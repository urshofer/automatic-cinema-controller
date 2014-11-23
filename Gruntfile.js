module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: ['lib/paper-core.min.js','lib/MooTools-Core-1.5.1.js','lib/MooTools-More-1.5.1-compressed.js','src/**.js'],
        dest: 'www/js/v3.js/<%= pkg.name %>.min.js'
      },
      build: {
		options: {
		      mangle: false
		},
        src: ['lib/app.js','lib/services.js','lib/controllers.js'],
        dest: 'www/js/app.min.js'
      }/*,
	  copy: {
		  files: [
	        {expand: true, src: ['lib/*'], dest: 'www/js/v3.js', filter: 'isFile'},
		  ]
		}*/
    },
	cssmin: {
	  combine: {
	    files: {
	      'www/js/v3.css/<%= pkg.name %>.min.css': ['css/*.css']
	    }
	  }
	}
  });
  

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  
  // Default task(s).
  grunt.registerTask('default', ['uglify', 'cssmin']);

};
