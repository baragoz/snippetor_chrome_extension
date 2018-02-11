/*globals jQuery, define, module, exports, require, window, document, postMessage */
(function(jQuery) {
  "use strict";
  $(document).ready(function() {
    // C++ simple parser
    var Parser = {
				lines: [],
				line: 0,
				stack: [],
				tokens: [],
				init: function(lines) {
					// just save lines in the local structure
					this.lines = lines;
					this.line = 0;
					this.tokens = [];
					this.stack = [];
					this.program = {
						namespaces: [],
						classes: []
					};
				},
				//
				// Wrap some char or substring with a spaces
				// Uses to simplify tokenization process
				//
				addSpaces: function(sm, ch) {
					if (sm.indexOf(ch) >= 0) {
						return sm.split(ch).join(" " + ch + " ");
					}
					return sm;
				},
				//
				// split all control symbols via spaces
				// before splitting string on tokens
				//
				splitters: ["{", "{", "(", ")", ":", ";", "::", ","],
				makeTokenable: function(sm) {
					var res = sm;
					for (var g in this.splitters) {
						res = this.addSpaces(res, this.splitters[g]);
					}
					return res;
				},
				//
				// split next line on tokens
				//
				getTokens: function(inp) {
					if (!inp) return;
					if (inp.indexOf("//") >= 0)
						inp = inp.substr(0, inp.indexOf("//"));
					return this.makeTokenable(inp).split(" ");
				},
				//
				// provide next token
				//
				getNextToken: function() {
					// check if there is no more tokens in the line
					// then read next line
					var next = "";

					while (next == "" || next == '\n') {
						if (this.tokens.length == 0) {
							if (this.line == this.lines.length)
								return null;
							// get next tokkens
							this.tokens = this.getTokens(this.lines[this.line++]);
						}
						next = this.tokens.shift();
					}
					return (next == "" ? null : next);
				},
				//
				// Each file could consits of namsaces or classes
				// there is no cache for a standalon functions
				// or friends functions
				//
				program: {
					namespaces: [],
					classes: []
				},
				//
				// Parse current program to extract namespaces and classes
				//
				parse: function() {
					var x;
					while (x = this.getNextToken()) {
						if (x == "namespace") {
							var nm = this.parseNamespace();
							nm.classes = [];
							nm.namespaces = [];
							this.stack.push(nm);
						} else if (x == "class" || x == "struct") {
							// class parser detect } by  itself
							var sm = this.parseClass(x);
							if (sm == null) {
								console.log("Parsing terminated");
								return this.program;
							}


							if (this.stack.length == 0) {
								this.program.classes.push(top);
							}
							if (this.stack.length > 0) {
								this.stack[this.stack.length - 1].classes.push(sm);
							}
						} else if (x[0] == "}") {
							// Check the closing scope
							if (this.stack.length > 1) {
								var top = this.stack.pop();
								this.stack[this.stack.length - 1].namespaces.push(top);
							}
							if (this.stack.length == 1) {
								var top = this.stack.pop();
								this.program.namespaces.push(top);
							}
						}
					}
					return this.program;
				},
				//
				// namespace token identified, parse all stuff after token
				//
				parseNamespace: function() {
					var name = this.getNextToken();
					console.log("Parsing namespace: " + name);
					if (name.indexOf("{") >= 0)
						return {
							type: "namespace",
							isAnonymouse: true
						};
					// Check next token
					var x = this.getNextToken();
					// it is not unnamed namespace
					if (x.indexOf("{") >= 0)
						return {
							type: "namespace",
							isAnonymouse: false,
							value: name
						};

					console.log("Unhandled use-case with namespace parsing: " + name + " " + x);
					// Try to read all token for unknown use-case
					while (x && x.indexOf("{") < 0) {
						name += x;
						x = this.getNextToken();
					}
					return {
						type: "namespace",
						value: name,
						isAnonymouse: false
					};
				},
				//
				// the "class" token identified, parse class start or
				// read class methods
				//
				parseClass: function(ctype) {
					var x = this.getNextToken();
					console.log("parsing class: " + x);
					var base = {};
					//
					// use-case:
					// class {
					// } arg;
					//
					if (x[0] == "{") {
						// skip class declaration
						this.skipTill("}", "{");
						return {};
					} else {
						var name = x;
						var x = this.getNextToken();

						var subset = [];
						subset.push(name);
						// parse inheritance
						while (x[0] != ":"
							&& x[0] != "{"
							&& x[0] != ";") {
							subset.push(x);
							x = this.getNextToken();
						}

						if (x[0] == ";") {
							return {
								type: ctype,
								isDeclaration: true,
								name: subset[subset.length -1],
								subroutine: subset.join(" ")
							};
						}
					}

					if (x[0] == ":")
						base = this.parseBaseClasses();

					var result = this.parseClassDeclaration();
					if (result == null)
					  return null;
					return {
						type: ctype,
						isDeclaration: true,
						name: subset[subset.length -1],
						subroutine: subset.join(" "), // CONTENT_EXPORT __attributes visibility etc..
						attributes: result.attributes, // fields of the class
						methods: result.methods, // methods of the class
						base: base // the list of base classes
					};
				},
				//
				// read the base classes:
				// TODO: add virtual support
				// class A: public B, private C, protected D {
				//    // some class details
				// }
				// TODO: add template classes support
				// class A: public C<int, string, void*>, private X {}
				//
				inharitage: ["public", "private", "protected"],
				parseBaseClasses: function() {
					var base = [];
					var visibility = "public";
					var name = "";
					var read_visibility = true;
					var x = this.getNextToken();
					//
					// read till the class start
					//
					while (x[0] != "{") {
						if (read_visibility && this.inharitage.indexOf(x) >= 0) {
							visibility = x;
						}
						else if (x[0] == ",") {
							read_visibility = true;
							base.push({
								visibility: visibility,
								name: name
							});
							// reset class name
							name = "";
						} else {
							read_visibility = false;
							name += x + " ";
						}
						x = this.getNextToken();
					} // while

					// add the last class name which ends with {
					if (name != "") {
						base.push({
							visibility: visibility,
							name: name
						});
					}

					return base;
				},
				//
				// parse class methods and attributes line by line
				// and tracking the visiblity options
				//
				parseClassDeclaration: function(classType, className) {
					var result = {
						subroutines: [], // the list of subroutines
						fields: [],      // the list of fields
						methods: [],     // the list of methods
						classes: [],     // the list of classes
						friends: []      // friend classes or methods
					};
					//
					// The default visibility depends on class or structure
					//
					var visibility = (classType == "class" ? "private" : "public");

					//
					// the break should happen on "}" or end of file
					//
					while (true) {
						var x = this.getNextToken();

						// end of file, nothing to do
						if (x == null)
						  return result;

						// end of the clas declaration
						// Example:
						// class A {
						// }  <-- waiting for this token
						if (x[0] == "}")
							return result;

						// 1. check that it is not visibility modificator
						// For example
						// class A {
						//   public:      <-- waiting for public: private: or protected: modificator
						//     int a;
						// }
						if (this.inharitage.indexOf(x) >= 0) {
							var y = this.getNextToken();
							if (y[0] != ":")
								console.log("Unexpected handler: " + x + y);
							visibility = x;
							continue;
						}
						// 2. Handle nested classes:
						//    probably it is class,struct or enum
						if (["class", "struct"].indexOf(x) >= 0) {
							var res = this.parseClass(x);
							if (res == null)
							  return result;
							result.classes.push(res);
							continue;
						}
						// 3. probably it is the constructor
						//    or attribute of method. we have to read whole line to be sure what is it
						var item = this.parseClassItem(x);

						if (item == null)
						  return null;

						if (item) {
							item.visibility = visibility;

							if (item.type == "method") {
								result.methods.push(item.name);
							}
							if (item.type == "field") {
								result.fields.push(item);
							}
							if (item.type == "friend") {
								result.friends.push(item);
							}
						}

					}
					return result;
				},
				//
				// Parse the class items:
				// - Field:
				// - methods
				// - constructor
				// - destructor
				// - friend declaration
				//
				// the rest of the  use-cases should be
				// handled by the previous method
				parseClassItem: function(start) {
				  var x = start;
					var result = {
						type: "field"
					};
					var subset = [];
					var is_opened = true;
					var stack = [];

					// insert first token
					subset.push(x);

					while (is_opened) {
						x = this.getNextToken();
						if (x == null)
						  return null;

						if (x[0] == ";") {
							if (result.type == "field")
							  result.name  = subset.join(" ");
								return result;

							if (result.type == "method") {
								//
								// int f() = 0;
								// int f() const;
								// int f() throw();
								if (subset.length != 0) {
									result.postfix = subset.join(" ");
								}
								// this use case should not handle the inline declaration
								// for example:
								// int f1(int x) const { print(x); }
								return result;
							}
							return null;
						}

						if (x[0] == "(") {
							  result.type = "method";
								result.name = subset[subset.length -1];
								result.return_type = subset.join(" ");
								subset = [];
								result.arguments = this.readMethodArguments();
								continue;
						}
						if (x[0] == "{") {
							if (result.type != "method") {
								console.log("Invalid precondition: '{' - token should be after '(' only");
								return null;
							}
							//
							// int f() const { }
							// int f1() throw() {}
							if (subset.length != 0) {
								result.postfix = subset.join(" ");
							}
							result.is_inline = true;
							this.skipTill('}', '{');
							// we are not expecting enything after }
							// but probably user could add ";"
							return result;
							continue;
						}

						subset.push(x);
					}
				},
				readMethodArguments: function() {
					var result = {
						arguments : []
					};
					var argument = "";
					var x = this.getNextToken();

					// TODO: check end of file
					while (x != ')') {
						if (x[0] == ',') {
							result.arguments.push(argument);
							argument = "";
						}
						else {
							argument += " " + x;
						}
						// read next token for the iteration
						x = this.getNextToken();
					}
					//
					// int f1(void* x);
					// there is not "," in that case and last arguments
					// will be skiped without this check
					// but if we have
					// int f1(); then arguments will be empty substring
					// and also ok
					if (argument != "")
						result.arguments.push(argument);
					// the list of arguments
					return result.arguments;
				},
				//
				// we are not interested in what is going on inside class
				// method. There for we can skip till the closing "}"
				// class A {
				//    int f1(int x) {
				//         {
				//           int y = 123; x = y; // etc...
				//         }
				//    }
				// };
				skipTill: function(item, open_item) {
					var count = 1;
          var x;
					while (count > 0) {
						 x = this.getNextToken();
						 if (x.substr(0, item.length) == item) {
							 --count;
						 }
						 else if (open_item && x.substr(0, item.length) == open_item) {
							 ++count;
						 }
					}
				}
			};


    var ns = {
      extApi: {},
      uiApi: {}
    };
    var isSnippetor = (window.location.href.indexOf("http://localhost:5000") == 0 || window.location.href.indexOf("https://snipettor.firebaseapp.com") == 0);
    if (!isSnippetor) {
      window.addEventListener("onSnippetChange", function(evt) {
        var payload = evt.detail;
        if (payload.action == "save") {
          ns.uiApi.onSaveSnippet(payload);
        } else if (payload.action == "create") {
          ns.uiApi.onCreateSnippet(payload);
        } else if (payload.action == "open") {
          ns.uiApi.onOpenSnippet(payload);
        } else if (payload.action == "edit-state") {
          ns.uiApi.onEditStateSnippet(payload);
        }  else if (payload.action == "add-index") {
          ns.extApi.onAddIndexedItem(payload);
        }  else if (payload.action == "remove-index") {
          ns.extApi.onRemoveIndexedItem(payload);
        } else {
          alert("Unknow snippet action: " + payload.action);
        }
      });

      window.addEventListener("onSnippetItemChange", function(evt) {
        var payload = evt.detail;
        if (payload.action == "add") {
          ns.extApi.onAddItem(payload);
        } else if (payload.action == "remove") {
          ns.extApi.onRemoveItem(payload);
        } else if (payload.action == "change") {
          ns.extApi.onChangeItem(payload);
        } else if (payload.action == "move") {
          ns.extApi.onMoveItem(payload);
        } else if (payload.action == "update") {
          ns.extApi.onUpdateItem(payload);
        } else {
          alert("Unknow snippet action: " + payload.action);
        }
      });
    }

    window.addEventListener("onSnipettorAction", function(evt) {
      var payload = evt.detail;
      console.dir(payload);
      if (payload.action == "saved-draft") {
        chrome.runtime.sendMessage({
          type: "onSaveSnippetDraft",
          payload: {
            uid: payload.payload.uid
          }
        }, function(response) {});
      } else if (payload.action == "open-snippet") {
        chrome.runtime.sendMessage({
          type: "onOpenSnippet",
          payload: payload.data
        }, function(response) {});
      }
      if (payload.action == "select-snippet") {
        chrome.runtime.sendMessage({
          type: "openSnippet",
          payload: payload.data
        }, function(response) {});
      } else if (payload.action == "GetInitialState") {
        ns.extApi.init(function(response) {
          window.dispatchEvent(new CustomEvent("onInit", {
            detail: response
          }));
        });

      } else if (payload.action == "subscribe") {
        chrome.runtime.sendMessage({
          type: "subscribeSnippet",
          payload: payload.payload
        }, function(response) {
          console.log("snippet has been subscribed. TODO: send a feedback message");
        });

      } else if (payload.action == "unsubscribe") {
        chrome.runtime.sendMessage({
          type: "unsubscribeSnippet",
          payload: payload.payload
        }, function(response) {
          console.log("snippet has been unsubscribed. TODO: send a feedback message");
        });
      } else if (payload.action == "edit-current-snippet") {
        chrome.runtime.sendMessage({
          type: "editCurrentSnippet",
          payload: payload.payload
        }, function(response) {
          console.log("snippet edit state has been updated");
        });
      } else if (payload.action == "select-snippet") {} else if (payload.action == "update-snippet-item") {
        chrome.runtime.sendMessage({
          type: "updateItem",
          payload: payload.payload
        }, function(response) {
          console.log("snippet has been updated");
        });
      } else if (payload.action == "delete-snippet-item") {
        chrome.runtime.sendMessage({
          type: "removeItem",
          payload: payload.payload.index
        }, function(response) {
          console.log("snippet has been updated");
        });
      } else if (payload.action == "move-snippet-item") {
        chrome.runtime.sendMessage({
          type: "moveItem",
          payload: payload.payload
        }, function(response) {
          console.log("snippet has been updated");
        });
      }
    });


    var siteHandlers;
    var isInitializedOnce = false;

    function subscribeForTheLineDblClick() {
      //
      // Make a subscription via concreate site handler
      // but subscription method is common for all sites
      //
      function snippetorSubscribeFunction(siteHandler) {
        var lines = siteHandler.getLines();

        if (lines == null || lines == undefined)
          return;
        var updatedElementsCount = 0;

        function snippetorSelectHandler(e) {
          var lineNumber = siteHandler.getLineNumberOnClick(this, e);
          console.log("LINE NUMBER ON CLICK IS : " + lineNumber);
          // Something goes wrong
          if (!lineNumber)
            return;
          var xxx = window.location.href;
          xxx = xxx.split("#")[0];
          xxx = xxx.split("?")[0]; // Leave only clear path
          ns.uiApi.showBubble(e, xxx, lineNumber);
        }

        for (var idx = 0; idx < lines.length; ++idx) {
          if (!lines[idx].classList || !lines[idx].classList.contains("snipettor-event-observer")) {
            ++updatedElementsCount;
            lines[idx].className += " snipettor-event-observer";
            lines[idx].addEventListener('dblclick', snippetorSelectHandler);
          }
        }
        // show bubble UI on lines availability
        if (lines.length > 0 || ns.uiApi.showInitialBubbleRequestDone == false)
          setTimeout(function() {
            ns.uiApi.showInitialBubble();
          }, 200);
        if (updatedElementsCount == 0 && !isInitializedOnce) {
          setTimeout(function() {
            subscribeForTheLineDblClick();
          }, 1000);
        } else {
          isInitializedOnce = true;
        }

      } // subscribe function
      //////////////////////////////////////////////////


      siteHandlers = siteHandlers || [{
          // Name of the handler
          title: "GitHub",
          //
          // Url verification method
          //
          checkUrl: function(url) {
            return (url.indexOf("https://github.com") == 0);
          },
          getLines: function() {
            return $(".js-line-number");
          },
          getLineNumberOnClick: function(element) {
            return element.attributes["data-line-number"].value;
          },
          getLineElementByNumber: function(lineNumber) {
            var lines = this.getLines();
            if (lines == null || lineNumber >= lines.length)
              return null;
            return lines[parseInt(lineNumber)];          }
        }, // GitHub
        {
          title: "BitBucket",
          //
          // Url verification method
          //
          checkUrl: function(url) {
            return (url.indexOf("https://bitbucket.org") == 0);
          },
          getLines: function() {
            var lines = $(".linenodiv pre a");
            if (lines.length == 0)
              return null;
            return lines;
          },
          getLineNumberOnClick: function(element) {
            return element.innerHTML;
          },
          //
          // Note: there are two items in the bitbucket structure
          //       one is a-tag and another one is #text == "\n"
          getLineElementByNumber: function(lineNumber) {
            var lines = this.getLines();
            if (lines == null || lineNumber >= lines.length)
              return null;
            return lines[parseInt(lineNumber)];
          }
        }, // BitBucket
        {
          title: "GoogleCodeSearch",
          checkUrl: function(url) {
            return (url.indexOf("https://cs.chromium.org") == 0);
          },
          getLines: function() {
            return $(".lineNumber");
          },
          getLineNumberOnClick: function(element) {
            return parseInt(element.innerHTML);
          },
          getLineElementByNumber: function(lineNumber) {
            var lines = this.getLines();
            if (lines == null || lineNumber >= lines.length)
              return null;
            return lines[parseInt(lineNumber)];
          }
        }, // cs.chromium.org
        {
          title: "UmlSync",
          checkUrl: function(url) {
            return (url.indexOf("https://umlsync-6e2da.firebaseapp.com") == 0);
          },
          getLines: function() {
            return document.getElementsByClassName("us-element-border");
          },
          getLineNumberOnClick: function(element) {
            return element.id;
          },
          getLineElementByNumber: function(lineNumber) {
            return $("#" + lineNumber);
          }
        }
      ];

      // Subscribe for snippet bubble show
      // via concreate site handler
      for (var x in siteHandlers) {
        if (siteHandlers[x].checkUrl(window.location.href)) {
          snippetorSubscribeFunction(siteHandlers[x]);
          break;
        }
      }
    } // subscribe for the line dbl click

    function getLineIndexElementByLineNumber(lineNumber) {
      for (var x in siteHandlers) {
        if (siteHandlers[x].checkUrl(window.location.href)) {
          return siteHandlers[x].getLineElementByNumber(lineNumber);
        }
      }
      return null;
    }

    // Subscribe for line numbers
    window.subscribeForTheLineDblClick = subscribeForTheLineDblClick;
    window.addEventListener("load", function() {
      setTimeout(function() {
        subscribeForTheLineDblClick();
      }, 1000);
    }, false);

    function findById(id, subscription, callback) {
      var element = document.getElementById(id);
      if (element && subscription && callback) {
        element.addEventListener(subscription, function(e) {
          e.stopPropagation();
          callback(e);
        });
      }
      return element;
    }

    ns.extApi = {
      items: [],
      wsid: null,
      wiid: null,
      state: "idle",
      //
      // Return the working item
      //
      getWorkingItem: function() {
        if (ns.extApi.wsid == undefined || ns.extApi.wsid == null)
          return null;

        var itemIdx = ns.extApi.snippetsList[ns.extApi.wsid].workingItem;
        if (itemIdx == null || itemIdx == undefined)
          return null;
        return ns.extApi.snippetsList[ns.extApi.wsid].items[itemIdx];
      },
      saveNewItemAtCurrentPosition: function(item) {
        var itemIdx = ns.extApi.wiid;
        itemIdx = itemIdx == null  || itemIdx == undefined ? 0 : itemIdx + 1;
        this.addNewItem(itemIdx, item, function(response) {
          // add to the end of the existing list
          ns.extApi.wiid = itemIdx;
          ns.uiApi.onAddItem(ns.extApi.snippetsList[ns.extApi.wsid].items[itemIdx], itemIdx);
        });
      },
      updateCommentForCurrentSnippetItem: function(comment) {
        var item = this.getWorkingItem();
        if (!item) {
          console.log("Error: there is no snippet item which we can change comment for.");
          return;
        }
        this.updateItemComment(ns.extApi.snippetsList[ns.extApi.wsid].workingItem, comment);
      },
      unsubscribeSnippet: function() {
        chrome.runtime.sendMessage({
          type: "unsubscribeSnippet",
          payload: ns.extApi.wsid,
        }, function(response) {
          ns.extApi.wsid = null;
          ns.extApi.wiid = null;
          console.log("snippet has been unsubscribed. TODO: send a feedback message");
        });

      },
      subscribeSnippet: function(idx) {
        var snp = ns.extApi.snippetsList[idx];
        if (!snp) return;

        chrome.runtime.sendMessage({
          type: "subscribeSnippet",
          payload: snp.uid,
        }, function(response) {
          console.log("snippet has been subscribed. TODO: send a feedback message");
        });
      },
      //
      //
      isWorkingSnippet: function(payload) {
        return (payload.working == this.wsid);
      },
      onSaveSnippet: function(id) {
        // Remove snippet from the menu list, because it is not draft anymore
        ns.extApi.snippetsList[id] = null;
      },
      createSnippet: function(title, callback) {
        chrome.runtime.sendMessage({
          type: "createSnippet",
          payload: {
            title: title,
            isModified: true
          }
        }, function(response) {
          // get an id of the working snippet
          ns.extApi.wsid = response.working;
          ns.extApi.snippetsList[ns.extApi.wsid] = {title:title, items:[]};
          ns.extApi.wiid = undefined;
          console.log("Snippet created");
          if (callback)
            callback(response);
        });
      },
      openSnippet: function(idx) {
        chrome.runtime.sendMessage({
          type: "openSnippet",
          payload: idx
        }, function(response) {});
        // resetup snippet configuration
        if (ns.extApi.snippetsList[idx] != null) {
          ns.extApi.wsid = idx;
          ns.extApi.wiid = ns.extApi.snippetsList[idx].workingItem;
        }
      },
      openSnippetItem: function(id, callback) {
        ns.uiApi.showInitialBubbleRequestDone = false;
        ns.extApi.snippetsList[ns.extApi.wsid].workingItem = id;
        ns.extApi.wiid = id;

        chrome.runtime.sendMessage({
          type: "openItem",
          payload: id
        }, function(response) {
          console.log("Open snippet complete");
          if (callback)
            callback(response);
        });

      },
      saveSnippet: function(callback) {
        chrome.runtime.sendMessage({
          type: "saveSnippet"
        }, function(response) {
          console.log("Snippet saved probably");
          if (callback)
            callback(response);
        });
      },
      removeItem: function(idx) {
        chrome.runtime.sendMessage({
          type: "removeItem",
          payload: idx
        }, function(response) {
          ns.extApi.snippetsList[ns.extApi.wsid].items.splice(idx, 1);
          ns.uiApi.onRemoveItem(idx);
          if (callback)
            callback(response);
        });
      },
      addNewItem: function(idx, item, callback) {
        chrome.runtime.sendMessage({
          type: "addNewItem",
          payload: {
            item: item,
            index: idx
          }
        }, function(response) {
          ns.extApi.snippetsList[ns.extApi.wsid].items.splice(idx, 0, item);
          if (callback)
            callback(response);
        });
      },
      updateItemComment: function(idx, comment) {
        chrome.runtime.sendMessage({
          type: "updateItem",
          payload: {
            idx: idx,
            item: {
              comment: comment
            }
          }
        }, function(response) {
          console.log("snippet has been updated");
        });
        this.snippetsList[this.wsid].items[idx].comment = comment;
        this.items[idx].comment = comment;
      },
      moveIndex: function(payload) {
        chrome.runtime.sendMessage({
          type: "moveItem",
          payload: payload
        }, function(response) {
          console.log("snippet has been updated");
        });
        // change the position of old item and new item
        var item = ns.extApi.snippetsList[ns.extApi.wsid].items.splice(payload.oldIndex, 1);
        ns.extApi.snippetsList[ns.extApi.wsid].items.splice(payload.newIndex, 0, item);
      },
      updateSnippetState: function(state) {
        chrome.runtime.sendMessage({
          type: "updateSnippetState",
          payload: state
        }, function(response) {
          console.log("snippet state changed");
        });
      },
      closeCurrentSnippet: function() {
        chrome.runtime.sendMessage({
          type: "closeCurrentSnippet",
          payload: ns.extApi.wsid
        }, function(response) {
          console.log("snippet has been unsubscribed");
        });
        // reset state to the IDLE
        ns.extApi.wsid = null;
        ns.extApi.wiid = undefined;
        ns.extApi.state = "idle";
      },
      // track if extension initialized
      // and provided the list of snippets
      isInitialized: false,
      init: function(callback) {
        chrome.runtime.sendMessage({
          type: "initialItems",
          payload: {}
        }, function(response) {
          console.dir(response);
          ns.extApi.isInitialized = true;
          // Complex check if we failed to unsubscribe from snippet
          // correctly
          var hasWorking = (response.working != undefined &&
                            response.working != null &&
                             response.working >= 0 &&
                             response.snippets[response.working] != null);
          ns.extApi.wsid = hasWorking ? response.working : null;
          ns.extApi.wiid =  hasWorking ?
              response.snippets[response.working].workingItem : null;
          ns.extApi.snippetsList = response.snippets;

          if (response.state && response.state.collapsed == false) {
            // restore previous state
            $(".snippetor-ui .brand").trigger("click");
          }
          if (callback)
            callback(response);
        });
      },
      //
      // HANDLE SOURCE CODE INDEXING DATA
      //
      updateIndexedData: function(url, program, callback) {
        if (program == null) {
          chrome.runtime.sendMessage({
            type: "removeIndexedItem",
            payload: {
              url: url
            }
          }, function(response) {
            delete ns.extApi.snippetsList[ns.extApi.wsid].indexed[url];
            if (callback) callback();
          });
          return;
        }
        //
        // add an indexed item to the list
        //
        chrome.runtime.sendMessage({
          type: "addIndexedItem",
          payload: {
            item: program,
            url: url
          }
        }, function(response) {
          ns.extApi.snippetsList[ns.extApi.wsid].indexed = ns.extApi.snippetsList[ns.extApi.wsid].indexed || [];
          ns.extApi.snippetsList[ns.extApi.wsid].indexed[url] = program;
          if (callback) callback();
        });
      },
      getIndexedData: function() {
        return ns.extApi.snippetsList[ns.extApi.wsid].indexed;
      },

      /////////////////////  callbacks
      onAddItem: function(payload) {
        ns.extApi.snippetsList[payload.working].items.splice(payload.index, 0, payload.item);
        // update snippet item UI if it was current item
        if (payload.working == ns.extApi.wsid) {
          // add to the end of the existing list
          ns.uiApi.onAddItem(ns.extApi.snippetsList[payload.working].items[payload.index], payload.index);
        }
      },
      onRemoveItem: function(payload) {
        var removed = ns.extApi.snippetsList[payload.working].items.splice(payload.payload.index, 1);
        if (payload.working == ns.extApi.wsid) {
          ns.uiApi.onRemoveItem(removed);
        }
      },
      onUpdateItem: function(payload) {
        ns.extApi.snippetsList[payload.working].items[payload.payload.index] = payload.item;
        if (payload.working == ns.extApi.wsid) {
          ns.uiApi.onUpdateItem(payload.item, payload.payload.index);
        }
      },
      onMoveItem: function(payload) {
        // Update snipettor cached data
        var item = ns.extApi.snippetsList[payload.working].items[payload.payload.url];
        ns.extApi.snippetsList[payload.working].items.splice(payload.payload.oldIndex, 1);
        ns.extApi.snippetsList[payload.working].items.splice(payload.payload.newIndex, 0, item);

        // update snippet item UI if it was current item
        if (payload.working == ns.extApi.wsid) {
          // swap status if it is the same items
          ns.uiApi.onMoveItem(payload.payload.oldIndex, payload.payload.newIndex);
        }
      },
      onRemoveIndexedItem: function(payload) {
        delete ns.extApi.snippetsList[payload.working].indexed[payload.payload.url];

        // update snippet item UI if it was current item
        if (payload.working == ns.extApi.wsid) {
          // swap status if it is the same items
          ns.uiApi.clearIndexedMenu();
        }
      },
      onAddIndexedItem: function(payload) {
        if (!ns.extApi.snippetsList[payload.working].indexed) {
          ns.extApi.snippetsList[payload.working].indexed = [];
        }
        ns.extApi.snippetsList[payload.working].indexed[payload.payload.url] = payload.payload.item;
        // update snippet item UI if it was current item
        if (payload.working == ns.extApi.wsid) {
          // swap status if it is the same items
          ns.uiApi.clearIndexedMenu();
        }
      }
    };

    // all the code below extend the standard UI of the page
    // So, we do not need to extend the UI of snipettor page
    if (isSnippetor)
      return;

    ns.uiBubbleApi = {
      bubbleElement: null,
      removeBubble: function() {
        if (this.bubbleElement != null)
          this.bubbleElement.remove();
      },
      //
      // Remove previous bubble element and create a new one
      // and subscribe for a dialog event
      // @param payload - line number, comment, etc
      // @param style - css style to fixup position of the bubble UI
      // @param callbacks - {onEditDone: function() {},
      //                     onEditStart: function() {},
      //                     onEditCancel: funciton() {},
      //                     onBubbleClose: function() {}}
      //
      _getBubbleUi: function(payload, styleData, callbacks) {
        // remove previos bubble if exists
        this.removeBubble();
        // Create a new bubble element and configure it
        // TBD: use nano for a template handling
        var isSimple = payload.isNewItem && !payload.isModified;
        this.bubbleElement = isSimple ?
                             this._getNewBubbleTemplate(payload) :
                             this._getBubbleTemplate(payload);

        this.bubbleElement.appendTo("body");

        // change style for this element
        styleData.position = "absolute";
        $("#snipettor-bubble-dialog-new").css(styleData);

        // Sync -up component and model with an old jQuery style
        isSimple ? this._configureNewBubbleBehavior(callbacks) :
                   this._configureBubbleBehavior(callbacks);
      },
      _getBubbleTemplate: function(payload) {
        return $('<div id="snipettor-bubble-dialog-new" class="bubble-comment active" style="display: block;">\
                            <a class="bubble-close"></a>\
                            <div class="comment">' + (payload.comment || '') + '</div>\
                            <div class="textarea-area" style="display:none;"><textarea></textarea></div>\
                            <div class="bubble-buttons left-sided">\
                                <a class="bubble-save">Save Changes</a>\
                                <a class="bubble-cancel">Cancel</a>\
                            </div>\
                            <div class="bubble-clean-buttons">\
                                <a class="bubble-edit">Edit Comment</a>\
                                <a class="bubbleLeft"></a>\
                                <a class="bubbleRight"></a>\
                            </div>\
                            <div class="clearfix"></div>\
                        </div>');
      },
      _getNewBubbleTemplate: function(payload) {
        return $('<div id="snipettor-bubble-dialog-new" class="bubble-comment add-comment active" style="display: block;">\
                            <a class="bubble-close"></a>\
                            <textarea placeholder="Enter your comment here.."></textarea>\
                            <div class="bubble-buttons">\
                                <a class="bubble-cancel">Cancel</a>\
                                <a class="bubble-save">Save</a>\
                            </div>\
                        </div>');
      },
      _configureNewBubbleBehavior: function(callbacks) {
        var that = this;
        //
        // CLOSE comment bubble UI
        //
        this.bubbleElement.find(".bubble-close").click(function(e) {
          e.preventDefault();
          // Notify that bubble was closed
          if (callbacks.onBubbleClose)
            callbacks.onBubbleClose();
          // Remove UI bubble element
          that.removeBubble();
        })
        //
        // CANCEL comment edit
        //
        this.bubbleElement.find(".bubble-cancel").click(function(e) {
          e.preventDefault();
          // Notify on edit start
          if (callbacks && callbacks.onBubbleClose)
            callbacks.onBubbleClose();
          // Remove UI bubble element
          that.removeBubble();
        });
        //
        // SAVE new comment
        //
        this.bubbleElement.find(".bubble-save").click(function(e) {
          e.preventDefault();
          var comment = $(this).parent().parent().children("textarea").val();

          // Notify on edit complete
          if (callbacks && callbacks.onEditDone)
            callbacks.onEditDone(comment);

          // close bubble anyway
          if (callbacks && callbacks.onBubbleClose)
              callbacks.onBubbleClose();

          // Remove UI bubble element
          that.removeBubble();
        });

      },
      //
      // CONFIGURE A NEW BUBBLE UI ELEMENT
      //
      // @param callbacks - {onEditDone: function() {},
      //                     onEditStart: function() {},
      //                     onEditCancel: funciton() {},
      //                     onBubbleClose: function() {}}
      _configureBubbleBehavior: function(callbacks) {

        /*          //          findById("snipettor-bubble-dialog-textarea").value = that.currentItem.comment || "";
                  // Subscribe for SAVE button
                  findById("snipettor-bubble-dialog-save", "click", function(e) {
                    // read current value and reset input
                    var r = findById("snipettor-bubble-dialog-textarea").value;
                    findById("snipettor-bubble-dialog-textarea").value = "";
                    console.log("SAVE BUBBLE !!!: " + that.currentItem.line)
                    if (that.currentItem.idx != undefined) {
                      ns.uiApi.updateItemComment(that.currentItem.idx, r);
                    } else {
                      ns.uiApi.showNewItem(that.currentItem.url, that.currentItem.line, r, false, false, true);
                    }
                    that.bubbleElement.style.display = "none";
                  });
          */
        var workingBubble = this.bubbleElement;
        var that = this;

        //
        // CLOSE comment bubble UI
        //
        this.bubbleElement.find(".bubble-close").click(function(e) {
          e.preventDefault();
          // Notify that bubble was closed
          if (callbacks.onBubbleClose)
            callbacks.onBubbleClose();
          that.removeBubble();
        })
        //
        // CANCEL comment edit
        //
        this.bubbleElement.find(".bubble-cancel").click(function(e) {
          e.preventDefault();
          var $textComment = $(this).parent().siblings(".textarea-area");
          var $comment = $(this).parent().siblings(".comment");

          $textComment.hide();
          $comment.fadeIn(200);

          $(this).parent().parent().removeClass("add-comment");
          $(this).parent().hide();

          // Notify on edit start
          if (callbacks && callbacks.onEditCancel)
            callbacks.onEditCancel($comment.text(), $textComment.children("textarea").val());
        })

        //
        // SAVE changed comment
        //
        this.bubbleElement.find(".bubble-save").click(function(e) {
          e.preventDefault();
          var $textComment = $(this).parent().siblings(".textarea-area");
          var $comment = $(this).parent().siblings(".comment");
          var content = $textComment.children("textarea").val();
          var oldContent = $comment.text();
          $comment.text(content);
          $textComment.hide();
          $comment.fadeIn(200);
          // Tricky css to hide/show next-prev buttons,
          // may be it is good to do the same for Save/Cancel
          // But in that case we have to remove fadeIn/Out effects
          $(this).parent().parent().removeClass("add-comment");
          $(this).parent().hide();

          // Notify on edited comment saved
          if (callbacks && callbacks.onEditDone)
            callbacks.onEditDone(content, oldContent);
        })


        this.bubbleElement.find(".bubble-edit").click(function(e) {
          e.preventDefault();
          var $comment = $(this).parent().siblings(".comment");
          var content = $comment.text();
          $comment.hide();
          $(this).parent().parent().addClass("add-comment");
          $(this).parent().siblings(".textarea-area").fadeIn().children("textarea").val(content);
          $(this).parent().siblings(".bubble-buttons").fadeIn(200);

          // Notify on edited comment started
          if (callbacks && callbacks.onEditStart)
            callbacks.onEditStart(content);
        })

        return this.bubbleElement;
      },
      //
      // configure next prev navigation
      // based on arguments provided by ns.uiApi
      configureNextAndPrev: function(config) {
        // Do nothing if there is no active bubble element
        if (this.bubbleElement == null)
          return;

        // Handle Next/Prev elements visibility
        var next_element = $("a.bubbleRight"),
          prev_element = $("a.bubbleLeft");
        // Handle prev state
        if (config.isPrevVisisble()) {
          prev_element
            .attr("display", "block")
            .click(function(e) {
              e.stopPropagation();
              e.preventDefault();
              config.onPrevClick();
            })
        } else {
          prev_element.attr("display", "none");
        }

        if (config.isNextVisible()) {
          next_element
            .attr("display", "block")
            .click(function(e) {
              e.stopPropagation();
              e.preventDefault();
              config.onNextClick();
            })
        } else
          next_element.attr("display", "none");
      }
    };

    ns.uiApi = {
      url: null,
      //
      // Show an initial bubble of the snippet page open
      //
      showInitialBubble: function() {
        //
        // Do nothing if initial bubble already show
        // It happens because of multiple call of
        // this method. We have no idea when all code will be on place
        // but want to show bubble ASAP
        if (this.showInitialBubbleRequestDone || !ns.extApi.isInitialized)
          return;

        var item = ns.extApi.getWorkingItem();
        // skip bubble show on empy element
        if (item == undefined)
          return;

        // Handle navigation
        // TBD: this._NextPrevHelper(true, true);

        var line = getLineIndexElementByLineNumber(item.line);
        // Suppose that there is no 0 line
        if (!line) {
          console.log("Could not file line: " + item.line + '. Retry');
          return;
        }
        // indicates that we shown bubble UI of first start
        this.showInitialBubbleRequestDone = true;

        ///////////////////// CREATE BUBBLE AT THE POSITION
        // Get possition of line in the code

        var absPos = line.getBoundingClientRect();

        // Handle UI element position
        var bubbleElement = ns.uiBubbleApi._getBubbleUi(item, {
          top: (absPos.top - 10  + document.scrollingElement.scrollTop) + "px",
          left: (absPos.left + 50 + document.scrollingElement.scrollLeft) + "px",
          display: "block"
        }, this);
        // There is no page redirect support for a while
        // therefore we have to show only new bubble,
        // or initial bubble items
        this._NextPrevHelper(true, true);
      },
      _NextPrevHelper: function(isSavedItem, isInitial) {
        if (!isInitial)
          return;

        ns.uiBubbleApi.configureNextAndPrev({
          isPrevVisisble: function() {
            // Not saved item should not have next and prev navigation
            // if it is the last item, then do not show prev
            return isSavedItem && (ns.extApi.wiid > 0);
          },
          isNextVisible: function() {
            var len = ns.extApi.snippetsList[ns.extApi.wsid].items.length;
            // Not saved item should not have next and prev navigation
            // do not show next item if there is no more items to show
            return isSavedItem && (ns.extApi.wiid < len - 1);
          },
          onPrevClick: function() {
            if (ns.extApi.wiid > 0) {
              ns.uiApi.updateActiveItem(ns.extApi.wiid-1, ns.extApi.wiid);
              ns.extApi.openSnippetItem(ns.extApi.wiid-1);
            } else {
              // we should never get into this else
            }
          },
          onNextClick: function() {
            var len = ns.extApi.snippetsList[ns.extApi.wsid].items.length;
            if (ns.extApi.wiid < len - 1) {
              ns.uiApi.updateActiveItem(ns.extApi.wiid+1, ns.extApi.wiid);
                ns.extApi.openSnippetItem(ns.extApi.wiid+1);
            } else {
              // somthing goes wrong, but we hanle it anyway
            }
          }
        }); // bubble ui next/prev config
      },
      //
      // Show input bubble at UI position
      //
      showBubble: function(evt, url, line) {
        // Do nothing if snippet was not named
        //this.currentItem = ns.extApi.getWorkingItem();
        if (ns.extApi.wsid == undefined || ns.extApi.wsid == null)
          return;

        this.currentItem = {
          url: url,
          line: line,
          isNewItem: true, // true or undefined
          isModified: undefined // undefined + isNewItem - means absolutely new item
          // true + isNewItem - means modify a new itemm which was not saved
        };

        var bubbleElement = ns.uiBubbleApi._getBubbleUi(this.currentItem, {
          top: (evt.pageY) + "px",
          left: (evt.pageX + 50) + "px",
          display: "block"
        }, this);

        // it is brand new item1
        // therefore no fwd and backward support
        this._NextPrevHelper(false, false);

        evt.stopPropagation();
      },
      ////////////////// BUBBLE UI CALLBACKS handling
      onBubbleClose: function() {
        // nothing changed but reset current item
        this.currentItem = null;
      },
      onEditStart: function() {
        // 1. Check if current snippet does not have edit state
        //    then change the current state
      },
      onEditCancel: function() {
        // 1. Return an original edit state for the snippet ui element
        //    the major comment is to move to not modified state`
      },
      onEditDone: function(newComment, oldComment) {
        if (this.currentItem) {
          if (oldComment != undefined)
            console.log("Error: expected no old comment value for a new comment");
          this.currentItem.comment = newComment;
          // indicates that next time we should open it via next-prev dialog
          // bubble but anyway it is still has isNewItem comment flag equal true
          this.currentItem.isModified = true;
          // Lets update snippet background model
          //
          // Notify all extension's subscribes about new item
          ns.extApi.saveNewItemAtCurrentPosition(this.currentItem);
        }
        else {
          ns.extApi.updateCommentForCurrentSnippetItem(newComment);
        }

      },


      //
      // Update comment via bubble UI element
      updateItemComment: function(idx, comment) {
        // Do nothing if snippet was not named
        if (ns.extApi.wsid == undefined || ns.extApi.wsid == null)
          return;
        ns.extApi.updateItemComment(idx, comment);
      },
      // List of snippets
      snippetsList: null,
      // Current index of snippet item
      current_index: 0,
      carouselReInit: function(wiid /* working item ID */) {
        var topSlider = $('.snippetor-ui .owl-carousel').owlCarousel({
          loop:false,
          nav: false,
          responsive: {
            0: {
              items: 1
            },
            600: {
              items: 2
            },
            800: {
              items: 3
            },
            1000: {
              items: 4
            },
            1300: {
              items: 5
            }
          },
          dots: false
        });


        topSlider.trigger("to.owl.carousel", [wiid, 0]);

        $(".snippetor-ui .goLeft").click(function(e) {
          e.preventDefault();
          topSlider.trigger('prev.owl.carousel');
        })

        $(".snippetor-ui .goRight").click(function(e) {
          e.preventDefault();
          topSlider.trigger('next.owl.carousel');
        });

      },
      updateActiveItem: function(newVal, oldVal) {
        var items = $("div.owl-stage>div.owl-item");
        // change an active class
        if (oldVal< items.length)
            $(items[oldVal]).children("div.item").removeClass("active");
        if (newVal< items.length)
            $(items[newVal]).children("div.item").addClass("active");
      },
      //
      // Show new snippet item on the top list menu
      //
      showNewItem: function(url, line, comment, isInit, skipSubsciption, isActive) {
        this.current_index++;
        //
        // Hide previous active items
        //
        if (isActive) {
          var activeItems = document.getElementsByClassName("snipettor-active-menu-item");
          for (var i = 0; i < activeItems.length; ++i)
            activeItems[i].classList.remove("snipettor-active-menu-item");
        }
        // Last 20 symbols of file path + name
        var payload = url.length > 20 ? url.substr(url.length - 20) : url;
        // Add item to the List of snippets
        $('<div class="item modified ' + (isActive ? 'active' : '') + '">\
              <div class="sn-file">' + payload + '</div><!--\
              --><span>line: <b>' + line + '</b></span>\
              <a class="remove ui-snippet-item-remove"></a>\
              </div>').appendTo("div.owl-carousel");

        //
        //
          /*          if (false && typeof SnippetSortable !== 'undefined') {
                      SnippetSortable.create(this.snippetsList, {
                        delay: 100,
                        onEnd: function(evt) {
                          ns.extApi.moveIndex({
                            oldIndex: evt.oldIndex,
                            newIndex: evt.newIndex
                          });
                        }
                      });
                    } // check if exists
          */

      },
      init: function() {
        ns.extApi.init(function() {
          if (ns.extApi.wsid != null && ns.extApi.wsid != undefined) {
            ns.uiApi.refreshItemsUiList();
            // Force change
            var isMod = ns.extApi.snippetsList[ns.extApi.wsid].isModified;
            console.log("IS MODIFIED ? " + isMod);
            ns.uiApi.toggleSave(isMod, !isMod);
          } else {
            ns.uiApi.toggleSave(false, false);
          }
          // Update the list of snippets
          ns.uiApi.refreshVertMenu();
        });
      },
      //
      // Change an edit mode of the opened snippet
      //
      changeEditMode: function(isModified) {
        if (isModified) {
          $("#snippetor-edit-action").hide();
          $("#snippetor-save-action").show();
        } else {
          $("#snippetor-edit-action").show();
          $("#snippetor-save-action").hide();
        }
      },
      refreshVertMenu: function() {
        if (isSnippetor)
          return;
        $('.ui-listofsnippets .ui-snippet-list').remove();
        for (var x in ns.extApi.snippetsList) {
          var snip = ns.extApi.snippetsList[x];
          if (snip == null)
            continue;
          var sname = snip.title;
          if (sname.length > 33) {
            sname = sname.substr(0, 30) + "...";
          }

          $('.ui-listofsnippets').append(
            '<li class="ui-snippet-list"><a>[ ] <b style="overflow:hidden;">'+sname+'</b></a></li>');
        }

        var snippets = $('.ui-snippet-list');
        snippets.click(function(e) {
          e.stopPropagation();
          e.preventDefault();
          var idx = snippets.index($(this));
          ns.extApi.openSnippet(idx);
          // update ui menu
          ns.uiApi.refreshItemsUiList();
          // vertical menu disable
          $(".snippetor-ui .brand").removeClass("active-vmenu");
          $(".snippetor-ui .dropdown-menu").fadeOut(100);
          setTimeout(function() {
            $(".snippetor-ui .brand").trigger("click");
          }, 100);
        });



        var vertMenu= findById("snippetor-vertical-menu");
        if (vertMenu) {
          // Empty previous value
          //vertMenu.innerHTML = '<li><a id="snipettor-create-item">Create</a></li>';

          for (var t in ns.extApi.snippetsList) {
            var snippet = ns.extApi.snippetsList[t];
            if (snippet) {
              //  vertMenu.innerHTML += '<li><a snippet_item="' + t + '" class="snipettor-select-menu-item">' + (snippet.title || 'no title') + '</a></li>';
            }
          }
          findById("snipettor-create-item", "click", function(e) {
            //  ns.uiApi.toggleCreate(true);
            //            ns.uiApi.toggleVMenu(false);
            // hide top line
            findById("menu-dddd").dispatchEvent(new Event("click"));
          });

          var snippetDrafts = document.getElementsByClassName("snipettor-select-menu-item");
          for (var x = 0; x < snippetDrafts.length; ++x) {
            snippetDrafts[x].addEventListener("click", function(e) {
              var index = parseInt(this.attributes["snippet_item"].value);
              console.log("ITEM IS:" + index);
              ns.uiApi.openSnippet(index);
            });
          }
        } // vertical menu
      },
      //
      // Re-draw and subscribe on UI list again
      //
      refreshItemsUiList: function() {
        if (isSnippetor)
          return;
        var snippetsList = findById("menu-snippets-list");
        //snippetsList.innerHTML = '';
        if (ns.extApi.wsid != null && ns.extApi.wsid != undefined
           && ns.extApi.snippetsList[ns.extApi.wsid] != null) {
          // update according to the modified state
          var isMod = ns.extApi.snippetsList[ns.extApi.wsid].isModified;
          // clean current carousel and refresh it
          $('.snippetor-ui .owl-carousel')
          .owlCarousel('destroy')
          .empty()
          .removeClass("owl-loaded")
          .removeClass("owl-drag");

          // Add all snippet items
          for (var x in ns.extApi.snippetsList[ns.extApi.wsid].items) {
            var tmp = ns.extApi.snippetsList[ns.extApi.wsid].items[x];
            var isActive = x == ns.extApi.wiid;
            ns.uiApi.showNewItem(tmp.url, tmp.line, tmp.data, true, false, isActive);
          }
          // reinit carousel on load complete
          this.carouselReInit(ns.extApi.wiid);

          var navigation = $(".owl-item");
          // replace on map function
          for (var v = 0; v < navigation.length; v++) {
            navigation[v].addEventListener('click', (function(payload) {
              var pl = payload;
              return function(e) {
                e.stopPropagation();
                ns.uiApi.updateActiveItem(pl, ns.extApi.wiid);
                ns.extApi.openSnippetItem(pl);
              };
            })(v));
          }

          var rems2 = $(".ui-snippet-item-remove");
          rems2.click(
              function(e) {
                 e.preventDefault();
                 e.stopPropagation();
                 var element = $(this).parent().parent();
                 var pos = element.parent().find(".owl-item").index(element);
                 ns.extApi.removeItem(pos);
              });
        }
      },
      openSnippet: function(idx) {
        // open top menu on save mode
        ns.uiApi.toggleCreate(false);
        ns.uiApi.toggleVMenu(false);

        ns.extApi.openSnippet(idx);
        // refresh snippets on open
        ns.uiApi.refreshItemsUiList();

        // hide top line
        findById("menu-dddd").dispatchEvent(new Event("click"));
      },
      closeCurrentSnippet: function() {
        // Notify extension about snippet close for the current tab
        ns.extApi.closeCurrentSnippet();
      },
      toggleVMenu: function(flag) {
        return;
        if (isSnippetor)
          return;
        var vertMenu = findById("snippetor-vertical-menu");
        if (flag == undefined) {
          flag = vertMenu.style.display == "none";
        }
        vertMenu.style.display = flag ? "block" : "none";
      },
      toggleSave: function(flag, f2) {
        return;
        if (isSnippetor)
          return;
        var saveIt = findById("snippetor-save-action");
        saveIt.style.display = flag ? "block" : "none";

        var editS = findById("snippetor-edit-action");
        editS.style.display = f2 ? "block" : "none";
        // working state
        if (flag || f2)
          ns.extApi.state = "edit";
      },
      toggleCreate: function(flag) {
        return;
        if (isSnippetor)
          return;
        var closeIt = findById("snippetor-create-action");
        closeIt.style.display = flag ? "block" : "none";
        var inputWrapper = findById("snippetor-input-action-wrapper");
        inputWrapper.style.display = flag ? "block" : "none";
        // waiting for craete
        if (flag)
          ns.extApi.state = "create";
        else {
          console.log(inputWrapper);
          inputWrapper.value = "";
        }
      },
      ///////////////////////////////////////////////
      //
      // Snippet list change observer
      //
      ///////////////////////////////////////////////
      //
      // Close current snippet on save
      //
      onSaveSnippet: function(payload) {
        console.log("SAVE SNIPPET HANDLE WIT CLOSE ");

        // Remove snippet from the menu list, because it is not draft anymore
        ns.extApi.snippetsList[payload.working] = null;
        if (ns.extApi.wsid == payload.working) {
          $(".snippetor-ui a.close").trigger("click");
        }


        // Remove snippet from the menu list, because it is not draft anymore
        ns.extApi.onSaveSnippet(payload.working);

        this.refreshVertMenu();
      },
      //
      // Add snippet to the list of snippets on create
      //
      onCreateSnippet: function(payload) {
        // refresh the list of snippets in the menu
        ns.extApi.snippetsList[payload.working] = payload.snippet;
        this.refreshVertMenu();
      },
      onEditStateSnippet: function(payload) {
        ns.extApi.snippetsList[payload.working].isModified = payload.isModified;

        if (payload.working == ns.extApi.wsid) {
          var isMod = payload.isModified ? true : false;
          ns.uiApi.toggleSave(isMod, !isMod);
          //this.changeEditMode(payload.isModified);
        }
      },
      onOpenSnippet: function(payload) {
        // refresh the list of snippets in the menu
        // TODO: split draft snippets and opened snippets
        if (payload.working != ns.extApi.wsid) {
          ns.extApi.snippetsList[payload.working] = payload.snippet;
          // refresh vertical menu items
          this.refreshVertMenu();
        }
      },
      ///////////////////////////////////////////////
      //
      // Handle working snippet changes
      //
      ///////////////////////////////////////////////
      onAddItem: function(payload, index) {
          ns.uiApi.refreshItemsUiList();
      },
      onMoveItem: function(payload) {
          ns.uiApi.refreshItemsUiList();
      },
      onRemoveItem: function(payload) {
          ns.uiApi.refreshItemsUiList();
      },
      onUpdateItem: function(payload) {
          console.log("TODO: check if it bubble dialog is opened");
      },
      clearIndexedMenu: function() {
        $(".snippetor_alert").remove();
      }
    };

    $('\
    <div class="snippetor-ui">\
        <div class="navigation">\
            <div class="brand">\
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANjSURBVHic7Zo/TBRBGMUfd+ZCTpHDgiCHFRUmJlZUGAs1JtJIQkF1HSWNdMaCisqEigorKjo7sZBKEggV0UL+FMQYGhMtjIbkYnwWe0fWudm9vZ359pvEe8kWu9l9b97v7jZ7MztAEv+zStoD0FYfgPYAtNUHoD0AbfUBaA9AWyECaAD4BuA9gBcAhiTDBgJ8EPoA4E5s/xWARamw0L4Bt/BveQD4IRkYGoAnlmNvJANDB/AT0b1ATCEBqAB4YBx7B6ApGeoDQA3APICqo899AFeNY0lf/2ors+aYCZB02cZIfmKkfZLDDl5r7FTdct5wK4ut7DGXDr7Kt7VPspLT79jwOrScU4mVb8sJQt7yN0ke0a6ZHH6TFp9Vy3kzCZlHrTEVAiCt/FuS5RyeSxYvG8hyK8MbBN/lB3OUB8ltw+s7k0EO+oQQQvkqyQvDb6vLNd4g9FLevEn5KA+SsxbPRobr0iAcZ4WQZYDjguVBct3w/ENyNOO13SCMuwKQLg+SZ4bvQY/XO0HoVv5EuPyUxXslh08ahJM0CJrlQXLZ4j+d0ysXBJtRvaDyILlj+H8lWXLw6wah49Fas/wQyaaRsenBtycIZvnTgsqD5JwlZ8GTdxqE0zgErfIguWHk/CY54tE/EwSQnFAoD5LnRtauQEY3CBMguadQ/q4l77lQVhqEPa0pscInPxNFnZ/ArpFzrvDpX/4EwGJvgiOMbnhxbSiUv7wJFg1hweI/p1HeBNCGIP0gtGn4Nhk9FBVRPvVBqAgIJUaPu3HtaJVPAgDK/RmatvgtF1Q+858hSQgrFq8prfLdALQh+JwQOTA8zoTLO02I+IYwymi6K651zfJZAYB+JkUblmtnBct7mxSNQ3CZFt8yrrlgNCXuu7zItLgrhDKjxY64trXL5wGQBYJtRce2preUI1t9aSwLBNua3qrlvMkcuUEsjra3XpbHD43zjnNmBrM8boOQ9IJEnZ1ac8gM5gWJ9lYjOc/kO/qiBcAjx8xqK7PmOv4iXpR8DeBpbP8XgBsQfvkpq6SnxCoAHhrHdhBIeUAewD0A14xjOnN/CZIGEM7kZ4KkAVw39j8C+CKc2ZOuCPs/A/AZwGMAtwG8FM7rWSG+Ll+oQnpXWEV9ANoD0FYfgPYAtNUHoD0Abf0FwgHK57mLy2kAAAAASUVORK5CYII=">\
                    <span>Snippetor</span>\
                    <ul class="dropdown-menu ui-listofsnippets">\
                        <li><a id="createNewSnippetButton"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGKSURBVFiF7Ze7SgNREIa/31tpNE8gYpNCUbC0CNiopaSxsjAGfItY+gQ29jY+goVYaWMhSpr0NkkkaiPGjIUHicteszmYwh+GhT2zM98Mc85yMDMGDagBbcBy2AtQCcYOM7mkP5LUAe6BK4bTArAP9IA9M7uI9Q7pgAH1NPRhBpRdjCfgI6kTE0NWmUaHwA1wLqkS5eQT4A3YToLwAfDunmvAOnACtCIhPMzAJPBI+O54DfpPjbp8M/uUtAysAjMDS1XgIOg/cgAH0QfuBt9J2grz9TmEqZTYAUlF4AwoZozdAapm1olzGv8OuAp2fQGMfwcAJJWAQsbYXTNr5AaQtMT33zHrlu1JKplZMxeAmTUlbQDzGQGek5KnAnAQtxmTp9b4D6GkAnDKcAfRkZl1cwEA08Ccsyzqu29jlWYIW8BOxuSpNf4zACBpEZiNWH4ws543AHcQNWJ868CxNwB3EG0SvQsuh02eCsBBXOdJEqc/H8J/AB+X0yiVgRUz+z3Mnq7nYdYGasF8X7nuZR2F1xitAAAAAElFTkSuQmCC"> <b>Create New Snippet</b></a></li>\
                        <li><a href="https://snipettor.firebaseapp.com"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAA3XAAAN1wFCKJt4AAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAuFJREFUeNrsmz9IHEEUhz89ELloPBvRO62sLAKprAyp0sRKSGF1XUoruxCIlV2wskpnZSc2MY0QiKBYmaSIfwqLYBNIiigRJGRTZAzL8G5vnd3ZmWPmwRV37Pze/b7Z2dt9b64vSRJCjn4CjwggAogAIoAIIIZf0Qa+Ax+Al8BwaAA+AUnq9SakJTAFPNA++xkSgKfCZ29DOv23tdP/EhgIxfwAcKUB2OqFn8EG8AyoF9R5DNzLefrXVc6G61kbB76o2ToARgporWmznwAt4bgRlStRucd9MJ+kIJiu2RNN66jDMjnQjnMCYQI4FmYsAeYM9KYFnVXhuLkOOY/Vd3Ju/h1QM9BcygmypnI4g9DN/KCh7o6m9SMD5KArCLbM14FrTW+zy5jKIUwIF6kyzAPMC5rtHOOyIJyUCaFp0TzAuqb5BxjLObYbhKbv5gHONd3DO463BqEJnFo2PyNorxjoZEE4NYFQhXmAZUF/1lCrNAitiswD7Gr63wo+n3SD0PLJ/DBwo+XYKEHXGEILOKvIPMCCkGexJO0sCGcShKrNo2p96Ty/gdES9XNDmHRgHuBCy7VnIUc3CJMA+w7MPxTyvbCUKwvCvquiqFfFTxdLYE/Lc+Fg9v8vgaovgqPqgme7+eHtL8GioL/g2nyVN0Ibmu4N5fb/vL4b7Fe3u2nNXZ/M234YmhX0lisy78UT4YqgNeOjeVsFkUNN49yyea+qQmOq3JUev+67+TKLom1h7LxF81Yqw0XK4pvamGvMG6o91xuo8a/ZkT5+p9fM54UgdXSknt6SQW7nrbE8EKSe3qpw3LRBXi+ao7dxl/b4kXCRMglv2uMShE4bJFrCjK0VyOnNBonbaJC9Rea5AOBJwZzebJHJE1ua+SsC2/l1qQHY9ukL2q4JPgKGfKn9uYjXwvqfCukMuK+9/wx89QlAzbL+e+CXuhYMAa+Ajz4B6Iv/Gww8IoAIIAKIACKAkOPvAO4obVrKJnSqAAAAAElFTkSuQmCC"> <b>Snippetor Website</b></a></li>\
                        <li><hr></li>\
                    </ul>\
                </div>\
            <div class="createNewSnippetForm">\
                    <form>\
                        <input type="text" placeholder="Snippet Draft Name..">\
                        <input type="button" value="Create" disabled>\
                        <a class="cancel">Cancel</a>\
                    </form>\
                </div>\
            <div class="activePage">\
                    <a class="saveButton">Save</a>\
                    <div class="comments">\
                        <a class="goLeft"></a><!--\
                     --><div class="area">\
                            <div class="owl-carousel owl-theme">\
                            </div>\
                        </div><!--\
                     --><a class="goRight"></a>\
                    </div>\
                </div>\
            <div class="pull-right closeActivePage">\
                <a class="top-buttons index"></a>\
                <a class="top-buttons minimize"></a>\
                <a class="top-buttons close"></a>\
            </div>\
            <div class="clearfix"></div>\
        </div>\
    </div>').appendTo(document.body);

    $('<ul id="snippetor-vertical-menu"></ul>').appendTo(document.body);

    // Close icon
    var snippetorCloseAction = findById("snipettor-close-action", "click", function(e) {
      e.stopPropagation();
      ns.uiApi.closeCurrentSnippet();
    }); // On click handler

    var saveAction = $(".snippetor-ui .saveButton").click(function(e) {
      e.stopPropagation();
      ns.extApi.saveSnippet();
    });

    var editAction = $(".snippetor-ui .editButton").click( function(e) {
      e.stopPropagation();
      ns.extApi.saveSnippet();
    });

    // once more
    setTimeout(function() {
      subscribeForTheLineDblClick();
/////////////////////////// TBD CACHE INITIAL STATE IN THE EXTENSION

      $(".snippetor-ui div.activePage").hide();
      $(".snippetor-ui .closeActivePage").hide();
      $(".snippetor-ui .createNewSnippetForm").hide();
      $(".snippetor-ui div.navigation").width("20px");
      $(".snippetor-ui .brand").removeClass("active-vmenu");
////////////////////////////

      $(".snippetor-ui .brand").click(function(e, postProcess) {
        e.preventDefault();
        //
        // If UI has working snippet we do not need to show
        // drop down menu
        if ((ns.extApi.wsid != null && ns.extApi.wsid >= 0) || ns.uiApi.creating) {
          if ($(this).hasClass("active-vmenu")) {
            $(this).removeClass("active-vmenu");

            (ns.uiApi.creating ?
              $(".snippetor-ui .createNewSnippetForm").hide() :
              $(".snippetor-ui div.activePage").hide());
            $(".snippetor-ui .closeActivePage").hide()
            $(".snippetor-ui div.navigation").width("20px");

ns.extApi.updateSnippetState({collapsed: true});
          } else {
            // add class
            $(this).addClass("active-vmenu");
            (ns.uiApi.creating ?
              $(".snippetor-ui .createNewSnippetForm").fadeIn() :
              $(".snippetor-ui div.activePage").show());
            $(".snippetor-ui .closeActivePage").show();
            $(".snippetor-ui div.navigation").removeAttr("style");
ns.extApi.updateSnippetState({collapsed: false});
          }
        } else {
          // Drop down menu is required when there is no opened snippet
          if ($(this).hasClass("active")) {
            $(this).children(".dropdown-menu").fadeOut(200);
            $(this).removeClass("active");
          } else {
            $(this).children(".dropdown-menu").fadeIn(200);
            $(this).addClass("active");
          }
        }

        if (typeof(postProcess) == "function") {
          postProcess();
        }
      }).mouseleave(function() {
        $(this).children(".dropdown-menu").fadeOut(100);
        $(this).removeClass("active");
      })


      $(".snippetor-ui #createNewSnippetButton").click(function(e) {
        e.preventDefault();
        // switch into another mode
        $(".snippetor-ui .brand").trigger("click");
        ns.uiApi.creating = true;


        $(".snippetor-ui .brand .dropdown-menu").fadeOut(100);
        $(".snippetor-ui .activePage").hide();
        $(".snippetor-ui .brand").removeClass("active");
        $(".snippetor-ui .createNewSnippetForm").fadeIn();
        // show menu again
        $(".snippetor-ui .brand").trigger("click");
        $(".snippetor-ui .createNewSnippetForm input[type=text]").focus();
        return false;
      })

      $(".snippetor-ui .createNewSnippetForm .cancel").click(function(e) {
        e.preventDefault();
        // hide create form
        // $(".snippetor-ui .createNewSnippetForm").hide();
        // trigger top menu hiding
        $(".snippetor-ui .brand").trigger("click",
          function() {
            // trigger no show top menu on brand menu
            ns.uiApi.creating = false;
          });
        return false;
      });

      $(".snippetor-ui .createNewSnippetForm input[type=button]")
      .click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        //
        var value = $(".snippetor-ui .createNewSnippetForm input[type=text]").val();

        $(".snippetor-ui .brand").trigger("click",
          function() {
            // trigger no show top menu on brand menu
            ns.uiApi.creating = false;
          });

        // create snippet
        ns.extApi.createSnippet(value, function() {
          ns.uiApi.refreshItemsUiList();
          $(".snippetor-ui .brand").trigger("click");
        });
        // prevent button
        return false;
      });


      $(".snippetor-ui .createNewSnippetForm input[type=text]").keyup(function() {
        if ($(this).val() != 0) {
          $(".snippetor-ui .createNewSnippetForm input[type=button]").prop("disabled", false);
        } else {
          $(".snippetor-ui .createNewSnippetForm input[type=submit]").prop("disabled", true);
        }
      })

      $(".snippetor-ui a.index").click(function() {

        var data = ns.extApi.getIndexedData();

        function show_dropdown_menu(payload, parent) {
          var htmlView = "";
          if (payload && payload.length > 0) {
            for (var x = 0; x< payload.length; ++x) {
              htmlView += "<tr info='" + x + "'>\
                <td >X</td>\
                <td class='snipettor-indexing-dropdown'>" + payload[x].prefix  + "::" + payload[x].name + "</td>\
                <td >)))</td>\
              </tr>";
            }
          }
          else {
          for (var x in payload) {
            htmlView += "<tr info='" + x + "'>\
              <td >X</td>\
              <td class='snipettor-indexing-dropdown'>" + x + "</td>\
              <td >)))</td>\
            </tr>";
          }
         }

          var header = "";
          if (!parent) {
            header = '<span class="snippetor_vclosebtn" style="float:right;" onclick="this.parentElement.style.display=\'none\';">&times;</span> \
                      <button id="snipettor-indexing" style="margin-bottom: 10px; background-color:#39A9DB; border: 1px solid #39A9DB; color:white;border-radius: 2px;">index current file</button>\
                      '; // header
          }
          // Attach the dropdown menu
          $('\
            <div class="snippetor_alert">\
              <table style="width:100%; max-height:400px; overflow:scroll; border: 1px dashed white;">\
                ' + header + '\
                ' + htmlView + '\
                </table> \
                </div>')
          .appendTo(document.body);

          $(".snippetor_alert").mouseover(function() {
              $(".snippetor_alert").stop().fadeIn();
          });

          $(".snippetor_alert").mouseenter(function() {
            $(".snippetor_alert").stop().fadeIn();
          });

          $(".snippetor_alert").mouseleave(function() {
            $(".snippetor_alert").fadeOut(700, function() {
                ns.uiApi.clearIndexedMenu();
            });
          });

          $(".snipettor-indexing-dropdown").click(function() {
            var info = $(this).parent().attr("info");
            if (info && payload[info]) {
              //                                td -> tr-> table-> div
              show_dropdown_menu(payload[info], $(this).parent().parent().parent());
            }
          });

          // Assign handlers
          if (!parent)
            $("#snipettor-indexing").click(function() {
              var stack = [];
              $(".stx-line").each(function(idx, item) {
                  stack.push($(item).text());
                });

              Parser.init(stack);
              var payload = [];
              var data2 = Parser.parse();
              function push_recursion(prefix, data) {
                for (var x in data.classes) {
                  data.classes[x].prefix = prefix;
                  payload.push(data.classes[x]);
                  // apply for subclasses
                  if (data.classes[x].classes) {
                    console.log("> " + prefix + "::" + data.classes[x].name);
                    push_recursion(prefix + "::" + data.classes[x].name, data.classes[x]);

                  }
                }
                for (var y in data.namespaces) {
                  var new_prefix = prefix;
                  if (data.namespaces[y].value)
                    new_prefix += "::" + data.namespaces[y].value;
                    console.log("> " + new_prefix);
                  push_recursion(new_prefix, data.namespaces[y]);
                }
              }
              push_recursion("", data2);
              ns.extApi.updateIndexedData(window.location.href.split("?")[0], payload, ns.uiApi.clearIndexedMenu);
            });
        }

        show_dropdown_menu(ns.extApi.getIndexedData(), null);
      });

      $(".snippetor-ui a.minimize").click(function() {
        $(".snippetor-ui div.activePage").hide();
        $(".snippetor-ui .closeActivePage").hide();
        $(".snippetor-ui .createNewSnippetForm").hide();
        $(".snippetor-ui div.navigation").width("20px");
        $(".snippetor-ui .brand").removeClass("active-vmenu");

        ns.extApi.updateSnippetState({collapsed: true});
      });

      $(".snippetor-ui a.close").click(function() {
        $(".snippetor-ui div.activePage").hide();
        $(".snippetor-ui .closeActivePage").hide();
        $(".snippetor-ui .createNewSnippetForm").hide();
        $(".snippetor-ui div.navigation").width("20px");
        $(".snippetor-ui .brand").removeClass("active-vmenu");

        ns.extApi.unsubscribeSnippet();
        // hide current bubble ui on snippet close
        ns.uiBubbleApi.removeBubble();
      });

      // Make init
      ns.uiApi.init();
    }, 200);


  }); // document ready

})($);
