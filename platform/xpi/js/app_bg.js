'use strict';

var vAPI = Object.create(null);

vAPI.firefox = true;
vAPI._baseURI = 'chrome://' + location.host + '/content/';

vAPI.app = (function() {
	var extInfo = location.hash.slice(1).split(',');
	var XULAppInfo = Components
		.classes['@mozilla.org/xre/app-info;1']
		.getService(Components.interfaces.nsIXULAppInfo);

	return {
		name: extInfo[0],
		version: extInfo[1],
		platform: XULAppInfo.name + ' ' + XULAppInfo.version
			+ ' (' + navigator.platform + ')'
	};
})();

vAPI.storage = {
	_pb: Components
		.classes['@mozilla.org/preferences-service;1']
		.getService(Components.interfaces.nsIPrefService)
		.getBranch('extensions.' + vAPI.app.name + '.'),
	_str: Components
		.classes['@mozilla.org/supports-string;1']
		.createInstance(Components.interfaces.nsISupportsString),

	get: function(key, callback) {
		try {
			callback(
				this._pb.getComplexValue(
					key,
					Components.interfaces.nsISupportsString
				).data
			);
		} catch ( ex ) {
			callback(null);
		}
	},

	set: function(key, value) {
		this._str.data = value;
		this._pb.setComplexValue(
			key,
			Components.interfaces.nsISupportsString,
			this._str
		);
	},

	remove: function(key) {
		this._pb.clearUserPref(key);
	}
};

vAPI.tabs = {
	_mostRecentWindow: function() {
		return Components
			.classes['@mozilla.org/appshell/window-mediator;1']
			.getService(Components.interfaces.nsIWindowMediator)
			.getMostRecentWindow('navigator:browser');
	},

	getSelected: function(callback) {
		var win = this._mostRecentWindow();
		callback(win && win.gBrowser ? win.gBrowser.selectedTab : {});
	},

	create: function(params) {
		var win = this._mostRecentWindow();

		if ( !win ) {
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
	get _globalMessageManager() {
		return Components.classes['@mozilla.org/globalmessagemanager;1']
			.getService(Components.interfaces.nsIMessageListenerManager);
	},

	parseMessage: function(request) {
		var listenerId = request.data.listenerId;
		var messager = request.target.messageManager;

		return {
			msg: request.data.data,
			origin: request.data.origin,

			postMessage: function(message) {
				messager.sendAsyncMessage(
					listenerId,
					JSON.stringify(message)
				);
			}
		};
	},

	listen: function(callback) {
		if ( typeof callback !== 'function' ) {
			this._globalMessageManager.removeMessageListener(
				location.host + ':background',
				this.postMessage
			);
			this.postMessage = null;
			return;
		}

		this._globalMessageManager.addMessageListener(
			location.host + ':background',
			callback
		);
		this.postMessage = callback;
	}
};

vAPI.messaging._globalMessageManager.loadFrameScript(
	vAPI.messaging._frameScript,
	true
);

// It's easier if we disable browser settings,
// instead of handling the damage done by the default behavior
vAPI._browserPrefs = {
	get prefBranch() {
		return Components
			.classes['@mozilla.org/preferences-service;1']
			.getService(Components.interfaces.nsIPrefService)
			.getBranch('browser.');
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

// This function will run even when the browser is closing
window.addEventListener('unload', function() {
	vAPI._browserPrefs.restore();

	// TODO: return here when the browser is exiting

	var messaging = vAPI.messaging;
	var gmm = messaging._globalMessageManager;
	gmm.removeDelayedFrameScript(messaging._frameScript);
	gmm.removeMessageListener(
		location.host + ':background',
		messaging.postMessage
	);

	var URI = messaging._frameScript.replace('_script', '_module');
	var frameModule = {};
	Components.utils.import(URI, frameModule);
	frameModule.docObserver.unregister();
	Components.utils.unload(URI);

	var winumerator = Components
		.classes['@mozilla.org/appshell/window-mediator;1']
		.getService(Components.interfaces.nsIWindowMediator)
		.getEnumerator('navigator:browser');

	while ( winumerator.hasMoreElements() ) {
		var gBrowser = winumerator.getNext().gBrowser;
		var tabs = gBrowser.tabs;
		var i = tabs.length;

		while ( i-- ) {
			URI = tabs[i].linkedBrowser.currentURI;

			// close extension tabs
			if ( URI.schemeIs('chrome') && URI.host === location.host ) {
				gBrowser.removeTab(tabs[i]);
			}
		}
	}
});
