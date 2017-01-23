'use strict';

var cachedTabs = [];



chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status !== 'loading') return;

  chrome.tabs.executeScript(tabId, {
    code: 'var injected = window.octotreeInjected; window.octotreeInjected = true; console.log("INJECTING DATA '+ tabId + '"); injected;',
    runAt: 'document_start'
  }, function (res) {
    if (chrome.runtime.lastError || // don't continue if error (i.e. page isn't in permission list)
    res[0]) // value of `injected` above: don't inject twice
      return;

    var cssFiles = ['jstree.css', 'octotree.css'];

    var jsFiles = ['jquery.js', 'jquery-ui.js', 'jstree.js'];

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
    saveSnippet: function gotReportFromTheTab(data) {
      for (var r in cachedTabs) {
        console.log("DO SOME STUFF");
        console.dir(r);
        chrome.tabs.executeScript(parseInt(r), {
          code: 'console.log("BROADCAST !!!!");'
        });
      }
      return true;
    },
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
    createSnippet: function(payload) {
      console.log("CREATE SNIPPET !Q!!!! " + snippetsList.length );
      // init snippet by id
      workingEnvironment[sender.tab.id] = snippetsList.length;
      snippetsList.push({title: payload.title, items:[]});
      sendRes({working: workingEnvironment[sender.tab.id]});
    },
    closeSnippet: function(data) {
      workingEnvironment[sender.tab.id] = null;
    },
    addNewItem: function(payload) {
       var pos = workingEnvironment[sender.tab.id];
       console.log("POSITION IS: " + pos);
       console.dir(payload);
       if (pos != undefined) {
         console.log("ADD PAYLOAD");
         snippetsList[pos].items.push(payload);
         sendRes(true);
         return true;
       }
      sendRes(false);
       return false;

    },
    openItem: function(itemId) {
      console.log(itemId);
      var pos = workingEnvironment[sender.tab.id];
      if (snippetsList[pos].items.length > itemId) {
        console.dir(snippetsList[pos]);
        var x_url = snippetsList[pos].items[itemId].url;
        var xx_url = x_url.substr(0, x_url.lastIndexOf(":")) + "#L" + x_url.substr(x_url.lastIndexOf(":") + 1);
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
