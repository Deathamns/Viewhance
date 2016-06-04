'use strict';

var vAPI = Object.create(null);

vAPI.opera = true;

vAPI.app = {
	name: widget.name,
	version: widget.version,
	platform: 'Opera ' + window.opera.version()
};

vAPI.storage = {
	get: function(key, callback) {
		callback(widget.preferences.getItem(key));
	},

	set: function(key, value) {
		if ( value === '' ) {
			this.remove(key);
			return;
		}

		widget.preferences.setItem(key, value);
	},

	remove: function(key) {
		widget.preferences.removeItem(key);
	}
};

vAPI.tabs = {
	create: function(params) {
		opera.extension.tabs.create({
			url: params.url,
			focused: !!params.active,
			private: !!(opera.extension.tabs.getSelected() || {}).private
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
