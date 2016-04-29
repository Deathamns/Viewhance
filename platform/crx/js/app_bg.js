'use strict';

/******************************************************************************/

if ( typeof browser === 'object' && this.browser.extension ) {
	this.chrome = this.browser;

	if ( !chrome.storage.sync ) {
		chrome.storage.sync = chrome.storage.local;
	}
}

/******************************************************************************/

var vAPI = Object.create(null);

vAPI.chrome = true;

vAPI.app = chrome.runtime.getManifest();
vAPI.app = {
	name: vAPI.app.name,
	version: vAPI.app.version,
	platform: (function() {
		var vendor = navigator.appVersion.match(
			/(Chromium|OPR|RockMelt|Comodo_Dragon|CoolNovo|Iron|Edge)\/(\S+)/
		);

		if ( vendor ) {
			vendor[1] = vendor[1].replace('OPR', 'Opera').replace('_', ' ');
		} else {
			vendor = navigator.appVersion.match(/(Chrome)\/(\S+)/);
		}

		return (vendor ? vendor.slice(1).join(' ') : 'Chromium')
			+ ' (' + navigator.platform + ')';
	})()
};

vAPI.storage = {
	get: function(key, callback) {
		chrome.storage.sync.get(key, function(obj) {
			callback(obj[key] === void 0 ? null : obj[key]);
		});
	},

	set: function(key, value) {
		var data = {};
		data[key] = value;
		chrome.storage.sync.set(data);
	},

	remove: function(key) {
		chrome.storage.sync.remove(key);
	}
};

vAPI.tabs = {
	create: chrome.tabs.create
};

vAPI.messaging = {
	listen: function(callback) {
		chrome.runtime.onMessage.addListener(function(message, sender, respond) {
			callback(message, {url: sender.url}, respond);
			return true;
		});
	}
};
