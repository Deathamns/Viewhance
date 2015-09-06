'use strict';

var vAPI = Object.create(null);

vAPI.maxthon = true;
vAPI.runtime = external.mxGetRuntime();

vAPI.app = (function() {
	var extInfo = location.hash.slice(1).split(',');

	return {
		name: extInfo[0],
		version: extInfo[1],
		platform: 'Maxthon ' + external.mxVersion
			+ ' (' + navigator.platform + ')'
	};
})();

vAPI.storage = {
	mxStorage: vAPI.runtime.storage,

	get: function(key, callback) {
		var value = this.mxStorage.getConfig(key);
		callback(value === '' ? null : value);
	},

	set: function(key, value) {
		return this.mxStorage.setConfig(key, value);
	},

	remove: function(key) {
		this.mxStorage.setConfig(key, '');
	}
};

vAPI.tabs = {
	mxTabs: new mx.browser.tabs, // eslint-disable-line

	getSelected: function(callback) {
		callback(this.mxTabs.getCurrentTab());
	},

	create: function(params) {
		if ( /^[a-z-]{2,10}:/.test(params.url) === false ) {
			params.url = vAPI.runtime.getPrivateUrl() + params.url;
		}

		this.mxTabs.newTab({
			url: params.url,
			activate: params.active
		});
	}
};

vAPI.messaging = {
	parseMessage: function(request) {
		var listenerId = request.listenerId;

		return {
			msg: JSON.parse(request.message),
			origin: request.origin,
			postMessage: function(message) {
				vAPI.runtime.post(listenerId, JSON.stringify(message));
			}
		};
	},

	listen: function(callback, name) {
		vAPI.runtime.listen(name || 'service', callback);
	}
};
