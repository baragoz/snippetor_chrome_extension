'use strict';

var cachedTabs = [];

chrome.tabs.onRemoved.addListener(function(tabId) {
  cachedTabs[tabId] = false;
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'loading') return;

    chrome.tabs.executeScript(tabId, {
        code: 'var injected = window.octotreeInjected; window.octotreeInjected = true; console.log("INJECTING DATA ' + tabId + '"); if (window.subscribeForTheLineDblClick) window.subscribeForTheLineDblClick(); injected;',
        runAt: 'document_start'
    }, function(res) {
        if (chrome.runtime.lastError || // don't continue if error (i.e. page isn't in permission list)
            res[0]) // value of `injected` above: don't inject twice
            return;

        var cssFiles = ['jstree.css', 'owl.carousel.min.css', 'owl.theme.default.min.css'];

        var jsFiles = ['jquery.js', 'jquery-ui.js', 'owl.carousel.min.js', 'SnippetSortable.min.js', 'jstree.js'];

        cachedTabs[tabId] = true;

        eachTask([function(cb) {
            return eachItem(cssFiles, inject('insertCSS'), cb);
        }, function(cb) {
            return eachItem(jsFiles, inject('executeScript'), cb);
        }]);

        function inject(fn) {
            return function(file, cb) {
                chrome.tabs[fn](tabId, {
                    file: file,
                    runAt: 'document_start'
                }, cb);
            };
        }
    });
});

var workingEnvironment = [];
var tabsUiStates = [];
var snippetsList = [];

chrome.runtime.onMessage.addListener(function(req, sender, sendRes) {
    var handler = {
        requestPermissions: function requestPermissions() {
            var urls = (req.urls || []).filter(function(url) {
                return url.trim() !== '';
            }).map(function(url) {
                if (url.slice(-2) === '/*') return url;
                if (url.slice(-1) === '/') return url + '*';
                return url + '/*';
            });

            if (urls.length === 0) {
                sendRes(true);
                removeUnnecessaryPermissions();
            } else {
                chrome.permissions.request({
                    origins: urls
                }, function(granted) {
                    sendRes(granted);
                    removeUnnecessaryPermissions();
                });
            }
            return true;

            function removeUnnecessaryPermissions() {
                var whitelist = urls.concat(['https://github.com/*', 'https://gitlab.com/*']);
                chrome.permissions.getAll(function(permissions) {
                    var toBeRemovedUrls = permissions.origins.filter(function(url) {
                        return !~whitelist.indexOf(url);
                    });

                    if (toBeRemovedUrls.length) {
                        chrome.permissions.remove({
                            origins: toBeRemovedUrls
                        });
                    }
                });
            }
        },
        onSaveSnippetDraft: function(success) {
            console.log("SNIPPET SAVED");
            sendRes({
                notified: true
            });
            console.log("DRAFT ID == " + workingEnvironment[sender.tab.id]);
            this._broadcastTabs(sender.tab.id, "onSnippetChange", {
                action: "save",
                working: workingEnvironment[sender.tab.id]
            });
            // TODO: action depends on preferences; we could add UID only on save
            snippetsList[workingEnvironment[sender.tab.id]] = null;
            // sender tab is moving to the search or open state on snippet and snippet draft save
            workingEnvironment[sender.tab.id] = null;
            tabsUiStates[sender.tab.id] = {collapsed: true};
            return true;
        },
        onRemoveSnippetDraft: function(payload) {
            // notify all opened tabs about snippet remove (please do not miss with save cancelation)
        },
        // Open the first item of the opened snippet
        onOpenSnippet: function(payload2) {
            var payload = payload2.payload;

            var pos = snippetsList.length;
            if (payload2.index != undefined) {
                payload = snippetsList[payload2.index];
                pos = payload2.index;
            }
            // there is no snippets to show
            if (!payload || payload.items.length == 0) {
                sendRes({
                    status: "failed"
                });
                return;
            }

            // snippets data
            payload.workingItem = 0;
            if (payload2.index == undefined)
                snippetsList.push(payload);

            if (payload && payload.items) {
                var url = payload.items[0].url;
                if (url.indexOf("https://cs.chromium.org") == 0)
                  url = url + "?l=" + payload.items[0].line;
                if (url.indexOf("https://github.com") == 0)
                    url = url + "#L" + payload.items[0].line;
                if (url.indexOf("https://bitbucket.org") == 0)
                    url = url + "?fileviewer=file-view-default#-" + payload.items[0].line;
                chrome.tabs.create({
                    'url': url,
                    active: true
                }, function(tab) {
                    workingEnvironment[tab.id] = pos;
                    // just opened snippet in a new tab
                    tabsUiStates[tab.id] = {collapsed: false};
                });
                // prevent re-open notification
                if (payload2.index == undefined)
                    this._broadcastTabs(-1, "onSnippetChange", {
                        action: "open",
                        working: pos,
                        snippet: payload
                    });
                sendRes({
                    status: "opening"
                });
                return true;
            }
            sendRes({
                status: "failed"
            });
            return false;
        },
        //
        // Save current snippet request
        //
        saveSnippet: function gotReportFromTheTab(data) {
            var snipettorURL = "https://snipettor.firebaseapp.com";
            var pos = workingEnvironment[sender.tab.id];
            if (pos != undefined && pos >= 0) {
                chrome.tabs.create({
                    'url': snipettorURL + "/edit/draft",
                    active: true
                }, function(tab) {
                    // Assign opened tab as snippet handler
                    workingEnvironment[tab.id] = pos;
                    // useless assignment but ...
                    tabsUiStates[tab.id] = {collapsed: false};
                });
                sendRes({
                    status: "saving"
                });
            }
        },
        //
        // Get initial items for a current tab
        //
        initialItems: function(payload) {
            // has opened snippet
            var pos = workingEnvironment[sender.tab.id];
            var state = tabsUiStates[sender.tab.id];
            if (pos != undefined && pos >= 0) {
                return sendRes({
                    working: pos,
                    snippets: snippetsList,
                    state: state
                });
            }
            console.log("GET INITIAL ITEMS EMPTY");
            sendRes({
                snippets: snippetsList
            });
        },
        openSnippet: function(index) {
            // TODO: think about synchronization of this list
            workingEnvironment[sender.tab.id] = index;
            tabsUiStates[sender.tab.id] = {collapsed : false};
        },
        createSnippet: function(payload) {
            console.log("CREATE SNIPPET !Q!!!! " + snippetsList.length);
            // init snippet by id
            workingEnvironment[sender.tab.id] = snippetsList.length;
            tabsUiStates[sender.tab.id] = {collapsed: false};
            snippetsList.push({
                title: payload.title,
                isModified: payload.isModified,
                items: []
            });
            sendRes({
                working: workingEnvironment[sender.tab.id]
            });

            // -1 - Broadcast for all tabs
            this._broadcastTabs(-1, "onSnippetChange", {
                action: "create",
                snippet: snippetsList[snippetsList.length - 1],
                working: snippetsList.length - 1
            });
        },
        updateSnippetState: function(state) {
          if (state && state.collapsed != undefined ) {
            tabsUiStates[sender.tab.id] = {collapsed: state.collapsed};
          }
        },
        updateSnippet: function(payload) {


        },
        closeCurrentSnippet: function(data) {
            workingEnvironment[sender.tab.id] = null;
            tabsUiStates[sender.tab.id] = {collapsed: true};
        },
        unsubscribeSnippet: function(data) {
            workingEnvironment[sender.tab.id] = null;
        },
        subscribeSnippet: function(data) {
          for (var s in snippetsList)
			        if (snippetsList[s] && snippetsList[s].uid == data.payload.uid) {
                  workingEnvironment[sender.tab.id] = s;
                  // suppose that we can subscribe for snippet when UI is visible
                  tabsUiStates[sender.tab.id] = {collapsed: false};
			        }
        },

        editCurrentSnippet: function(data) {
          var pos = workingEnvironment[sender.tab.id];
          if (pos == null || pos < 0)
            return;

          this._broadcastTabs(-1, "onSnippetChange", {
                action: "edit-state",
                working: pos,
                isModified: true
          });
        },
        _broadcastTabs: function(senderId, action, payload) {
            var code = "window.dispatchEvent(new CustomEvent(\"" + action + "\", {detail: " + JSON.stringify(payload) + "}));";
            console.log("dispatch: " + code);
            for (var x in cachedTabs) {
                var tabId = parseInt(x);
                // if tab is still active
                if (tabId != senderId && cachedTabs[tabId])
                    chrome.tabs.executeScript(tabId, {
                        code: code
                    }, function(result) {});
            }
        },
        openItem: function(itemId) {
            console.log("openItem: " + itemId);
            var pos = workingEnvironment[sender.tab.id];
            if (snippetsList[pos].items.length > itemId) {
                console.dir(snippetsList[pos]);
                // Update current working item
                snippetsList[pos].workingItem = itemId;
                var x_url = snippetsList[pos].items[itemId].url;
                if (x_url.indexOf("https://github.com") == 0) {
                    x_url = x_url + "#L" + snippetsList[pos].items[itemId].line;
                } else if (x_url.indexOf("https://cs.chromium.org") == 0) {
                    x_url = x_url + "?l=" + snippetsList[pos].items[itemId].line;
                } else if (x_url.indexOf("https://bitbucket.org") == 0) {
                    var pref = x_url.split("/").pop();
                    x_url = x_url + "?fileviewer=file-view-default#"
                            + pref + "-" + parseInt(snippetsList[pos].items[itemId].line);
                }

                chrome.tabs.update({
                    'url': x_url,
                    active: true
                }, function(x) {
                    console.dir(arguments);
                });
            }


            sendRes(true);
        },
        addNewItem: function(payload) {
            var pos = workingEnvironment[sender.tab.id];
            if (pos != undefined) {
                snippetsList[pos].items.splice(payload.index, 0, payload.item);
                sendRes(true);

                // Send item added event for all tabs
                this._broadcastTabs(sender.tab.id, "onSnippetItemChange", {
                    action: "add",
                    item: payload.item,
                    working: pos,
                    index: payload.index
                });
                return true;
            }
            sendRes(false);
            return false;
        },
        updateItem: function(payload) {
            var pos = workingEnvironment[sender.tab.id];
            if (pos != undefined) {
                // TODO: update another options here
                console.dir(payload);
                snippetsList[pos].items[payload.idx].comment = payload.item.comment;
                sendRes(true);

                // Send item added event for all tabs
                this._broadcastTabs(-1, "onSnippetItemChange", {
                    action: "update",
                    working: pos,
                    payload: payload
                });
                return true;
            }
            sendRes(false);
            return false;
        },
        moveItem: function(payload) {
            var pos = workingEnvironment[sender.tab.id];
            if (pos != undefined) {
                var item = snippetsList[pos].items[payload.oldIndex];
                snippetsList[pos].items.splice(payload.oldIndex, 1);
                snippetsList[pos].items.splice(payload.newIndex, 0, item);
                sendRes(true);

                // Send item added event for all tabs
                this._broadcastTabs(sender.tab.id, "onSnippetItemChange", {
                    action: "move",
                    working: pos,
                    payload: payload
                });
                return true;
            }
            sendRes(false);
            return false;
        },
        removeItem: function(index) {
            var pos = workingEnvironment[sender.tab.id];
            if (pos != undefined) {
                snippetsList[pos].items.splice(index, 1);
                sendRes(true);

                // Send item added event for all tabs
                this._broadcastTabs(sender.tab.id, "onSnippetItemChange", {
                    action: "remove",
                    working: pos,
                    payload: index
                });
                return true;
            }
            sendRes(false);
            return false;
        },
        removeIndexedItem: function(payload) {
          var pos = workingEnvironment[sender.tab.id];
          if (pos != undefined) {
              delete snippetsList[pos].indexed[payload.url];
              sendRes(true);

              // Send item added event for all tabs
              this._broadcastTabs(sender.tab.id, "onSnippetChange", {
                  action: "remove-index",
                  working: pos,
                  payload: payload
              });
              return true;
          }
          sendRes(false);
          return false;
        },
        addIndexedItem: function(payload) {
          var pos = workingEnvironment[sender.tab.id];
          if (pos != undefined) {
              if (!snippetsList[pos].indexed)
                snippetsList[pos].indexed = {};
              snippetsList[pos].indexed[payload.url] = payload.item;
              sendRes(true);
              console.dir(snippetsList);

              // Send item added event for all tabs
              this._broadcastTabs(sender.tab.id, "onSnippetChange", {
                  action: "add-index",
                  working: pos,
                  payload: payload
              });
              return true;
          }
          sendRes(false);
          return false;
        }
    };
    console.log("HANDLE :" + req.type);
    return handler[req.type](req.payload);
});

function eachTask(tasks, done) {
    (function next() {
        var index = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

        if (index === tasks.length) done && done();
        else tasks[index](function() {
            return next(++index);
        });
    })();
}

function eachItem(arr, iter, done) {
    var tasks = arr.map(function(item) {
        return function(cb) {
            return iter(item, cb);
        };
    });
    return eachTask(tasks, done);
}
