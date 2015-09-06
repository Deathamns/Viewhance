# Viewhance #
A browser extension to enhance the browser's default media viewer.

To try it out (when installed), open a media file ([image](http://upload.wikimedia.org/wikipedia/commons/e/ec/StLouisArchMultExpToneMapped.jpg) / [video](http://upload.wikimedia.org/wikipedia/commons/5/5f/Hdr_time_lapse_montage.ogg) / [audio](http://upload.wikimedia.org/wikipedia/en/3/3d/Sample_of_Daft_Punk's_Da_Funk.ogg)) in a new tab.

Visit one of the extension stores (below) to see the list of features.

## Browser support / Installation ##
Only the latest browser versions are fully supported. It may work on older versions, but extra effort won't be made to stretch the compatibility for the sake of outdated platforms.

- [Firefox](https://addons.mozilla.org/addon/viewhance/) ~24+ (or its relatives; SeaMonkey, Waterfox, Pale Moon...)
- [Opera](http://tiny.cc/Viewhance-oex) 12
- [Chromium](https://chrome.google.com/webstore/detail/ijabcgpjcbpphfagcaknnlcfeodbnkgp) ~22+ (or its relatives; Chrome, Opera 15+, YaBrowser...)
- [Safari](http://tiny.cc/Viewhance-safariextz) ~5.1+
- [Maxthon](http://extension.maxthon.com/detail/index.php?view_id=2527) 4+

## Contribution ##
- **Localization**: You can use [this helper tool](https://rawgit.com/Deathamns/Viewhance/master/l10n/localizer.html) for translating strings. The result can be sent as a pull request on GitHub (instructions are shown when you export your work on the localizer page).
- **Code**: if you have a bug-fix, or did some tweaks, then you can send a pull request with your changes. Criteria: Try to respect the code styling, use [`eslint`](http://eslint.org/), don't diverge from the main goal - viewing enhancements - (for instance, photo editing capability doesn't belong in this extension).

## Build ##
```
sh build.sh [platform(s)] [meta] [useln] [pack]
```

The script prepares extension directories for each platform, and if the `pack` argument is supplied, it will create installable packages (and update files depending on the platform). All the output of this script goes to the `build` directory.

Optionally, it accepts platform codes (any directory name under `platform`) in case if the build should happen only for the desired platforms, since all platforms will be processed by default.

Windows users need [Cygwin](https://cygwin.com/install.html) to run the script.

Examples:
```
# Prepare directories for every supported platform
sh build.sh

# Prepare directories and package them for every supported platform
sh build.sh pack

# Prepare directories for Firefox and Opera
sh build.sh xpi oex

# Prepare and package for Chromium
sh build.sh crx pack
```

For generating only meta-data (manifest and locales files, and/or update files when the `pack` argument is given), the `build_meta.py` script can be used (requires Python3). Similarly, it accepts the *platform codes* and the `pack` argument.
The same effect is achieved by running `sh build.sh meta [platform(s)]` command.

## Development ##
For testing you can build (described above) the extension for a selected platform, and install it from the `build/_platform_` directory for your browser.

Some browsers (on some platforms) support reading the files through symbolic links, and for them there is a `useln` argument for the `build.sh` script to create symbolic links instead of copying the project files. `useln` is ignored when `pack` is used.

Alternatively, the extension can be built into a packaged file, which can be installed as well.

#### Firefox ####
Create a [proxy file](https://developer.mozilla.org/en-US/Add-ons/Setting_up_extension_development_environment#Firefox_extension_proxy_file), which content will be the absolute path of the `/build/xpi` directory, and its name should be the ID of the extension: `{00000c4c-fcfd-49bc-9f0d-78db44456c9c}`.
Copy the created file into the [`path of your profile`](https://support.mozilla.org/en-US/kb/profiles-where-firefox-stores-user-data#w_how-do-i-find-my-profile)`/extensions` directory.

#### Opera ####
For Opera 12: Open the Extension manager (<kbd>Ctrl+Shift+E</kbd>), and drag-n-drop the generated `config.xml` file from the `build/oex` directory onto the browser window.

For Opera 15+ see Chromium.

#### Chromium ####
Open `chrome://extensions` in a tab, and drag-n-drop the `build/crx` directory onto the page.

#### Safari ####
- `Settings / Preferences / Advanced`, tick the `Show Develop menu in menu bar` checkbox
- Menu button, and choose `Develop / Show Extension Builder`
- Click the `+` button at the bottom left, and choose `Add Extension`
- Select the `build/Viewhance.safariextension` directory, and Install (assuming the developer certificates are already installed)

#### Maxthon ####
This platform is available only on Windows. Installation happens by copying the `build/mxaddon` directory into user's `Addons`, or creating a junction (soft link) to the same directory. Creating a junction (don't forget to delete the link if you don't use it anymore):

```
mklink /H /D /J Maxthon_install_path\UserData\Users\guest\Addons\Viewhance build\mxaddon
```
