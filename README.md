# Viewhance #
A browser extension to enhance the browser's default media viewer.

To try it out (when installed), open a media file ([image](http://upload.wikimedia.org/wikipedia/commons/e/ec/StLouisArchMultExpToneMapped.jpg) / [video](http://upload.wikimedia.org/wikipedia/commons/5/5f/Hdr_time_lapse_montage.ogg) / [audio](http://upload.wikimedia.org/wikipedia/en/3/3d/Sample_of_Daft_Punk's_Da_Funk.ogg)) in a new tab.

Visit one of the extension stores (below) to see the list of features.

## Browser support / Installation ##
Only the latest browser versions are fully supported. It may work on older versions, but extra effort won't be made to stretch the compatibility for the sake of outdated platforms.

- [Firefox](https://addons.mozilla.org/addon/viewhance/) ~24+ (or its relatives; SeaMonkey, Waterfox, Cyberfox, Pale Moon...)
- [Opera](http://tiny.cc/Viewhance-oex) 12
- [Chromium](https://chrome.google.com/webstore/detail/ijabcgpjcbpphfagcaknnlcfeodbnkgp) ~22+ (or its relatives; Chrome, Opera 15+, CoolNovo, YaBrowser...)
- [Safari](http://tiny.cc/Viewhance-safariextz) ~5.1+
- [Maxthon](http://extension.maxthon.com/detail/index.php?view_id=2527) 4+

## Contribution ##
- **Translation**: You can use [this helper tool](https://rawgit.com/Deathamns/Viewhance/master/tools/localizer.html) for localizing strings. The result can be sent as a pull request on GitHub.
- **Code**: if you have a bug-fix, or did some tweaks, then you can send a pull request with your changes. Criteria: Try to respect the code styling, use [`eslint`](http://eslint.org/), don't diverge from the main goal - viewing enhancements - (for instance, photo editing capability doesn't belong in this extension).

## Build ##
```
sh tools/build.sh
```

Arguments:

no arguments - Generates meta-data (manifest files, locales) into the `src` directory (all the generated files are listed in `.gitignore`).

`clean-meta` - Removes meta-data from the `src` directory (platform arguments are ignored here, so it will remove all files).

`xpi`, `oex`, `crx`, `safariextz`, `mxaddon` - If one of these are set, then the building will apply only for the specified platform (file extensions are used as platforms).

`prep` - Prepares the project directory for the specified or all platforms, so it can be examined what files will be included in specific extension files.

`pack` - Creates installable packages for the specified or all platforms. If no `prep` argument was given, then the platform directory will be removed from `build` after the package is ready.

## Development ##
In order to start hacking, the meta-data (manifest files and locales) needs to be generated, which can be done by running the following bash script (for Windows, it can be used with [Cygwin](https://cygwin.com/install.html)):

```
sh tools/build.sh
```

Without any arguments it will simply run the `tools/build_meta.py` (Python 2/3) script, which could be used instead as well. This step prepares the `src` directory, from which it will be possible to install the extension on any browser (see below).

Installing from `src` allows to test the changes without any building (usually refreshing the page is enough).

Alternatively, the `build.sh` script is able to create the files for each platform under the `build` directory, and the extension could be installed from there too (see above how to use the build script). So, in the following installation methods the `build/**platform**` directory could be used instead of `src`.

Beside these, the extension can be built into a packaged file, which can be installed too (but that sounds tedious for developing).

#### Firefox ####
Create a [proxy file](https://developer.mozilla.org/en-US/Add-ons/Setting_up_extension_development_environment#Firefox_extension_proxy_file), which content will be the absolute path of the `src` directory, and its name should be the ID of the extension: `{00000c4c-fcfd-49bc-9f0d-78db44456c9c}`.
Copy the created file into the [`path of your profile`](https://support.mozilla.org/en-US/kb/profiles-where-firefox-stores-user-data#w_how-do-i-find-my-profile)`/extensions` directory.

#### Opera ####
For Opera 12: Open the Extension manager (<kbd>Ctrl+Shift+E</kbd>), and drag-n-drop the generated `config.xml` file from the `src` directory onto the browser window.

For Opera 15+ see Chromium.

#### Chromium ####
Open `chrome://extensions` in a tab, and drag-n-drop the `src` directory onto the page.

#### Safari ####
The extension files need to be placed in a folder named `Viewhance.safariextension` in oder to be able to load it via the Extension Builder.

Use the build script to generate the `build/Viewhance.safariextension` platform directory for Safari, which you can use (or in Windows, create a hard link pointing to the `src` directory, see example at Maxthon below). After that in Safari:

- `Settings / Preferences / Advanced`, tick the `Show Develop menu in menu bar` checkbox
- Menu button, and choose `Develop / Show Extension Builder`
- Click the `+` button at the bottom left, and choose `Add Extension`
- Select the `Viewhance.safariextension` directory, and Install (assuming the developer certificates are already installed)

#### Maxthon ####
Since this platform is available on Windows only, creating a hard link under the user's `Addons` directory will install the extension. Something like this:

```
mklink /H /D /J Maxthon_install_path\UserData\Users\guest\Addons\Viewhance src
```

(Of course, don't forget to delete the link if you don't use it anymore.)
