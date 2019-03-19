# Viewhance #

A browser extension to enhance the browser's default media viewer.

To try it out (when installed), open a media file ([image](https://upload.wikimedia.org/wikipedia/commons/e/ec/StLouisArchMultExpToneMapped.jpg) / [video](https://upload.wikimedia.org/wikipedia/commons/d/de/Hdr_time_lapse_montage.ogv) / [audio](https://upload.wikimedia.org/wikipedia/en/3/3d/Sample_of_Daft_Punk's_Da_Funk.ogg)) in a new tab.

Visit one of the extension stores (below) to see the list of features.

## Browser support / Installation ##
Only the latest browser versions are fully supported. It may work on older versions, but extra effort won't be made to stretch the compatibility for the sake of outdated platforms.

- [Firefox](https://addons.mozilla.org/addon/viewhance/) (or its relatives; SeaMonkey, Pale Moon...)
- [Opera](https://tiny.cc/Viewhance-oex) 12
- [Chrome](https://chrome.google.com/webstore/detail/impppjchnpfgknmbaaghfeopcgfoilac) (other Chromium clones; Vivaldi, Opera 15+...)
- [Safari](https://tiny.cc/Viewhance-safariextz)
- [Maxthon](http://extension.maxthon.com/detail/index.php?view_id=2527)

## Contribution ##
- **Localization** You can use [this helper tool](https://deathamns.github.io/Viewhance/localizer.html) for translating strings. The result can be sent as a pull request on GitHub (instructions are shown when you export your work on the localizer page).
- **Code** If you have a bug-fix, or did some tweaks, then you can send a pull request with your changes. Criteria: Try to respect the code styling, use [`eslint`](http://eslint.org/), don't diverge too much from the main goal; viewing enhancements.
The code must work on all supported platforms, except if the browser's extension API doesn't provide appropriate functionality, then fail silently.

## Build ##
```
python build.py [platform(s)] [-meta] [-pack] [-useln]
```

The script prepares installable directories for each platform, and if the `-pack` argument is supplied, it will create installable packages (and update-files depending on the platform). All the output of this script goes into the `build` directory.

Optionally, it accepts platform names (any directory name under the `platform` directory) in case if the build should happen only for the desired platforms, since all of them will be processed by default.

For generating only meta-data (manifest and locale files, and/or update-files when the `-pack` argument is set) use the `-meta` argument.

Examples:
```
# Prepare directories for every available platform
./build.py

# Prepare directories and package them for every available platform
./build.py -pack

# Prepare directories for Firefox and Opera
./build.py xpi oex

# Prepare and package for Chromium
./build.py crx -pack

# Generate meta-data for Maxthon and Safari
./build.py -meta mxaddon safariextz
```

## Development ##
For testing, you can build (described above) the extension for a selected platform, and install it from the `build/_platform_` directory for your browser.

Some browsers (on some platforms) support reading the files through symbolic links, and for them there is a `-useln` argument for the `build.py` script to create symbolic links instead of copying the files. `-useln` is ignored when `-pack` is used.

Alternatively, the extension can be built into a packaged file, which can be installed as well.

Additional information for specific platforms can be found in their directories.
