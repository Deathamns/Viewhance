'use strict';

var vAPI = Object.create(null);

try {
	void chrome.storage.local;
	vAPI[this.browser ? 'firefox' : 'chrome'] = true;
} catch ( ex ) {
	vAPI.edge = true;
	this.chrome = this.browser;
}

vAPI.crx = true;

vAPI.app = chrome.runtime.getManifest();
vAPI.app = {
	name: vAPI.app.name,
	version: vAPI.app.version,
	platform: (function() {
		var vendor = navigator.userAgent.match(
			/((Edge|Firefox)|\S+)\/(\S+)(?: \([^/]+)?$/
		);

		if ( !vendor ) {
			return 'Chrome';
		}

		if ( vendor[2] ) {
			vendor.splice(2, 1);
		} else if ( vendor[1] === 'Safari' ) {
			vendor = navigator.userAgent.match(/(Chrome)\/(\S+)/);
		}

		return vendor.slice(1).join(' ')
			.replace('_', ' ')
			.replace('OPR', 'Opera');
	})()
};

vAPI.storage = {
	get: function(key, callback) {
		chrome.storage.local.get(key, function(obj) {
			callback(obj[key] === void 0 ? null : obj[key]);
		});
	},

	set: function(key, value) {
		var data = {};
		data[key] = value;
		chrome.storage.local.set(data);
	},

	remove: function(key) {
		chrome.storage.local.remove(key);
	}
};

vAPI.tabs = {
	create: chrome.tabs.create
};

vAPI.messaging = {
	listen: function(callback) {
		chrome.runtime.onMessage.addListener(function(message, sender, respond) {
			callback(message, {url: sender.url, tabId: sender.tab.id}, respond);
			return true;
		});
	}
};
