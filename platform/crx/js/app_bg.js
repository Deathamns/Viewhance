'use strict';

var vAPI = Object.create(null);

vAPI.chrome = true;

vAPI.app = chrome.runtime.getManifest();
vAPI.app = {
	name: vAPI.app.name,
	version: vAPI.app.version,
	platform: (function() {
		var vendor = navigator.appVersion.match(
			/(Chromium|OPR|RockMelt|Comodo_Dragon|CoolNovo|Iron)\/(\S+)/
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
	getSelected: function(callback) {
		chrome.tabs.query(
			{active: true, currentWindow: true},
			function(tabs) {
				callback(tabs[0] || {});
			}
		);
	},

	create: function(params) {
		delete params.incognito;

		chrome.windows.getCurrent(function(win) {
			params.windowId = win.windowId;
			chrome.tabs.create(params);
		});
	}
};

vAPI.messaging = {
	parseMessage: function(message, sender, sendResponse) {
		return {
			msg: message,
			origin: sender.url,
			postMessage: sendResponse
		};
	},

	listen: function(callback) {
		(chrome.runtime || chrome.extension).onMessage.addListener(callback);
	}
};
