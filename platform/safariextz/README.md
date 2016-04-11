#### Safari ####

In order to build Safari extensions, first you need to have a [Safari Extension Certificate](https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/ExtensionsOverview/ExtensionsOverview.html#//apple_ref/doc/uid/TP40009977-CH15-SW26), developing in newer versions is possible without obtaining the certificate.

- In `Settings / Preferences / Advanced`, enable `Show Develop menu in menu bar`
- Menu button, and choose `Develop / Show Extension Builder`
- Click the `+` button at the bottom left, and choose `Add Extension`
- Select the `build/Viewhance.safariextension` directory, and Install (the developer certificate must be installed for older browser versions)

After every install the content of the extension is cached, so after making some modifications to the code, the extension must be built, and reinstalled in the `Extension Builder`.

For packaging the extension, the `xar` command must be available (see `xar_setup.sh`), and the private key should be placed in the `secret/key.pem` (see `certs.sh`).

* [About Safari Extensiosn](https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/Introduction/Introduction.html)
* [Safari Extensions Gallery](https://extensions.apple.com/)
