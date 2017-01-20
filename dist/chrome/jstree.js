/*globals jQuery, define, module, exports, require, window, document, postMessage */
(function (jQuery) {
	"use strict";
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
				 var r = document.getElementById("snipettor-bubble-dialog-textarea").value;
				 snippetorUiApi.showNewItem(r, that.url);
				 that.bubbleElement.style.display = "none";
			 });
			 document.getElementById("snipettor-bubble-dialog-cancel").addEventListener("click", function(e) {
				 document.getElementById("snipettor-bubble-dialog-textarea").value = "";
				 that.bubbleElement.style.display = "none";
			 });
		 }
		 this.bubbleElement.style.top = (evt.pageY + 20) + "px";
		 this.bubbleElement.style.left = (evt.pageX + 10) + "px";
		 this.bubbleElement.style.display = "block";
		 evt.stopPropagation();
	 },
	 snippetsList: null,
	 showNewItem: function(data, url) {
		 var payload = url.length > 20 ? url.substr(url.length -20): url;
		 this.snippetsList = document.getElementById("menu-snippets-list");
		 this.snippetsList.innerHTML += '<li><a aria-label="'+url+'">'+payload+'</a></li><li class="snippet-separator-arrow-right"></li>';
		 console.log("Show new item: " + data);
	 }
 };

  var snippetorExtensionApi = {
		saveSnippet: function() {
			chrome.runtime.sendMessage({type: "saveSnippet"}, function(response) {
				console.log(response);
			});
		},
		showNewItem: function() {
      snippetorUiApi.showNewItem();
		}
	};

  document.body.innerHTML += '\
<ul id="menu-dddd">\
  <li><a id="snippetor-toggle-menu" class="active">S</a></li>\
  <li><a id="snippetor-save-action">Save</a></li>\
	<ul id="menu-snippets-list"><li class="snippet-separator-arrow-right"></li>\
	</ul>\
  <li style="float:right"><a id="snipettor-close-action">[x]</a></li>\
</ul>\
<div id="snipettor-bubble-dialog"><textarea id="snipettor-bubble-dialog-textarea"></textarea>\
<br>\
<button id="snipettor-bubble-dialog-save">Save</button>\
<button id="snipettor-bubble-dialog-cancel">Cancel</button></div>';

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

  // Close icon
	var snippetorCloseAction = document.getElementById("snipettor-close-action");
	if (snippetorCloseAction) {
		snippetorCloseAction.onclick =   function(e) {
			  e.stopPropagation();
				snippetorToggleAction.style.height = "49px";
				snippetorToggleAction.style.width = "42px";
	  }
	}

	var snipettorSaveAction =  document.getElementById("snippetor-save-action");
	if (snipettorSaveAction) {
		snipettorSaveAction.onclick = function(e) {
			  e.stopPropagation();
        snippetorExtensionApi.saveSnippet();
		}
	}

  var lines = document.getElementsByClassName("blob-num js-line-number");
	function snippetorSelectHandler(e) {
		snippetorUiApi.showBubble(this, e, this.attributes["data-line-number"].value);
	}
	for (var idx =0; idx <lines.length; ++idx) {
		lines[idx].addEventListener('dblclick', snippetorSelectHandler);
	}

})($);
