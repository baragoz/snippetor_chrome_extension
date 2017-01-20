'use strict';

var TEMPLATE = '<div>\n' + '  <nav class="octotree_sidebar">\n' + '    <a class="octotree_toggle btn">\n' + '      <div class="loader"></div>\n' + '      <span></span>\n' + '\n' + '      <div class="popup">\n' + '        <div class="arrow"></div>\n' + '        <div class="content">\n' + '          Octotree is enabled on this page. Click this button or press\n' + '          <kbd>cmd shift s</kbd> (or <kbd>ctrl shift s</kbd>)\n' + '          to show it.\n' + '        </div>\n' + '      </div>\n' + '    </a>\n' + '\n' + '    <a class="octotree_opts" href="javascript:void(0)">\n' + '      <span></span>\n' + '    </a>\n' + '\n' + '    <div class="octotree_views">\n' + '      <div class="octotree_view octotree_treeview current">\n' + '        <div class="octotree_view_header"></div>\n' + '        <div class="octotree_view_body"></div>\n' + '      </div>\n' + '\n' + '      <div class="octotree_view octotree_errorview">\n' + '        <div class="octotree_view_header"></div>\n' + '        <form class="octotree_view_body">\n' + '          <div class="message"></div>\n' + '          <div>\n' + '            <input name="token" type="text" placeholder="Paste access token here" autocomplete="off">\n' + '          </div>\n' + '          <div>\n' + '            <button type="submit" class="btn">Save</button>\n' + '            <a href="https://github.com/buunguyen/octotree#access-token" target="_blank" tabIndex="-1">Why is this required?</a>\n' + '          </div>\n' + '          <div class="error"></div>\n' + '        </form>\n' + '      </div>\n' + '\n' + '      <div class="octotree_view octotree_optsview">\n' + '        <div class="octotree_view_header">Settings</div>\n' + '        <form class="octotree_view_body">\n' + '          <div>\n' + '            <label>Site access token</label>\n' + '            <a class="octotree_help" href="https://github.com/buunguyen/octotree#settings" target="_blank" tabIndex="-1">\n' + '              <span></span>\n' + '            </a>\n' + '            <input type="text" data-store="TOKEN" data-perhost="true">\n' + '          </div>\n' + '\n' + '          <div>\n' + '            <div>\n' + '              <label>Hotkeys</label>\n' + '            </div>\n' + '            <input type="text" data-store="HOTKEYS">\n' + '          </div>\n' + '\n' + '          <div class="octotree_github_only">\n' + '            <div>\n' + '              <label>GitHub Enterprise URLs</label>\n' + '            </div>\n' + '            <textarea data-store="GHEURLS" placeholder="https://github.mysite1.com                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   https://github.mysite2.com">\n' + '            </textarea>\n' + '          </div>\n' + '\n' + '          <div class="octotree_gitlab_only">\n' + '            <div>\n' + '              <label>GitLab Enterprise URLs</label>\n' + '            </div>\n' + '            <textarea data-store="GLEURLS" placeholder="https://gitlab.mysite1.com                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   https://gitlab.mysite2.com">\n' + '            </textarea>\n' + '          </div>\n' + '          <div>\n' + '            <label><input type="checkbox" data-store="REMEMBER"> Remember sidebar visibility</label>\n' + '          </div>\n' + '\n' + '          <div>\n' + '            <label><input type="checkbox" data-store="NONCODE"> Show in non-code pages</label>\n' + '          </div>\n' + '\n' + '          <div class="octotree_github_only">\n' + '            <label><input type="checkbox" data-store="LOADALL"> Load entire tree at once</label>\n' + '          </div>\n' + '\n' + '          <div>\n' + '            <button type="submit" class="btn">Save</button>\n' + '          </div>\n' + '        </form>\n' + '      </div>\n' + '    </div>\n' + '  </nav>\n' + '</div>\n' + '';
'use strict';

var NODE_PREFIX = 'octotree';
var ADDON_CLASS = 'octotree';
var SHOW_CLASS = 'octotree-show';

var STORE = {
  TOKEN: 'octotree.access_token',
  REMEMBER: 'octotree.remember',
  NONCODE: 'octotree.noncode_shown',
  HOTKEYS: 'octotree.hotkeys',
  LOADALL: 'octotree.loadall',
  POPUP: 'octotree.popup_shown',
  WIDTH: 'octotree.sidebar_width',
  SHOWN: 'octotree.sidebar_shown',
  GHEURLS: 'octotree.gheurls.shared',
  GLEURLS: 'octotree.gleurls.shared'
};

var DEFAULTS = {
  TOKEN: '',
  REMEMBER: true,
  NONCODE: true,
  LOADALL: true,
  HOTKEYS: '⌘+⇧+s, ⌃+⇧+s',
  POPUP: false,
  WIDTH: 232,
  SHOWN: false,
  GHEURLS: '',
  GLEURLS: ''
};

var EVENT = {
  TOGGLE: 'octotree:toggle',
  LOC_CHANGE: 'octotree:location',
  LAYOUT_CHANGE: 'octotree:layout',
  REQ_START: 'octotree:start',
  REQ_END: 'octotree:end',
  OPTS_CHANGE: 'octotree:change',
  VIEW_READY: 'octotree:ready',
  VIEW_CLOSE: 'octotree:close',
  FETCH_ERROR: 'octotree:error'
};
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Adapter = function () {
  function Adapter(deps) {
    _classCallCheck(this, Adapter);

    deps.forEach(function (dep) {
      return window[dep]();
    });
    this._defaultBranch = {};
  }

  /**
   * Loads the code tree of a repository.
   * @param {Object} opts: {
   *                  path: the starting path to load the tree,
   *                  repo: the current repository,
   *                  node (optional): the selected node (null to load entire tree),
   *                  token (optional): the personal access token
   *                 }
   * @param {Function} transform(item)
   * @param {Function} cb(err: error, tree: Array[Array|item])
   */


  _createClass(Adapter, [{
    key: '_loadCodeTree',
    value: function _loadCodeTree(opts, transform, cb) {
      var _this = this;

      var folders = { '': [] };
      var $dummyDiv = $('<div/>');
      var path = opts.path;
      var repo = opts.repo;
      var node = opts.node;


      opts.encodedBranch = opts.encodedBranch || encodeURIComponent(decodeURIComponent(repo.branch));

      this._getTree(path, opts, function (err, tree) {
        if (err) return cb(err);

        _this._getSubmodules(tree, opts, function (err, submodules) {
          if (err) return cb(err);

          submodules = submodules || {};

          var nextChunk = function nextChunk() {
            var iteration = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

            var CHUNK_SIZE = 300;

            for (var i = 0; i < CHUNK_SIZE; i++) {
              var item = tree[iteration * CHUNK_SIZE + i];

              // we're done
              if (item === undefined) {
                return cb(null, folders['']);
              }

              // runs transform requested by subclass
              if (transform) {
                transform(item);
              }

              // if lazy load and has parent, prefix with parent path
              if (node && node.path) {
                item.path = node.path + '/' + item.path;
              }

              var _path = item.path;
              var type = item.type;
              var index = _path.lastIndexOf('/');
              var name = $dummyDiv.text(_path.substring(index + 1)).html(); // sanitizes, closes #9

              item.id = NODE_PREFIX + _path;
              item.text = name;
              item.icon = type; // uses `type` as class name for tree node

              if (node) {
                folders[''].push(item);
              } else {
                folders[_path.substring(0, index)].push(item);
              }

              if (type === 'tree' || type === 'blob') {
                if (type === 'tree') {
                  if (node) item.children = true;else folders[item.path] = item.children = [];
                }

                // encodes but retains the slashes, see #274
                var encodedPath = _path.split('/').map(encodeURIComponent).join('/');
                item.a_attr = {
                  href: '/' + repo.username + '/' + repo.reponame + '/' + type + '/' + repo.branch + '/' + encodedPath
                };
              } else if (type === 'commit') {
                var moduleUrl = submodules[item.path];

                if (moduleUrl) {
                  // fixes #105
                  // special handling for submodules hosted in GitHub
                  if (~moduleUrl.indexOf('github.com')) {
                    moduleUrl = moduleUrl.replace(/^git(:\/\/|@)/, window.location.protocol + '//').replace('github.com:', 'github.com/').replace(/.git$/, '');
                    item.text = '<a href="' + moduleUrl + '" class="jstree-anchor">' + name + '</a>\n                               <span>@ </span>\n                               <a href="' + moduleUrl + '/tree/' + item.sha + '" class="jstree-anchor">' + item.sha.substr(0, 7) + '</a>';
                  }
                  item.a_attr = { href: moduleUrl };
                }
              }
            }

            setTimeout(function () {
              return nextChunk(iteration + 1);
            });
          };

          nextChunk();
        });
      });
    }
  }, {
    key: '_handleError',
    value: function _handleError(jqXHR, cb) {
      var error = undefined,
          message = undefined,
          needAuth = undefined;

      switch (jqXHR.status) {
        case 0:
          error = 'Connection error';
          message = 'Cannot connect to website.\n           If your network connection to this website is fine, maybe there is an outage of the API.\n           Please try again later.';
          needAuth = false;
          break;
        case 206:
          error = 'Repo too large';
          message = 'This repository is too large to be retrieved at once.\n           If you frequently work with this repository, go to Settings and uncheck the "Load entire tree at once" option.';
          break;
        case 401:
          error = 'Invalid token';
          message = 'The token is invalid.\n           Follow <a href="' + this.getCreateTokenUrl() + '" target="_blank">this link</a>\n           to create a new token and paste it below.';
          needAuth = true;
          break;
        case 409:
          error = 'Empty repository';
          message = 'This repository is empty.';
          break;
        case 404:
          error = 'Private repository';
          message = 'Accessing private repositories requires a access token.\n           Follow <a href="' + this.getCreateTokenUrl() + '" target="_blank">this link</a>\n           to create one and paste it below.';
          needAuth = true;
          break;
        case 403:
          if (~jqXHR.getAllResponseHeaders().indexOf('X-RateLimit-Remaining: 0')) {
            // It's kinda specific for GitHub
            error = 'API limit exceeded';
            message = 'You have exceeded the GitHub API hourly limit and need GitHub access token\n             to make extra requests. Follow <a href="' + this.getCreateTokenUrl() + '" target="_blank">this link</a>\n             to create one and paste it below.';
            needAuth = true;
            break;
          } else {
            error = 'Forbidden';
            message = 'You are not allowed to access the API.\n             You might need to provide an access token.\n             Follow <a href="' + this.getCreateTokenUrl() + '" target="_blank">this link</a>\n             to create one and paste it below.';
            needAuth = true;
            break;
          }
        default:
          error = message = jqXHR.statusText;
          needAuth = false;
          break;
      }
      cb({
        error: 'Error: ' + error,
        message: message,
        needAuth: needAuth
      });
    }

    /**
     * Inits behaviors after the sidebar is added to the DOM.
     * @api public
     */

  }, {
    key: 'init',
    value: function init($sidebar) {
      $sidebar.resizable({ handles: 'e', minWidth: this.getMinWidth() }).addClass(this.getCssClass());
    }

    /**
     * Returns the CSS class to be added to the Octotree sidebar.
     * @api protected
     */

  }, {
    key: 'getCssClass',
    value: function getCssClass() {
      throw new Error('Not implemented');
    }

    /**
     * Returns the minimum width acceptable for the sidebar.
     * @api protected
     */

  }, {
    key: 'getMinWidth',
    value: function getMinWidth() {
      return 200;
    }

    /**
     * Returns whether the adapter is capable of loading the entire tree in
     * a single request. This is usually determined by the underlying the API.
     * @api public
     */

  }, {
    key: 'canLoadEntireTree',
    value: function canLoadEntireTree() {
      return false;
    }

    /**
     * Loads the code tree.
     * @api public
     */

  }, {
    key: 'loadCodeTree',
    value: function loadCodeTree(opts, cb) {
      throw new Error('Not implemented');
    }

    /**
     * Returns the URL to create a personal access token.
     * @api public
     */

  }, {
    key: 'getCreateTokenUrl',
    value: function getCreateTokenUrl() {
      throw new Error('Not implemented');
    }

    /**
     * Updates the layout based on sidebar visibility and width.
     * @api public
     */

  }, {
    key: 'updateLayout',
    value: function updateLayout(togglerVisible, sidebarVisible, sidebarWidth) {
      throw new Error('Not implemented');
    }

    /**
     * Returns repo info at the current path.
     * @api public
     */

  }, {
    key: 'getRepoFromPath',
    value: function getRepoFromPath(showInNonCodePage, currentRepo, token, cb) {
      throw new Error('Not implemented');
    }

    /**
     * Selects the file at a specific path.
     * @api public
     */

  }, {
    key: 'selectFile',
    value: function selectFile(path) {
      window.location.href = path;
    }

    /**
     * Selects a submodule.
     * @api public
     */

  }, {
    key: 'selectSubmodule',
    value: function selectSubmodule(path) {
      window.location.href = path;
    }

    /**
     * Opens file or submodule in a new tab.
     * @api public
     */

  }, {
    key: 'openInNewTab',
    value: function openInNewTab(path) {
      window.open(path, '_blank').focus();
    }

    /**
     * Downloads a file.
     * @api public
     */

  }, {
    key: 'downloadFile',
    value: function downloadFile(path, fileName) {
      var link = document.createElement('a');
      link.setAttribute('href', path.replace(/\/blob\//, '/raw/'));
      link.setAttribute('download', fileName);
      link.click();
    }

    /**
     * Gets tree at path.
     * @param {Object} opts - {token, repo}
     * @api protected
     */

  }, {
    key: '_getTree',
    value: function _getTree(path, opts, cb) {
      throw new Error('Not implemented');
    }

    /**
     * Gets submodules in the tree.
     * @param {Object} opts - {token, repo, encodedBranch}
     * @api protected
     */

  }, {
    key: '_getSubmodules',
    value: function _getSubmodules(tree, opts, cb) {
      throw new Error('Not implemented');
    }
  }]);

  return Adapter;
}();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GH_RESERVED_USER_NAMES = ['settings', 'orgs', 'organizations', 'site', 'blog', 'about', 'explore', 'styleguide', 'showcases', 'trending', 'stars', 'dashboard', 'notifications', 'search', 'developer', 'account', 'pulls', 'issues', 'features', 'contact', 'security', 'join', 'login', 'watching', 'new', 'integrations', 'gist', 'business', 'mirrors', 'open-source', 'personal', 'pricing'];
var GH_RESERVED_REPO_NAMES = ['followers', 'following', 'repositories'];
var GH_404_SEL = '#parallax_wrapper';
var GH_PJAX_CONTAINER_SEL = '#js-repo-pjax-container, .context-loader-container, [data-pjax-container]';
var GH_CONTAINERS = '.container, .container-responsive';
var GH_RAW_CONTENT = 'body > pre';

var GitHub = function (_Adapter) {
  _inherits(GitHub, _Adapter);

  function GitHub() {
    _classCallCheck(this, GitHub);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(GitHub).call(this, ['jquery.pjax.js']));

    $.pjax.defaults.timeout = 0; // no timeout
    $(document).on('pjax:send', function () {
      return $(document).trigger(EVENT.REQ_START);
    }).on('pjax:end', function () {
      return $(document).trigger(EVENT.REQ_END);
    });
    return _this;
  }

  // @override


  _createClass(GitHub, [{
    key: 'init',
    value: function init($sidebar) {
      _get(Object.getPrototypeOf(GitHub.prototype), 'init', this).call(this, $sidebar);

      if (!window.MutationObserver) return;

      // Fix #151 by detecting when page layout is updated.
      // In this case, split-diff page has a wider layout, so need to recompute margin.
      // Note that couldn't do this in response to URL change, since new DOM via pjax might not be ready.
      var diffModeObserver = new window.MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (~mutation.oldValue.indexOf('split-diff') || ~mutation.target.className.indexOf('split-diff')) {
            return $(document).trigger(EVENT.LAYOUT_CHANGE);
          }
        });
      });

      diffModeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
        attributeOldValue: true
      });

      // GitHub switch pages using pjax. This observer detects if the pjax container
      // has been updated with new contents and trigger layout.
      var pageChangeObserver = new window.MutationObserver(function () {
        // Trigger location change, can't just relayout as Octotree might need to
        // hide/show depending on whether the current page is a code page or not.
        return $(document).trigger(EVENT.LOC_CHANGE);
      });

      var pjaxContainer = $(GH_PJAX_CONTAINER_SEL)[0];

      if (pjaxContainer) {
        pageChangeObserver.observe(pjaxContainer, {
          childList: true
        });
      } else {
        (function () {
          var detectLocChange = function detectLocChange() {
            if (location.href !== href || location.hash !== hash) {
              href = location.href;
              hash = location.hash;

              // If this is the first time this is called, no need to notify change as
              // Octotree does its own initialization after loading options.
              if (firstLoad) {
                firstLoad = false;
              } else {
                setTimeout(function () {
                  $(document).trigger(EVENT.LOC_CHANGE);
                }, 300); // Wait a bit for pjax DOM change
              }
            }
            setTimeout(detectLocChange, 200);
          };

          // Fall back if DOM has been changed
          var firstLoad = true,
              href = undefined,
              hash = undefined;

          detectLocChange();
        })();
      }
    }

    // @override

  }, {
    key: 'getCssClass',
    value: function getCssClass() {
      return 'octotree_github_sidebar';
    }

    // @override

  }, {
    key: 'canLoadEntireTree',
    value: function canLoadEntireTree() {
      return true;
    }

    // @override

  }, {
    key: 'getCreateTokenUrl',
    value: function getCreateTokenUrl() {
      return location.protocol + '//' + location.host + '/settings/tokens/new';
    }

    // @override

  }, {
    key: 'updateLayout',
    value: function updateLayout(togglerVisible, sidebarVisible, sidebarWidth) {
      var SPACING = 10;
      var $containers = $(GH_CONTAINERS);
      var autoMarginLeft = ($(document).width() - $containers.width()) / 2;
      var shouldPushLeft = sidebarVisible && autoMarginLeft <= sidebarWidth + SPACING;

      $('html').css('margin-left', shouldPushLeft ? sidebarWidth : '');
      $containers.css('margin-left', shouldPushLeft ? SPACING : '');
    }

    // @override

  }, {
    key: 'getRepoFromPath',
    value: function getRepoFromPath(showInNonCodePage, currentRepo, token, cb) {
      var _this2 = this;

      // 404 page, skip
      if ($(GH_404_SEL).length) {
        return cb();
      }

      // Skip raw page
      if ($(GH_RAW_CONTENT).length) {
        return cb();
      }

      // (username)/(reponame)[/(type)]
      var match = window.location.pathname.match(/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?/);
      if (!match) {
        return cb();
      }

      var username = match[1];
      var reponame = match[2];

      // Not a repository, skip
      if (~GH_RESERVED_USER_NAMES.indexOf(username) || ~GH_RESERVED_REPO_NAMES.indexOf(reponame)) {
        return cb();
      }

      // Skip non-code page unless showInNonCodePage is true
      if (!showInNonCodePage && match[3] && ! ~['tree', 'blob'].indexOf(match[3])) {
        return cb();
      }

      // Get branch by inspecting page, quite fragile so provide multiple fallbacks
      var GH_BRANCH_SEL_1 = '[aria-label="Switch branches or tags"]';
      var GH_BRANCH_SEL_2 = '.repo-root a[data-branch]';
      var GH_BRANCH_SEL_3 = '.repository-sidebar a[aria-label="Code"]';
      var GH_BRANCH_SEL_4 = '.current-branch';
      var GH_BRANCH_SEL_5 = 'link[title*="Recent Commits to"]';

      var branch =
      // Detect branch in code page
      $(GH_BRANCH_SEL_1).attr('title') || $(GH_BRANCH_SEL_2).data('branch') ||
      // Non-code page (old GH design)
      ($(GH_BRANCH_SEL_3).attr('href') || ' ').match(/([^\/]+)/g)[3] ||
      // Non-code page: commit page
      ($(GH_BRANCH_SEL_4).attr('title') || ' ').match(/([^\:]+)/g)[1] ||
      // Non-code page: others
      $(GH_BRANCH_SEL_5).length === 1 && ($(GH_BRANCH_SEL_5).attr('title') || ' ').match(/([^\:]+)/g)[1] ||

      // Reuse last selected branch if exist
      currentRepo.username === username && currentRepo.reponame === reponame && currentRepo.branch ||
      // Get default branch from cache
      this._defaultBranch[username + '/' + reponame];

      // Still no luck, get default branch for real
      var repo = { username: username, reponame: reponame, branch: branch };

      if (repo.branch) {
        cb(null, repo);
      } else {
        this._get(null, { repo: repo, token: token }, function (err, data) {
          if (err) return cb(err);
          repo.branch = _this2._defaultBranch[username + '/' + reponame] = data.default_branch || 'master';
          cb(null, repo);
        });
      }
    }

    // @override

  }, {
    key: 'selectFile',
    value: function selectFile(path) {
      var $pjaxContainer = $(GH_PJAX_CONTAINER_SEL);

      if ($pjaxContainer.length) {
        $.pjax({
          // needs full path for pjax to work with Firefox as per cross-domain-content setting
          url: location.protocol + '//' + location.host + path,
          container: $pjaxContainer
        });
      } else {
        // falls back
        _get(Object.getPrototypeOf(GitHub.prototype), 'selectFile', this).call(this, path);
      }
    }

    // @override

  }, {
    key: 'loadCodeTree',
    value: function loadCodeTree(opts, cb) {
      opts.encodedBranch = encodeURIComponent(decodeURIComponent(opts.repo.branch));
      opts.path = opts.node && (opts.node.sha || opts.encodedBranch) || opts.encodedBranch + '?recursive=1';
      this._loadCodeTree(opts, null, cb);
    }

    // @override

  }, {
    key: '_getTree',
    value: function _getTree(path, opts, cb) {
      this._get('/git/trees/' + path, opts, function (err, res) {
        if (err) cb(err);else cb(null, res.tree);
      });
    }

    // @override

  }, {
    key: '_getSubmodules',
    value: function _getSubmodules(tree, opts, cb) {
      var item = tree.filter(function (item) {
        return (/^\.gitmodules$/i.test(item.path)
        );
      })[0];
      if (!item) return cb();

      this._get('/git/blobs/' + item.sha, opts, function (err, res) {
        if (err) return cb(err);
        var data = atob(res.content.replace(/\n/g, ''));
        cb(null, parseGitmodules(data));
      });
    }
  }, {
    key: '_get',
    value: function _get(path, opts, cb) {
      var _this3 = this;

      var host = location.protocol + '//' + (location.host === 'github.com' ? 'api.github.com' : location.host + '/api/v3');
      var url = host + '/repos/' + opts.repo.username + '/' + opts.repo.reponame + (path || '');
      var cfg = { url: url, method: 'GET', cache: false };

      if (opts.token) {
        cfg.headers = { Authorization: 'token ' + opts.token };
      }

      $.ajax(cfg).done(function (data) {
        if (path && path.indexOf('/git/trees') === 0 && data.truncated) {
          _this3._handleError({ status: 206 }, cb);
        } else cb(null, data);
      }).fail(function (jqXHR) {
        return _this3._handleError(jqXHR, cb);
      });
    }
  }]);

  return GitHub;
}(Adapter);
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GL_RESERVED_USER_NAMES = ['u', 'dashboard', 'projects', 'users', 'help', 'explore', 'profile', 'public', 'groups', 'abuse_reports'];
var GL_RESERVED_REPO_NAMES = [];
var GL_RESERVED_TYPES = ['raw'];

var GitLab = function (_Adapter) {
  _inherits(GitLab, _Adapter);

  function GitLab(store) {
    _classCallCheck(this, GitLab);

    // GitLab (for now) embeds access token in the page of a logged-in user.
    // Use it to set the token if one isn't available.

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(GitLab).call(this, ['turbolinks.js']));

    var token = store.get(STORE.TOKEN);
    if (!token) {
      var match = $('head').text().match(/gon.api_token\s*=\s*"(.*?)"/m);
      if (match && match[1]) {
        store.set(STORE.TOKEN, match[1]);
      }
    }
    return _this;
  }

  // @override


  _createClass(GitLab, [{
    key: 'init',
    value: function init($sidebar) {
      _get(Object.getPrototypeOf(GitLab.prototype), 'init', this).call(this, $sidebar);

      // Trigger layout when the GL sidebar is toggled
      $('.toggle-nav-collapse').click(function () {
        setTimeout(function () {
          $(document).trigger(EVENT.LAYOUT_CHANGE);
        }, 10);
      });

      // GitLab disables our submit buttons, re-enable them
      $('.octotree_view_body button[type="submit"]').click(function (event) {
        setTimeout(function () {
          $(event.target).prop('disabled', false).removeClass('disabled');
        }, 100);
      });

      // Reuse GitLab styles for inputs
      $('.octotree_view_body input[type="text"], .octotree_view_body textarea').addClass('form-control');

      // GitLab uses Turbolinks to handle page load
      $(document).on('page:fetch', function () {
        return $(document).trigger(EVENT.REQ_START);
      }).on('page:load', function () {

        // GitLab removes DOM, let's add back
        $sidebar.appendTo('body');

        // Trigger location change since the new page might not a repo page
        $(document).trigger(EVENT.LOC_CHANGE);
        $(document).trigger(EVENT.REQ_END);
      });
    }

    // @override

  }, {
    key: 'getCssClass',
    value: function getCssClass() {
      return 'octotree_gitlab_sidebar';
    }

    // @override

  }, {
    key: 'getMinWidth',
    value: function getMinWidth() {
      return 220; // just enough to hide the GitLab sidebar
    }

    // @override

  }, {
    key: 'getCreateTokenUrl',
    value: function getCreateTokenUrl() {
      return location.protocol + '//' + location.host + '/profile/personal_access_tokens';
    }

    // @override

  }, {
    key: 'updateLayout',
    value: function updateLayout(togglerVisible, sidebarVisible, sidebarWidth) {
      var glSidebarPinned = $('.page-with-sidebar').hasClass('page-sidebar-pinned');
      $('.octotree_toggle').css('right', sidebarVisible ? '' : -40);
      $('.side-nav-toggle, h1.title').css('margin-left', glSidebarPinned || sidebarVisible ? '' : 36);
      $('.navbar-gitlab').css({ 'margin-left': sidebarVisible ? sidebarWidth - (glSidebarPinned ? 220 : 0) : '' });
      $('.page-with-sidebar').css('padding-left', sidebarVisible ? sidebarWidth - (glSidebarPinned ? 220 : 0) : '');
    }

    // @override

  }, {
    key: 'getRepoFromPath',
    value: function getRepoFromPath(showInNonCodePage, currentRepo, token, cb) {
      var _this2 = this;

      // 404 page, skip - GitLab doesn't have specific element for Not Found page
      if ($(document).find('title').text() === 'The page you\'re looking for could not be found (404)') {
        return cb();
      }

      // (username)/(reponame)[/(type)]
      var match = window.location.pathname.match(/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?/);
      if (!match) {
        return cb();
      }

      var username = match[1];
      var reponame = match[2];
      var type = match[3];

      // Not a repository, skip
      if (~GL_RESERVED_USER_NAMES.indexOf(username) || ~GL_RESERVED_REPO_NAMES.indexOf(reponame) || ~GL_RESERVED_TYPES.indexOf(type)) {
        return cb();
      }

      // Skip non-code page unless showInNonCodePage is true
      // with GitLab /username/repo is non-code page
      if (!showInNonCodePage && (!match[3] || match[3] && ! ~['tree', 'blob'].indexOf(match[3]))) {
        return cb();
      }

      // Get branch by inspecting page, quite fragile so provide multiple fallbacks
      var GL_BRANCH_SEL_1 = '#repository_ref';
      var GL_BRANCH_SEL_2 = '.select2-container.project-refs-select.select2 .select2-chosen';
      // .nav.nav-sidebar is for versions below 8.8
      var GL_BRANCH_SEL_3 = '.nav.nav-sidebar .shortcuts-tree, .nav-links .shortcuts-tree';

      var branch =
      // Code page
      $(GL_BRANCH_SEL_1).val() || $(GL_BRANCH_SEL_2).text() ||
      // Non-code page
      // A space ' ' is a failover to make match() always return an array
      ($(GL_BRANCH_SEL_3).attr('href') || ' ').match(/([^\/]+)/g)[3] ||
      // Assume same with previously
      currentRepo.username === username && currentRepo.reponame === reponame && currentRepo.branch ||
      // Default from cache
      this._defaultBranch[username + '/' + reponame];

      var repo = { username: username, reponame: reponame, branch: branch };

      if (repo.branch) {
        cb(null, repo);
      } else {
        this._get(null, { token: token }, function (err, data) {
          if (err) return cb(err);
          repo.branch = _this2._defaultBranch[username + '/' + reponame] = data.default_branch || 'master';
          cb(null, repo);
        });
      }
    }

    // @override

  }, {
    key: 'selectFile',
    value: function selectFile(path) {
      Turbolinks.visit(path);
    }

    // @override

  }, {
    key: 'loadCodeTree',
    value: function loadCodeTree(opts, cb) {
      opts.path = opts.node.path;
      this._loadCodeTree(opts, function (item) {
        item.sha = item.id;
        item.path = item.name;
      }, cb);
    }

    // @override

  }, {
    key: '_getTree',
    value: function _getTree(path, opts, cb) {
      this._get('/tree?path=' + path + '&ref_name=' + opts.encodedBranch, opts, cb);
    }

    // @override

  }, {
    key: '_getSubmodules',
    value: function _getSubmodules(tree, opts, cb) {
      var item = tree.filter(function (item) {
        return (/^\.gitmodules$/i.test(item.name)
        );
      })[0];
      if (!item) return cb();

      this._get('/blobs/' + opts.encodedBranch + '?filepath=' + item.name, opts, function (err, data) {
        if (err) return cb(err);
        cb(null, parseGitmodules(data));
      });
    }
  }, {
    key: '_get',
    value: function _get(path, opts, cb) {
      var _this3 = this;

      var repo = opts.repo;
      var host = location.protocol + '//' + location.host + '/api/v3';
      var project = $('#search_project_id').val() || $('#project_id').val() || repo.username + '%2f' + repo.reponame;
      var url = host + '/projects/' + project + '/repository' + path + '&private_token=' + opts.token;
      var cfg = { url: url, method: 'GET', cache: false };

      $.ajax(cfg).done(function (data) {
        return cb(null, data);
      }).fail(function (jqXHR) {
        return _this3._handleError(jqXHR, cb);
      });
    }
  }]);

  return GitLab;
}(Adapter);
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var HelpPopup = function () {
  function HelpPopup($dom, store) {
    _classCallCheck(this, HelpPopup);

    this.$view = $dom.find('.popup');
    this.store = store;
  }

  _createClass(HelpPopup, [{
    key: 'init',
    value: function init() {
      var $view = this.$view;
      var store = this.store;
      var popupShown = store.get(STORE.POPUP);
      var sidebarVisible = $('html').hasClass(SHOW_CLASS);

      if (popupShown || sidebarVisible) {
        return hideAndDestroy();
      }

      $(document).one(EVENT.TOGGLE, hideAndDestroy);

      setTimeout(function () {
        setTimeout(hideAndDestroy, 6000);
        $view.addClass('show').click(hideAndDestroy);
      }, 500);

      function hideAndDestroy() {
        store.set(STORE.POPUP, true);
        if ($view.hasClass('show')) {
          $view.removeClass('show').one('transitionend', function () {
            return $view.remove();
          });
        } else {
          $view.remove();
        }
      }
    }
  }]);

  return HelpPopup;
}();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ErrorView = function () {
  function ErrorView($dom, store) {
    _classCallCheck(this, ErrorView);

    this.store = store;
    this.$view = $dom.find('.octotree_errorview').submit(this._saveToken.bind(this));
  }

  _createClass(ErrorView, [{
    key: 'show',
    value: function show(err) {
      var $token = this.$view.find('input[name="token"]');
      var $submit = this.$view.find('button[type="submit"]');
      var $help = $submit.next();
      var token = this.store.get(STORE.TOKEN);

      this.$view.find('.octotree_view_header').html(err.error);
      this.$view.find('.message').html(err.message);

      if (err.needAuth) {
        $submit.show();
        $token.show();
        $help.show();
        if (token) $token.val(token);
      } else {
        $submit.hide();
        $token.hide();
        $help.hide();
      }

      $(this).trigger(EVENT.VIEW_READY);
    }
  }, {
    key: '_saveToken',
    value: function _saveToken(event) {
      var _this = this;

      event.preventDefault();

      var $error = this.$view.find('.error').text('');
      var $token = this.$view.find('[name="token"]');
      var oldToken = this.store.get(STORE.TOKEN);
      var newToken = $token.val();

      if (!newToken) return $error.text('Token is required');

      this.store.set(STORE.TOKEN, newToken, function () {
        var changes = _defineProperty({}, STORE.TOKEN, [oldToken, newToken]);
        $(_this).trigger(EVENT.OPTS_CHANGE, changes);
        $token.val('');
      });
    }
  }]);

  return ErrorView;
}();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TreeView = function () {
  function TreeView($dom, store, adapter) {
    var _this = this;

    _classCallCheck(this, TreeView);

    this.store = store;
    this.adapter = adapter;
    this.$view = $dom.find('.octotree_treeview');
    this.$tree = this.$view.find('.octotree_view_body').on('click.jstree', '.jstree-open>a', function (_ref) {
      var target = _ref.target;
      return _this.$jstree.close_node(target);
    }).on('click.jstree', '.jstree-closed>a', function (_ref2) {
      var target = _ref2.target;
      return _this.$jstree.open_node(target);
    }).on('click', this._onItemClick.bind(this)).jstree({
      core: { multiple: false, worker: false, themes: { responsive: false } },
      plugins: ['wholerow']
    });
  }

  _createClass(TreeView, [{
    key: 'show',
    value: function show(repo, token) {
      var _this2 = this;

      var $jstree = this.$jstree;

      $jstree.settings.core.data = function (node, cb) {
        var loadAll = _this2.adapter.canLoadEntireTree() && _this2.store.get(STORE.LOADALL);
        node = !loadAll && (node.id === '#' ? { path: '' } : node.original);

        _this2.adapter.loadCodeTree({ repo: repo, token: token, node: node }, function (err, treeData) {
          if (err) {
            $(_this2).trigger(EVENT.FETCH_ERROR, [err]);
          } else {
            treeData = _this2._sort(treeData);
            if (loadAll) {
              treeData = _this2._collapse(treeData);
            }
            cb(treeData);
          }
        });
      };

      this.$tree.one('refresh.jstree', function () {
        _this2.syncSelection();
        $(_this2).trigger(EVENT.VIEW_READY);
      });

      this._showHeader(repo);
      $jstree.refresh(true);
    }
  }, {
    key: '_showHeader',
    value: function _showHeader(repo) {
      var adapter = this.adapter;

      this.$view.find('.octotree_view_header').html('<div class="octotree_header_repo">' + '<a href="/' + repo.username + '">' + repo.username + '</a>' + ' / ' + '<a data-pjax href="/' + repo.username + '/' + repo.reponame + '">' + repo.reponame + '</a>' + '</div>' + '<div class="octotree_header_branch">' + this._deXss(repo.branch) + '</div>').on('click', 'a[data-pjax]', function (event) {
        event.preventDefault();
        var href = $(this).attr('href'); /* a.href always return absolute URL, don't want that */
        var newTab = event.shiftKey || event.ctrlKey || event.metaKey;
        newTab ? adapter.openInNewTab(href) : adapter.selectFile(href);
      });
    }
  }, {
    key: '_deXss',
    value: function _deXss(str) {
      return str && str.replace(/[<>'"&]/g, '-');
    }
  }, {
    key: '_sort',
    value: function _sort(folder) {
      var _this3 = this;

      folder.sort(function (a, b) {
        if (a.type === b.type) return a.text === b.text ? 0 : a.text < b.text ? -1 : 1;
        return a.type === 'blob' ? 1 : -1;
      });

      folder.forEach(function (item) {
        if (item.type === 'tree' && item.children !== true && item.children.length > 0) {
          _this3._sort(item.children);
        }
      });

      return folder;
    }
  }, {
    key: '_collapse',
    value: function _collapse(folder) {
      var _this4 = this;

      return folder.map(function (item) {
        if (item.type === 'tree') {
          item.children = _this4._collapse(item.children);
          if (item.children.length === 1 && item.children[0].type === 'tree') {
            var onlyChild = item.children[0];
            onlyChild.text = item.text + '/' + onlyChild.text;
            return onlyChild;
          }
        }
        return item;
      });
    }
  }, {
    key: '_onItemClick',
    value: function _onItemClick(event) {
      var _this5 = this;

      var $target = $(event.target);
      var download = false;

      // handle middle click
      if (event.which === 2) return;

      // handle icon click, fix #122
      if ($target.is('i.jstree-icon')) {
        $target = $target.parent();
        download = true;
      }

      if (!$target.is('a.jstree-anchor')) return;

      // refocus after complete so that keyboard navigation works, fix #158
      var refocusAfterCompletion = function refocusAfterCompletion() {
        $(document).one('pjax:success page:load', function () {
          _this5.$jstree.get_container().focus();
        });
      };

      var adapter = this.adapter;
      var newTab = event.shiftKey || event.ctrlKey || event.metaKey;
      var href = $target.attr('href');
      var $icon = $target.children().length ? $target.children(':first') : $target.siblings(':first'); // handles child links in submodule

      if ($icon.hasClass('commit')) {
        refocusAfterCompletion();
        newTab ? adapter.openInNewTab(href) : adapter.selectSubmodule(href);
      } else if ($icon.hasClass('blob')) {
        if (download) {
          adapter.downloadFile(href, $target.text());
        } else {
          refocusAfterCompletion();
          newTab ? adapter.openInNewTab(href) : adapter.selectFile(href);
        }
      }
    }
  }, {
    key: 'syncSelection',
    value: function syncSelection() {
      var $jstree = this.$jstree;
      if (!$jstree) return;

      // converts /username/reponame/object_type/branch/path to path
      var path = decodeURIComponent(location.pathname);
      var match = path.match(/(?:[^\/]+\/){4}(.*)/);
      if (!match) return;

      var currentPath = match[1];
      var loadAll = this.adapter.canLoadEntireTree() && this.store.get(STORE.LOADALL);

      selectPath(loadAll ? [currentPath] : breakPath(currentPath));

      // converts ['a/b'] to ['a', 'a/b']
      function breakPath(fullPath) {
        return fullPath.split('/').reduce(function (res, path, idx) {
          res.push(idx === 0 ? path : res[idx - 1] + '/' + path);
          return res;
        }, []);
      }

      function selectPath(paths) {
        var index = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

        var nodeId = NODE_PREFIX + paths[index];

        if ($jstree.get_node(nodeId)) {
          $jstree.deselect_all();
          $jstree.select_node(nodeId);
          $jstree.open_node(nodeId, function () {
            if (++index < paths.length) {
              selectPath(paths, index);
            }
          });
        }
      }
    }
  }, {
    key: '$jstree',
    get: function get() {
      return this.$tree.jstree(true);
    }
  }]);

  return TreeView;
}();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var OptionsView = function () {
  function OptionsView($dom, store) {
    var _this = this;

    _classCallCheck(this, OptionsView);

    this.store = store;
    this.$view = $dom.find('.octotree_optsview').submit(this._save.bind(this));
    this.$toggler = $dom.find('.octotree_opts').click(this._toggle.bind(this));
    this.elements = this.$view.find('[data-store]').toArray();

    // hide options view when sidebar is hidden
    $(document).on(EVENT.TOGGLE, function (event, visible) {
      if (!visible) _this._toggle(false);
    });
  }

  _createClass(OptionsView, [{
    key: '_toggle',
    value: function _toggle(visibility) {
      if (visibility !== undefined) {
        if (this.$view.hasClass('current') === visibility) return;
        return this._toggle();
      }

      if (this.$toggler.hasClass('selected')) {
        this.$toggler.removeClass('selected');
        $(this).trigger(EVENT.VIEW_CLOSE);
      } else {
        this._load();
      }
    }
  }, {
    key: '_load',
    value: function _load() {
      var _this2 = this;

      this._eachOption(function ($elm, key, value, cb) {
        if ($elm.is(':checkbox')) $elm.prop('checked', value);else $elm.val(value);
        cb();
      }, function () {
        _this2.$toggler.addClass('selected');
        $(_this2).trigger(EVENT.VIEW_READY);
      });
    }
  }, {
    key: '_save',
    value: function _save(event) {
      var _this3 = this;

      event.preventDefault();

      /*
       * Certainly not a good place to put this logic but Chrome requires
       * permissions to be requested only in response of user input. So...
       */
      var $ta = this.$view.find('[data-store$=EURLS]').filter(':visible');
      var storeKey = $ta.data('store');
      var urls = $ta.val().split(/\n/).filter(function (url) {
        return url !== '';
      });

      if (urls.length > 0) {
        chrome.runtime.sendMessage({ type: 'doSomeStuff', urls: urls }, function (granted) {
          if (!granted) {
            // permissions not granted (by user or error), reset value
            $ta.val(_this3.store.get(STORE[storeKey]));
          }
          _this3._saveOptions();
        });
        return;
      }
      return this._saveOptions();
    }
  }, {
    key: '_saveOptions',
    value: function _saveOptions() {
      var _this4 = this;

      var changes = {};
      this._eachOption(function ($elm, key, value, cb) {
        var newValue = $elm.is(':checkbox') ? $elm.is(':checked') : $elm.val();
        if (value === newValue) return cb();
        changes[key] = [value, newValue];
        _this4.store.set(key, newValue, cb);
      }, function () {
        _this4._toggle(false);
        if (Object.keys(changes).length) {
          $(_this4).trigger(EVENT.OPTS_CHANGE, changes);
        }
      });
    }
  }, {
    key: '_eachOption',
    value: function _eachOption(processFn, completeFn) {
      var _this5 = this;

      parallel(this.elements, function (elm, cb) {
        var $elm = $(elm);
        var key = STORE[$elm.data('store')];

        _this5.store.get(key, function (value) {
          processFn($elm, key, value, function () {
            return cb();
          });
        });
      }, completeFn);
    }
  }]);

  return OptionsView;
}();
'use strict';

// regexps from https://github.com/shockie/node-iniparser
var INI_SECTION = /^\s*\[\s*([^\]]*)\s*\]\s*$/;
var INI_COMMENT = /^\s*;.*$/;
var INI_PARAM = /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/;
var SEPARATOR = /\r\n|\r|\n/;

function parseGitmodules(data) {
  if (!data) return;

  var submodules = {};
  var lines = data.split(SEPARATOR);
  var lastPath = undefined;

  lines.forEach(function (line) {
    var match = undefined;
    if (INI_SECTION.test(line) || INI_COMMENT.test(line) || !(match = line.match(INI_PARAM))) {
      return;
    }

    if (match[1] === 'path') lastPath = match[2];else if (match[1] === 'url') submodules[lastPath] = match[2];
  });

  return submodules;
}
"use strict";

function parallel(arr, iter, done) {
  var total = arr.length;
  if (total === 0) return done();

  arr.forEach(function (item) {
    iter(item, finish);
  });

  function finish() {
    if (--total === 0) done();
  }
}
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Storage = function () {
  function Storage() {
    _classCallCheck(this, Storage);
  }

  _createClass(Storage, [{
    key: "set",
    value: function set(key, val, cb) {
      localStorage.setItem(key, JSON.stringify(val));
      if (cb) cb();
    }
  }, {
    key: "get",
    value: function get(key, cb) {
      var val = parse(localStorage.getItem(key));
      if (cb) cb(val);else return val;

      function parse(val) {
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }
    }
  }]);

  return Storage;
}();
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

(function () {
  var oldSet = Storage.prototype.set;
  Storage.prototype.set = function (key, val, cb) {
    this._cache = this._cache || {};
    this._cache[key] = val;

    var shared = ~key.indexOf('.shared');
    if (shared) chrome.storage.local.set(_defineProperty({}, key, val), cb || Function());else oldSet.call(this, key, val, cb);
  };

  var oldGet = Storage.prototype.get;
  Storage.prototype.get = function (key, cb) {
    this._cache = this._cache || {};
    if (!cb) return this._cache[key];

    var shared = ~key.indexOf('.shared');
    if (shared) chrome.storage.local.get(key, function (item) {
      return cb(item[key]);
    });else oldGet.call(this, key, cb);
  };
})();
'use strict';

$(document).ready(function () {
  var store = new Storage();

  parallel(Object.keys(STORE), setDefault, loadExtension);

  function setDefault(key, cb) {
    var storeKey = STORE[key];
    store.get(storeKey, function (val) {
      store.set(storeKey, val == null ? DEFAULTS[key] : val, cb);
    });
  }

  function createAdapter() {
    var githubUrls = store.get(STORE.GHEURLS).split(/\n/).map(function (url) {
      return url.replace(/(.*?:\/\/[^/]+)(.*)/, '$1');
    }).concat('https://github.com');

    return ~githubUrls.indexOf(location.protocol + '//' + location.host) ? new GitHub(store) : new GitLab(store);
  }

  function loadExtension() {
    var $html = $('html');
    var $document = $(document);
    var $dom = $(TEMPLATE);
    var $sidebar = $dom.find('.octotree_sidebar');
    var $toggler = $sidebar.find('.octotree_toggle');
    var $views = $sidebar.find('.octotree_view');
    var adapter = createAdapter();
    var treeView = new TreeView($dom, store, adapter);
    var optsView = new OptionsView($dom, store);
    var helpPopup = new HelpPopup($dom, store);
    var errorView = new ErrorView($dom, store);
    var currRepo = false;
    var hasError = false;

    $html.addClass(ADDON_CLASS);

    var $lines = $dom.find("div#line_numbers>a.lineNumber");
    console.dir("LINES: " + $lines.length);
    $lines.click(function() {
      console.log("CLICKEDD");
      console.log($(this).text());
      chrome.runtime.sendMessage({ type: 'doSomeStuff', urls: "XXX" }, function (done) {
        if (!done) {
console.log("ADDED SOME STUFF");
        }
      });
    });

    $(window).resize(function (event) {
      if (event.target === window) layoutChanged();
    });

    $toggler.click(toggleSidebarAndSave);
    key.filter = function () {
      return $toggler.is(':visible');
    };
    key(store.get(STORE.HOTKEYS), toggleSidebarAndSave);

    var views = [treeView, errorView, optsView];
    views.forEach(function (view) {
      $(view).on(EVENT.VIEW_READY, function (event) {
        if (this !== optsView) {
          $document.trigger(EVENT.REQ_END);
        }
        showView(this.$view);
      }).on(EVENT.VIEW_CLOSE, function () {
        return showView(hasError ? errorView.$view : treeView.$view);
      }).on(EVENT.OPTS_CHANGE, optionsChanged).on(EVENT.FETCH_ERROR, function (event, err) {
        return showError(err);
      });
    });

    $document.on(EVENT.REQ_START, function () {
      return $toggler.addClass('octotree_loading');
    }).on(EVENT.REQ_END, function () {
      return $toggler.removeClass('octotree_loading');
    }).on(EVENT.LAYOUT_CHANGE, layoutChanged).on(EVENT.TOGGLE, layoutChanged).on(EVENT.LOC_CHANGE, function () {
      return tryLoadRepo();
    });

    $sidebar.width(parseInt(store.get(STORE.WIDTH))).resize(layoutChanged).appendTo($('body'));

    adapter.init($sidebar);
    return tryLoadRepo();

    function optionsChanged(event, changes) {
      var reload = false;

      Object.keys(changes).forEach(function (storeKey) {
        var value = changes[storeKey];

        switch (storeKey) {
          case STORE.TOKEN:
          case STORE.LOADALL:
            reload = true;
            break;
          case STORE.HOTKEYS:
            key.unbind(value[0]);
            key(value[1], toggleSidebar);
            break;
        }
      });

      if (reload) {
        tryLoadRepo(true);
      }
    }

    function tryLoadRepo(reload) {
      hasError = false;
      var remember = store.get(STORE.REMEMBER);
      var showInNonCodePage = store.get(STORE.NONCODE);
      var shown = store.get(STORE.SHOWN);
      var token = store.get(STORE.TOKEN);

      adapter.getRepoFromPath(showInNonCodePage, currRepo, token, function (err, repo) {
        if (err) {
          showError(err);
        } else if (repo) {
          $toggler.show();

          if (remember && shown) {
            toggleSidebar(true);
          }

          if (isSidebarVisible()) {
            var repoChanged = JSON.stringify(repo) !== JSON.stringify(currRepo);

            if (repoChanged || reload === true) {
              $document.trigger(EVENT.REQ_START);
              currRepo = repo;
              treeView.show(repo, token);
            } else {
              treeView.syncSelection();
            }
          }
        } else {
          $toggler.hide();
          toggleSidebar(false);
        }
        helpPopup.init();
        layoutChanged();
      });
    }

    function showView(view) {
      $views.removeClass('current');
      view.addClass('current');
    }

    function showError(err) {
      hasError = true;
      errorView.show(err);
    }

    function toggleSidebarAndSave() {
      store.set(STORE.SHOWN, !isSidebarVisible(), function () {
        toggleSidebar();
        if (isSidebarVisible()) {
          tryLoadRepo();
        }
      });
    }

    function toggleSidebar(visibility) {
      if (visibility !== undefined) {
        if (isSidebarVisible() === visibility) return;
        toggleSidebar();
      } else {
        $html.toggleClass(SHOW_CLASS);
        $document.trigger(EVENT.TOGGLE, isSidebarVisible());
      }
    }

    function layoutChanged() {
      var width = $sidebar.outerWidth();
      adapter.updateLayout(isTogglerVisible(), isSidebarVisible(), width);
      store.set(STORE.WIDTH, width);
    }

    function isSidebarVisible() {
      return $html.hasClass(SHOW_CLASS);
    }

    function isTogglerVisible() {
      return $toggler.is(':visible');
    }
  }
});
