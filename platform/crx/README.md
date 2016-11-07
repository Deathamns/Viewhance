## Chromium ##

Dependencies: `7z`, `openssl`.

The build script will create a `build/crx` directory, which can be installed for a Chromium based browser by simply drag-n-dropping the folder onto the `chrome://extensions/` page. Or alternatively with the described way [here](https://developer.chrome.com/extensions/getstarted#unpacked).

Chromium based browsers cache the `.js` files, so after every change to the code, the extension needs to be built, and it needs to be also reloaded in `chrome://extensions/`.

The private key for creating the `.crx` package should be put in `platform/crx/secret/key.pem` in the platform directory.

* [Chrome extension development](https://developer.chrome.com/extensions/overview)
* [Chrom Web Store extensions](https://chrome.google.com/webstore/category/extensions)
