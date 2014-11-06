
angular.module('starter.services', ['ngCookies', 'ngResource', 'ng'])

.factory('PaperService', function($q) {
	console.log("PaperService initialized...");	
	var max = [0,0];
	var canvas;
	var _storeMax = function(x,y) {
		if (x>max[0]) {
			max[0]=x;
		}
		if (y>max[1]) {
			max[1]=y;
		}			
	}
	var _path = function(points, linewidth, col, dash) {
		if (dash==undefined) dash = false;
		if (col==undefined) col = [0,0,0];
		if (linewidth==undefined) linewidth = 1;		
		var p = new paper.Path();
		p.strokeColor = new paper.Color(col);
		p.strokeWidth = linewidth;
		if (dash) p.dashArray = [dash[0],dash[1]?dash[1]:dash[0]];
		angular.forEach(points, function(point, key){
			p.add(new paper.Point(Math.floor(point[0]), Math.floor(point[1])));
			_storeMax(point[0],point[1]);
		});				
		p.translate(new paper.Point(.5, .5));
		return p;
	}
	
	return {
		init: function(_canvas) {
			canvas = _canvas;
			paper.setup(canvas);
			max = [0,0];
		},
		clear: function() {
			if(paper.project.activeLayer.hasChildren()){
		        paper.project.activeLayer.removeChildren();
				max = [0,0];
		    }
		},
		getMax: function() {
			return {x:max[0],y:max[1]};
		},
		update: function() {
			paper.view.draw();	
		},
		draw: function() {
			canvas.width = parseInt(max[0]);
			canvas.height = parseInt(max[1]);
			canvas.style.width = canvas.width + "px";
			canvas.style.height = canvas.height + "px";			
			paper.view.draw();	
		},
		path: function(points, linewidth, col, dash) {
			_path(points, linewidth, col, dash);
		},
		text: function(x, y, str, size, col, font, rotate) {
			if (size==undefined) size = 9;
			if (col==undefined) col = [0,0,0];
			if (font==undefined) font = "Helvetica";
			if (rotate==undefined) rotate = false;
			var t = new paper.PointText(new paper.Point(Math.floor(x), Math.floor(y)));
			t.content = str;
			t.characterStyle = {font: font, fontSize: size, fillColor: new paper.Color(col)};		
			if (rotate) t.rotate(rotate, new paper.Point(Math.floor(x), Math.floor(y)));
			_storeMax(x+t.bounds.width,y+t.bounds.height);
			t.translate(new paper.Point(.5, .5));
			return t;
		},
	
		rect: function(x, y, w, h, bcol, fcol, linewidth, hsl) {
			if (hsl==undefined) hsl = false;
			if (linewidth==undefined) linewidth = 1;
			if (bcol==undefined) bcol = [0,0,0];
			if (fcol==undefined) col = [0,0,0];
			var p = new paper.Path.Rectangle(new paper.Rectangle(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h)));
			if (bcol) {
				if (hsl) {
					p.strokeColor = new paper.HslColor(bcol[0], bcol[1], bcol[2]);
				}
				else {
					p.strokeColor = new paper.Color(bcol);
				}
			}
			if (fcol) {
				if (hsl) {
					p.fillColor = new paper.HslColor(bcol[0], bcol[1], bcol[2]);
				}
				else {
					p.fillColor = new paper.Color(bcol);
				}
			}		
			p.strokeWidth = linewidth;
			p.translate(new paper.Point(.5, .5));
			_storeMax(x+p.bounds.width,y+p.bounds.height);
		},
		
		circle: function(x, y, r, bcol, fcol, linewidth, hsl) {
			if (hsl==undefined) hsl = false;
			if (linewidth==undefined) linewidth = 1;
			if (bcol==undefined) bcol = [0,0,0];
			if (fcol==undefined) col = [0,0,0];			
			var p = new paper.Path.Circle(new paper.Point(Math.floor(x),Math.floor(y)), Math.floor(r));
			if (bcol) {
				if (hsl) {
					p.strokeColor = new paper.HslColor(bcol[0], bcol[1], bcol[2]);
				}
				else {
					p.strokeColor = new paper.Color(bcol);
				}
			}
			if (fcol) {
				if (hsl) {
					p.fillColor = new paper.HslColor(bcol[0], bcol[1], bcol[2]);
				}
				else {
					p.fillColor = new paper.Color(bcol);
				}
			}		
			p.strokeWidth = linewidth;
			p.translate(new paper.Point(.5, .5));
			_storeMax(x+r,y+r);
		},
		
		polyfill: function(points, bcol, fcol, linewidth) {
			if (bcol==undefined) bcol = [0,0,0];
			if (fcol==undefined) col = [0,0,0];	
			var p = _path(points, linewidth, bcol);
			if (fcol) {
				p.closePath();
				p.fillColor   = new paper.Color(fcol);
			}
			
		}			
				
	}
})

.factory('NetService', function($resource, $q, $http) {
	console.log("Network initialized...");	

	var channels = {};
	
	return {
		check: function(token) {
			var deferred = $q.defer();
			$http.get(window.localStorage['endpoint']+'/CheckSession/'+token).then(function(response) {				
				if (response.data == "true") {
					deferred.resolve(true);
				}
				else {
					deferred.resolve(false);
				}
			});
			return deferred.promise;
		},
		login: function(user, pass) {
			console.log("Login: "+user);
			var deferred = $q.defer();
			$http.post(window.localStorage['endpoint']+'/Login', {username:user, password:pass}).then(function(response){
				data = angular.fromJson(response.data);
				console.log(data);
				if (data.Error) {
					deferred.resolve(false);
				}
				else {
					deferred.resolve(data);
				}
			});
			return deferred.promise;
		},
		load: function(type, token) {
			var deferred = $q.defer();
			$http.get(window.localStorage['endpoint']+'/Load/'+token+'/'+type).then(function(response) {
				data = angular.fromJson(response.data);
				if (data.Error) {
					deferred.resolve(data);
				}
				else {
					deferred.resolve(data);
				}
			});
			return deferred.promise;
		},
		loadconfig: function(token) {
			var deferred = $q.defer();
			$http.get(window.localStorage['endpoint']+'/LoadConfig/'+token).then(function(response) {
				var configuration = angular.fromJson(response.data);
				deferred.resolve(configuration);
			});
			return deferred.promise;
		},		
		loadoptions: function(token) {
			var deferred = $q.defer();
			$http.get(window.localStorage['endpoint']+'/LoadOptions/'+token).then(function(response) {
				var data = angular.fromJson(response.data);
				console.log(data);
				var ret = data;
				if (ret.style == null ||	
					ret.target 	 == null ||	
					ret.content  == null
				) {
					ret.Error = {};
					ret.Error.Code = 100;
					ret.Error.Message = "Style, Target or Content missing.";					
				}
				if (ret.shows == null) {
					ret.Error = {};
					ret.Error.Code = 100;
					ret.Error.Message = "Show missing.";					
				}

				deferred.resolve(ret);
			});
			return deferred.promise;
		},	
		loadchannels: function(token, active_only) {
			if (active_only==undefined||active_only==false) filter = "/all";
			else filter = "";
			var deferred = $q.defer();
			$http.get(window.localStorage['endpoint']+'/Channels/'+token+filter).then(function(response) {		
				channels = angular.fromJson(response.data);
//				angular.forEach(ret, function(value, key){
//					value._status_asbool = value._status == "Close"?true:false;
//				});				
				deferred.resolve(channels);
			});
			return deferred.promise;
		},
		channelstate: function(token) {
			var deferred = $q.defer();
			var state = {};
			var ch_count = channels.length;
			angular.forEach(channels, function(value, key){
				$http.get(window.localStorage['endpoint']+'/State/'+token+'/'+ value.name).then(function(response) {
					state[value.name] = angular.fromJson(response.data);
					ch_count--;
					if (ch_count==0) {
						deferred.resolve(state);
					}
				});
			});	
			return deferred.promise;
		},		
		delete: function(contribid,state,token) {
			var deferred = $q.defer();
			$http.delete(window.localStorage['endpoint']+'/Delete/'+token+'/'+state+'/'+contribid).then(function(response) {
				deferred.resolve(response.data);
			});
			return deferred.promise;			
		},
		toggle: function(contribid,state,token) {
			var deferred = $q.defer();
			$http.get(window.localStorage['endpoint']+'/Toggle/'+token+'/'+contribid+'/'+state).then(function(response) {
				deferred.resolve(response.data);
			});
			return deferred.promise;			
		},
		rename: function(contribid,newname,token, state) {
			var deferred = $q.defer();
			$http.post(window.localStorage['endpoint']+'/Rename/'+token+'/'+state+'/'+contribid, {newname:newname}).then(function(response) {
				deferred.resolve(response.data);
			});
			return deferred.promise;			
		},		
		timeline: function(token, action) {
			var deferred = $q.defer();
			if (action == "load") {
				var timeline = {};
				var ch_count = channels.length;
				angular.forEach(channels, function(value, key){
					$http.get(window.localStorage['endpoint']+'/Timeline/'+token+'/'+ value.name).then(function(response) {
						timeline[value.name] = angular.fromJson(response.data);
						ch_count--;
						if (ch_count==0) {
							var ch_n = [];
							var tl = {};
							angular.forEach(timeline, function(value, key){ch_n.push(key);});
							ch_n.sort();
							angular.forEach(ch_n, function(value){
								tl[value] = timeline[value];
							});							
							deferred.resolve(tl);
						}
					});
				});				
			}
			else if (action == "trigger") {
				var ch_count = channels.length;
				console.log(ch_count)
				angular.forEach(channels, function(value, key){
					$http.get(window.localStorage['endpoint']+'/Next/'+token+'/'+ value.name).then(function(response) {
						ch_count--;
						if (ch_count==0) deferred.resolve(true);
					});
				});				
			}
			else if (action == "reset") {
				$http.get(window.localStorage['endpoint']+'/Reset/'+token).then(function(response) {		
					deferred.resolve(true);
				});
			}			
			return deferred.promise;			
		},
		store: function(data,type,token) {
			var deferred = $q.defer();
			$http.post(window.localStorage['endpoint']+'/Store/'+token+'/'+type, data).then(function(response) {
				deferred.resolve(angular.fromJson(response.data));
			});
			return deferred.promise;			
		}
	}
})

;
