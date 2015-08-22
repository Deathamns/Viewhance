// » header
'use strict';

var vAPI = Object.create(null);

// Extension info is passed through the URL for Firefox, Safari, and Maxthon,
// in order to get it synchronously
if ( location.hash ) {
	vAPI.app = location.hash.slice(1).split(',');
	vAPI.app = {
		name: vAPI.app[0],
		version: vAPI.app[1]
	};
}
// «

if ( self.hasOwnProperty('opera') ) {
	// » oex
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
				'private': params.incognito
			});
		}
	};

	vAPI.messaging = {
		parseMessage: function(msg) {
			return {
				msg: msg.data,
				origin: msg.origin,
				postMessage: function(message) {
					msg.source.postMessage(message);
				}
			};
		},

		listen: function(callback) {
			opera.extension.addEventListener('message', callback);
		}
	};
	// «
} else if ( self.hasOwnProperty('chrome') && !self.hasOwnProperty('mx') ) {
	// » crx
	vAPI.chrome = true;

	vAPI.app = chrome.runtime.getManifest();
	vAPI.app = {
		name: vAPI.app.name,
		version: vAPI.app.version
	};

	vAPI.app.platform = navigator.appVersion.match(
		/(Chromium|OPR|RockMelt|Comodo_Dragon|CoolNovo|Iron)\/(\S+)/
	);

	if ( vAPI.app.platform ) {
		vAPI.app.platform[1] = vAPI.app.platform[1]
			.replace('OPR', 'Opera')
			.replace('_', ' ');
	} else {
		vAPI.app.platform = navigator.appVersion.match(/(Chrome)\/(\S+)/);
	}

	vAPI.app.platform = (vAPI.app.platform
		? vAPI.app.platform.slice(1).join(' ')
		: 'Chromium'
	) + ' (' + navigator.platform + ')';

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
			localStorage.removeItem(key);
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
	// «
} else if ( self.hasOwnProperty('safari') ) {
	// » safariextz
	vAPI.safari = true;

	vAPI.app.platform = navigator.appVersion.match(/Version\/(\S+)/);
	vAPI.app.platform = 'Safari'
		+ (vAPI.app.platform ? ' ' + vAPI.app.platform[1] : '')
		+ ' (' + navigator.platform + ')';

	vAPI.storage = {
		get: function(key, callback) {
			callback(safari.extension.settings.getItem(key));
		},

		set: function(key, value) {
			safari.extension.settings.setItem(key, value);
		},

		remove: function(key) {
			safari.extension.removeItem(key);
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
		parseMessage: function(msg) {
			var sourcePage = msg.target.page;
			var listenerId = msg.name;

			return {
				msg: msg.message,
				origin: msg.target.url,
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
	// «
} else if ( self.hasOwnProperty('mx') ) {
	// » mxaddon
	vAPI.app.platform = 'Maxthon '
		+ external.mxVersion
		+ ' (' + navigator.platform + ')';

	vAPI.runtime = external.mxGetRuntime();

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
		parseMessage: function(msg) {
			var listenerId = msg.listenerId;

			return {
				msg: JSON.parse(msg.message),
				origin: msg.origin,
				postMessage: function(message) {
					vAPI.runtime.post(listenerId, JSON.stringify(message));
				}
			};
		},

		listen: function(callback, name) {
			vAPI.runtime.listen(name || 'service', callback);
		}
	};
	// «
} else {
	// » xpi
	var Ci = Components.interfaces;

	vAPI.firefox = true;
	vAPI.baseURI = 'chrome://' + location.host + '/content/';

	vAPI.app.platform = Components
		.classes['@mozilla.org/xre/app-info;1']
		.getService(Ci.nsIXULAppInfo);
	vAPI.app.platform = vAPI.app.platform.name + ' '
		+ vAPI.app.platform.version
		+ ' (' + navigator.platform + ')';

	vAPI.storage = {
		pb: Components
			.classes['@mozilla.org/preferences-service;1']
			.getService(Components.interfaces.nsIPrefService)
			.getBranch('extensions.' + vAPI.app.name + '.'),
		str: Components
			.classes['@mozilla.org/supports-string;1']
			.createInstance(Ci.nsISupportsString),

		get: function(key, calblack) {
			try {
				calblack(this.pb.getComplexValue(key, Ci.nsISupportsString).data);
			} catch ( ex ) {
				calblack(null);
			}
		},

		set: function(key, value) {
			this.str.data = value;
			this.pb.setComplexValue(key, Ci.nsISupportsString, this.str);
		},

		remove: function(key) {
			this.pb.clearUserPref(key);
		}
	};

	vAPI.tabs = {
		mostRecentWindow: function() {
			return Components
				.classes['@mozilla.org/appshell/window-mediator;1']
				.getService(Ci.nsIWindowMediator)
				.getMostRecentWindow('navigator:browser');
		},

		getSelected: function(callback) {
			var win = this.mostRecentWindow();
			callback(win && win.gBrowser ? win.gBrowser.selectedTab : {});
		},

		create: function(params) {
			var win = this.mostRecentWindow();

			if ( !win ) {
				return;
			}

			if ( /^[a-z-]{2,10}:/.test(params.url) === false ) {
				params.url = vAPI.baseURI + params.url;
			}

			win.gBrowser.loadOneTab(params.url, {inBackground: !params.active});
		}
	};

	vAPI.messaging = {
		frameScript: vAPI.baseURI + 'frameScript.js',

		get globalMessageManager() {
			return Components.classes['@mozilla.org/globalmessagemanager;1']
				.getService(Ci.nsIMessageListenerManager);
		},

		parseMessage: function(msg) {
			var listenerId = msg.data.listenerId;
			var messager = msg.target.messageManager;

			return {
				msg: msg.data.data,
				origin: msg.data.origin,
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
				this.globalMessageManager.removeMessageListener(
					location.host + ':background',
					this.postMessage
				);
				this.postMessage = null;
				return;
			}

			this.globalMessageManager.addMessageListener(
				location.host + ':background',
				callback
			);
			this.postMessage = callback;
		}
	};

	vAPI.messaging.globalMessageManager.loadFrameScript(
		vAPI.messaging.frameScript,
		true
	);

	window.addEventListener('unload', function() {
		var messaging = vAPI.messaging;
		var gmm = messaging.globalMessageManager;
		gmm.removeDelayedFrameScript(messaging.frameScript);
		gmm.removeMessageListener(
			location.host + ':background',
			messaging.postMessage
		);

		var URI = messaging.frameScript.replace('Script', 'Module');
		var frameModule = {};
		Components.utils.import(URI, frameModule);
		frameModule.docObserver.unregister();
		Components.utils.unload(URI);

		var winumerator = Components
			.classes['@mozilla.org/appshell/window-mediator;1']
			.getService(Ci.nsIWindowMediator)
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
	// «
}
