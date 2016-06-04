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
	};
})();

vAPI.storage = {
	get: function(key, callback) {
		callback(safari.extension.settings.getItem(key));
	},

	set: function(key, value) {
		if ( value === '' ) {
			this.remove(key);
			return;
		}

		safari.extension.settings.setItem(key, value);
	},

	remove: function(key) {
		safari.extension.settings.removeItem(key);
	}
};

vAPI.tabs = {
	create: function(params) {
		var win = safari.application.activeBrowserWindow;
		var newTab = win.openTab(params.active ? 'foreground' : 'background');

		if ( /^[a-z-]{2,10}:/.test(params.url) === false ) {
			params.url = safari.extension.baseURI + params.url;
		}

		newTab.url = params.url;

		if ( params.active ) {
			win.activate();
		}
	}
};

vAPI.messaging = {
	listen: function(callback) {
		safari.application.addEventListener('message', function(request) {
			var listenerId = request.name;
			var sourcePage = request.target.page;

			callback(
				request.message,
				{url: request.target.url},
				function(response) {
					sourcePage.dispatchMessage(listenerId, response);
				}
			);
		}, false);
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
