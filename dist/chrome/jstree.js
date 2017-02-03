/*globals jQuery, define, module, exports, require, window, document, postMessage */
(function(jQuery) {
    "use strict";
    $(document).ready(function() {
        var snippetorExtensionApi;
        var isSnippetor = (window.location.href.indexOf("http://localhost") == 0);
if (!isSnippetor) {
        window.addEventListener("onSnippetChange", function(evt) {
            var payload = evt.detail;
            if (payload.action == "save") {
                snippetorUiApi.onSaveSnippet(payload);
            } else if (payload.action == "create") {
                snippetorUiApi.onCreateSnippet(payload);
            } else if (payload.action == "open") {
                snippetorUiApi.onOpenSnippet(payload);
            } else {
                alert("Unknow snippet action: " + payload.action);
            }
        });

        window.addEventListener("onSnippetItemChange", function(evt) {
            var payload = evt.detail;
            if (payload.action == "add") {
                snippetorUiApi.onAddItem(payload);
            } else if (payload.action == "remove") {
                snippetorUiApi.onRemoveItem(payload);
            } else if (payload.action == "change") {
                snippetorUiApi.onChangeItem(payload);
            } else if (payload.action == "move") {
                snippetorUiApi.onMoveItem(payload);
            } else {
                alert("Unknow snippet action: " + payload.action);
            }
        });
}

        window.addEventListener("onSnipettorAction", function(evt) {
            console.log("SAVED");
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
            } else if (payload.action == "GetInitialState") {
              console.log("GET IIIIIIIIIIIIIIIIIIIIIIII");
              snippetorExtensionApi.init(function(response){
                window.dispatchEvent(new CustomEvent("onInit", {detail: response}));
              });

            } else if (payload.action == "unsubscribe") {
              chrome.runtime.sendMessage({
                  type: "closeCurrentSnippet",
                  payload: payload.payload
              }, function(response) {
                  console.log("snippet has been unsubscribed. TODO: send a feedback message");
              });

            } else if (payload.action == "select-snippet") {
            } else if (payload.action == "update-snippet-item") {
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


        var snippetorUiApi;

        function subscribeForTheLineDblClick() {
            if (window.location.href.indexOf("https://github.com") == 0) {
                subscribeForTheLineDblClick_GitHub();
            } else if (window.location.href.indexOf("https://cs.chromium.org") == 0) {
                subscribeForTheLineDblClick_GoogleCodeSearch();
            }
        }

        function subscribeForTheLineDblClick_GoogleCodeSearch() {
            var lines = document.getElementsByClassName("lineNumber");

            function snippetorSelectHandler(e) {
                var line = parseInt(this.innerHTML);
                var xxx = window.location.href;
                xxx = xxx.split("?")[0];
                snippetorUiApi.showBubble(e, xxx, line);
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
            console.log("updatedElementsCount: " + updatedElementsCount);
        }

        function subscribeForTheLineDblClick_GitHub() {
            var lines = document.getElementsByClassName("blob-num js-line-number");

            function snippetorSelectHandler(e) {
                var line = this.attributes["data-line-number"].value;
                var xxx = window.location.href;
                xxx = xxx.split("#")[0];
                snippetorUiApi.showBubble(e, xxx, line);
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

        snippetorExtensionApi = {
            items: [],
            extensionStorageId: null,
            extensionWorkingItemId: null,
            state: "idle",
            createSnippet: function(title, callback) {
                chrome.runtime.sendMessage({
                    type: "createSnippet",
                    payload: {
                        title: title
                    }
                }, function(response) {
                    // get an id of the working snippet
                    snippetorExtensionApi.extensionStorageId = response.working;
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
                snippetorExtensionApi.items = snippetorExtensionApi.snippetsList[idx].items;
                snippetorExtensionApi.extensionStorageId = idx;
            },
            openSnippetItem: function(id, callback) {
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
                    snippetorExtensionApi.items.push({
                        url: url,
                        line: line,
                        comment: comment
                    });
                    snippetorExtensionApi.snippetsList[snippetorExtensionApi.extensionStorageId].items.push({
                        url: url,
                        line: line,
                        comment: comment
                    });
                    if (callback)
                        callback(response);
                });
            },
            moveIndex: function(payload) {
                chrome.runtime.sendMessage({
                    type: "moveItem",
                    payload: payload
                }, function(response) {
                    console.log("snippet has been updated");
                });
                // change the position of old item and new item
                var item = snippetorExtensionApi.items[payload.oldIndex];
                snippetorExtensionApi.items.splice(payload.oldIndex, 1);
                snippetorExtensionApi.items.splice(payload.newIndex, 0, item);

                snippetorExtensionApi.snippetsList[snippetorExtensionApi.extensionStorageId].items.splice(payload.oldIndex, 1);
                snippetorExtensionApi.snippetsList[snippetorExtensionApi.extensionStorageId].items.splice(payload.newIndex, 0, item);
            },
            closeCurrentSnippet: function() {
                chrome.runtime.sendMessage({
                    type: "closeCurrentSnippet",
                    payload: snippetorExtensionApi.extensionStorageId
                }, function(response) {
                    console.log("snippet has been unsubscribed");
                });
                // reset state to the IDLE
                snippetorExtensionApi.extensionStorageId = null;
                snippetorExtensionApi.items = [];
                snippetorExtensionApi.extensionWorkingItemId = undefined;
                snippetorExtensionApi.state = "idle";
            },
            init: function(callback) {
                chrome.runtime.sendMessage({
                    type: "initialItems",
                    payload: {}
                }, function(response) {
                    console.log("IIIIIIIIIIIIIIIII");
                    console.dir(response);
                    snippetorExtensionApi.extensionStorageId = response.working;
                    snippetorExtensionApi.items = (response.working != undefined && response.working >= 0) ? response.snippets[response.working].items : [];
                    snippetorExtensionApi.extensionWorkingItemId = (response.working != undefined && response.working >= 0) ? response.snippets[response.working].workingItem : null;
                    snippetorExtensionApi.snippetsList = response.snippets;
                    if (callback)
                        callback(response);
                });
            }
        };

        // all the code below extend the standard UI of the page
        // So, we do not need to extend the UI of snipettor page
        if (isSnippetor)
          return;

        snippetorUiApi = {
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
                    // Subscribe for SAVE button
                    findById("snipettor-bubble-dialog-save", "click", function(e) {
                        // read current value and reset input
                        var r = findById("snipettor-bubble-dialog-textarea").value;
                        findById("snipettor-bubble-dialog-textarea").value = "";
                        console.log("SAVE BUBBLE !!!: " + that.currentItem.line)
                        snippetorUiApi.showNewItem(that.currentItem.url, that.currentItem.line, r);
                        that.bubbleElement.style.display = "none";
                    });
                    // Subscrbe for CANCEL button
                    findById("snipettor-bubble-dialog-cancel", "click", function(e) {
                        findById("snipettor-bubble-dialog-textarea").value = "";
                        that.bubbleElement.style.display = "none";
                    });
                }
                return this.bubbleElement;
            },
            //
            // Show input bubble at UI position
            //
            showBubble: function(evt, url, line) {
                // Do nothing if snippet was not named
                if (snippetorExtensionApi.extensionStorageId == undefined || snippetorExtensionApi.extensionStorageId == null)
                    return;

                this.currentItem = {
                    url: url,
                    line: line
                };

                var bubbleElement = this._getBubbleUi();
                bubbleElement.style.top = (evt.pageY + 20) + "px";
                bubbleElement.style.left = (evt.pageX + 10) + "px";
                bubbleElement.style.display = "block";
                evt.stopPropagation();
            },
            snippetsList: null,
            current_index: 0,
            showNewItem: function(url, line, comment, isInit, skipSubsciption) {
                this.current_index++;

                var payload = url.length > 20 ? url.substr(url.length - 20) : url;
                this.snippetsList = findById("menu-snippets-list");
                this.snippetsList.innerHTML += '<li><a class="snippetor-navigation-item" aria-label="' + url + '" id="snippetor-active-item-' + this.current_index + '">' + payload + ':' + line + '</a></li>';
                // skip subscription on init
                console.log("ADD NEW ITEM: " + line);
                if (!isInit)
                    snippetorExtensionApi.addNewItem(url, line, comment);
                if (!skipSubsciption) {
                    var navigation = document.getElementsByClassName("snippetor-navigation-item");
                    // replace on map function
                    for (var v = 0; v < navigation.length; ++v) {
                        navigation[v].addEventListener('click', (function(payload) {
                            var pl = payload;
                            return function(e) {
                                e.stopPropagation();
                                snippetorExtensionApi.openSnippetItem(pl);
                            };
                        })(v));
                    }
                    if (typeof SnippetSortable !== 'undefined') {
                    SnippetSortable.create(this.snippetsList, {
                        delay: 100,
                        onEnd: function(evt) {
                            snippetorExtensionApi.moveIndex({
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
                snippetorExtensionApi.init(function() {
                    if (snippetorExtensionApi.extensionStorageId != null && snippetorExtensionApi.extensionStorageId != undefined) {
                        snippetorUiApi.refreshItemsUiList();
                        snippetorUiApi.toggleSave(true);
                        snippetorUiApi.toggleCreate(false);

                    } else {
                        snippetorUiApi.toggleSave(false);
                        snippetorUiApi.toggleCreate(false);
                    }

                    snippetorUiApi.toggleVMenu(false);
                    //
                    // Work-around for a S-menu toggle: we need to toggle vertical when user do nothing with snippet
                    // and horizontal otherwise.
                    // So we need to minimize menu on start in case which described above
                    //
                    if (snippetorExtensionApi.extensionStorageId == null && snippetorExtensionApi.extensionStorageId == undefined) {
                        if (!isSnippetor) {
                            snippetorToggleAction.style.width = "42px";
                            snippetorToggleAction.style.height = "49px";
                        }
                    }
                    snippetorUiApi.refreshVertMenu();
                });
            },
            refreshVertMenu: function() {
                if (isSnippetor)
                    return;
                var vertMenu = findById("snippetor-vertical-menu");
                if (vertMenu) {
                    // Empty previous value
                    vertMenu.innerHTML = '<li><a id="snipettor-create-item">Create</a></li>';

                    for (var t in snippetorExtensionApi.snippetsList) {
                        var snippet = snippetorExtensionApi.snippetsList[t];
                        if (snippet) {
                            vertMenu.innerHTML += '<li><a snippet_item="' + t + '" class="snipettor-select-menu-item">' + (snippet.title || 'no title') + '</a></li>';
                        }
                    }
                    findById("snipettor-create-item", "click", function(e) {
                        snippetorUiApi.toggleCreate(true);
                        snippetorUiApi.toggleVMenu(false);
                        // hide top line
                        findById("menu-dddd").dispatchEvent(new Event("click"));
                    });

                    var snippetDrafts = document.getElementsByClassName("snipettor-select-menu-item");
                    for (var x = 0; x < snippetDrafts.length; ++x) {
                        snippetDrafts[x].addEventListener("click", function(e) {
                            var index = parseInt(this.attributes["snippet_item"].value);
                            console.log("ITEM IS:" + index);
                            snippetorUiApi.openSnippet(index);
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
                if (snippetorExtensionApi.extensionStorageId != null && snippetorExtensionApi.extensionStorageId != undefined) {
                    for (var x in snippetorExtensionApi.items) {
                        console.log("POST INIT: []" + x);
                        var tmp = snippetorExtensionApi.items[x];
                        snippetorUiApi.showNewItem(tmp.url, tmp.line, tmp.data, true, false);
                    }
                }
            },
            openSnippet: function(idx) {
                // open top menu on save mode
                snippetorUiApi.toggleSave(true);
                snippetorUiApi.toggleCreate(false);
                snippetorUiApi.toggleVMenu(false);


                snippetorExtensionApi.openSnippet(idx);
                // refresh snippets on open
                snippetorUiApi.refreshItemsUiList();

                // hide top line
                findById("menu-dddd").dispatchEvent(new Event("click"));
            },
            closeCurrentSnippet: function() {
                // hide top line
                findById("menu-dddd").dispatchEvent(new Event("click"));

                // hide all menus
                snippetorUiApi.toggleSave(false);
                snippetorUiApi.toggleCreate(false);
                snippetorUiApi.toggleVMenu(false);

                this.snippetsList = findById("menu-snippets-list");
                this.snippetsList.innerHTML = "";

                snippetorExtensionApi.closeCurrentSnippet();
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
            toggleSave: function(flag) {
                if (isSnippetor)
                    return;
                var saveIt = findById("snippetor-save-action");
                saveIt.style.display = flag ? "block" : "none";
                // working state
                if (flag)
                    snippetorExtensionApi.state = "edit";
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
                    snippetorExtensionApi.state = "create";
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
                if (payload.working == snippetorExtensionApi.extensionStorageId) {
                    this.closeCurrentSnippet();
                }
                // Remove snippet from the menu list, because it is not draft anymore
                snippetorExtensionApi.snippetsList[payload.working] = null;
                this.refreshVertMenu();

            },
            //
            // Add snippet to the list of snippets on create
            //
            onCreateSnippet: function(payload) {
                // refresh the list of snippets in the menu
                snippetorExtensionApi.snippetsList[payload.working] = payload.snippet;
                this.refreshVertMenu();
            },
            onOpenSnippet: function(payload) {
                // refresh the list of snippets in the menu
                // TODO: split draft snippets and opened snippets
                if (payload.working != snippetorExtensionApi.extensionStorageId) {
                    snippetorExtensionApi.snippetsList[payload.working] = payload.snippet;
                    this.refreshVertMenu();
                }
            },
            ///////////////////////////////////////////////
            //
            // Handle working snippet changes
            //
            ///////////////////////////////////////////////
            onAddItem: function(payload) {
                snippetorExtensionApi.snippetsList[payload.working].items.splice(payload.index, 0, payload.item);
                snippetorExtensionApi.items.splice(payload.index, 0, payload.item);
                // update snippet item UI if it was current item
                if (payload.working == snippetorExtensionApi.extensionStorageId) {
                    // add to the end of the existing list
                    if (payload.index == snippetorExtensionApi.snippetsList[payload.working].items.length - 1) {
                        this.showNewItem(payload.item.url, payload.item.line, payload.item.comment, true, false);
                    } else {
                        // inser into the middle therefore we need to refresh list
                        snippetorUiApi.refreshItemsUiList();
                    }
                }
            },
            onMoveItem: function(payload) {
                console.dir(payload);
                console.dir(snippetorExtensionApi.snippetsList);
                console.dir(snippetorExtensionApi.items);
                // Update snipettor cached data
                var item = snippetorExtensionApi.snippetsList[payload.working].items[payload.payload.oldIndex];
                console.dir(item);
                snippetorExtensionApi.snippetsList[payload.working].items.splice(payload.payload.oldIndex, 1);
                snippetorExtensionApi.snippetsList[payload.working].items.splice(payload.payload.newIndex, 0, item);

                // update snippet item UI if it was current item
                if (payload.working == snippetorExtensionApi.extensionStorageId) {
                    // swap status if it is the same items
                    snippetorExtensionApi.items.splice(payload.payload.oldIndex, 1);
                    snippetorExtensionApi.items.splice(payload.payload.newIndex, 0, item);
                    console.dir(snippetorExtensionApi.items);
                    // inser into the middle therefore we need to refresh list
                    snippetorUiApi.refreshItemsUiList();
                }
            },
            onRemoveItem: function(payload) {
              snippetorExtensionApi.snippetsList[payload.working].items.splice(payload.payload.index, 1);
              if (payload.working == snippetorExtensionApi.extensionStorageId) {
                snippetorExtensionApi.items.splice(payload.payload.index, 1);
                snippetorUiApi.refreshItemsUiList();
                console.log("TODO: check if it bubble dialog is opened");
              }
            },
            onUpdateItem: function(payload) {
              snippetorExtensionApi.snippetsList[payload.working].items[payload.payload.index] = payload.item;
              if (payload.working == snippetorExtensionApi.extensionStorageId) {
                snippetorExtensionApi.items[payload.payload.index] = payload.item;
                console.log("TODO: check if it bubble dialog is opened");
              }
            }
        };

            document.body.innerHTML += '\
<ul id="menu-dddd">\
  <li><a id="snippetor-toggle-menu" class="active">S</a></li>\
  <li><a id="snippetor-save-action">Save</a></li>\
	<li><a id="snippetor-create-action" >Create</a></li>\
	<li><a id="snippetor-input-action-wrapper"><input id="snippetor-input-action" placeholder="Draft name please ..."></a></li>\
	<ul id="menu-snippets-list">\
	</ul>\
  <li style="float:right"><a id="snipettor-close-action">[x]</a></li>\
</ul>\
<div id="snipettor-bubble-dialog">\
  <textarea id="snipettor-bubble-dialog-textarea"></textarea>\
  <br>\
  <button id="snipettor-bubble-dialog-prev" style="display:none;">Prev</button>\
  <button id="snipettor-bubble-dialog-next" style="display:none;">Next</button>\
  <button id="snipettor-bubble-dialog-save">Save</button>\
  <button id="snipettor-bubble-dialog-cancel">Cancel</button>\
</div>';

            document.body.innerHTML += '<ul id="snippetor-vertical-menu"></ul>';

        snippetorUiApi.init();

        // Close icon
        var snippetorCloseAction = findById("snipettor-close-action", "click", function(e) {
            e.stopPropagation();
            snippetorUiApi.closeCurrentSnippet();
        }); // On click handler

        var saveAction = findById("snippetor-save-action", "click", function(e) {
            e.stopPropagation();
            snippetorExtensionApi.saveSnippet();
        });

        var snippetTitle = findById("snippetor-input-action-wrapper", "click", function(e) {
            e.stopPropagation();
        });

        var xTitle = findById("snippetor-input-action", "click", function(e) {
            e.stopPropagation();
        });

        var snipettorCreateAction = findById("snippetor-create-action", "click", function(e) {
            console.log("CLICKED ON CREATE: ");
            e.stopPropagation();
            var inTitle = findById("snippetor-input-action");
            if (inTitle && inTitle.value) {
                //snippetorExtensionApi.saveSnippet();
                snippetorExtensionApi.createSnippet(inTitle.value, function() {
                  // activate save and hide create
                  snippetorUiApi.toggleSave(true);
                  snippetorUiApi.toggleCreate(false);
                });
            } else {
                snipettorCreateAction.style.disabled = true;
            }
        });

        // Show/hide top menu
        var snippetorToggleAction = findById("menu-dddd", "click", function(e) {
            if (snippetorExtensionApi.state == "idle") {
                snippetorUiApi.toggleVMenu();
            } else {
                snippetorUiApi.toggleVMenu(false);
                //var rrr = document.getElementById("menu-dddd");
                snippetorToggleAction.style.height = "49px";
                if (snippetorToggleAction.style.width == "42px")
                    snippetorToggleAction.style.width = "100%";
                else
                    snippetorToggleAction.style.width = "42px";
            }
        });

        // asdads ad
        subscribeForTheLineDblClick();


    }); // document ready

})($);
