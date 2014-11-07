# Automatic Cinema Controller

**Installation & Run**

Open index.html in Firefox, Chrome or Safari. You need a fully functional Automatic Cinema Server as a prerequisite for this controller. You will be asked first to log into your server. You need to know the address (i.e. http://localhost:3000) and the username and the password. An account will be added the first time you log in with a username. Don't forget the password, there is currently no recover function. Passwords are stored encrypted in the database, so it's also hard to get it directly there.

**Cordova**

The www directory can be placed into a Apache Cordova Project. It relies on the Ionic Framework.

**Related Projects**

- Apache Cordova
- Ionic Framework
- Paper.js
- Mootools

**Build**

If you want to build the javascript files, theres a grunt task: first, install the grunt dependencies with ```npm install``` and then issue a ```grunt``` command. Grunt will produce a minified version of the controller libs.
