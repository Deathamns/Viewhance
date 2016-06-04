'use strict';

var vAPI = Object.create(null);

vAPI.maxthon = true;
vAPI._runtime = external.mxGetRuntime();

vAPI.app = (function() {
	var extInfo = location.hash.slice(1).split(',');

	return {
		name: extInfo[0],
		version: extInfo[1],
		platform: 'Maxthon ' + external.mxVersion
	};
})();

vAPI.storage = {
	_mxStorage: vAPI._runtime.storage,

	get: function(key, callback) {
		var value = this._mxStorage.getConfig(key);
		callback(value === '' ? null : value);
	},

	set: function(key, value) {
		return this._mxStorage.setConfig(key, value);
	},

	remove: function(key) {
		this.set(key, '');
	}
};

vAPI.tabs = {
	_mxTabs: new mx.browser.tabs,

	create: function(params) {
		if ( /^[a-z-]{2,10}:/.test(params.url) === false ) {
			params.url = vAPI._runtime.getPrivateUrl() + params.url;
		}

		this._mxTabs.newTab({
			url: params.url,
			activate: params.active
		});
	}
};

vAPI.messaging = {
	listen: function(callback, name) {
		vAPI._runtime.listen(name || 'service', function(request) {
			var listenerId = request.listenerId;

			callback(
				JSON.parse(request.message),
				{url: request.url},
				function(response) {
					vAPI._runtime.post(listenerId, JSON.stringify(response));
				}
			);
		});
	}
};
