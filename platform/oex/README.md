## Opera 12 ##

This platform is for the Presto based Opera (until 12). For Opera 15+ see the Chromium platform.

To install the extension, drag-n-drop the generated `config.xml` file from the `build/oex` directory onto the page of the Extension manager (<kbd>Ctrl+Shift+E</kbd>).

The browser is able to follow symbolic links, so using the `useln` argument for the `build.sh` script is recommended for faster testing, as it won't be neccessary to build, or even reload the extension if a modification is made to a content script (except `app.js`). For changes made to background content, the extension needs to be reloaded in the Extension manager (`app_bg.js` also needs to be built).

* [Developing Opera extensions](https://maqentaer.github.io/devopera-static-backup/http/dev.opera.com/addons/extensions/index.html) ([backup](https://github.com/operasoftware/devopera-static-backup))
* [Opera Extensions](https://addons.opera.com/extensions/)
