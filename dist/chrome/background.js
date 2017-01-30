'use strict';

var cachedTabs = [];

// Create Base64 Object
var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}};

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

    var jsFiles = ['jquery.js', 'jquery-ui.js', 'jstree.js', 'Sortable.min.js'];

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
      this._broadcastTabs(-1, "onSnippetChange", {action: "save", working: workingEnvironment[sender.tab.id]});
      // TODO: action depends on preferences; we could add UID only on save
      snippetsList[workingEnvironment[sender.tab.id]] = null;
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
        var encodedString = Base64.encode(JSON.stringify(snippetsList[pos]));
        chrome.tabs.create({'url': snipettorURL + "?save="+encodedString, active:true}, function(tab) {
          console.log("SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS");
          console.dir(arguments);
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
    closeCurrentSnippet: function(data) {
      workingEnvironment[sender.tab.id] = null;
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
    swapCurrentSnippet: function(payload) {
      var pos = workingEnvironment[sender.tab.id];
      if (pos != undefined) {
        var item = snippetsList[pos].items[payload.oldIndex];
				snippetsList[pos].items.splice(payload.oldIndex, 1);
				snippetsList[pos].items.splice(payload.newIndex, 0, item);
        sendRes(true);

        // Send item added event for all tabs
        this._broadcastTabs(sender.tab.id, "onSnippetItemChange", {action: "swap", working:pos, payload:payload});
        return true;
      }
      sendRes(false);
      return false;

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
        var xx_url = x_url+ "#L" + snippetsList[pos].items[itemId].line;
        console.log(xx_url);
        chrome.tabs.update({'url': xx_url, active:true}, function(x) {
          console.dir(arguments);
        });
      }


      sendRes(true);
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
