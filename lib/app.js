
angular.module('starter', ['ionic', 'starter.services',  'starter.controllers', 'angular-md5'])

// Reconfigure Post Header

.config(function($httpProvider) {
  // Use x-www-form-urlencoded Content-Type
  $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

  /**
   * The workhorse; converts an object to x-www-form-urlencoded serialization.
   * @param {Object} obj
   * @return {String}
   */ 
  var param = function(obj) {
    var query = '', name, value, fullSubName, subName, subValue, innerObj, i;
      
    for(name in obj) {
      value = obj[name];
        
      if(value instanceof Array) {
        for(i=0; i<value.length; ++i) {
          subValue = value[i];
          fullSubName = name + '[' + i + ']';
          innerObj = {};
          innerObj[fullSubName] = subValue;
          query += param(innerObj) + '&';
        }
      }
      else if(value instanceof Object) {
        for(subName in value) {
          subValue = value[subName];
          fullSubName = name + '[' + subName + ']';
          innerObj = {};
          innerObj[fullSubName] = subValue;
          query += param(innerObj) + '&';
        }
      }
      else if(value !== undefined && value !== null)
        query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
    }
      
    return query.length ? query.substr(0, query.length - 1) : query;
  };

  // Override $http service's default transformRequest
  $httpProvider.defaults.transformRequest = [function(data) {
    return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
  }];
  
  $httpProvider.defaults.transformResponse = []

  
})


.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  	console.log("Platform initialized...");	
	
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('app', {
      url: "/app",
      abstract: true,
      templateUrl: "templates/menu.html",
      controller: 'AppCtrl'
    })

    .state('app.index', {
      url: "/index",
      views: {
        'menuContent' :{
          templateUrl: "templates/index.html",
		  controller: 'LoginCtrl'  
        }
      }
    })

    .state('app.target', {
      url: "/target",
      views: {
        'menuContent' :{
          templateUrl: "templates/target.html",
		  controller: 'TargetCtrl'		  
        }
      }
    })
	
    .state('app.style', {
      url: "/style",
      views: {
        'menuContent' :{
          templateUrl: "templates/style.html",
		  controller: 'StyleCtrl'		  
        }
      }
    })	
	
    .state('app.timeline', {
      url: "/timeline",
      views: {
        'menuContent' :{
          templateUrl: "templates/timeline.html",
		  controller: 'TimelineCtrl'		  
        }
      }
    })

    .state('app.graph', {
      url: "/graph",
      views: {
        'menuContent' :{
          templateUrl: "templates/graph.html",
		  controller: 'GraphCtrl'		  
        }
      }
    })
		
    .state('app.content', {
      url: "/content",
      views: {
        'menuContent' :{
          templateUrl: "templates/content.html",
		  controller: 'ContentCtrl'		  
        }
      }
    })	
	
    .state('app.settings', {
      url: "/settings",
      views: {
        'menuContent' :{
          templateUrl: "templates/settings.html",
		  controller: 'SettingsCtrl'		  
        }
      }
    })
	
	;
	
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/index');
});

