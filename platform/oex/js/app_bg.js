'use strict';

var vAPI = Object.create(null);

vAPI.opera = true;

vAPI.app = {
	name: widget.name,
	version: widget.version,
	platform: 'Opera '
		+ window.opera.version()
		+ ' (' + navigator.platform + ')'
};

vAPI.storage = {
	get: function(key, callback) {
		callback(widget.preferences.getItem(key));
	},

	set: function(key, value) {
		widget.preferences.setItem(key, value);
	},

	remove: function(key) {
		widget.preferences.removeItem(key);
	}
};

vAPI.tabs = {
	getSelected: function(callback) {
		var tab = opera.extension.tabs.getSelected();

		if ( tab ) {
			tab.incognito = tab.private;
		}

		callback(tab || {});
	},

	create: function(params) {
		opera.extension.tabs.create({
			url: params.url,
			focused: params.active,
			private: params.incognito
		});
	}
};

vAPI.messaging = {
	listen: function(callback) {
		opera.extension.addEventListener('message', function(request) {
			var source = request.source;

			callback(
				request.data,
				{url: request.origin},
				function(response) {
					source.postMessage(response);
				}
			);
		});
	}
};
