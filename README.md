Automatic Cinema Controller
===========================

**Installation & Run**

Open index.html in Firefox, Chrome or Safari. You need a fully functional
Automatic Cinema Server as a prerequisite for this controller. You will be asked
first to log into your server. You need to know the address (i.e.
http://localhost:3000) and the username and the password. An account will be
added the first time you log in with a username. Don't forget the password,
there is currently no recover function. Passwords are stored encrypted in the
database, so it's also hard to get it directly there.

**Ionic Framework​**

The Automatic Cinema Controller is built on top of the Ionic Framework. It can
be packed into an app with Apache Cordova or built as a native Application with
Atom's Electron Framework

**Related Projects**

-   Apache Cordova

-   Ionic Framework

-   Paper.js

-   Mootools

**Modification and Building​**

If you want to build the javascript files, theres a grunt task: first, install
the grunt dependencies with `npm install` and then issue a `grunt` command.
Grunt will produce a minified version of the controller libs and copy them into
the www folder.

**Using Electron to build an OSX native App​**

You can move the contents of www folder into the /Contents/Resources/app Folder
of the an Electron.app binary. Electron will automatically look for the main.js
script and start the controller. Alternatively you can pack the www folder into
a asar archive with Atom's asar tool.
