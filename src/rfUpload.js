/*
---

name: Request.File
description: Uploading files with FormData
license: MIT-style license.
authors: [Arian Stolwijk, Djamil Legato]
requires: [Request]
provides: Request.File
credits: https://gist.github.com/a77b537e729aff97429c

...
*/

(function(){

var progressSupport = ('onprogress' in new Browser.Request());

Request.File = new Class({

	Extends: Request,

	options: {
		emulation: false,
		urlEncoded: false
	},

	initialize: function(options){
		this.xhr = new Browser.Request();
		this.formData = new FormData();
		this.setOptions(options);
		this.headers = this.options.headers;
	},

	append: function(key, value){
		this.formData.append(key, value);
		return this.formData;
	},

	reset: function(){
		this.formData = new FormData();
		console.log("Request.File.reset");
	},

	send: function(options){
		if (!this.check(options)) return this;

		this.options.isSuccess = this.options.isSuccess || this.isSuccess;
		this.running = true;

		var xhr = this.xhr;
		if (progressSupport){
			xhr.onloadstart = this.loadstart.bind(this);
			xhr.onprogress = this.progress.bind(this);
			xhr.upload.onprogress = this.progress.bind(this);
		}

		xhr.open('POST', this.options.url, true);
		xhr.onreadystatechange = this.onStateChange.bind(this);

		Object.each(this.headers, function(value, key){
			try {
				xhr.setRequestHeader(key, value);
			} catch (e){
				this.fireEvent('exception', [key, value]);
			}
		}, this);

		this.fireEvent('request');
		xhr.send(this.formData);

		if (!this.options.async) this.onStateChange();
		if (this.options.timeout) this.timer = this.timeout.delay(this.options.timeout, this);
		return this;
	}

});

})();



/*
---

name: Form.MultipleFileInput
description: Create a list of files that has to be uploaded
license: MIT-style license.
authors: Arian Stolwijk
requires: [Element.Event, Class, Options, Events]
provides: Form.MultipleFileInput

...
*/

Object.append(Element.NativeEvents, {
	dragenter: 2, dragleave: 2, dragover: 2, dragend: 2, drop: 2
});

if (!this.Form) this.Form = {};

Form.MultipleFileInput = new Class({

	Implements: [Options, Events],

	options: {
		itemClass: 'uploadItem'/*,
		onAdd: function(file){},
		onRemove: function(file){},
		onEmpty: function(){},
		onDragenter: function(event){},
		onDragleave: function(event){},
		onDragover: function(event){},
		onDrop: function(event){}*/
	},

	_files: [],

	initialize: function(input, list, drop, options){
		input = this.element = document.id(input);
		if (list) list = this.list = document.id(list);
		drop = this.drop = document.id(drop);

		this.setOptions(options);

		var name = input.get('name');
		if (name.slice(-2) != '[]') input.set('name', name + '[]');
		input.set('multiple', true);

		this.inputEvents = {
			change: function(event){
				Array.each(input.files, this.add, this);
				this.fireEvent('change', event);
			}.bind(this)
		};
		

		this.dragEvents = drop && (typeof document.body.draggable != 'undefined') ? {
			dragenter: this.fireEvent.bind(this, 'dragenter'),
			dragleave: this.fireEvent.bind(this, 'dragleave'),
			dragend: this.fireEvent.bind(this, 'dragend'),
			dragover: function(event){
				event.preventDefault();
				this.fireEvent('dragover', event);
			}.bind(this),
			drop: function(event){
				event.preventDefault();
				var dataTransfer = event.event.dataTransfer;
				if (dataTransfer) Array.each(dataTransfer.files, this.add, this);
				this.fireEvent('drop', event);

			}.bind(this)
		} : null;

		this.attach();
	},

	attach: function(){
		this.element.addEvents(this.inputEvents);
		if (this.dragEvents) this.drop.addEvents(this.dragEvents);
	},

	detach: function(){
		this.input.removeEvents(this.inputEvents);
		if (this.dragEvents) this.drop.removeEvents(this.dragEvents);
	},

	add: function(file){
		this._files.push(file);
		if (this.list) {
			var self = this;
			new Element('li', {
				'class': this.options.itemClass
			}).grab(new Element('span', {
				text: file.name
			})).grab(new Element('a', {
				text: 'x',
				href: '#',
				events: {click: function(e){
					e.preventDefault();
					self.remove(file);
				}}
			})).inject(this.list);
		}
		this.fireEvent('add', file);
		return this;
	},

	remove: function(file){
		var index = this._files.indexOf(file);
		if (index == -1) return this;
		this._files.splice(index, 1);
		if (this.list) this.list.childNodes[index].destroy();
		this.fireEvent('remove', file);
		if (!this._files.length) this.fireEvent('empty');
		return this;
	},

	getFiles: function(){
		return this._files;
	}

});


/*
---

name: Form.Upload
description: Create a multiple file upload form
license: MIT-style license.
authors: Arian Stolwijk
requires: [Form.MultipleFileInput, Request.File]
provides: Form.Upload

...
*/

(function(){
"use strict";

if (!this.Form) this.Form = {};
var Form = this.Form;

Form.Upload = new Class({

	Implements: [Options, Events],

	options: {
		dropMsg: 'Please drop your files here',
		fireAtOnce: false,
		dropzone: false,
		showlist: true,
		showprogress: true,
		onComplete: function(){
			// reload
			window.location.href = window.location.href;
		},
		onDrop: function(e){
			console.log(e);
		}
	},

	initialize: function(input, options){
		input = this.input = document.id(input);

		this.setOptions(options);

		// Our modern file upload requires FormData to upload
		if ('FormData' in window) this.modernUpload(input);
		else this.legacyUpload(input);
	},

	modernUpload: function(input){

		this.modern = true;

		var form = input.getParent('form');
		if (!form) return;
		this.raw_form = form;

		var self = this;
		if (self.options.dropzone) {
			var drop = $(self.options.dropzone);
		}
		else {
			var drop = new Element('div.droppable', {
				text: this.options.dropMsg
			}).inject(input, 'after');
		}


		if (self.options.showlist) {
			var list = new Element('ul.uploadList').inject(drop, 'after');
		}
		else var list = false;

		if (self.options.showprogress) {
			if (typeof self.options.showprogress == 'string') {
				var progress = $(self.options.showprogress);
			}
			else {
				var progress = new Element('div.progress')
					.setStyle('display', 'none').inject(list, 'after');
			}
		}
		else var progress = false;

		var uploadReq = new Request.File({
			url: form.get('action'),
			onRequest: (self.options.showprogress?progress.setStyles.pass({display: 'block', width: 0}, progress):false),
			onProgress: function(event){
				var loaded = event.loaded, total = event.total;
				if (self.options.showprogress) progress.setStyle('width', parseInt(loaded / total * 100, 10).limit(0, 100) + '%');
			},
			onComplete: function(){
				if (self.options.showprogress) progress.setStyle('width', '100%');
				self.fireEvent('complete', Array.slice(arguments));
				self.reset();
				this.reset();
			}
		});

		var inputname = input.get('name');

		var  inputFiles = new Form.MultipleFileInput(input, list, drop, {
/*			onDragenter: drop.addClass.pass('hover', drop),
			onDragleave: drop.removeClass.pass('hover', drop),
*/			onDrag: function(e){
				self.fireEvent('drag', e);
			},
			onDrop: function(e){
				self.fireEvent('drop', [e,inputFiles._files]);
				drop.removeClass.pass('hover', drop);
				if (self.options.fireAtOnce){
					uploadReq.options.url = form.get('action');
					self.submit(inputFiles, inputname, uploadReq);
				}
			},
			onChange: function(){
				if (self.options.fireAtOnce){
					self.submit(inputFiles, inputname, uploadReq);
				}
			}
		});

		form.addEvent('submit', function(event){
			if (event) event.preventDefault();
			self.submit(inputFiles, inputname, uploadReq);
		});

		self.reset = function() {
			var files = inputFiles.getFiles();
			for (var i = 0; i < files.length; i++){
				inputFiles.remove(files[i]);
			}
			console.log("self.reset");
		};
	},

	submit: function(inputFiles, inputname, uploadReq){
		
		// Append all post fields
		this.raw_form.getChildren('input').each(function(e){
			if (e.get('type')!='file') {
				uploadReq.append(e.name , e.value);
			}
		});		
		
		inputFiles.getFiles().each(function(file){
			uploadReq.append(inputname , file);
		});
		uploadReq.send();
	},

	legacyUpload: function(input){

		var rows = [];

		var row = input.getParent('.formRow');
		var rowClone = row.clone(true, true);
		var add = function(event){
			event.preventDefault();

			var newRow = rowClone.clone(true, true),
				inputID = String.uniqueID(),
				label = newRow.getElement('label');

			newRow.getElement('input').set('id', inputID).grab(new Element('a.delInputRow', {
				text: 'x',
				events: {click: function(event){
					event.preventDefault();
					newRow.destroy();
				}}
			}), 'after');

			if (label) label.set('for', inputID);
			newRow.inject(row, 'after');
			rows.push(newRow);
		};

		new Element('a.addInputRow', {
			text: '+',
			events: {click: add}
		}).inject(input, 'after');

		this.reset = function() {
			for (var i = 0; i < rows.length; i++){
				rows[i].destroy();
			}
			rows = [];
		};

	},

	isModern: function(){
		return !!this.modern;
	}

});

}).call(window);
