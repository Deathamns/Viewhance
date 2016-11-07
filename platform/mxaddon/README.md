## Maxthon ##

Dependencies: `mxpack` (included).

The browser is available only on Windows.
Installation happens by copying the `build/mxaddon` directory into `Maxthon_install_path\UserData\Users\guest\Addons\Viewhance`, or creating a directory junction ("hard link" for a folder) to the same location.

Alternatively, the built `.mxaddon` package can be drag-n-dropped onto the browser window (dropping over web-page content won't work) to install it.

Creating a junction (don't forget to delete it if you don't use it anymore):
```
mklink /H /D /J Maxthon_install_path\UserData\Users\guest\Addons\Viewhance build\mxaddon
```

Following this method, it's possible to use the `-useln` argument for the build script, i.e. there's no need to build the extension after every modification made to a content script (with the exception of the `app.js`), simply reloading the current tab is enough.

* [Maxthon Extension Development Guide & Package Tool](http://forum.maxthon.com/index.php?/topic/15294-sdk-maxthon-extension-development-guide-package-tool-20150521/)
* [Extension Center](http://extension.maxthon.com/)
* [mxpack.py by Rob Wu](https://github.com/Rob--W/extension-dev-tools/tree/master/maxthon)
