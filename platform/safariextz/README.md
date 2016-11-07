## Safari ##

Dependencies: `xar`, `openssl`.

In order to build Safari extensions, first a developer certificate needs to be obtained, or the latest versions of the browser should be used. [Read more](https://developer.apple.com/library/content/documentation/Tools/Conceptual/SafariExtensionGuide/ExtensionsOverview/ExtensionsOverview.html#//apple_ref/doc/uid/TP40009977-CH15-SW26).

- In `Settings / Preferences / Advanced`, enable `Show Develop menu in menu bar`
- Menu button, and choose `Develop / Show Extension Builder`
- Click the `+` button at the bottom left, and choose `Add Extension`
- Select the `build/Viewhance.safariextension` directory, and Install (the developer certificate must be installed for older browser versions)

After making some modifications to the code, the extension must be built, and reinstalled in the `Extension Builder`.

For packaging the extension, the `xar` command must be available (see `scripts/xar_setup.sh`), and the private key should be placed in `platform/safariextz/secret/key.pem` (see `scripts/certs.sh`).

* [About Safari Extensions](https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/Introduction/Introduction.html)
* [Safari Extensions Gallery](https://extensions.apple.com/)
