/*globals jQuery, define, module, exports, require, window, document, postMessage */
(function (jQuery) {
	"use strict";

  var snippetorUiApi;
  function subscribeForTheLineDblClick() {
	  var lines = document.getElementsByClassName("blob-num js-line-number");
		function snippetorSelectHandler(e) {
			var line = this.attributes["data-line-number"].value;
			console.log("CLICKED : " + line);
			snippetorUiApi.showBubble(e, line);
		}
		console.log("GOT THE NUMBER OF ELEMENTS: " + lines.length);
		var updatedElementsCount = 0;
		for (var idx =0; idx <lines.length; ++idx) {
			if (!lines[idx].classList.contains("snipettor-event-observer")) {
				++updatedElementsCount;
				lines[idx].className += " snipettor-event-observer";
			  lines[idx].addEventListener('dblclick', snippetorSelectHandler);
			}
		}
		console.log("updatedElementsCount: " + updatedElementsCount);
	} // subscribeForTheLineDblClick
  window.subscribeForTheLineDblClick = subscribeForTheLineDblClick;
// Notify that injected data
console.log("IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII");
window.addEventListener("hashchange", function(){
	console.log("HASH CHANGE : " + window.location.hash);
}, false);

window.addEventListener("loadend", function(){
	console.log("loadend CHANGE : " + window.location.href);
}, false);

window.addEventListener("load", function(){
	subscribeForTheLineDblClick();
	console.log("LOAD CHANGE : " + window.location.href);
}, false);


window.addEventListener("loadstart", function(){
	console.log("LOAD START CHANGE : " + window.location.href);
}, false);

window.addEventListener("loadend", function(){
	console.log("LOAD END CHANGE : " + window.location.href);
}, false);


 function findById(id, subscription, callback) {
	 var element =  document.getElementById(id);
	 if (element && subscription && callback) {
		 element.addEventListener(subscription, function(e) {
			 e.stopPropagation();
			 callback(e);
		 });
	 }
	 return element;
 }

 var snippetorExtensionApi = {
	    items: [],
			extensionStorageId : null,
			extensionWorkingItemId : null,
			createSnippet: function(title, callback) {
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
				chrome.runtime.sendMessage({type: "openItem", payload: id}, function(response) {
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
          snippetorExtensionApi.extensionWorkingItemId = (response.working != undefined && response.working >= 0) ? response.snippets[response.working].workingItem: null;
					if (callback)
					  callback(response);
				});
			}
 };

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
	 showBubble: function(evt, line) {
		 var xxx = window.location.href;
		 xxx = xxx.split("#")[0];
		 this.currentItem = {url: xxx, line: line};
		 console.log("SHOW BUBBLE !!!"+ this.currentItem.line);

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

		 var payload = url.length > 20 ? url.substr(url.length -20): url;
		 this.snippetsList = findById("menu-snippets-list");
		 this.snippetsList.innerHTML += '<li><a class="snippetor-navigation-item" aria-label="'+url+'" id="snippetor-active-item-'+this.current_index+'">'+payload+':'+line+'</a></li><li class="snippet-separator-arrow-right"></li>';
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
		 }
		 console.log("Show new item: " + url);
	 },
	 init: function() {
		 snippetorExtensionApi.init(function() {
       if (snippetorExtensionApi.extensionStorageId != null) {
			   for (var x in snippetorExtensionApi.items) {
				   console.log("POST INIT: []" + x);
  				 var tmp = snippetorExtensionApi.items[x];
  				 snippetorUiApi.showNewItem(tmp.url, tmp.line, tmp.data, true, false);
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
		 var saveIt = findById("snippetor-save-action");
		 saveIt.style.display = flag ? "block" : "none";
	 },
	 toggleCreate: function(flag) {
		 var closeIt = findById("snippetor-create-action");
		 closeIt.style.display = flag ? "block" : "none";
		 var inputWrapper = findById("snippetor-input-action-wrapper");
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
	var snippetorCloseAction = findById("snipettor-close-action", "click", function(e) {
			  e.stopPropagation();
				snippetorToggleAction.style.height = "49px";
				snippetorToggleAction.style.width = "42px";
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

	var snipettorCreateAction =  findById("snippetor-create-action", "click", function(e) {
			console.log("CLICKED ON CREATE: ");
			  e.stopPropagation();
				var inTitle = findById("snippetor-input-action");
				if (inTitle && inTitle.value) {
					//snippetorExtensionApi.saveSnippet();
					snippetorExtensionApi.createSnippet(inTitle.value);
				}
				else {
					snipettorCreateAction.style.disabled = true;
				}
  });

	// Show/hide top menu
  var snippetorToggleAction = findById("menu-dddd", "click", function(e) {
				//var rrr = document.getElementById("menu-dddd");
				snippetorToggleAction.style.height = "49px";
				if (snippetorToggleAction.style.width == "42px")
				  snippetorToggleAction.style.width = "100%";
				else
				snippetorToggleAction.style.width = "42px";
	});

  // asdads ad
	subscribeForTheLineDblClick();

})($);
