'use strict';

var vAPI = Object.create(null);

vAPI.safari = true;

vAPI.app = (function() {
	var extInfo = location.hash.slice(1).split(',');
	var vendorVersion = navigator.appVersion.match(/Version\/(\S+)/);

	return {
		name: extInfo[0],
		version: extInfo[1],
		platform: 'Safari' + (vendorVersion ? ' ' + vendorVersion[1] : '')
			+ ' (' + navigator.platform + ')'
	};
})();

vAPI.storage = {
	get: function(key, callback) {
		callback(safari.extension.settings.getItem(key));
	},

	set: function(key, value) {
		safari.extension.settings.setItem(key, value);
	},

	remove: function(key) {
		safari.extension.settings.removeItem(key);
	}
};

vAPI.tabs = {
	getSelected: function(callback) {
		callback(safari.application.activeBrowserWindow.activeTab || {});
	},

	create: function(params) {
		var win = safari.application.activeBrowserWindow;
		var newTab = win.openTab(params.active ? 'foreground' : 'background');

		if ( /^[a-z-]{2,10}:/.test(params.url) === false ) {
			params.url = safari.extension.baseURI + params.url;
		}

		newTab.url = params.url;
	}
};

vAPI.messaging = {
	parseMessage: function(request) {
		var sourcePage = request.target.page;
		var listenerId = request.name;

		return {
			msg: request.message,
			origin: request.target.url,
			postMessage: function(message) {
				sourcePage.dispatchMessage(listenerId, message);
			}
		};
	},

	listen: function(callback) {
		safari.application.addEventListener('message', callback, false);
	}
};

// Migrate from localStorage - should be removed in the future
if ( localStorage.hasOwnProperty('cfg') ) {
	vAPI.storage.set('cfg', localStorage.getItem('cfg'));
	localStorage.clear();
}

safari.extension.settings.addEventListener('change', function(e) {
	if ( e.key === 'open_prefs' ) {
		vAPI.tabs.create({url: 'options.html', active: true});
	}
}, false);
