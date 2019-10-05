## Opera (Presto) ##

This (legacy) platform is for the Presto based Opera (until 12). For Opera 15+ see the `crx` platform.

To install the extension, drag-n-drop the generated `config.xml` file from the `build/oex` directory onto the page of the Extension manager (<kbd>Ctrl+Shift+E</kbd>).

The browser is able to follow symbolic links, so using the `-useln` argument for the build script is recommended for faster testing, as it won't be neccessary to build, or even reload the extension if a modification is made to a content script (except `app.js` and `options.html`). For changes made to background content, the extension needs to be reloaded in the Extension manager.

* [Developing Opera extensions](https://maqentaer.github.io/devopera-static-backup/http/dev.opera.com/addons/extensions/index.html) [#2](https://maqentaer.com/operaextensions.js/docs/) ([backup](https://github.com/operasoftware/devopera-static-backup))
* [Opera Extensions](https://addons.opera.com/extensions/)
