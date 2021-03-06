/*

Ontology Widget

Speichert Keywords und Abhängigkeiten zwischen Keywords in
mehreren Dimensionen. Ordnet Elemente diesen Keywords zu.


*/

window.performance = window.performance || {};
performance.now = (function() {
  return performance.now       ||
         performance.mozNow    ||
         performance.msNow     ||
         performance.oNow      ||
         performance.webkitNow ||
         function() { return new Date().getTime(); };
})();

(function(){

var Ontology = new Class({
	Implements: [Events, Options],

	options: {
		verboseid: false,
		data: false,
		previewPrefix: "/rf/Ajax/Animatedpreview"
	},
	
	// Constructor
	
	initialize: function(container, options) {  

		// Options
		this.setOptions(options);

		// Globals
		this._drawstate = false;		// Linienstatus: true - es wird eine Linie gezeichnet false - Linienzeichnung uaus
		this._cursorpos = [0,0];		// Cursor Position (x,y)
		this._currentcanvas = false;	// Current Active Canvas to draw on $()-Object
		this._actualdimension = 0;
		this._nodestack = Array();
		this._objectstack = Array();		
		this._keywordstack = Array();		
		this._dimensionstack = Array();
		this._keyword_id_mapping = Array();
		this._nodestyle = 1;			// Node Style
		this._datapool = Array();
		this._zoomfactor = 1;
		this._zoomoffset = [0,0];
		this._previewstack = Array();
		this._multiple = false;	// Dragging multiple elements with a hittest
		
		this.save_function = function(){ this.fireEvent('save', this); };
		this.save_timer = null;

		// Grabbing Elements
		this.container = $(container);
		
		if (this.options.verboseid) this.verb = $(this.options.verboseid);
		else this.verb = new Element('p');
				

		// Creating Keywords, Objects and Nodes from JSON Data
		this.loadJSON(this.options.data);

		// Creating Default Values... If absolutely no data is delivered
		if (!this._dimensionstack[this._actualdimension]) {
			this._dimensionstack[this._actualdimension] = "Dimension 1";
			this._datapool[this._dimensionstack[this._actualdimension]] = Array();

		}
		// Defining empty arrays for every dimension
		for( var k in this._dimensionstack ) {
			if (k<=this._dimensionstack.length) {
				if (!this._keywordstack[k]) this._keywordstack[k] = Array();
				if (!this._nodestack[k]) this._nodestack[k] = Array();			
				if (!this._objectstack[k]) {
					this._objectstack[k] = Array();						
				}
			}
		}
		// Draw Menu
		console.log("draw menu");
			this.drawMenu();
		console.log("done");		
		
		// Draw the initial setup
		console.log("draw menu");
			this.drawDimension();
		console.log("done");		

		// Container Handlers
		this.container.addEvents({
			'mousewheel': function(event) {
			    if (event.wheel > 0) this.zoomIn();
			    else if (event.wheel < 0) this.zoomOut();
			}.bind(this),
		    'contextmenu': function(event) {						// Cancel Line Drawing 
				event.preventDefault();
				event.stopPropagation();
				this.clearDraw();
			}.bind(this),
			'click': function(event) {					// Add New Keyword Handler
				this.clearDraw();
				this.keywordUpdate();
			}.bind(this),
			'dblclick': function(event) {					// Add New Keyword Handler
				this.clearDraw();
				this.addKeyword()
			}.bind(this),
			'mousemove': function(event) {					// Keeping track of the mouse
				this._cursorpos = Array(event.page.x - this.container.getPosition().x,event.page.y - this.container.getPosition().y);
				if (this._drawstate=="new") this.paintLine();	
				if (this.region_drawing) {
					this.region.setStyles({'width': event.page.x - this.region.getPosition().x,'height': event.page.y - this.region.getPosition().y});
				}						
			}.bind(this),
			'mousedown': function (event) {
				if (event.shift) {
					if (!this.region) {
						this.region = new Element('div', {'id': 'selector'});
						this.region.setStyles({'left': this._cursorpos[0],'top': this._cursorpos[1]});
						this.region.inject(this.container);		
						this.region_drawing = true;		
					}
				}
/*				else {
					if (this.region) {
						$$('div.ontology div.object').each(function(x){
							var bounds = x.getCoordinates();
							var compare = this.region.getCoordinates();
							if(!(compare.right < bounds.left || compare.left > bounds.right || compare.bottom < bounds.top || compare.top > bounds.bottom)) {
								x.fireEvent('mousedown', event);									   
							}
						}.bind(this));
					}					
				}*/
				event.stop();
			}.bind(this),
			'mouseup': function (event) {			
				if (event.shift) {
					if (this.region_drawing) this.region_drawing = false;
				}
				else if (this.region) {
					this.region.destroy();
					this.region = null;
				}				
			}.bind(this)			
		});
		
		
		// Add Redraw Event
		this.resizeTimer = false;
		window.removeEvents('resize');		
		window.addEvent('resize', function(event) {
		    if (this.resizeTimer) clearTimeout(this.resizeTimer);
			this.resizeTimer = this.redraw.delay(250, this);	
		}.bind(this));
		
		this.fireEvent('render', this);
		
	},
	
	guid: (function() {
	  function s4() {
	    return Math.floor((1 + Math.random()) * 0x10000)
	               .toString(16)
	               .substring(1);
	  }
	  return function() {
	    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
	           s4() + '-' + s4() + s4() + s4();
	  };
	})(),
	
	zoomIn: function() {
		// Store zoom Anchor the first time
		if (this._zoomfactor==1) {
			this._zoomoffset[0] = this._cursorpos[0];
			this._zoomoffset[1] = this._cursorpos[1];
		}
		this._zoomfactor < 19 ? this._zoomfactor+=2 : this._zoomfactor=20;	
		this.zoom.set('text',this._zoomfactor);
		clearTimeout(this.draw_timer);
		this.draw_timer = this.drawDimension.delay(250, this);		
	},

	zoomOut: function() {
		this._zoomfactor > 2 ? this._zoomfactor-=2 : this._zoomfactor=1;				
		this.zoom.set('text',this._zoomfactor);
		clearTimeout(this.draw_timer);
		this.draw_timer = this.drawDimension.delay(250, this);		
	},

	// Initialize Objects:Handlers	
	initobject: function(elm) {
		// Make Objects Draggable
		// Container Handlers

		elm.addEvents({
			'dblclick': function(event) {
				event.stop();
			}.bind(this),
			'mouseover': function(event) {
				event.stop();
//				elm.addClass('highlight');
				if(elm.imgprev==null) {
					elm.textprev = new Element('span').inject(elm).set('text', elm.orig_text);
				}	
				$$('div.ontology div.highlight').removeClass('highlight');

				/* Highlighting all elements with the same source */
				$$('div.ontology div.object').each(function(x){
					if (elm.orig_text==x.orig_text) {
						x.addClass('highlight');
					}
				}.bind(this));				
				
			}.bind(this),
			'mouseout': function(event) {
				event.stop();
				if(elm.imgprev==null && elm.textprev) {
					elm.textprev.destroy();
				}
			}.bind(this),
			/* Delete Object on right click */
			'contextmenu': function(event) {
					event.stop();	
					
					/* Multiple Selections: Activate slave elements and kill the region */
					if (this.region) {
						var compare = this.region.getCoordinates();
						this.region.destroy();
						this.region = null;
						$$('div.ontology div.object').each(function(x){
							if (x != elm) {
								var bounds = x.getCoordinates();
								if(!(compare.right < bounds.left || compare.left > bounds.right || compare.bottom < bounds.top || compare.top > bounds.bottom)) {
									x.fireEvent('contextmenu', event);									   
								}
							}
						}.bind(this));
					}					
					/* Delete Slave Hilightes */
					$$('div.ontology div.highlight').removeClass('highlight');
					/* Delete from Stack and Destroy Element */					
					console.log("Deleting "+elm.stackid)

					var del_name = this._objectstack[this._actualdimension][elm.stackid][0];
					var same_name = this._objectstack[this._actualdimension].filter(function(el) {return el[0] == del_name;})
					// Delete only one cloned copy 
					if (same_name.length>1) {
						this._objectstack[this._actualdimension].splice(elm.stackid, 1);
						console.log("Deleting clone only")
					}
					// Delete all Elements in the Ontology if this is the only copy 
					else {
						console.log("Wiping "+ del_name +" from all dimensions")
						for (var o in this._objectstack) if (this._objectstack.hasOwnProperty(o)) {
							console.log(this._objectstack[o])
							this._objectstack[o] = this._objectstack[o].filter(function(el) {return el[0] != del_name;})						
							console.log(this._objectstack[o])
						}
					}

					
					
					elm.destroy();			
					/* Store Data */
					this.updateJSON();		
					this.redraw();		
			}.bind(this)
		});		

		
		if (this._previewstack[elm.stackid]==true) {
				this.preview(elm);							
		}
		
	},
	
	// Initialize Keywords
	initkeyword: function(elm) {
		
		// In diesen Arrays werden die Node-Refernzen gespeichert
		
		elm.inNodes = Array();
		elm.outNodes = Array();
		elm.zOld = 10000;

		// Double Click: Edit Word
		elm.addEvent('dblclick', function(event) {
			event.preventDefault();
			event.stopPropagation();
			this.clearDraw();
			this.editKeyword(elm);
		}.bind(this));

		// 
		elm.addEvent('click', function(event) {
			event.stopPropagation();
		}.bind(this));
		
		// Right Click: Delete word
		elm.addEvent('contextmenu', function(event) {
			event.preventDefault();
			if (!this._drawstate) if (confirm("Delete Keyword "+elm.get('text'))) {
				this.deleteKeyword(elm);
			}
		}.bind(this));
		
		// Install Drag and Drop
		elm.drag = elm.makeDraggable({
			container: this.container,
			stopPropagation: true,
			onCancel: function(elm) {
				// Linie beenden wenn angefangen
				// und neue Anfangen
				this.startDraw(elm,this._nodestyle);
				if (newnode = this.finishDraw(elm))
					this.addNodeToStack(newnode);
			}.bind(this),
			onComplete: function(elm){
				// Update Node Positions
				this.updatePosition(elm,'keyword');
				elm.setStyle('z-index', elm.zOld);				
		    }.bind(this),
			onDrag: function(elm) {
				// Update attached Nodes
 				this.clearDraw();
				this.keywordUpdate(elm);
				this.updateNodes(elm);
				elm.setStyle('z-index', '50000');
			}.bind(this),
			onStop: function(elm) {
				// Update Position
			}.bind(this)			
		});
	},

	exportDimensions: function() {
		return this._dimensionstack;
	},
	
	switchDimension: function(i) {
		if (this._dimensionstack[i]) {
			this._actualdimension = i;			
			this.drawDimension();
		}
	},

	changeLineStyle: function(i) {
		if (i>0&&i<5) {
			this._nodestyle = i;	
		}
	},

	drawMenu: function() {
		// Background
		var bgo = new Element('div', {'id': 'ont_menu_bg'});
		var form = new Element('form', {'id': 'ont_menu_form'});
		form.inject(bgo);				

		//Draws all Menu items
		var new_e = Array();
		for (var i=1; i < 5; i++) {
			new_e[i] = new Element('img', {
			    'src': './img/ontology/l'+i+'.gif',
				'id': 'ont_menu'+i,
				'class': 'ont_menu_button',
				'chval': i
			});		
			new_e[i].sc = this;
		};
		$$(new_e).inject(bgo);				
		$$(new_e).addEvents({
	        'click': function(event){
				event.stopPropagation();
				if (this.sc._nodestyle != this.get('chval')) {
					this.addClass('ont_button_mouseover');						
				}
				$('ont_menu'+this.sc._nodestyle).removeClass('ont_button_mouseover')
				this.sc._nodestyle = this.get('chval');
	        },
	        'mouseover': function(event){this.addClass('ont_button_mouseover');},
	        'mouseout': function(event){if (this.sc._nodestyle != this.get('chval')) {this.removeClass('ont_button_mouseover')}}});
	
		var t1 = new Element('p', {'class': 'ont_tit_r','text': 'Connections'});		
		t1.inject(bgo);
		var t2 = new Element('p', {'class': 'ont_tit_l','text': 'Dimensions'});		
		t2.inject(bgo);
	
	
		// Dimension Select
		var sl = new Element('select', {'id': 'ont_menu_dim_sel', 'name': 'ont_menu_dim_sel'});		
		sl.inject(form);				
		for( var k in this._dimensionstack ) {
			if (k<=this._dimensionstack.length) {
				var sk = new Element('option', {
						'value': this._dimensionstack[k],
				    	'text': this._dimensionstack[k]
				});
			}		
			sk.inject(sl);				
		}		
		sl.addEvents({
	        'mousedown': function(event){
				return true;
	        }.bind(this),
	        'mouseup': function(event){
				return true;
	        }.bind(this),
	        'click': function(event){
				sl.focus();
			    var evt = document.createEvent("KeyboardEvent");
			     evt.initKeyEvent ("keypress", true, true, window,
			                       0, 0, 0, 0,
			                       40, 0) 
			     var canceled = !window.dispatchEvent(evt);
				 
				//sl.size=sl.length;
//				event.stopPropagation();
				return true;
	        }.bind(this),
	        'change': function(event){
				this._actualdimension = this._dimensionstack.indexOf($('ont_menu_dim_sel').value);
				this.drawDimension();
	        }.bind(this)
		});
		// Add / Delete Dimension
		var sd = new Element('input', {'type':'button','id': 'ont_menu_d_dim','class': 'ont_menu_adr_dim','value':'Delete'});		
		sd.inject(form);		
		var sa = new Element('input', {'type':'button','id': 'ont_menu_a_dim','class': 'ont_menu_adr_dim','value':'Add'});		
		sa.inject(form);	
		var sr = new Element('input', {'type':'button','id': 'ont_menu_r_dim','class': 'ont_menu_adr_dim','value':'Rename'});		
		sr.inject(form);			
		sd.addEvents({
	        'click': function(event){
				event.stopPropagation();
				sd.focus();
				this.deleteDimension();
	        }.bind(this)
		});
		sa.addEvents({
	        'click': function(event){
				event.stopPropagation();
				sa.focus();
				this.addDimension();
	        }.bind(this)
		});
		sr.addEvents({
	        'click': function(event){
				event.stopPropagation();
				sr.focus();
				this.renameDimension();
	        }.bind(this)
		});		
		this.container.grab(bgo);		
		
		// Zoom
		this.zoom = new Element('div', {'id': 'zoom'});
		this.zoom.set('text', this._zoomfactor);		
		this.container.grab(this.zoom);		
				
	//	this.container.setStyle('margin-top',bgo.getStyle('height'));
	//	bgo.setStyle('margin-top',(0-bgo.getSize().y)+'px');		
	//	this.container.setStyle('height',(this.container.getSize().y - bgo.getSize().y) + "px");		
	},

	deleteDimension: function(prompt) {
		if (this._dimensionstack.length==1) return (alert("Can not delete last Dimension"));
		if (prompt == undefined) {
			if (!(confirm("Delete Dimension "+this._dimensionstack[this._actualdimension]))) return;
		}
		$('ont_menu_dim_sel').getElement('option[value='+this._dimensionstack[this._actualdimension]+']').destroy();
		delete(this._datapool[this._dimensionstack[this._actualdimension]]);
		this.emptyStacks();

		for( var k in this._datapool ) {
			this._keywordstack.push(this._datapool[k]['Keywords']);
			this._nodestack.push(this._datapool[k]['Nodes']);			
			this._objectstack.push(this._datapool[k]['Objects']);			
			this._dimensionstack.push(k);
		}
		this._actualdimension=0;
		this.updateJSON();		
		this.drawDimension();		
	},
	
	addDimension: function(newname) {
		if (newname == undefined) {
			if (!(newname = prompt("Add Dimension:"))) return;
		}
		if (this._dimensionstack.indexOf(newname)!=-1) return alert("Dimension already exists");
		var k = parseInt(this._dimensionstack.push(newname) - 1);
		this._keywordstack[k] = Array();
		this._nodestack[k] = Array();			
		this._objectstack[k] = Array.clone(this._objectstack[this._actualdimension]);
		
		for (var o in this._objectstack[k]) if (this._objectstack[k].hasOwnProperty(o)) {
			this._objectstack[k][o][3] = true;
		}		
		
		this._datapool[this._dimensionstack[k]] = new Object();		
		var sk = new Element('option', {
			'value': this._dimensionstack[k],
	    	'text': this._dimensionstack[k]
		});
		sk.inject($('ont_menu_dim_sel'));		
		this._actualdimension = k;		
		this.updateJSON();	
		
		this.emptyStacks();
		this.loadJSON();
		this.drawDimension();		
	},

	emptyStacks: function() {
		this._dimensionstack.empty();
		this._keywordstack.empty();
		this._nodestack.empty();
		this._objectstack.empty();
	},

	renameDimension: function(newname) {
		if (newname == undefined) {
			if (!(newname = prompt("Add Dimension:"))) return;
		}		
		if (this._dimensionstack.indexOf(newname)!=-1) return alert("Dimension already exists");
		var oldid = this._datapool[this._dimensionstack[this._actualdimension]].id;
		delete(this._datapool[this._dimensionstack[this._actualdimension]]);
		$('ont_menu_dim_sel').getElement('option[value='+this._dimensionstack[this._actualdimension]+']').set('text',newname);
		$('ont_menu_dim_sel').getElement('option[value='+this._dimensionstack[this._actualdimension]+']').set('value',newname);		
		this._dimensionstack[this._actualdimension] = newname;
		this._datapool[this._dimensionstack[this._actualdimension]] = new Object();
		this.updateJSON(oldid);
	},

	loadJSON: function(data) {
//			console.log("Loading JSON with a size of: "+data.length+" Bytes.");
			if (data != null) this._datapool = data
			
			
			
			for( var k in this._datapool ) {
				if (this._datapool[k]['Keywords'] != null)
					this._keywordstack.push(this._datapool[k]['Keywords']);

				if (this._datapool[k]['Objects'] != null)
					this._objectstack.push(this._datapool[k]['Objects']);			

				if (this._datapool[k]['Nodes'] != null)
					this._nodestack.push(this._datapool[k]['Nodes']);			

				this._dimensionstack.push(k);
			}
	},

	updateJSON: function (id) {

		for (var d in this._dimensionstack) if (this._dimensionstack.hasOwnProperty(d)) {
			// JSONize the Data and save in in the input tag.		
			this._datapool[this._dimensionstack[d]]['Keywords'] = this._keywordstack[d];
			this._datapool[this._dimensionstack[d]]['Nodes'] = this._nodestack[d];
			this._datapool[this._dimensionstack[d]]['Objects'] = this._objectstack[d];
			this._datapool[this._dimensionstack[d]]._active = this._dimensionstack[this._actualdimension]
			
		}

		if (this._datapool[this._dimensionstack[this._actualdimension]].id == null) 
			this._datapool[this._dimensionstack[this._actualdimension]].id = (id==null?this.guid():id);

		clearTimeout(this.save_timer);
		this.save_timer = this.save_function.delay(1000, this);
	},

	// Draws all Objects, Keywords and Nodes for a certain Dimension

	drawDimension: function() {
		now = window.performance.now();

		if (this._drawstate=='new') this.clearDraw();		
		if (this._drawstate=='edit') this.keywordUpdate();		
		var dim = this._actualdimension;
		
//		console.log("Actual: " + dim + " Stack: " + this._dimensionstack[dim] );
		
		$('ont_menu_dim_sel').getElement('option[value='+this._dimensionstack[dim]+']').set('selected','selected');
			
		if (this._keyword_id_mapping[dim]==null) this._keyword_id_mapping[dim] = Array();
		// Clear the screen
		this.clearScreen();
		
		var cont_x = this.container.getSize().x;
		var cont_y = this.container.getSize().y;		
		
		// Installing Objects, Keywords and Nodes
		for( var k in this._keywordstack[dim] ) {
			if (k<=this._keywordstack[dim].length) {

//				console.log(this._zoomoffset[0] * (this._zoomfactor-1));

//				var x = this.container.getSize().x / 100 * this._keywordstack[dim][k][1][0];
//				var y = this.container.getSize().y / 100 * this._keywordstack[dim][k][1][1];

				var x = ((cont_x * this._zoomfactor) / 100 * this._keywordstack[dim][k][1][0]) - (this._zoomoffset[0] * (this._zoomfactor-1));
				var y = ((cont_y * this._zoomfactor) / 100 * this._keywordstack[dim][k][1][1]) - (this._zoomoffset[1] * (this._zoomfactor-1));
				this._keywordstack[dim][k]['id'] = this._keyword_id_mapping[dim][this._keywordstack[dim][k][0]] = this.addKeyword(x,y,this._keywordstack[dim][k][0]);
			}
		}

		for( var k in this._objectstack[dim] ) {
			if (k<=this._objectstack[dim].length) {
//				var x = this.container.getSize().x / 100 * this._objectstack[dim][k][1][0];
//				var y = this.container.getSize().y / 100 * this._objectstack[dim][k][1][1];
				if (this._objectstack[dim][k] != null) {
					var x = ((cont_x * this._zoomfactor) / 100 * this._objectstack[dim][k][1][0]) - (this._zoomoffset[0] * (this._zoomfactor-1));
					var y = ((cont_y * this._zoomfactor) / 100 * this._objectstack[dim][k][1][1]) - (this._zoomoffset[1] * (this._zoomfactor-1));
					this._objectstack[dim][k]['id'] = this.addObject(x,y,this._objectstack[dim][k][0],this._objectstack[dim][k][2], k,this._objectstack[dim][k][3]==="true"||this._objectstack[dim][k][3]===true?true:false);
				}
			}
		}
		
		$$('.object').makeDraggable({
			container: this.container,
			stopPropagation: true,
			onStart: function(elm, event) {
				
				/* Multiple Selections: Activate slave elements and kill the region */
				if (this.region) {
					var compare = this.region.getCoordinates();
					this.region.destroy();
					this.region = null;
					$$('div.ontology div.object').each(function(x){
						if (x != elm) {
							var bounds = x.getCoordinates();
							if(!(compare.right < bounds.left || compare.left > bounds.right || compare.bottom < bounds.top || compare.top > bounds.bottom)) {
								x.fireEvent('mousedown', event);									   
							}
						}
					}.bind(this));
				}				
				
				/* Duplicate Element */
				if (event.shift) {
					var newid = parseInt(this._objectstack[this._actualdimension].push(Array(this._objectstack[this._actualdimension][elm.stackid][0],Array(0,0),this._objectstack[this._actualdimension][elm.stackid][2])) - 1);
					this._objectstack[this._actualdimension][newid]['id'] = this.addObject(elm.getPosition(this.container).x,elm.getPosition(this.container).y,elm.orig_text,elm.get('prev'),newid,false);
					
					$(this._objectstack[this._actualdimension][newid]['id']).makeDraggable({
						container: this.container,
						stopPropagation: true,
						onStart: function(elm, event) {
				
							/* Multiple Selections: Activate slave elements and kill the region */
							if (this.region) {
								var compare = this.region.getCoordinates();
								this.region.destroy();
								this.region = null;
								$$('div.ontology div.object').each(function(x){
									if (x != elm) {
										var bounds = x.getCoordinates();
										if(!(compare.right < bounds.left || compare.left > bounds.right || compare.bottom < bounds.top || compare.top > bounds.bottom)) {
											x.fireEvent('mousedown', event);									   
										}
									}
								}.bind(this));
							}				
				
							/* Duplicate Element */
							if (event.shift) {
								var newid = parseInt(this._objectstack[this._actualdimension].push(Array(this._objectstack[this._actualdimension][elm.stackid][0],Array(0,0),this._objectstack[this._actualdimension][elm.stackid][2])) - 1);
								this._objectstack[this._actualdimension][newid]['id'] = this.addObject(elm.getPosition(this.container).x,elm.getPosition(this.container).y,elm.orig_text,elm.get('prev'),newid, false);
								this.updatePosition($(this._objectstack[this._actualdimension][newid]['id']),'object');
							}
						}.bind(this),
						onComplete: function(elm){						// Save Element Position
							elm.removeClass("notmoved")
							this.updatePosition(elm,'object');				
					    }.bind(this),
						onCancel: function(elm, event){						// On Cancel means: Click without move
							this.preview(elm);
					    }.bind(this)			
					});
					
					
					this.updatePosition($(this._objectstack[this._actualdimension][newid]['id']),'object');
				}
			}.bind(this),
			onComplete: function(elm){						// Save Element Position
				elm.removeClass("notmoved")
				this.updatePosition(elm,'object');				
		    }.bind(this),
			onCancel: function(elm, event){						// On Cancel means: Click without move
				this.preview(elm);
		    }.bind(this)			
		});
		
//		console.log("Drawing:" + this._objectstack[this._actualdimension].length + " Elements in Dimension: " + this._actualdimension);
		
		for( var k in this._nodestack[dim] ) {
			if (k<=this._nodestack[dim].length) {
				fromelm = $(this._keyword_id_mapping[dim][this._nodestack[dim][k][0]]);
				toelm = $(this._keyword_id_mapping[dim][this._nodestack[dim][k][1]]);
				var tempNode = this.drawNode(fromelm,toelm, this._nodestack[dim][k][2]);
				if (tempNode != null) {
					this._nodestack[dim][k]['id'] = tempNode;
//					console.log("Draw Node: " + fromelm + "/" + toelm + ".")				
				}
			}
		}
		
		console.log((window.performance.now()-now)/1000);

		
	},
	
	clearScreen: function() {
		this.container.getElements('.keyword').destroy();
		this.container.getElements('.object').destroy();		
		this.container.getElements('canvas').destroy();		
	},
		
	deleteKeyword: function(elm) {
		// Delete Nodes from/to
		for( var k in elm.outNodes ) if (elm.outNodes[k].id) this.deleteNode(elm.outNodes[k]);
		for( var k in elm.inNodes ) if (elm.inNodes[k].id) this.deleteNode(elm.inNodes[k]);
		// Delete from Data
		for( var k in this._keywordstack[this._actualdimension]) if (elm.id == this._keywordstack[this._actualdimension][k]['id']) this._keywordstack[this._actualdimension].splice(k,1);
		// Remove object
		this.updatePosition();
		elm.destroy();

		/* Store Data */
		this.updateJSON();			
	},

	// Loads the preview content
	preview: function(elm) {
		if(elm.imgprev!=null) {
			elm.imgprev.destroy();
			if(elm.textprev!=null) {
				elm.textprev.destroy();
				elm.textprev = null;
			}
			elm.imgprev = null;
			elm.removeClass('highlight');
			this._previewstack[elm.stackid] = false;
		}	
		else {	
			elm.imgprev = new Element('img').inject(elm).set('src',this.options.previewPrefix + elm.get('prev'));
			this._previewstack[elm.stackid] = true;
		}
	},

	startDraw: function(elm,type) {
		if (this._drawstate!=false) return;
		this.verb.set('text',"Start Line");
		this._drawstate="new";		
		var dt = new Date();
		var rd=Math.floor(Math.random()*1000)		
		var id = "canv_"+dt.getTime()+rd;
		var el = new Element('canvas', {
			'id': id,
		    'styles': {
				'position': 'absolute',
				'display': 'none'
		    },
		    'events': {
		        'contextmenu': function(event){
					if (this._drawstate) return;
					event.preventDefault();
					event.stopPropagation();
					$(id).addClass('line_canvas_highlighted');
					if (confirm("Delete Node "+$(id).id)) {
						this.deleteNode($(id));
					}
					else {
						$(id).removeClass('line_canvas_highlighted');										
					}
		        }.bind(this)
		    }		
		});
		this._currentcanvas = $(el);
		this._currentcanvas.from = elm;
		this._currentcanvas.type = type;
		this._currentcanvas.context = this._currentcanvas.getContext("2d");
		this._currentcanvas.inject(this.container);
	},

	addNodeToStack: function(canvasid) {
		var canv = $(canvasid);
		var add = Array();
		add[0] = canv.from.get('text');
		add[1] = canv.to.get('text');
		add[2] = canv.type;
		add['id'] = canvasid;					
		this._nodestack[this._actualdimension].push(add);
		this.updateJSON();
	},

	deleteNode: function(elm) {
		for( var k in this._nodestack[this._actualdimension]) {
			// Delete from Data			
			if (elm.id == this._nodestack[this._actualdimension][k]['id']){
				 this._nodestack[this._actualdimension].splice(k,1);
				// Remove object
				elm.destroy();
				this.updateJSON();
			}
		}
	},

	clearDraw: function() {
		
		if (this.region) {
			this.region.destroy();
			this.region = null;
		}
		
		if (this._drawstate != "new") return;
		this._drawstate=false;
		this.verb.set('text',"Clear Line");
		$(this._currentcanvas).destroy();
	},

	finishDraw: function(elm) {
		//alert(elm.get('text'));
		if (elm==null) return false;
		if (this._drawstate != "new") return false;
		//same?
		if (this._currentcanvas.from == null || elm.id==this._currentcanvas.from.id) return;
		this._drawstate=false;
		this.verb.set('text',"Finish Line");
		this._currentcanvas.to = elm;
		this._currentcanvas.from.outNodes.push(this._currentcanvas);
		elm.inNodes.push(this._currentcanvas);

		// Todo: Save Element to the Stack
		//Stack: Array[dimension][element] = Array[type][fromelement][toelement]
		// Only Update - neue hinzufügen, alte überschreiben.
		return this._currentcanvas.id;
	},
		
	drawNode: function(fromelm,toelm,type) {
		// Draws a node from - to with a certain type
		if (fromelm != null && toelm != null) {
			this.startDraw(fromelm,type);
			this.paintLine(fromelm,toelm);		 
			var newid = this.finishDraw(toelm);
			return newid;
		}
		else return null;
	},
	
	updatePosition: function(elm,type) {
		// Save a position of a object
		// Objects are only updated since already in stack
		if (type=='keyword') {
			for( var k in this._keywordstack[this._actualdimension] ) {
				if (this._keywordstack[this._actualdimension][k]['id']==elm.id) {
					this._keywordstack[this._actualdimension][k][1][0] = 100 / (this.container.getSize().x * this._zoomfactor) * (elm.getPosition(this.container).x + (this._zoomoffset[0] * (this._zoomfactor-1)));
					this._keywordstack[this._actualdimension][k][1][1] = 100 / (this.container.getSize().y * this._zoomfactor) * (elm.getPosition(this.container).y + (this._zoomoffset[1] * (this._zoomfactor-1)));
					this._keywordstack[this._actualdimension][k][0] = elm.get('text');
					this.updateJSON();
					return true;
				}
			}
			// Add a new one			
			var add = Array();
			var cor = Array()
			add[0] = elm.get('text');
			cor[0] = 100 / (this.container.getSize().x * this._zoomfactor) * (elm.getPosition(this.container).x + (this._zoomoffset[0] * (this._zoomfactor-1)));
			cor[1] = 100 / (this.container.getSize().y * this._zoomfactor) * (elm.getPosition(this.container).y + (this._zoomoffset[1] * (this._zoomfactor-1)));
			add[1] = cor;
			add['id'] = elm.id;					
			this._keywordstack[this._actualdimension].push(add);
			this.updateJSON();
			return true;
		}
		// Save a position of a keyword
		if (type=='object') {
				var xcord = 100 / (this.container.getSize().x * this._zoomfactor) * (elm.getPosition(this.container).x + (this._zoomoffset[0] * (this._zoomfactor-1)));
				var ycord = 100 / (this.container.getSize().y * this._zoomfactor) * (elm.getPosition(this.container).y + (this._zoomoffset[1] * (this._zoomfactor-1)));
//				console.log("Updating Position of element "+elm.stackid+": "+xcord+"/"+ycord);
//				console.log(this._objectstack[this._actualdimension][elm.stackid]);
				this._objectstack[this._actualdimension][elm.stackid][1][0] = xcord;
				this._objectstack[this._actualdimension][elm.stackid][1][1] = ycord;
				this._objectstack[this._actualdimension][elm.stackid][3] = elm.hasClass('notmoved')?true:false;

				this.updateJSON();
				return true;
		}				
	},				
	
	updateNodes: function(elm) {
		// Changes the position of an existing Line
		this._drawstate = "update";
		for( var k in elm.outNodes ) {
			if (elm.outNodes[k].id) {
				this._currentcanvas = elm.outNodes[k];
				this.paintLine(elm,this._currentcanvas.to,this._currentcanvas.type);
			}
		}
		for( var k in elm.inNodes ) {
			if (elm.inNodes[k].id) {
				this._currentcanvas = elm.inNodes[k];
				this.paintLine(this._currentcanvas.from,elm,this._currentcanvas.type);		
			}
		}		
		this._drawstate = false;
	},
	
	paintLine: function(fromelm,toelm,type) {

		// Implement: Type!

		if (!this._drawstate) return;		


		// Getting Positions for the Canvas
		if (typeof(fromelm)=='object' && fromelm != null) {
//			var sz = fromelm.getSize();
			var po = fromelm.getPosition(this.container);
		}
		else {
			if (typeof(this._currentcanvas.from)=='object' && this._currentcanvas.from != null) {	
//				var sz = this._currentcanvas.from.getSize();
				var po = this._currentcanvas.from.getPosition(this.container);
			}
			else {
			/* Emergency Break if Data missing */
				return false;
			}
		}			
		
		if (typeof(toelm)=='object' && toelm != null) {
//			var tsz = toelm.getSize();
			var tpo = toelm.getPosition(this.container);			
		}
		else {
			var tpo = new Object;
			var tsz = new Object;			
			tpo.x = this._cursorpos[0];
			tpo.y = this._cursorpos[1];
//			tsz.x = 0;
//			tsz.y = 0;
		}
		
//		var right = (tpo.x>po.x)?(tpo.x):(po.x);
//		var bottom =  (tpo.y>po.y)?(tpo.y):(po.y);
//		var left = (po.x<tpo.x)?(po.x):(tpo.x);
//		var top = (po.y<tpo.y)?(po.y):(tpo.y);		


		// alert(left+"-"+top+"-"+right+"-"+bottom)

		// Moving the Canvas
		this._currentcanvas.setStyles({'left': ((po.x<tpo.x)?(po.x):(tpo.x)) - 4,'top': ((po.y<tpo.y)?(po.y):(tpo.y)) - 4,'display': 'block', 'margin': '0px'});
		this._currentcanvas.width = Math.abs(po.x-tpo.x) + 8;
		this._currentcanvas.height = Math.abs(po.y-tpo.y) + 8;


		// Drawing the Line
		// Todo: Abhängig vom eingestellen Bezugsverhältnis: Pfeil und Farbe
		if (this._currentcanvas.type==2 || this._currentcanvas.type==4)this._currentcanvas.context.strokeStyle = "#F00";
		else this._currentcanvas.context.strokeStyle = "#0F0";		

		/*
		// Get Positions relative to in Canvas
		if (typeof(this._currentcanvas.from)=='object' && this._currentcanvas.from != null) {	
			var lfrx = this._currentcanvas.from.getPosition(this._currentcanvas).x;// + sz.x/2;
			var lfry = this._currentcanvas.from.getPosition(this._currentcanvas).y;// + sz.y/2;
		}
		else {
		// Emergency Break if Data missing 
			return false;
		}
		*/
		
		
		/*
		if (typeof(toelm)=='object' && toelm != null) {		
			var ltox = toelm.getPosition(this._currentcanvas).x;// + tsz.x/2;
			var ltoy = toelm.getPosition(this._currentcanvas).y;// + tsz.y/2;
		}
		else {
			var ltox = tpo.x-this._currentcanvas.getPosition(this.container).x;
			var ltoy = tpo.y-this._currentcanvas.getPosition(this.container).y;
		}
*/
		
		var lfrx = po.x-this._currentcanvas.getPosition(this.container).x;
		var lfry = po.y-this._currentcanvas.getPosition(this.container).y;
		var ltox = tpo.x-this._currentcanvas.getPosition(this.container).x;
		var ltoy = tpo.y-this._currentcanvas.getPosition(this.container).y;
		
		this._currentcanvas.context.beginPath();
		this._currentcanvas.context.lineWidth = 1.5;
		this._currentcanvas.context.moveTo(lfrx,lfry);
		this._currentcanvas.context.lineTo(ltox,ltoy);
		this._currentcanvas.context.stroke();

		// Arrow Head
		// Distance and Deltas
		var dx = ltox - lfrx;
		var dy = ltoy - lfry;
		var d = Math.sqrt((dx*dx)+(dy*dy));
		var fx = dx/d;
		var fy = dy/d;
		if (this._currentcanvas.type==3 || this._currentcanvas.type==4) {
			for (var i=2; i <= 8; i++) {
				this._currentcanvas.context.beginPath();
				this._currentcanvas.context.lineWidth = i;			
//				this._currentcanvas.context.moveTo(ltox - ((i*2.5)*fx+(fx*tsz.x/2)),ltoy - ((i*2.5)*fy+(fy*tsz.y/2)));
//				this._currentcanvas.context.lineTo(ltox - ((i*2.5+2.5)*fx+(fx*tsz.x/2)),ltoy - ((i*2.5+2.5)*fy+(fy*tsz.y/2)));			
				this._currentcanvas.context.moveTo(ltox - ((i*2)*fx),ltoy - ((i*2)*fy));
				this._currentcanvas.context.lineTo(ltox - ((i*2+2)*fx),ltoy - ((i*2+2)*fy));			
				this._currentcanvas.context.stroke();
			};
		}
		this.verb.set('text',"Currently Drawing: "+(this._currentcanvas.width)+"/"+(this._currentcanvas.height));	
	},
	
	addKeyword: function(l,t,v) {
		if (this._drawstate) return;		
		this.verb.set('text',"Add a keyword");	
		var dt = new Date();
		var rd=Math.floor(Math.random()*1000)		
		var id = "key_"+dt.getTime()+rd;			
		var new_e = new Element('div', {
			'class': 	'keyword',
			'id': 		id,
			'html': 	'<div><span>' + ((v!=null)?(v):('Please Edit')) + '</span></div>',
		    'styles': {
				'left': (l!=null)?(l):(this._cursorpos[0]),
				'top': (t!=null)?(t):this._cursorpos[1]
		    }
		});
		new_e.inject(this.container);	
		this.initkeyword(new_e);	
		if (v==null) this.editKeyword(new_e);
		return id;
	},

	addObject: function(l,t,v,p,nr,notmoved) {
		this.verb.set('text',"Add an object");	
//		var dt = new Date();
//		var rd=Math.floor(Math.random()*1000)
		var id = "obj_"+nr;			
		var new_e = new Element('div', {
		    'class': 'object'+(notmoved===true?' notmoved':''),
			'id' : id,
			'prev': p,  
			'html': '&nbsp;',		
		    'styles': {
				'left': l,
				'top': t		
		    }
		});
		new_e.stackid = nr;
		new_e.orig_text = v;
		new_e.inject(this.container);	
		this.initobject(new_e);	
		return id;
	},

	
	// Substitute Content with form element
	editKeyword: function(elm) {
		if (this._drawstate) return;
		this._drawstate = "edit";
		var new_e = new Element('input', {
		    'value': elm.get('text'),
		    'id': 'onto_upd_input',		
		    'styles': {
				'width': (parseInt(elm.getStyle('width'))<40)?(40):(elm.getStyle('width')),
				'height': '20px',
				'z-index': '20000'
		    },		
		    'events': {
		        'click': function(event){
					event.stopPropagation();
					new_e.focus();
					new_e.select();
		        }.bind(this),
		        'keydown': function(event){
		            if (event.key == "enter") this.keywordUpdate(elm);
		        }.bind(this)
		    }
		});		
		elm.getElement('span').set('text','');
		new_e.inject(elm.getElement('span'));	
		new_e.focus();
		new_e.select();
		// Disable all Dragging
		for(var k in this._keywordstack[this._actualdimension]) if (this._keywordstack[this._actualdimension][k]['id']) $(this._keywordstack[this._actualdimension][k]['id']).drag.detach();
	},
	
	// Save an updated keyword
	keywordUpdate: function(elm) {
		if (!this._drawstate) return;
		if (elm==null) elm = $('onto_upd_input').getParent('div.keyword');
		// Check for existing Words in the Definition
		for(var k in this._keywordstack[this._actualdimension]) if (this._keywordstack[this._actualdimension][k][0]==elm.getElement('input').get('value') && this._keywordstack[this._actualdimension][k]['id']!=elm.id) return alert("Keyword already exists in this Dimension!\Please change it...");
		// Enable all Dragging
		for(var k in this._keywordstack[this._actualdimension]) if (this._keywordstack[this._actualdimension][k]['id']) $(this._keywordstack[this._actualdimension][k]['id']).drag.attach();
		this._drawstate = false;		
		elm.set('html','<div><span>' + (elm.getElement('input').get('value')) + '</span></div>');
		elm.setStyle('padding','0px');		
		this.updatePosition(elm,'keyword');
	},
	
	/* 
		Helper Functions: get Current Dimension
	*/
	
	currentDimension: function(asBool) {
		if (asBool==null || asBool==false) return this._dimensionstack[this._actualdimension];
		else return this._actualdimension;
	},
	
	/*
		Returns a coordinate x and y into percentages
	*/
	convertCoordinate: function(x,y) {
		return {
			'x' : 100 / (this.container.getSize().x * this._zoomfactor) * ((x - this.container.getPosition().x) + (this._zoomoffset[0] * (this._zoomfactor-1))),
			'y' : 100 / (this.container.getSize().y * this._zoomfactor) * ((y - this.container.getPosition().y) + (this._zoomoffset[1] * (this._zoomfactor-1)))
		};
	},
	
	/*
		Complete reload and redraw
	*/
	redraw: function(json) {
		this.emptyStacks();
		this.loadJSON(json);
		this.drawDimension();		
	}
	
	
});

Element.implement({
	makeOntology: function(options){
		var ontology = new Ontology(this, options);
		return ontology;
	}

});
})();