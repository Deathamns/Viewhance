'use strict';

if ( typeof browser === 'object' && this.browser.extension ) {
	this.chrome = this.browser;
}

var vAPI = Object.create(null);

vAPI.app = chrome.runtime.getManifest();
vAPI.app = {
	name: vAPI.app.name,
	version: vAPI.app.version,
	platform: (function() {
		var vendor = navigator.userAgent.match(/(\S+)\/(\S+)$/);
		return vendor
			? vendor.slice(1).join(' ')
				.replace('_', ' ')
				.replace('OPR', 'Opera')
			: 'Chromium';
	})()
};

switch ( vAPI.app.platform.split(' ')[0].toLowerCase() ) {
	case 'firefox':
		vAPI.firefox = true;
		break;
	case 'edge':
		vAPI.edge = true;
		break;
	default:
		vAPI.chrome = true;
}

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
			callback(message, {url: sender.url}, respond);
			return true;
		});
	}
};
