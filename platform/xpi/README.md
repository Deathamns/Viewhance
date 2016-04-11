#### Firefox ####

Installing happens by creating a [proxy file](https://developer.mozilla.org/en-US/Add-ons/Setting_up_extension_development_environment#Firefox_extension_proxy_file), which content will be the absolute path of the `build/xpi` directory, and its name should be the ID of the extension (`see meta/install.rdf`).
Copy the created file into the [`path of your profile`](https://support.mozilla.org/en-US/kb/profiles-where-firefox-stores-user-data#w_how-do-i-find-my-profile)`/extensions` directory.

The extension needs to be re-built after every change in code, however browser restart is not necessary for the content scripts, refreshing the actual page is enough to see the changes.

* [Add-on Development](https://developer.mozilla.org/en-US/Add-ons)
* [AMO](https://addons.mozilla.org/firefox/)
