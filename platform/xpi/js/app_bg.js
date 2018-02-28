'use strict';

const {interfaces: Ci, classes: Cc, utils: Cu} = Components;
const {Services} = Cu.import('resource://gre/modules/Services.jsm');

var vAPI = Object.create(null);

vAPI.firefox = true;
vAPI._baseURI = 'chrome://' + location.host + '/content/';

vAPI.app = (function() {
	var extInfo = location.hash.slice(1).split(',');

	return {
		name: extInfo[0],
		version: extInfo[1],
		platform: Services.appinfo.name + ' ' + Services.appinfo.version
	};
})();

vAPI.storage = {
	_branch: Services.prefs.getBranch('extensions.' + vAPI.app.name + '.'),

	get: function(key, callback) {
		try {
			callback(this._branch.getStringPref
				? this._branch.getStringPref(key)
				: this._branch.getComplexValue(
					key,
					Ci.nsISupportsString
				).data);
		} catch ( ex ) {
			callback(null);
		}
	},

	set: function(key, value) {
		if ( value === '' ) {
			this.remove(key);
			return;
		}

		if ( this._branch.setStringPref ) {
			this._branch.setStringPref(key, value);
		} else {
			var str = Cc['@mozilla.org/supports-string;1']
				.createInstance(Ci.nsISupportsString);
			str.data = value;
			this._branch.setComplexValue(key, Ci.nsISupportsString, str);
		}
		this._branch.setStringPref(key, value);
	},

	remove: function(key) {
		this._branch.clearUserPref(key);
	}
};

vAPI.tabs = {
	create: function(params) {
		var win = Services.wm.getMostRecentWindow('navigator:browser');

		if ( !win || !win.gBrowser ) {
			return;
		}

		if ( /^[a-z-]{2,10}:/.test(params.url) === false ) {
			params.url = vAPI._baseURI + params.url;
		}

		win.gBrowser.loadOneTab(params.url, {inBackground: !params.active});
	}
};

vAPI.messaging = {
	_frameScript: vAPI._baseURI + 'js/frame_script.js',

	listen: function(callback) {
		this._listener = function(request) {
			var listenerId = request.data.listenerId;
			var messager = request.target.messageManager;

			callback(
				request.data.data,
				{url: request.data.url},
				function(response) {
					messager.sendAsyncMessage(listenerId, response);
				}
			);
		};

		Services.mm.addMessageListener(
			location.host + ':background',
			this._listener
		);
	}
};

Services.mm.loadFrameScript(
	vAPI.messaging._frameScript,
	true
);

// It's easier if we disable browser settings,
// instead of handling the damage done by the default behavior
vAPI._browserPrefs = {
	get prefBranch() {
		return Services.prefs.getBranch('browser.');
	},
	targetPrefs: [
		'enable_automatic_image_resizing',
		'enable_click_image_resizing'
	],

	suppress: function() {
		delete this.suppress;

		var prefBranch = this.prefBranch;
		var newTargetPrefs = [];

		for ( var i = 0; i < this.targetPrefs.length; ++i ) {
			var value;
			var prefName = this.targetPrefs[i];

			try {
				value = prefBranch.getBoolPref(prefName);
			} catch ( ex ) {
				continue;
			}

			if ( value === false ) {
				continue;
			}

			newTargetPrefs.push(prefName);
			prefBranch.setBoolPref(prefName, false);
		}

		if ( newTargetPrefs.length ) {
			this.targetPrefs = newTargetPrefs;
			return;
		}

		// If there won't be anything to restore...
		vAPI._browserPrefs = {
			restore: function() {}
		};
	},

	restore: function() {
		var prefName;
		var prefBranch = this.prefBranch;

		while ( prefName = this.targetPrefs.pop() ) {
			prefBranch.setBoolPref(prefName, true);
		}
	}
};

vAPI._browserPrefs.suppress();

window.addEventListener('unload', function() {
	vAPI._browserPrefs.restore();

	var messaging = vAPI.messaging;
	Services.mm.removeDelayedFrameScript(messaging._frameScript);
	Services.mm.removeMessageListener(
		location.host + ':background',
		messaging._listener
	);

	var URI = messaging._frameScript.replace('_script', '_module');
	var frameModule = {};
	Cu.import(URI, frameModule);
	frameModule.docObserver.unregister();
	Cu.unload(URI);

	var winumerator = Services.wm.getEnumerator('navigator:browser');

	while ( winumerator.hasMoreElements() ) {
		var gBrowser = winumerator.getNext().gBrowser;
		var tabs = gBrowser.tabs;
		var i = tabs.length;

		while ( i-- ) {
			URI = tabs[i].linkedBrowser.currentURI;

			// Close extension tabs
			if ( URI.schemeIs('chrome') && URI.host === location.host ) {
				gBrowser.removeTab(tabs[i]);
			}
		}
	}
});
