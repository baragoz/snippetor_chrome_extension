/*globals jQuery, define, module, exports, require, window, document, postMessage */
(function (jQuery) {
	"use strict";

 var snippetorExtensionApi = {
	    items: [],
			extensionStorageId : null,
			createSnippet: function(title, callback) {
				console.log("createSnippet DDDDDDDDDDDDDDD");
				chrome.runtime.sendMessage({type: "createSnippet", payload: {title: title}}, function(response) {
					// get an id of the working snippet
					snippetorExtensionApi.extensionStorageId = response.working;
					console.log("Snippet created");
					if (callback)
					  callback(response);
					snippetorUiApi.toggleSave(true);
					snippetorUiApi.toggleCreate(false);
				});
			},
			closeSnippet: function(callback) {
				chrome.runtime.sendMessage({type: "closeSnippet"}, function(response) {
					console.log("Snippet closed");
					if (callback)
					  callback(response);
				});
			},
			openSnippetItem: function(id, callback) {
				chrome.runtime.sendMessage({type: "openItem", payload: 1}, function(response) {
					console.log("Open snippet complete");
					if (callback)
					  callback(response);
				});
			},
			saveSnippet: function(callback) {
				chrome.runtime.sendMessage({type: "saveSnippet"}, function(response) {
					console.log("Snippet saved probably");
					if (callback)
					  callback(response);
				});
			},
			addNewItem: function(url, line, comment, callback) {
				chrome.runtime.sendMessage({type: "addNewItem", payload: {url: url, line: line, comment:comment}}, function(response) {
					console.log("item added");
					if (callback)
					  callback(response);
				});
			},
			init: function(callback) {
				chrome.runtime.sendMessage({type: "initialItems", payload: {}}, function(response) {
					console.log("got initial state for the tab");
					console.dir(response);
					snippetorExtensionApi.extensionStorageId = response.working;
					snippetorExtensionApi.items = (response.working != undefined && response.working >= 0) ? response.snippets[response.working].items: [];
					if (callback)
					  callback(response);
				});
			}
 };

 var snippetorUiApi = {
	 bubbleElement: null,
	 url: null,
	 showBubble: function(line_element, evt, line) {
		 var xxx = window.location.href;
		 xxx = xxx.split("#")[0];
		 this.url = xxx + ":" + line;
		 if (this.bubbleElement == null) {
			 this.bubbleElement = document.getElementById("snipettor-bubble-dialog");
			 var that = this;
			 document.getElementById("snipettor-bubble-dialog-save").addEventListener("click", function(e) {
				 // read current value and reset input
				 var r = document.getElementById("snipettor-bubble-dialog-textarea").value;
				 document.getElementById("snipettor-bubble-dialog-textarea").value = "";
				 snippetorUiApi.showNewItem(that.url, 10, r);
				 that.bubbleElement.style.display = "none";
			 });
			 document.getElementById("snipettor-bubble-dialog-cancel").addEventListener("click", function(e) {
				 document.getElementById("snipettor-bubble-dialog-textarea").value = "";
				 that.bubbleElement.style.display = "none";
			 });
		 }
		 console.log("SHOW BUBBLE !!!");
		 this.bubbleElement.style.top = (evt.pageY + 20) + "px";
		 this.bubbleElement.style.left = (evt.pageX + 10) + "px";
		 this.bubbleElement.style.display = "block";
		 evt.stopPropagation();
	 },
	 snippetsList: null,
	 current_index: 0,
	 showNewItem: function(url, line, comment, isInit) {
		 this.current_index++;

		 var payload = url.length > 20 ? url.substr(url.length -20): url;
		 this.snippetsList = document.getElementById("menu-snippets-list");
		 this.snippetsList.innerHTML += '<li><a aria-label="'+url+'" id="snippetor-active-item-'+this.current_index+'">'+payload+'</a></li><li class="snippet-separator-arrow-right"></li>';
		 if (!isInit)
		   snippetorExtensionApi.addNewItem(url, line, comment);
		 var itemToHandle = document.getElementById('snippetor-active-item-'+this.current_index);
		 itemToHandle.addEventListener('click', function(e) {
			 console.log("LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL");
			 e.stopPropagation();
		 });
		 itemToHandle.onclick = function(e) {
			 console.log("CLICKED ON CURRENT ELEMENT TO SHOW !!!");
			 e.stopPropagation();
			 snippetorExtensionApi.openSnippetItem(1);
		 }
		 console.log("Show new item: " + url);
	 },
	 init: function() {
		 snippetorExtensionApi.init(function() {
       if (snippetorExtensionApi.extensionStorageId != null) {
			   for (var x in snippetorExtensionApi.items) {
				   console.log("POST INIT: []" + x);
  				 var tmp = snippetorExtensionApi.items[x];
  				 snippetorUiApi.showNewItem(tmp.url, tmp.line, tmp.data, true);
				 }
				 snippetorUiApi.toggleSave(true);
				 snippetorUiApi.toggleCreate(false);

			 }
			 else {
				 snippetorUiApi.toggleSave(false);
				 snippetorUiApi.toggleCreate(true);
			 }
		 });
	 },
	 toggleSave: function(flag) {
		 var saveIt = document.getElementById("snippetor-save-action");
		 saveIt.style.display = flag ? "block" : "none";
	 },
	 toggleCreate: function(flag) {
		 var closeIt = document.getElementById("snippetor-create-action");
		 closeIt.style.display = flag ? "block" : "none";
		 var inputWrapper = document.getElementById("snippetor-input-action-wrapper");
		 inputWrapper.style.display = flag ? "block" : "none";
	 }
 };

  document.body.innerHTML += '\
<ul id="menu-dddd">\
  <li><a id="snippetor-toggle-menu" class="active">S</a></li>\
  <li><a id="snippetor-save-action">Save</a></li>\
	<li><a id="snippetor-create-action" >Create</a></li>\
	<li><a id="snippetor-input-action-wrapper"><input id="snippetor-input-action" placeholder="Draft name please ..."></a></li>\
	<ul id="menu-snippets-list"><li class="snippet-separator-arrow-right"></li>\
	</ul>\
  <li style="float:right"><a id="snipettor-close-action">[x]</a></li>\
</ul>\
<div id="snipettor-bubble-dialog"><textarea id="snipettor-bubble-dialog-textarea"></textarea>\
<br>\
<button id="snipettor-bubble-dialog-save">Save</button>\
<button id="snipettor-bubble-dialog-cancel">Cancel</button></div>';

 snippetorUiApi.init();

  // Close icon
	var snippetorCloseAction = document.getElementById("snipettor-close-action");
	if (snippetorCloseAction) {
		snippetorCloseAction.onclick =   function(e) {
			  e.stopPropagation();
				snippetorToggleAction.style.height = "49px";
				snippetorToggleAction.style.width = "42px";
	  }
	}

  var saveAction = document.getElementById("snippetor-save-action");
	saveAction.onclick = function(e) {
		e.stopPropagation();
		snippetorExtensionApi.saveSnippet();
	}

	var snippetTitle = document.getElementById("snippetor-input-action-wrapper");
	snippetTitle.onclick = function(e) {
		e.stopPropagation();
	};

	var xTitle = document.getElementById("snippetor-input-action");
	xTitle.onclick = function(e) {
		e.stopPropagation();
	};

	var snipettorCreateAction =  document.getElementById("snippetor-create-action");
	if (snipettorCreateAction) {
		snipettorCreateAction.onclick = function(e) {
			console.log("CLICKED ON CREATE: ");
			  e.stopPropagation();
				var inTitle = document.getElementById("snippetor-input-action");
				if (inTitle && inTitle.value) {
					//snippetorExtensionApi.saveSnippet();
					snippetorExtensionApi.createSnippet(inTitle.value);
				}
				else {
					snipettorCreateAction.style.disabled = true;
				}
		}
	}

	// Show/hide top menu
  var snippetorToggleAction = document.getElementById("menu-dddd");
	if (snippetorToggleAction) {
	  snippetorToggleAction.onclick =   function(e) {
				//var rrr = document.getElementById("menu-dddd");
				snippetorToggleAction.style.height = "49px";
				if (snippetorToggleAction.style.width == "42px")
				  snippetorToggleAction.style.width = "100%";
				else
				snippetorToggleAction.style.width = "42px";
			}
	}

  var lines = document.getElementsByClassName("blob-num js-line-number");
	function snippetorSelectHandler(e) {
		console.log("CLICKED");
		snippetorUiApi.showBubble(this, e, this.attributes["data-line-number"].value);
	}
	for (var idx =0; idx <lines.length; ++idx) {
		lines[idx].addEventListener('dblclick', snippetorSelectHandler);
	}

})($);
