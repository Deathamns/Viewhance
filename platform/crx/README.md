## Chromium ##

Using the `build.sh` script the `build/crx` directory will be created, which can be installed for a Chromium based browser by simply drag-n-dropping the folder onto the `chrome:extensions` page. Or alternatively with the described way [here](https://developer.chrome.com/extensions/getstarted#unpacked).

Chromium based browsers cache the `.js` files, so after every change to the code, the extension needs to be built, and it needs to be also reloaded in `chrome:extensions`. For this reason, using the `useln` argument for the `build.sh` won't make any sense.

The private key for creating the extension file (`.crx`) should be put in `secret/key.pem` in the platform directory.

* [Chrome extension development](https://developer.chrome.com/extensions/overview)
* [Chrom Web Store extensions](https://chrome.google.com/webstore/category/extensions)
