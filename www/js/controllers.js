angular.module('starter.controllers', ['ionic'])

.controller('AppCtrl', function($rootScope, $scope, $ionicPopup, NetService, md5, $q,  $state) {

	if (window.localStorage['isunlocked'] == undefined) {
		window.localStorage['isunlocked'] = false;
	}
	$scope.isunlocked = window.localStorage['isunlocked'];
	

	$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){ 
		$scope.isunlocked = window.localStorage['isunlocked'];
		if ($rootScope.interval) {
			clearInterval($rootScope.interval);
		}
	})

	$scope.f = function(n,w){
	  var n_ = Math.abs(n);
	        var zeros = Math.max(0, w - Math.floor(n_).toString().length );
	        var zeroString = Math.pow(10,zeros).toString().substr(1);
	        if( n < 0 ) {
	                zeroString = '-' + zeroString;
	        }

	  return zeroString+n;
	}

	$scope.storeTime = function() {
		console.log("Stored Time: " + $scope.time);
		$scope.send({time:$scope.time}, "time");
	}
	
	$scope.changeTime = function(time) {
		$scope.time = time;
		$scope.formatted = $scope.f(Math.floor(time/60),2) + ":" + $scope.f(time%60,2);
		if ($scope.timeout) {
			clearTimeout($scope.timeout);
		}
		$scope.timeout = setTimeout($scope.storeTime, 500);
	}


	
	$scope.doLogin = function() {
		$scope.log_deferred = $q.defer();
		if ($scope.auth_token!=undefined) {
			console.log("Checking: " + $scope.auth_token);
			NetService.check($scope.auth_token).then(function(checked){
				if (!checked) {
					$scope.loginPop(true);					
				}
				else {
					$scope.log_deferred.resolve(true);
					$scope.loadconfig();						
				}
			})
		}
		else {
			if (window.localStorage['user']==undefined || window.localStorage['pass'] == undefined) {
				$scope.loginPop(true);				
			}
			else {
				NetService.login(window.localStorage['user'],window.localStorage['pass']).then(function(api_endpoint){
					if (!api_endpoint) {
						$scope.loginPop(true);
					}
					else {
						$scope.auth_token = api_endpoint;
						$scope.log_deferred.resolve(true);
					}
				});
			}
		}
		return $scope.log_deferred.promise;
	}
	
	
	// Open Popup if no local values are stored
	$scope.loginPop = function(force) {
	    if(window.localStorage['endpoint'] == undefined || window.localStorage['user'] == undefined || window.localStorage['pass'] == undefined || force) {
			$scope.data = {};		
			$scope.data.api = window.localStorage['endpoint'];
			$scope.data.user = window.localStorage['user'];

	        var myPopup = $ionicPopup.show({
	          template: '<label class="item item-input"><input type="text" placeholder="Api Endpoint" ng-model="data.api"></label>' +
	  			'<label class="item item-input"><input type="text" placeholder="Username" ng-model="data.user"></label>' +
	  			'<label class="item item-input"><input type="password" placeholder="Password" ng-model="data.password"></label>',
	          title: 'Setup',
	          subTitle: 'Please log in and set the api endpoint.',
	          scope: $scope,
	          buttons: [
	            { text: 'Cancel' },
	            {
	              text: '<b>Save</b>',
	              type: 'button-positive',
	              onTap: function(e) {
	                if (!$scope.data.password || !$scope.data.user || !$scope.data.api) {
	                  e.preventDefault();
	                } else {
	                  return $scope.data;
	                }
	              }
	            },
	          ]
	        });
	        myPopup.then(function(data) {
				if (data != undefined) {
					window.localStorage['endpoint'] 	= data.api;
					window.localStorage['user'] 		= data.user;
					window.localStorage['pass'] 		= md5.createHash(data.password);
					$scope.auth_token 	= undefined;
					$scope.doLogin();
				}
				else {
					console.log('Cancel');					
				}
	        });
	    }
	}
	
	$scope.unlock = function() {
		if ($scope.isunlocked) {
			$scope.isunlocked = false;
			window.localStorage['isunlocked'] = $scope.isunlocked;
			$state.go('app.target');			
		}
		else {
			$scope.data = {};		
	        var myPopup = $ionicPopup.show({
	          template: '<label class="item item-input"><input type="text" placeholder="Unlock Code" ng-model="data.lockcode"></label>',
	          title: 'Unlock',
	          subTitle: 'Unlock the remote to show all settings.',
	          scope: $scope,
	          buttons: [
	            { text: 'Cancel' },		  
	            {
	              text: '<b>Unlock</b>',
	              type: 'button-positive',
	              onTap: function(e) {
	                if (!$scope.data.lockcode) {
	                  e.preventDefault();
	                } else {
	                  return $scope.data;
	                }
	              }
	            },
	          ]
	        });
	        myPopup.then(function(data) {
				if (data != undefined) {
					if (window.localStorage['lock']==undefined) window.localStorage['lock'] = data.lockcode;
					window.localStorage['isunlocked'] 	= data.lockcode == window.localStorage['lock']?true:false;
					$scope.isunlocked = window.localStorage['isunlocked'];
				}
				else {
					console.log('Cancel');					
				}
	        });
		}
	}
	
	// Send json data on configuration
	
	$scope.send = function(data, type) {
		NetService.store(data, type, $scope.auth_token)
	}
	
	
	// Things on init: Load Config
	$scope.loadconfig = function() {
		console.log("Load Configuration");
		NetService.loadconfig($scope.auth_token).then(function(data){
			$scope.configuration = data;
			console.log($scope.configuration);
			$scope.time = parseInt($scope.configuration.time);
			$scope.formatted = $scope.f(Math.floor($scope.time/60),2) + ":" + $scope.f($scope.time%60,2);
		})
	};
})

.controller('LoginCtrl', function($scope, $stateParams) {
	$scope.doLogin();
})

.controller('SettingsCtrl', function($scope, $stateParams, NetService, $ionicPopup, $ionicModal, $ionicLoading, $state) {


	
	$scope.lock = function($scope) {
		$scope.lockcode = window.localStorage['lock'];
		$scope.savecode = function()
		{
			window.localStorage['lock'] = $scope.lockcode;
		}
	}
	
	$scope.change = function () {
		NetService.store($scope.configuration, "config", $scope.auth_token).then(function(data){
			if (data.Error) {
				$ionicPopup.alert({title: 'Error ' + data.Error.Code, template: data.Error.Message});
			}
			else $scope.reload();
		});
	}
	
	$scope.toggle = function (channel) {
		channel.status = channel.status=="Open"?"Close":"Open";
		NetService.toggle(channel.name, channel.status, $scope.auth_token);
	}	
	
	$scope.delete = function (channel, type) {
        var confirmPopup = $ionicPopup.confirm({
          title: 'Delete ' + type + ' ' + channel,
          template: 'Are you sure you want to delete this ' + type +'?'
        });
        confirmPopup.then(function(res) {
          if(res)
			  NetService.delete(channel, type, $scope.auth_token).then(function(data){$scope.reload();});
        });		
	}	
	
	$scope.reload = function() {
		$ionicLoading.show({template: 'Loading...', delay: 500});
		
		if ($scope.configuration == null) {
			$scope.loadconfig();
		}
		
		NetService.loadoptions($scope.auth_token).then(function(data){
			if (data.Error) {
				$ionicPopup.alert({title: 'Error ' + data.Error.Code, template: data.Error.Message});
			}
			$scope.options = data;
			NetService.loadchannels($scope.auth_token).then(function(data){
				if (data.Error) {
					$ionicPopup.alert({title: 'Error ' + data.Error.Code, template: data.Error.Message});
				}
				$scope.channels = data;
				$ionicLoading.hide();
			});
		});
	}

	$ionicModal.fromTemplateUrl('addshow.html', {
	  scope: $scope,
	  animation: 'slide-in-up'
	}).then(function(data){
	  $scope.show_modal = data
	});

	$ionicModal.fromTemplateUrl('addchannel.html', {
	  scope: $scope,
	  animation: 'slide-in-up'
	}).then(function(data){
	  $scope.channel_modal = data
	});

	$ionicModal.fromTemplateUrl('addstyle.html', {
	  scope: $scope,
	  animation: 'slide-in-up'
	}).then(function(data){
	  $scope.style_modal = data
	});
	$ionicModal.fromTemplateUrl('addtarget.html', {
	  scope: $scope,
	  animation: 'slide-in-up'
	}).then(function(data){
	  $scope.target_modal = data
	});
	$ionicModal.fromTemplateUrl('addcontent.html', {
	  scope: $scope,
	  animation: 'slide-in-up'
	}).then(function(data){
	  $scope.content_modal = data
	});		

	    $scope.add = function(type) {
			if (type == 'channel') {
				$scope.active_modal = $scope.channel_modal;
			}
			if (type == 'show') {
				$scope.active_modal = $scope.show_modal;
			}
			if (type == 'style') {
				$scope.active_modal = $scope.style_modal;
			}
			if (type == 'target') {
				$scope.active_modal = $scope.target_modal;
			}
			if (type == 'content') {
				$scope.active_modal = $scope.content_modal;
			}												
			$scope.active_modal.data = {};
			$scope.active_modal.show();
	    };
	    $scope.close = function() {
			$scope.active_modal.hide();
	    };
	    $scope.save = function(type) {
			NetService.store($scope.active_modal.data, "add"+type, $scope.auth_token).then(function(data){
				if (data.Error) {
					$ionicPopup.alert({title: 'Error ' + data.Error.Code, template: data.Error.Message});
				}
  				$scope.reload();
				$scope.close();				
			});
	    };		
	    //Cleanup the modal when we're done with it!
	    $scope.$on('$destroy', function() {
			if ($scope.active_modal != undefined) {
				$scope.active_modal.remove();
			}
	    });


	$scope.rename = function (channel, type) {
		var c = {name: channel}
		$scope.pop = c;
        $ionicPopup.show({
          template: '<label class="item item-input"><input type="input" placeholder="New Name" ng-model="pop.name"></label>',
          title: 'Rename '+type+' '+channel,
          subTitle: 'Type in the new name of the '+type+'.',
          scope: $scope,
          buttons: [
            { text: 'Cancel' },
            {
              text: '<b>Save</b>',
              type: 'button-positive',
              onTap: function(e) {
                if (!$scope.pop.name) {
                  e.preventDefault();
                } else {
                  return $scope.pop.name;
                }
              }
            },
          ]
        }).then(function(newname) {
			if (newname != undefined) {
				NetService.rename(channel, newname, $scope.auth_token, type).then(function(data){$scope.reload();});
			}
        });
	}	
	
	
	$scope.doLogin().then(function(state){
		if (state===true) {
			$scope.reload();
		}
	});
})

.controller('TargetCtrl', function($scope, $stateParams, $q, $ionicPopup, NetService) {

	$scope.doLogin().then(function(state){
		if (state===true) {
			NetService.load("target", $scope.auth_token).then(function(data){
				if (data.Error) {
					$ionicPopup.alert({title: 'Error ' + data.Error.Code, template: data.Error.Message});
					return;
				}
				$('target').makeTarget({
					json: data,
					onRender: function() {},
					onSave: function() {
						$scope.send({data:this._datapool}, "target");
					}
				});
			});
		}
	});
})

.controller('StyleCtrl', function($scope, $stateParams, $q, $ionicPopup, NetService) {

	$scope.drawChannels = function(cloud) {
		$scope.cloud = cloud;
		$scope.channels = cloud.exportChannels();
		console.log($scope.channels);
	}
	
	$scope.openChannel = function(id) {
		$scope.cloud.switchChannel(id);
	}

	$scope.doLogin().then(function(state){
		if (state===true) {
			NetService.load("style", $scope.auth_token).then(function(data){
				if (data.Error) {
					$ionicPopup.alert({title: 'Error ' + data.Error.Code, template: data.Error.Message});
					return;
				}
				$('stylematrix').makeCloud({
					data: data,
					onRender: function() {
						$scope.drawChannels(this);
					},
					onSave: function() {
						$scope.send({data:this._datapool}, "style");
					}
				});
			});
		}
	});
})

.controller('ContentCtrl', function($scope, $stateParams, $q, $ionicPopup, NetService) {

	
	$scope.drawDimensions = function(ontology) {
		$scope.ontology = ontology;
		$scope.dimensions = ontology.exportDimensions();
		console.log($scope.dimensions);
	}
	
	$scope.switchDimension = function(id) {
		$scope.ontology.switchDimension(id);
	}	

    $scope.deleteDimension= function() {
       var confirmPopup = $ionicPopup.confirm({
         title: 'Delete Active Dimension',
         template: 'Are you sure you want to delete this dimension?'
       });
       confirmPopup.then(function(res) {
         if(res && $scope.ontology) {
			$scope.ontology.deleteDimension(true);
         }
       });
     };

	$scope.renameDimension = function() {
		$scope.pop = {};
        $ionicPopup.show({
          template: '<label class="item item-input"><input type="input" placeholder="New Name" ng-model="pop.name"></label>',
          title: 'Rename Dimension',
          subTitle: 'Type in the new name of the active dimension.',
          scope: $scope,
          buttons: [
            { text: 'Cancel' },
            {
              text: '<b>Save</b>',
              type: 'button-positive',
              onTap: function(e) {
                if (!$scope.pop.name) {
                  e.preventDefault();
                } else {
                  return $scope.pop.name;
                }
              }
            },
          ]
        }).then(function(newname) {
			if ($scope.ontology != undefined && newname != undefined) {
				$scope.ontology.renameDimension(newname);
			}
        });
	}
	
	$scope.addDimension = function() {
		$scope.pop = {};
        var myPopup = $ionicPopup.show({
          template: '<label class="item item-input"><input type="input" placeholder="New Name" ng-model="pop.new"></label>',
          title: 'Add Dimension',
          subTitle: 'Type in the name of the new Dimension.',
          scope: $scope,
          buttons: [
            { text: 'Cancel' },
            {
              text: '<b>Save</b>',
              type: 'button-positive',
              onTap: function(e) {
                if (!$scope.pop.new) {
                  e.preventDefault();
                } else {
                  return $scope.pop.new;
                }
              }
            },
          ]
        });
        myPopup.then(function(newname) {
			if ($scope.ontology != undefined && newname != undefined) {
				$scope.ontology.addDimension(newname);
			}
        });
	}
	
	$scope.swapArrow = function() {
        $ionicPopup.show({
          title: 'Arrow Type',
          subTitle: 'Choose the arrow type.',
          buttons: [
            {
              text: '',
              type: 'button button-icon button-balanced icon button-clear ion-ios7-minus-empty',
              onTap: function(e) {
				  return 1;
              }
            },
            {
              text: '',
              type: 'button button-icon button-assertive icon button-clear ion-ios7-minus-empty',
              onTap: function(e) {
				  return 2;
              }
            },
            {
              text: '',
              type: 'button button-icon button-balanced icon button-clear ion-ios7-arrow-thin-right',
              onTap: function(e) {
				  return 3;
              }
            },
            {
              text: '',
              type: 'button button-icon button-assertive icon button-clear ion-ios7-arrow-thin-right',
              onTap: function(e) {
				  return 4;
              }
            }									
          ]
        }).then(function(type) {
			if ($scope.ontology != undefined && type != undefined) {
				$scope.ontology.changeLineStyle(type);
			}
        });
	}	
	
	$scope.doLogin().then(function(state){
		if (state===true) {	
			NetService.load("content", $scope.auth_token).then(function(data){
				if (data.Error) {
					$ionicPopup.alert({title: 'Error ' + data.Error.Code, template: data.Error.Message});
					return;
				}
				$scope.data = data;
				$('uploader_close').addEvent('click', function(e){
					this.getParent('div.uploadlayer').setStyle('display','none');
					this.setStyle('display','none');
					$('dimtags').removeEvents('click');
					$('dimtags').setStyle('display','none').set('html','');
				});
				$('ontology').makeOntology({
					data: $scope.data,
					onRender: function() {
						$scope.drawDimensions(this);
						var self = this;
						$('uploadform').action =  window.localStorage['endpoint'] + '/StoreFile/' + $scope.auth_token;
						var upload = new Form.Upload('url', {
							dropMsg: '',
							fireAtOnce: true,		
							dropzone: 'ontology',
							showlist: false,
							showprogress: 'progress',
							onDrop: function(e, files){
								var dim = self.currentDimension();
								var pos = self.convertCoordinate(e.event.clientX, e.event.clientY);
								
								$('add_dim').value	= self.currentDimension();
								$('add_x').value	= pos.x;
								$('add_y').value	= pos.y;
								
//								$('uploadform').action = action + "?x=" + pos.x + "&y=" + pos.y + "&d=" + dim;
								$('tit').set('html',"Dropping " + files[(files.length-1)].name + " in "+ dim);
								$('uploader').setStyle('opacity',0).setStyle('display','block').fade('in');
								$('progress').setStyle('opacity',0).setStyle('display','block').fade('in');
							},
							onComplete: function(json){
								$('uploader_close').setStyle('display','block');
								$('progress').setStyle('display','none');
								var data_complete = angular.fromJson(json);
								if (data_complete.Error || !data_complete) {
									$ionicPopup.alert({title: 'Error ' + data_complete.Error.Code, template: data_complete.Error.Message});
									return;
								}

								// Draw Map According to json

									$('tit').set('html',"Choose additional attributes" );
									$('dimtags').setStyle('opacity',0).setStyle('display','block').fade('in');
									size = $('dimtags').getSize();
									pos = $('dimtags').getPosition();

									$('dimtags').activeDim = false;
									$('dimtags').object = data_complete.object;
									$('dimtags').preview = data_complete.preview;
									
						
									self.redraw(data_complete.metadata);

									for( var k in data_complete.keywords ) {
										for( var e in data_complete.keywords[k] ) {
											if (e<=data_complete.keywords[k].length) {
												console.log("add " + k + "/" + data_complete.keywords[k][e][0] + "/" + data_complete.keywords[k][e][1][0] + "x" + data_complete.keywords[k][e][1][1]);
												var _data = data_complete.keywords[k][e];
												var e = Element('div', {
													'class': 	'adtags dim_'+k,
													'id': 		'kw'+k+'_'+e,
													'html': 	_data[0],
													'styles': {
														'margin-left': size.x / 100 * _data[1][0],
														'margin-top': size.y / 100 * _data[1][1]
													}									
												}).inject($('dimtags'));	
												e.k = k;
												e.addEvents({
													click: function() {
														var on = function(){this.toggleClass('adtag_highlight');}.bind(this);
														var timer = on.periodical(50);
														var off = function(){clearTimeout(timer);this.addClass('adtag_highlight');}.bind(this);
														off.delay(500);											
													},
													mouseover: function(){
														$$('div.adtags').setStyle('z-index', 0);
														$$('div.adtags').removeClass('adtag_highlight');
														$('dimtags').activeDim = this.k;
														$$('div.dim_'+this.k).each(function(e){
															e.addClass('adtag_highlight');
															e.setStyle('z-index', 1);
														});
													}											
												});
											}
										}
									}
						
									$('dimtags').addEvent('click', function(e) {
										e.stop();
										if (this.activeDim) {
											var send = {
												'dim': this.activeDim,
												'object': this.object,
												'preview': this.preview,													
												'x': 100 / size.x * (e.client.x - pos.x),
												'y': 100 / size.y * (e.client.y - pos.y)												
											}
											NetService.store(send, "annotate", $scope.auth_token).then(function(data){
												self.redraw(data);
											});
										}
										else {
											var on = function(){$$('div.adtags').toggleClass('adtag_highlight');};
											var timer = on.periodical(50);
											var off = function(){clearTimeout(timer);$$('div.adtags').removeClass('adtag_highlight');};
											off.delay(500);
										}
									});
							}
						});
					},
					previewPrefix: window.localStorage['endpoint'] + '/Preview/' + $scope.auth_token + '/',
					onSave: function() {
//						console.log($scope.data);

						$scope.send({data:this._datapool}, "content");
					}
				});
			});	
		}
	});	
})

.controller('TimelineCtrl', function($rootScope, $scope, $stateParams, $q, NetService, PaperService, $ionicScrollDelegate) {

	$scope.zoomfactor = .2;
	$scope.o = {};			// Parameter Object
	
	/**
	 * Actual Visualization Code
	 */

	$scope.o.chn_l = 10;		// Horizontal Border 
	$scope.o.chn_t = 17;	// Vertical Border
	$scope.o.chn_s = 20;	// Space between Title and Grafic
	$scope.o.chn_v = 20;	// Vertical Space between Channels
	$scope.o.leg_w = 50;
	$scope.o.clp_v = 25;	// Vertical Size: Clip
	$scope.o.scr_v = 50;	// Vertical Size: Scores
	$scope.o.dim_v = 25;	// Vertical Size: Dimension
	$scope.o.leg_v = 200;	// Channel Total Height
	$scope.o.gut_v = 2;		// Gutter Spacing between fonts,scores and lines (v)
	$scope.o.gut_h = 2;		// Gutter Spacing between fonts,scores and lines (h)
	$scope.o.gut_rv = 0;	// Gutter Spacing between rects and lines (v)
	$scope.o.gut_rh = 0;	// Gutter Spacing between rects and lines (h)
	$scope.o.col_b = [1, 1, 1]; // White Basic
	$scope.o.col_s = [.6,.6,.6]; // Grey Slave
	$scope.o.col_d = [.3,.3,.3]; // Grey Dimension
	$scope.o.col_p = [0, 1, 0];
	$scope.o.col_t = [1, 0, 0];
	$scope.o.col_h = [.2,.4, 1];
	$scope.o.fnt_b = 14;	// Channel Font Size
	$scope.o.fnt_s = 9;		// Legend Font Size
	$scope.o.s_min = .002;
	$scope.o.s_max = .01;
	
	$scope.timeline = {};
	$scope.titles = [];
	
	$scope.isLoading = false;				
	
	$scope.adjustTitles = function() {
		var offset = $ionicScrollDelegate.$getByHandle('timelinescroll').getScrollPosition().left;
		angular.forEach($scope.titles, function(title){
//			title.position.x = $scope.o.chn_l+offset;
		});
	}

	$scope.draw = function () {
		PaperService.clear();

		$scope.o.fct_t = ($scope.o.s_min + ($scope.o.s_max - $scope.o.s_min) ) * $scope.zoomfactor;
		var top = 0;
		var lines = [];
		var lines_dotted = [];
		$scope.titles = [];
		angular.forEach($scope.timeline, function(_data, name){
			var data = _data.data;
			var live = _data.live || 0;
			if (data != null && data.length>0) {
			// Title
			top += $scope.o.chn_t;
			$scope.titles.push(PaperService.text($scope.o.chn_l, top + $scope.o.fnt_b/3,name,$scope.o.fnt_b, $scope.o.col_b));
			top += $scope.o.chn_s;
		
			// Elements
			$scope.e = false;
			
			var lp = [];
			var lh = [];
			var lt = [];
			var ld = [];

			var _sc_p = [];
			var _sc_h = [];
			var _sc_t = [];			
			var _sc_d = [];	
			var x = 0;		
			var v_lines = [];
			// Horizontal Lines
			lines.push(top);
			lines.push(top + $scope.o.clp_v);
			lines.push(top+($scope.o.clp_v + $scope.o.scr_v));
						
			angular.forEach(data, function(e, name){
				if (e.element_id) {
					$scope.e = e;
				
					// Box
					x = $scope.o.chn_l + $scope.o.leg_w + (e.element_in * $scope.o.fct_t);
					var hsl = false;
					var color = $scope.o.col_s;
					if (e.element_parameters.Hue) {
						color = [parseFloat(e.element_parameters.Hue), e.element_parameters.Saturation * .01, e.element_parameters.Luminosity * .01];
						hsl = true;
					}
					PaperService.rect(x + $scope.o.gut_rh , top + $scope.o.gut_rv , (e.element_duration * $scope.o.fct_t) - 2 * $scope.o.gut_rh, $scope.o.clp_v - 2 * $scope.o.gut_rv, color, color, 1, hsl);						
					// Vertical Lines
			        if (v_lines.indexOf(x) == -1) v_lines.push(x);
					v_lines.push(x+(e.element_duration * $scope.o.fct_t));

					// Scores
					lp = [x,top+($scope.o.clp_v + $scope.o.scr_v)-(($scope.o.scr_v-(2*$scope.o.gut_v))*e.element_score_physical)];
					lh = [x,top+($scope.o.clp_v + $scope.o.scr_v)-(($scope.o.scr_v-(2*$scope.o.gut_v))*e.element_score_demerit)];
					lt = [x,top+($scope.o.clp_v + $scope.o.scr_v)-(($scope.o.scr_v-(2*$scope.o.gut_v))*e.element_score_tension)];	
					_sc_p.push(lp);
					_sc_h.push(lh);
					_sc_t.push(lt);

					// Dimensions
		
					if (e.dimensions.length>0) angular.forEach(e.dimensions, function(dimname, dimkey){
						// Score Line
						if (_sc_d[dimkey]==undefined) _sc_d[dimkey] = [];
						_sc_d_bottom = top + $scope.o.clp_v + $scope.o.scr_v + ((dimkey+1) * $scope.o.dim_v);
						_sc_d_height = $scope.o.dim_v - (2 * $scope.o.gut_rv);
						
						ld[dimkey] = [x, _sc_d_bottom - ((e.thresholds[dimkey]>0)?(_sc_d_height / e.thresholds[dimkey] * e.tension_dimensions[dimkey]):(0))];
						_sc_d[dimkey].push(ld[dimkey]);

						if (dimkey<e.dimensions.length-1) {
							lines_dotted.push(_sc_d_bottom);
						}

						// Push Keyword into right Dimension Box
						if (dimname==e.active_dimension)
							PaperService.text(x + $scope.o.gut_h, top + $scope.o.clp_v + $scope.o.scr_v + (dimkey * $scope.o.dim_v)  + $scope.o.fnt_s, e.keyword, $scope.o.fnt_s, $scope.o.col_s, "Helvetica", 35);	
					});
					lines.push(_sc_d_bottom);

					// Clip Name
					var element_name = e.element_name.substring(0, 30);
					element_name = element_name + Array(30 + 1 - element_name.length).join(' ');
					PaperService.text(x +  $scope.o.gut_h, top + $scope.o.clp_v +  $scope.o.scr_v + (e.dimensions.length *  $scope.o.dim_v) +  $scope.o.fnt_s, element_name,  $scope.o.fnt_s,  $scope.o.col_b, "Helvetica", 35);				

				}			
			});
			
			// Legend
			PaperService.text($scope.o.chn_l, top + $scope.o.clp_v / 2 + $scope.o.fnt_s/3, "Clips", $scope.o.fnt_s, $scope.o.col_b);		
			PaperService.text($scope.o.chn_l, top + $scope.o.clp_v + $scope.o.scr_v/4 +   $scope.o.fnt_s/3, "Physics", $scope.o.fnt_s, $scope.o.col_p);
			PaperService.text($scope.o.chn_l, top + $scope.o.clp_v + $scope.o.scr_v/4*2 + $scope.o.fnt_s/3, "History", $scope.o.fnt_s, $scope.o.col_h);
			PaperService.text($scope.o.chn_l, top + $scope.o.clp_v + $scope.o.scr_v/4*3 + $scope.o.fnt_s/3, "Tension", $scope.o.fnt_s, $scope.o.col_t);	
		

			// Score Lines
			if ($scope.e) {
				var last_x = x + $scope.e.element_duration * $scope.o.fct_t
				_sc_p.push([last_x,lp[1]]);
				_sc_h.push([last_x,lh[1]]);
				_sc_t.push([last_x,lt[1]]);			
				PaperService.path(_sc_p, 1, $scope.o.col_p);	
				PaperService.path(_sc_h, 1, $scope.o.col_h);	
				PaperService.path(_sc_t, 1, $scope.o.col_t);	
				angular.forEach(_sc_d, function(points, dimkey){		
					points.push([last_x,ld[dimkey][1]]);
					PaperService.path(points, 1, $scope.o.col_t);	
					PaperService.text($scope.o.chn_l, top + $scope.o.clp_v + $scope.o.scr_v + (dimkey * $scope.o.dim_v) + $scope.o.dim_v / 2 + $scope.o.fnt_s/3, $scope.e.dimensions[dimkey] + ($scope.e.dimensions[dimkey]==$scope.e.master_dimension?'*':''), $scope.o.fnt_s, $scope.o.col_b);		
				});
			}		

			var bottom = Math.ceil(PaperService.getMax().y / 20) * 20;
			// Live Line
			var live_x = $scope.o.chn_l + $scope.o.leg_w + (live * $scope.o.fct_t);
			PaperService.path([[live_x,top],[live_x,top+$scope.o.clp_v]], 2, $scope.o.col_t);	
			// Clip Dividers
			angular.forEach(v_lines, function(line){
				PaperService.path([[line,top],[line,bottom]], 1, $scope.o.col_b, [1,2]);	
			});			
			top = bottom;
		}
		});
		angular.forEach(lines, function(line){
			PaperService.path([[$scope.o.chn_l + $scope.o.leg_w,line],[PaperService.getMax().x,line]], 1, $scope.o.col_b);	
		});
		angular.forEach(lines_dotted, function(line){
			PaperService.path([[$scope.o.chn_l + $scope.o.leg_w,line],[PaperService.getMax().x,line]], 1, $scope.o.col_b, [1,2]);	
		});
		PaperService.draw();
		// Scroll View to right
		$ionicScrollDelegate.scrollBy(10000, 0, true);
	}
	
	$scope.zoom = function(zoom_in) {
		$scope.zoomfactor += zoom_in
								? .1
								: $scope.zoomfactor >.2?-.1:0;
		console.log($scope.zoomfactor);
		$scope.draw();
	}
	
	$scope.trigger = function() {
		NetService.timeline($scope.auth_token,"trigger").then(function(data){			
			$scope.load();
		})		
	}
	
	$scope.reset = function() {
		NetService.timeline($scope.auth_token,"reset").then(function(data){			
			$scope.load();
		})		
	}

	$scope.load = function() {
		if (!$scope.isLoading) {
			$scope.isLoading = true;
			NetService.timeline($scope.auth_token,"load").then(function(timeline){			
				$scope.timeline = timeline;
				$scope.draw();
				$scope.isLoading = false;			
			})		
		}
		else {
			console.log("already loading…");
		}
	}
	
	$scope.doLogin().then(function(state){
		if (state===true) {
			PaperService.init(document.getElementById('canvas'));
			NetService.loadchannels($scope.auth_token, true).then(function(data){
				if (data.Error) {
					$ionicPopup.alert({title: 'Error ' + data.Error.Code, template: data.Error.Message});
				}
				$scope.load();
				$rootScope.interval = setInterval($scope.load, 1000);
			});
		}
	});
})

.controller('GraphCtrl', function($rootScope, $scope, $stateParams, $q, NetService, PaperService, $ionicScrollDelegate) {


	$scope.o = {};			// Parameter Object
	
	/**
	 * Actual Visualization Code
	 */
	$scope.o.col_b = [1, 1, 1]; // White Basic
	$scope.o.col_g = [.5,.5,.5]; // Gray Basic

	
	$scope.o.col_c = [];			// Channel Colors ()
	$scope.o.col_c.push([ 0, 1, 0]);
	$scope.o.col_c.push([ 1, 0, 0]);
	$scope.o.col_c.push([.2,.4, 1]);	
			
	$scope.o.gut_h = 2;	// Gutter Spacing between fonts,scores and lines (h)	
	$scope.o.chn_l = 0;	// Horizontal Border 
	$scope.o.chn_t = 10;	// Vertical Border

	$scope.o.fnt_s = 9;

	$scope.draw = function () {
		PaperService.clear();
		$scope.o.max_width = window.getSize().x;
		$scope.o.max_height = window.getSize().y - 90;

//		console.log($scope.ontology);

		// Draw Keywords
		angular.forEach($scope.keywords, function(data){
			if (data.Keywords != null && Object.keys(data.Keywords).length>0 && data.Target[2]==1) {
				angular.forEach(data.Keywords, function(coord, name){
					var x = $scope.o.chn_l + (($scope.o.max_width - (2*$scope.o.chn_l)) / 100 *coord[0]);
					var y = $scope.o.chn_t + (($scope.o.max_height - (2*$scope.o.chn_t)) / 100 *coord[1]);
					PaperService.circle(x, y, 2, $scope.o.col_b, $scope.o.col_b);
					PaperService.text(x+2*$scope.o.gut_h, y+$scope.o.fnt_s-$scope.o.fnt_s/4+$scope.o.gut_h, name, $scope.o.fnt_s, $scope.o.col_b);
				});
			}
		});
		//console.log($scope.keywords)

		var channel_count = 0;
		var last_pos = [];
		angular.forEach($scope.timeline, function(_data, name){
			var data = _data.data;
			var live = _data.live || 0;
			if (data != null && data.length>0) {
				angular.forEach(data, function(e, nr){
					if (e.element_id) {
						var elm_pos = [];
						elm_pos[0] = $scope.o.chn_l + (($scope.o.max_width - (2*$scope.o.chn_l)) / 100 *e.current_position[0]);
						elm_pos[1] = $scope.o.chn_t + (($scope.o.max_height - (2*$scope.o.chn_t)) / 100 *e.current_position[1]);

						
						var cur_pos = [
							(e.cursor.Position!=undefined?e.cursor.Position:e.cursor)[0],
							(e.cursor.Position!=undefined?e.cursor.Position:e.cursor)[1]
							]
						var key_pos = [
							$scope.keywords[e.active_dimension].Keywords[e.keyword][0],
							$scope.keywords[e.active_dimension].Keywords[e.keyword][1]
							]
						var to_pos = [
							$scope.keywords[e.active_dimension].Keywords[e.tokeyword][0],
							$scope.keywords[e.active_dimension].Keywords[e.tokeyword][1]
							]							

						console.log("Cursor: "+cur_pos);
						console.log("Key " + e.keyword + " in " + e.active_dimension + ": "+key_pos);

						cur_pos[0] = $scope.o.chn_l + (($scope.o.max_width - (2*$scope.o.chn_l)) / 100 *cur_pos[0]);
						cur_pos[1] = $scope.o.chn_t + (($scope.o.max_height - (2*$scope.o.chn_t)) / 100 *cur_pos[1]);

						key_pos[0] = $scope.o.chn_l + (($scope.o.max_width - (2*$scope.o.chn_l)) / 100 *key_pos[0]);
						key_pos[1] = $scope.o.chn_t + (($scope.o.max_height - (2*$scope.o.chn_t)) / 100 *key_pos[1]);

						to_pos[0] = $scope.o.chn_l + (($scope.o.max_width - (2*$scope.o.chn_l)) / 100 *to_pos[0]);
						to_pos[1] = $scope.o.chn_t + (($scope.o.max_height - (2*$scope.o.chn_t)) / 100 *to_pos[1]);


						PaperService.circle(elm_pos[0], elm_pos[1], 2, $scope.o.col_c[channel_count], $scope.o.col_c[channel_count]);
						
						if (last_pos) {
							PaperService.path([elm_pos,last_pos], 1, $scope.o.col_c[channel_count]);							
						}
						if (nr == data.length-1) {
							PaperService.path([elm_pos,key_pos], 1, $scope.o.col_g, [4,2]);							
							PaperService.path([elm_pos,to_pos], 1, $scope.o.col_b, [4,2]);							
							var element_name = e.element_name.substring(0, 30);
							PaperService.text(elm_pos[0]+2*$scope.o.gut_h, elm_pos[1]+$scope.o.fnt_s-$scope.o.fnt_s/4+$scope.o.gut_h, element_name, $scope.o.fnt_s, $scope.o.col_c[channel_count]);

						}




						last_pos = elm_pos.clone();
					}
				});
				channel_count++;
			}
		});
		PaperService.draw();
	}
	
	$scope.trigger = function() {
		NetService.timeline($scope.auth_token,"trigger").then(function(data){			
			$scope.load();
		})		
	}
	
	$scope.reset = function() {
		NetService.timeline($scope.auth_token,"reset").then(function(data){			
			$scope.load();
		})		
	}

	$scope.load = function() {
		if (!$scope.isLoading) {
			$scope.isLoading = true;
			NetService.load("target", $scope.auth_token).then(function(data){
				$scope.keywords = data;
				NetService.timeline($scope.auth_token,"load").then(function(timeline){			
					$scope.timeline = timeline;
					$scope.draw();
					$scope.isLoading = false;			
				})		
			});
		}
		else {
			console.log("already loading…");
		}
	}
	
	$scope.doLogin().then(function(state){
		if (state===true) {
			PaperService.init(document.getElementById('canvas'));
			NetService.loadchannels($scope.auth_token, true).then(function(data){
				if (data.Error) {
					$ionicPopup.alert({title: 'Error ' + data.Error.Code, template: data.Error.Message});
				}
				$scope.load();
				$rootScope.interval = setInterval($scope.load, 1000);
			});
		}
	});
})


;
