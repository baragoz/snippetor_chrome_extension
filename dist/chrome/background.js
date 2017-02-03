'use strict';

var cachedTabs = [];

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status !== 'loading') return;

  chrome.tabs.executeScript(tabId, {
    code: 'var injected = window.octotreeInjected; window.octotreeInjected = true; console.log("INJECTING DATA '+ tabId + '"); if (window.subscribeForTheLineDblClick) window.subscribeForTheLineDblClick(); injected;',
    runAt: 'document_start'
  }, function (res) {
    if (chrome.runtime.lastError || // don't continue if error (i.e. page isn't in permission list)
    res[0]) // value of `injected` above: don't inject twice
      return;

    var cssFiles = ['jstree.css', 'octotree.css'];

    var jsFiles = ['jquery.js', 'jquery-ui.js', 'SnippetSortable.min.js', 'jstree.js'];

    cachedTabs[tabId] = true;

    eachTask([function (cb) {
      return eachItem(cssFiles, inject('insertCSS'), cb);
    }, function (cb) {
      return eachItem(jsFiles, inject('executeScript'), cb);
    }]);

    function inject(fn) {
      return function (file, cb) {
        chrome.tabs[fn](tabId, { file: file, runAt: 'document_start' }, cb);
      };
    }
  });
});

var workingEnvironment = [];
var snippetsList = [];

chrome.runtime.onMessage.addListener(function (req, sender, sendRes) {
  var handler = {
    requestPermissions: function requestPermissions() {
      var urls = (req.urls || []).filter(function (url) {
        return url.trim() !== '';
      }).map(function (url) {
        if (url.slice(-2) === '/*') return url;
        if (url.slice(-1) === '/') return url + '*';
        return url + '/*';
      });

      if (urls.length === 0) {
        sendRes(true);
        removeUnnecessaryPermissions();
      } else {
        chrome.permissions.request({ origins: urls }, function (granted) {
          sendRes(granted);
          removeUnnecessaryPermissions();
        });
      }
      return true;

      function removeUnnecessaryPermissions() {
        var whitelist = urls.concat(['https://github.com/*', 'https://gitlab.com/*']);
        chrome.permissions.getAll(function (permissions) {
          var toBeRemovedUrls = permissions.origins.filter(function (url) {
            return ! ~whitelist.indexOf(url);
          });

          if (toBeRemovedUrls.length) {
            chrome.permissions.remove({ origins: toBeRemovedUrls });
          }
        });
      }
    },
    onSaveSnippetDraft: function(success) {
      console.log("SNIPPET SAVED");
      sendRes({notfied: true});
      console.log("DRAFT ID == " + workingEnvironment[sender.tab.id]);
      this._broadcastTabs(sender.tab.id, "onSnippetChange", {action: "save", working: workingEnvironment[sender.tab.id]});
      // TODO: action depends on preferences; we could add UID only on save
      snippetsList[workingEnvironment[sender.tab.id]] = null;
      // sender tab is moving to the search or open state on snippet and snippet draft save
      workingEnvironment[sender.tab.id] = null;
      return true;
    },
    onRemoveSnippetDraft: function(payload) {
      // notify all opened tabs about snippet remove (please do not miss with save cancelation)
    },
    // Open the first item of the opened snippet
    onOpenSnippet: function(payload) {
      var pos = snippetsList.length;
      // there is no snippets to show
      if (payload.items.length == 0) {
        sendRes({status:"failed"});
        return;
      }

      // snippets data
      payload.workingItem = 0;
      snippetsList.push(payload);
      if (payload && payload.items) {
        chrome.tabs.create({'url': payload.items[0].url + "#L"+payload.items[0].line, active:true}, function(tab) {
          workingEnvironment[tab.id] = pos;
        });
        this._broadcastTabs(-1, "onSnippetChange", {action: "open", working: pos, snippet: payload});
        sendRes({status:"opening"});
        return true;
      }
      sendRes({status:"failed"});
      return false;
    },
    //
    // Save current snippet request
    //
    saveSnippet: function gotReportFromTheTab(data) {
      var snipettorURL =  "http://localhost:8000";
      var pos = workingEnvironment[sender.tab.id];
      if (pos != undefined && pos >= 0) {
        chrome.tabs.create({'url': snipettorURL + "?save=draft", active:true}, function(tab) {
          // Assign opened tab as snippet handler
          workingEnvironment[tab.id] = pos;
        });
        sendRes({status:"saving"});
      }
    },
    //
    // Get initial items for a current tab
    //
    initialItems: function(payload) {
      console.log("GET INITIAL ITEMS: " + sender.tab.id);
      // has opened snippet
      console.dir(workingEnvironment);
      var pos = workingEnvironment[sender.tab.id];
      if (pos != undefined && pos >= 0) {
        return sendRes({working: pos, snippets: snippetsList});
      }
      console.log("GET INITIAL ITEMS EMPTY");
      sendRes({snippets: snippetsList});
    },
    openSnippet: function(index) {
      // TODO: think about synchronization of this list
      workingEnvironment[sender.tab.id] = index;
    },
    createSnippet: function(payload) {
      console.log("CREATE SNIPPET !Q!!!! " + snippetsList.length );
      // init snippet by id
      workingEnvironment[sender.tab.id] = snippetsList.length;
      snippetsList.push({title: payload.title, items:[]});
      sendRes({working: workingEnvironment[sender.tab.id]});

      // -1 - Broadcast for all tabs
      this._broadcastTabs(-1, "onSnippetChange", {action: "create", snippet: snippetsList[snippetsList.length-1], working: snippetsList.length-1});
    },
    updateSnippet: function(payload) {

    },
    closeCurrentSnippet: function(data) {
      workingEnvironment[sender.tab.id] = null;
    },
    _broadcastTabs: function(senderId, action, payload) {
      var code = "window.dispatchEvent(new CustomEvent(\"" + action + "\", {detail: " +JSON.stringify(payload)+ "}));";
      console.log("dispatch: " + code);
      for (var x in cachedTabs) {
        var tabId = parseInt(x);
        if (tabId != senderId)
          chrome.tabs.executeScript(tabId, {
            code:code
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
          x_url = x_url+ "#L" + snippetsList[pos].items[itemId].line;
        }
        else if (x_url.indexOf("https://cs.chromium.org") == 0) {
          x_url = x_url+ "?l=" + snippetsList[pos].items[itemId].line;
        }

        chrome.tabs.update({'url': x_url, active:true}, function(x) {
          console.dir(arguments);
        });
      }


      sendRes(true);
    },
    addNewItem: function(payload) {
      console.log("ADD NEW ITEM: ");
      console.dir(payload);
       var pos = workingEnvironment[sender.tab.id];
       console.log("POSITION IS: " + pos);
       console.dir(payload);
       if (pos != undefined) {
         console.log("ADD PAYLOAD");
         snippetsList[pos].items.push(payload);
         sendRes(true);

         // Send item added event for all tabs
         this._broadcastTabs(sender.tab.id, "onSnippetItemChange", {action: "add", item: payload, working:pos, index: snippetsList[pos].items.length-1});
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
        this._broadcastTabs(sender.tab.id, "onSnippetItemChange", {action: "move", working:pos, payload:payload});
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
        this._broadcastTabs(sender.tab.id, "onSnippetItemChange", {action: "remove", working:pos, payload:index});
        return true;
      }
      sendRes(false);
      return false;
    },
    updateItem: function(item) {

    }

  };
  console.log("HANDLE :" + req.type);
  return handler[req.type](req.payload);
});

function eachTask(tasks, done) {
  (function next() {
    var index = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

    if (index === tasks.length) done && done();else tasks[index](function () {
      return next(++index);
    });
  })();
}

function eachItem(arr, iter, done) {
  var tasks = arr.map(function (item) {
    return function (cb) {
      return iter(item, cb);
    };
  });
  return eachTask(tasks, done);
}
