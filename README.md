# Viewhance #

A browser extension to enhance the browser's default media viewer.

To try it out (when installed), open a media file ([image](http://upload.wikimedia.org/wikipedia/commons/e/ec/StLouisArchMultExpToneMapped.jpg) / [video](http://upload.wikimedia.org/wikipedia/commons/5/5f/Hdr_time_lapse_montage.ogg) / [audio](http://upload.wikimedia.org/wikipedia/en/3/3d/Sample_of_Daft_Punk's_Da_Funk.ogg)) in a new tab.

Visit one of the extension stores (below) to see the list of features.

## Browser support / Installation ##
Only the latest browser versions are fully supported. It may work on older versions, but extra effort won't be made to stretch the compatibility for the sake of outdated platforms.

- [Firefox](https://addons.mozilla.org/addon/viewhance/) (or its relatives; SeaMonkey, Pale Moon...)
- [Opera](https://tiny.cc/Viewhance-oex) 12
- [Chrome](https://chrome.google.com/webstore/detail/ijabcgpjcbpphfagcaknnlcfeodbnkgp) (other Chromium clones; Vivaldi, Opera 15+...)
- [Safari](https://tiny.cc/Viewhance-safariextz)
- [Maxthon](http://extension.maxthon.com/detail/index.php?view_id=2527) 4+

## Contribution ##
- **Localization** You can use [this helper tool](https://rawgit.com/Deathamns/Viewhance/master/l10n/localizer.html) for translating strings. The result can be sent as a pull request on GitHub (instructions are shown when you export your work on the localizer page).
- **Code** If you have a bug-fix, or did some tweaks, then you can send a pull request with your changes. Criteria: Try to respect the code styling, use [`eslint`](http://eslint.org/), don't diverge too much from the main goal; viewing enhancements.
The code must work on all supported platforms, except if the browser's extension API doesn't provide appropriate functionality, then fail silently.

## Build ##
```
sh build.sh [platform(s)] [meta] [useln] [pack]
```

Windows users need [Cygwin](https://cygwin.com/install.html) to run the script.

The script prepares installable directories for each platform, and if the `pack` argument is supplied, it will create installable packages (and update-files depending on the platform). All the output of this script goes into the `build` directory.

Optionally, it accepts platform names (any directory name under the `platform` directory) in case if the build should happen only for the desired platforms, since all platforms will be processed by default.

For generating only meta-data (manifest and locale files, and/or update-files when the `pack` argument is set), the `build_meta.py` script can be used (requires Python3). Similarly, it accepts the *platform name*, and the `pack` argument.
The same effect is achieved by running `sh build.sh meta [platform(s)]` command.

Examples:
```
# Prepare directories for every available platform
sh build.sh

# Prepare directories and package them for every available platform
sh build.sh pack

# Prepare directories for Firefox and Opera
sh build.sh xpi oex

# Prepare and package for Chromium
sh build.sh crx pack

# Generate meta-data for Maxthon and Safari
sh build.sh meta mxaddon safariextz
```

## Development ##
For testing, you can build (described above) the extension for a selected platform, and install it from the `build/_platform_` directory for your browser.

Some browsers (on some platforms) support reading the files through symbolic links, and for them there is a `useln` argument for the `build.sh` script to create symbolic links instead of copying the project files. `useln` is ignored when `pack` is used.

Alternatively, the extension can be built into a packaged file, which can be installed as well.

Additional information for specific platforms can be found in their directories.
