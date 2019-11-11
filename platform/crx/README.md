## Chromium ##

Dependencies: `openssl`.

Supports manifest version 2.

The build script will create a `build/crx` directory, which can be installed for a Chromium based browser, or for a browser that uses this platform (like Firefox or Edge).

Installing for; [Chrome](https://developer.chrome.com/extensions/getstarted#unpacked); [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox).

Chromium based browsers cache the `.js` files, so after every change to the code, the extension needs to be re-built, and it also needs to be reloaded in `chrome://extensions/`.

The private key for creating the `.crx` package should be put in `platform/crx/secret/key.pem` in the platform directory.

* [Chrome extension development](https://developer.chrome.com/extensions/overview)
* [Chrom Web Store extensions](https://chrome.google.com/webstore/category/extensions)

* [Browser Extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
* [AMO](https://addons.mozilla.org/en-US/firefox/)
