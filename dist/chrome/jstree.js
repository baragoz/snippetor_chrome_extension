/*globals jQuery, define, module, exports, require, window, document, postMessage */
(function(jQuery) {
    "use strict";
    $(document).ready(function() {

        var ns = {
            extApi: {},
            uiApi: {}
        };
        var isSnippetor = (window.location.href.indexOf("http://localhost:8000") == 0 || window.location.href.indexOf("https://snipettor.firebaseapp.com") == 0);
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
                } else {
                    alert("Unknow snippet action: " + payload.action);
                }
            });

            window.addEventListener("onSnippetItemChange", function(evt) {
                var payload = evt.detail;
                if (payload.action == "add") {
                    ns.uiApi.onAddItem(payload);
                } else if (payload.action == "remove") {
                    ns.uiApi.onRemoveItem(payload);
                } else if (payload.action == "change") {
                    ns.uiApi.onChangeItem(payload);
                } else if (payload.action == "move") {
                    ns.uiApi.onMoveItem(payload);
                } else if (payload.action == "update") {
                    ns.uiApi.onUpdateItem(payload);
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

            } else if (payload.action == "unsubscribe") {
                chrome.runtime.sendMessage({
                    type: "closeCurrentSnippet",
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


        function subscribeForTheLineDblClick() {
            if (window.location.href.indexOf("https://github.com") == 0) {
                subscribeForTheLineDblClick_GitHub();
            } else if (window.location.href.indexOf("https://cs.chromium.org") == 0) {
                setTimeout(function() {
                    subscribeForTheLineDblClick_GoogleCodeSearch();
                }, 1200);
            }  else if (window.location.href.indexOf("https://bitbucket.org") == 0) {
                setTimeout(function() {
                    subscribeForTheLineDblClick_Bitbucket();
                }, 1200);
            } else if (window.location.href.indexOf("https://umlsync-6e2da.firebaseapp.com") == 0) {
                setTimeout(function() {
                    subscribeForTheLineDblClick_UML();
                }, 1200);
            }
        }

        function subscribeForTheLineDblClick_UML() {
            var elements = document.getElementsByClassName("us-element-border");

            function snippetorSelectHandler(e) {
                var uid = this.id;
                var xxx = window.location.href;
                ns.uiApi.showBubble(e, xxx, uid);
            }

            console.log("GOT THE NUMBER OF ELEMENTS: " + elements.length);
            var updatedElementsCount = 0;
            for (var idx = 0; idx < elements.length; ++idx) {
                if (!elements[idx].classList.contains("snipettor-event-observer")) {
                    ++updatedElementsCount;
                    elements[idx].className += " snipettor-event-observer";
                    elements[idx].addEventListener('dblclick', snippetorSelectHandler);
                }
            }
            // show bubble UI on lines availability
            if (elements.length > 0 || ns.uiApi.showInitialBubbleRequestDone == false)
                setTimeout(function() {
                    ns.uiApi.showInitialBubble();
                }, 200);

            console.log("updatedElementsCount: " + updatedElementsCount);
        }


        function subscribeForTheLineDblClick_GoogleCodeSearch() {
            var lines = document.getElementsByClassName("lineNumber");

            function snippetorSelectHandler(e) {
                var line = parseInt(this.innerHTML);
                var xxx = window.location.href;
                xxx = xxx.split("?")[0];
                ns.uiApi.showBubble(e, xxx, line);
            }
            console.log("GOT THE NUMBER OF ELEMENTS: " + lines.length);
            var updatedElementsCount = 0;
            for (var idx = 0; idx < lines.length; ++idx) {
                if (!lines[idx].classList.contains("snipettor-event-observer")) {
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

            console.log("updatedElementsCount: " + updatedElementsCount);
        }

        function subscribeForTheLineDblClick_GitHub() {
            var lines = document.getElementsByClassName("blob-num js-line-number");

            function snippetorSelectHandler(e) {
                var line = this.attributes["data-line-number"].value;
                var xxx = window.location.href;
                xxx = xxx.split("#")[0];
                ns.uiApi.showBubble(e, xxx, line);
            }
            console.log("GOT THE NUMBER OF ELEMENTS: " + lines.length);
            var updatedElementsCount = 0;
            for (var idx = 0; idx < lines.length; ++idx) {
                if (!lines[idx].classList.contains("snipettor-event-observer")) {
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
            console.log("updatedElementsCount: " + updatedElementsCount);
        } // subscribeForTheLineDblClick

        function subscribeForTheLineDblClick_Bitbucket() {
            var wrapper = document.getElementsByClassName("linenodiv");
            if (wrapper.length == 0 || wrapper[0].childNodes.length == 0)
              return;
            var pre = wrapper[0].childNodes[0];
            var lines = pre.childNodes;

            function snippetorSelectHandler(e) {
                var line = this.innerHTML;
                var xxx = window.location.href;
                xxx = xxx.split("#")[0];
                ns.uiApi.showBubble(e, xxx, line);
            }
            console.log("GOT THE NUMBER OF ELEMENTS: " + lines.length);
            var updatedElementsCount = 0;
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
            console.log("updatedElementsCount: " + updatedElementsCount);
        } // subscribeForTheLineDblClick

        window.subscribeForTheLineDblClick = subscribeForTheLineDblClick;
        window.addEventListener("load", function() {
            subscribeForTheLineDblClick();
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
            workingSnippetId: null,
            extensionWorkingItemId: null,
            state: "idle",
            isWorkingSnippet: function(payload) {
              return (payload.working == this.workingSnippetId);
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
                    ns.extApi.workingSnippetId = response.working;
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
                ns.extApi.items = ns.extApi.snippetsList[idx].items;
                ns.extApi.workingSnippetId = idx;
            },
            openSnippetItem: function(id, callback) {
                ns.uiApi.showInitialBubbleRequestDone = false;
                ns.extApi.snippetsList[ns.extApi.workingSnippetId].workingItem = id;

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
            addNewItem: function(url, line, comment, callback) {
                chrome.runtime.sendMessage({
                    type: "addNewItem",
                    payload: {
                        url: url,
                        line: line,
                        comment: comment
                    }
                }, function(response) {
                    console.log("item added");
                    ns.extApi.items.push({
                        url: url,
                        line: line,
                        comment: comment
                    });
                    ns.extApi.snippetsList[ns.extApi.workingSnippetId].items.push({
                        url: url,
                        line: line,
                        comment: comment
                    });
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
                this.snippetsList[this.workingSnippetId].items[idx].comment = comment;
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
                var item = ns.extApi.items[payload.oldIndex];
                ns.extApi.items.splice(payload.oldIndex, 1);
                ns.extApi.items.splice(payload.newIndex, 0, item);

                ns.extApi.snippetsList[ns.extApi.workingSnippetId].items.splice(payload.oldIndex, 1);
                ns.extApi.snippetsList[ns.extApi.workingSnippetId].items.splice(payload.newIndex, 0, item);
            },
            closeCurrentSnippet: function() {
                chrome.runtime.sendMessage({
                    type: "closeCurrentSnippet",
                    payload: ns.extApi.workingSnippetId
                }, function(response) {
                    console.log("snippet has been unsubscribed");
                });
                // reset state to the IDLE
                ns.extApi.workingSnippetId = null;
                ns.extApi.items = [];
                ns.extApi.extensionWorkingItemId = undefined;
                ns.extApi.state = "idle";
            },
            init: function(callback) {
                chrome.runtime.sendMessage({
                    type: "initialItems",
                    payload: {}
                }, function(response) {
                    console.log("IIIIIIIIIIIIIIIII");
                    console.dir(response);
                    ns.extApi.workingSnippetId = response.working;
                    ns.extApi.items = (response.working != undefined && response.working >= 0) ? response.snippets[response.working].items : [];
                    ns.extApi.extensionWorkingItemId = (response.working != undefined && response.working >= 0) ? response.snippets[response.working].workingItem : null;
                    ns.extApi.snippetsList = response.snippets;
                    if (callback)
                        callback(response);
                });
            }
        };

        // all the code below extend the standard UI of the page
        // So, we do not need to extend the UI of snipettor page
        if (isSnippetor)
            return;

        ns.uiApi = {
            bubbleElement: null,
            url: null,
            //
            // Cache bubble UI element
            //
            _getBubbleUi: function() {
                if (this.bubbleElement == null) {
                    // Cache bubble dialog
                    var that = this;
                    // Cache BUBBLE UI element and manage hide/show behavior
                    this.bubbleElement = findById("snipettor-bubble-dialog");
                    findById("snipettor-bubble-dialog-textarea").value = that.currentItem.comment || "";
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
                    // Subscrbe for CANCEL button
                    findById("snipettor-bubble-dialog-cancel", "click", function(e) {
                        findById("snipettor-bubble-dialog-textarea").value = "";
                        that.bubbleElement.style.display = "none";
                    });
                } else {
                    findById("snipettor-bubble-dialog-textarea").value = this.currentItem.comment || "";
                }
                return this.bubbleElement;
            },
            //
            // Show an initial bubble of the snippet page open
            //
            showInitialBubble: function() {
                if (ns.extApi.workingSnippetId == undefined || ns.extApi.workingSnippetId == null)
                    return;

                if (this.showInitialBubbleRequestDone)
                    return;

                var itemIdx = ns.extApi.snippetsList[ns.extApi.workingSnippetId].workingItem;
                var item = ns.extApi.snippetsList[ns.extApi.workingSnippetId].items[itemIdx];
                // skip bubble show on empy element
                if (itemIdx == undefined  || item == undefined)
                    return;
                // Handle navigation
                this._NextPrevHelper(true, true);

                if (item.url.indexOf("https://github.com/") == 0) {
                    var line = findById("L" + item.line);
                    console.log("GOT LINE ???? ");
                    console.dir(line);
                    if (!line)
                      return;

                    this.showInitialBubbleRequestDone = true;
                    var absPos = line.getBoundingClientRect();
                    console.dir(line);
                    // Cache current item position
                    this.currentItem = item;
                    this.currentItem.idx = itemIdx;
                    // Handle UI element position
                    var bubbleElement = this._getBubbleUi();
                    bubbleElement.style.top = (absPos.top + 20 + document.scrollingElement.scrollTop) + "px";
                    bubbleElement.style.left = (absPos.left + 10 + document.scrollingElement.scrollLeft) + "px";
                    bubbleElement.style.display = "block";
                } else if (item.url.indexOf("https://cs.chromium.org/") == 0) {
                    var line = findById("n" + item.line);
                    this.showInitialBubbleRequestDone = true;
                    var absPos = line.getBoundingClientRect();
                    console.dir(absPos);
                    // Cache current item index
                    this.currentItem = item;
                    this.currentItem.idx = itemIdx;
                    // Handle UI element position
                    var bubbleElement = this._getBubbleUi();
                    bubbleElement.style.top = (absPos.top + 20 + document.scrollingElement.scrollTop) + "px";
                    bubbleElement.style.left = (absPos.left + 10 + document.scrollingElement.scrollLeft) + "px";
                    bubbleElement.style.display = "block";
                } else if (item.url.indexOf("https://umlsync-6e2da.firebaseapp.com") == 0) {
                    var line = findById(item.line);
                    console.log("LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL: " + item.line);
                    console.dir(line);

                    if (!line) {
                      var that = this;
                      setTimeout(function() {
                        that.showInitialBubble();
                      }, 1000);
                      return;
                    }

                    this.showInitialBubbleRequestDone = true;
                    var absPos = line.getBoundingClientRect();
                    console.dir(absPos);
                    // Cache current item index
                    this.currentItem = item;
                    this.currentItem.idx = itemIdx;

                    // Handle UI element position
                    var bubbleElement = this._getBubbleUi();
                    bubbleElement.style.top = (absPos.top + 20 + document.scrollingElement.scrollTop) + "px";
                    bubbleElement.style.left = (absPos.left + 10 + document.scrollingElement.scrollLeft) + "px";
                    bubbleElement.style.display = "block";
                }
            },
            _NextPrevHelper: function(isSavedItem, isInitial) {
              // Handle Next/Prev elements visibility
              var next_element = findById("snipettor-bubble-dialog-next"),
                  prev_element = findById("snipettor-bubble-dialog-prev");
                              if (isSavedItem) {
                                next_element.style.display = "block";
                                next_element.disabled = (ns.extApi.extensionWorkingItemId == ns.extApi.items.length -1);
                                prev_element.style.display = "block";
                                prev_element.disabled = (ns.extApi.extensionWorkingItemId <= 0);
                              }
                              else {
                                next_element.style.display = "none";
                                prev_element.style.display = "none";
                              }
                  if (isInitial) {
                    findById("snipettor-bubble-dialog-next", "click", function(e) {
                      e.stopPropagation();
                      if (ns.extApi.extensionWorkingItemId < ns.extApi.items.length -1) {
                        ns.extApi.extensionWorkingItemId++
                        ns.extApi.openSnippetItem(ns.extApi.extensionWorkingItemId);
                      }
                    });
                    findById("snipettor-bubble-dialog-prev", "click", function(e) {
                      e.stopPropagation();
                      if (ns.extApi.extensionWorkingItemId > 0) {
                        ns.extApi.extensionWorkingItemId--;
                        ns.extApi.openSnippetItem(ns.extApi.extensionWorkingItemId);
                      }
                    });
                  }
            },
            //
            // Show input bubble at UI position
            //
            showBubble: function(evt, url, line) {
                // Do nothing if snippet was not named
                if (ns.extApi.workingSnippetId == undefined || ns.extApi.workingSnippetId == null)
                    return;

                this.currentItem = {
                    url: url,
                    line: line
                };

                this._NextPrevHelper(false);

                var bubbleElement = this._getBubbleUi();
                bubbleElement.style.top = (evt.pageY + 20) + "px";
                bubbleElement.style.left = (evt.pageX + 10) + "px";
                bubbleElement.style.display = "block";
                evt.stopPropagation();
            },
            updateItemComment: function(idx, comment) {
                // Do nothing if snippet was not named
                if (ns.extApi.workingSnippetId == undefined || ns.extApi.workingSnippetId == null)
                    return;
                ns.extApi.updateItemComment(idx, comment);
            },
            snippetsList: null,
            current_index: 0,
            showNewItem: function(url, line, comment, isInit, skipSubsciption, isActive) {
                this.current_index++;
                //
                // Hide previous active items
                //
                if (isActive) {
                  var activeItems = document.getElementsByClassName("snipettor-active-menu-item");
                  for (var i=0; i< activeItems.length; ++i)
                    activeItems[i].classList.remove("snipettor-active-menu-item");
                }

                var payload = url.length > 20 ? url.substr(url.length - 20) : url;
                this.snippetsList = findById("menu-snippets-list");
                this.snippetsList.innerHTML += '<li><a class="snippetor-navigation-item '+ (isActive ? "snipettor-active-menu-item" : "")+ '" aria-label="' + url + '" id="snippetor-active-item-' + this.current_index + '">' + payload + ':' + line + '</a></li>';
                // skip subscription on init
                console.log("ADD NEW ITEM: " + line);
                if (!isInit)
                    ns.extApi.addNewItem(url, line, comment);
                if (!skipSubsciption) {
                    var navigation = document.getElementsByClassName("snippetor-navigation-item");
                    // replace on map function
                    for (var v = 0; v < navigation.length; ++v) {
                        navigation[v].addEventListener('click', (function(payload) {
                            var pl = payload;
                            return function(e) {
                                e.stopPropagation();
                                ns.extApi.openSnippetItem(pl);
                            };
                        })(v));
                    }
                    if (typeof SnippetSortable !== 'undefined') {
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

                }
                console.log("Show new item: " + url);
            },
            init: function() {
                ns.extApi.init(function() {
                    if (ns.extApi.workingSnippetId != null && ns.extApi.workingSnippetId != undefined) {
                        ns.uiApi.refreshItemsUiList();
                        // Force change
                        var isMod = ns.extApi.snippetsList[ns.extApi.workingSnippetId].isModified;
                        console.log("IS MODIFIED ? " + isMod);
                        ns.uiApi.toggleSave(isMod, !isMod);
                        ns.uiApi.toggleCreate(false);
                    } else {
                        ns.uiApi.toggleSave(false, false);
                        ns.uiApi.toggleCreate(false);
                    }

                    ns.uiApi.toggleVMenu(false);
                    //
                    // Work-around for a S-menu toggle: we need to toggle vertical when user do nothing with snippet
                    // and horizontal otherwise.
                    // So we need to minimize menu on start in case which described above
                    //
                    if (ns.extApi.workingSnippetId == null && ns.extApi.workingSnippetId == undefined) {
                        if (!isSnippetor) {
                            snippetorToggleAction.style.width = "42px";
                            snippetorToggleAction.style.height = "49px";
                        }
                    }
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
              }
              else {
                $("#snippetor-edit-action").show();
                $("#snippetor-save-action").hide();
              }
            },
            refreshVertMenu: function() {
                if (isSnippetor)
                    return;
                var vertMenu = findById("snippetor-vertical-menu");
                if (vertMenu) {
                    // Empty previous value
                    vertMenu.innerHTML = '<li><a id="snipettor-create-item">Create</a></li>';

                    for (var t in ns.extApi.snippetsList) {
                        var snippet = ns.extApi.snippetsList[t];
                        if (snippet) {
                            vertMenu.innerHTML += '<li><a snippet_item="' + t + '" class="snipettor-select-menu-item">' + (snippet.title || 'no title') + '</a></li>';
                        }
                    }
                    findById("snipettor-create-item", "click", function(e) {
                        ns.uiApi.toggleCreate(true);
                        ns.uiApi.toggleVMenu(false);
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
                snippetsList.innerHTML = '';
                if (ns.extApi.workingSnippetId != null && ns.extApi.workingSnippetId != undefined) {
                    // update according to the modified state
                    var isMod = ns.extApi.snippetsList[ns.extApi.workingSnippetId].isModified;
                    ns.uiApi.toggleSave(isMod, !isMod);
                    // Add all snippet items
                    for (var x in ns.extApi.items) {
                        console.log("POST INIT: []" + x);
                        var tmp = ns.extApi.items[x];
                        var isActive = x == ns.extApi.extensionWorkingItemId;
                        ns.uiApi.showNewItem(tmp.url, tmp.line, tmp.data, true, false, isActive);
                    }
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
                // hide top line
                findById("menu-dddd").dispatchEvent(new Event("click"));

                // hide all menus
                ns.uiApi.toggleSave(false, false);
                ns.uiApi.toggleCreate(false);
                ns.uiApi.toggleVMenu(false);

                this.snippetsList = findById("menu-snippets-list");
                this.snippetsList.innerHTML = "";
                if (this.bubbleElement)
                    this.bubbleElement.style.display = "none";

                // Notify extension about snippet close for the current tab
                ns.extApi.closeCurrentSnippet();
            },
            toggleVMenu: function(flag) {
                if (isSnippetor)
                    return;
                var vertMenu = findById("snippetor-vertical-menu");
                if (flag == undefined) {
                    flag = vertMenu.style.display == "none";
                }
                vertMenu.style.display = flag ? "block" : "none";
            },
            toggleSave: function(flag, f2) {
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

                if (ns.extApi.isWorkingSnippet(payload))
                  this.closeCurrentSnippet();

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

              if (payload.working == ns.extApi.workingSnippetId) {
                var isMod = payload.isModified ? true : false;
                ns.uiApi.toggleSave(isMod, !isMod);
                //this.changeEditMode(payload.isModified);
              }
            },
            onOpenSnippet: function(payload) {
                // refresh the list of snippets in the menu
                // TODO: split draft snippets and opened snippets
                if (payload.working != ns.extApi.workingSnippetId) {
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
            onAddItem: function(payload) {
                ns.extApi.snippetsList[payload.working].items.splice(payload.index, 0, payload.item);
                ns.extApi.items.splice(payload.index, 0, payload.item);
                // update snippet item UI if it was current item
                if (payload.working == ns.extApi.workingSnippetId) {
                    // add to the end of the existing list
                    if (payload.index == ns.extApi.snippetsList[payload.working].items.length - 1) {
                        this.showNewItem(payload.item.url, payload.item.line, payload.item.comment, true, false);
                    } else {
                        // inser into the middle therefore we need to refresh list
                        ns.uiApi.refreshItemsUiList();
                    }
                }
            },
            onUpdateItem: function(payload) {
                // update value
                ns.extApi.snippetsList[payload.working].items[payload.payload.idx].comment = payload.payload.item.comment;
                ns.extApi.items[payload.payload.idx].comment = payload.payload.item.comment;
                // TODO: update bubbleUI
            },
            onMoveItem: function(payload) {
                console.dir(payload);
                console.dir(ns.extApi.snippetsList);
                console.dir(ns.extApi.items);
                // Update snipettor cached data
                var item = ns.extApi.snippetsList[payload.working].items[payload.payload.oldIndex];
                console.dir(item);
                ns.extApi.snippetsList[payload.working].items.splice(payload.payload.oldIndex, 1);
                ns.extApi.snippetsList[payload.working].items.splice(payload.payload.newIndex, 0, item);

                // update snippet item UI if it was current item
                if (payload.working == ns.extApi.workingSnippetId) {
                    // swap status if it is the same items
                    ns.extApi.items.splice(payload.payload.oldIndex, 1);
                    ns.extApi.items.splice(payload.payload.newIndex, 0, item);
                    console.dir(ns.extApi.items);
                    // inser into the middle therefore we need to refresh list
                    ns.uiApi.refreshItemsUiList();
                }
            },
            onRemoveItem: function(payload) {
                ns.extApi.snippetsList[payload.working].items.splice(payload.payload.index, 1);
                if (payload.working == ns.extApi.workingSnippetId) {
                    ns.extApi.items.splice(payload.payload.index, 1);
                    ns.uiApi.refreshItemsUiList();
                    console.log("TODO: check if it bubble dialog is opened");
                }
            },
            onUpdateItem: function(payload) {
                ns.extApi.snippetsList[payload.working].items[payload.payload.index] = payload.item;
                if (payload.working == ns.extApi.workingSnippetId) {
                    ns.extApi.items[payload.payload.index] = payload.item;
                    console.log("TODO: check if it bubble dialog is opened");
                }
            }
        };

        $('\
<ul id="menu-dddd">\
  <li><a id="snippetor-toggle-menu" class="active">S</a></li>\
  <li><a id="snippetor-save-action" style="display:none;">Save</a></li>\
  <li><a id="snippetor-edit-action" style="display:none;">Edit</a></li>\
	<li><a id="snippetor-create-action" >Create</a></li>\
	<li><a id="snippetor-input-action-wrapper"><input id="snippetor-input-action" placeholder="Draft name please ..."></a></li>\
	<ul id="menu-snippets-list">\
	</ul>\
  <li style="float:right"><a id="snipettor-close-action">[x]</a></li>\
</ul>\
<div id="snipettor-bubble-dialog">\
  <textarea id="snipettor-bubble-dialog-textarea"></textarea>\
  <br>\
  <button id="snipettor-bubble-dialog-prev" style="float:left;">Prev</button>\
  <button id="snipettor-bubble-dialog-next" style="float:left;">Next</button>\
  <button id="snipettor-bubble-dialog-save">Save</button>\
  <button id="snipettor-bubble-dialog-cancel">Cancel</button>\
</div>').appendTo(document.body);

        $('<ul id="snippetor-vertical-menu"></ul>').appendTo(document.body);

        ns.uiApi.init();

        // Close icon
        var snippetorCloseAction = findById("snipettor-close-action", "click", function(e) {
            e.stopPropagation();
            ns.uiApi.closeCurrentSnippet();
        }); // On click handler

        var saveAction = findById("snippetor-save-action", "click", function(e) {
            e.stopPropagation();
            ns.extApi.saveSnippet();
        });

        var editAction = findById("snippetor-edit-action", "click", function(e) {
            e.stopPropagation();
            ns.extApi.saveSnippet();
        });


        var snippetTitle = findById("snippetor-input-action-wrapper", "click", function(e) {
            e.stopPropagation();
        });

        var xTitle = findById("snippetor-input-action", "click", function(e) {
            e.stopPropagation();
        });

        var snipettorCreateAction = findById("snippetor-create-action", "click", function(e) {
            e.stopPropagation();
            var inTitle = findById("snippetor-input-action");
            if (inTitle && inTitle.value) {
                //ns.extApi.saveSnippet();
                ns.extApi.createSnippet(inTitle.value, function() {
                    // activate save and hide create
                    ns.uiApi.toggleSave(true, false);
                    ns.uiApi.toggleCreate(false);
                });
            } else {
                snipettorCreateAction.style.disabled = true;
            }
        });

        // Show/hide top menu
        var snippetorToggleAction = findById("menu-dddd", "click", function(e) {
            if (ns.extApi.state == "idle") {
                ns.uiApi.toggleVMenu();
            } else {
                ns.uiApi.toggleVMenu(false);
                //var rrr = document.getElementById("menu-dddd");
                snippetorToggleAction.style.height = "49px";
                if (snippetorToggleAction.style.width == "42px")
                    snippetorToggleAction.style.width = "100%";
                else
                    snippetorToggleAction.style.width = "42px";
            }
        });

        // once more
        subscribeForTheLineDblClick();
    }); // document ready

})($);
