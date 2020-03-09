'use strict';

const {interfaces: Ci, classes: Cc, utils: Cu} = Components;
const {Services} = Cu.import('resource://gre/modules/Services.jsm');

var vAPI = Object.create(null);

vAPI.xpi = true;
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

		win.gBrowser.loadOneTab(params.url, {
			inBackground: !params.active,
			triggeringPrincipal:
				Services.scriptSecurityManager.getSystemPrincipal()
		});
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
				{
					url: request.data.url,
					tabId: request.data.tabId,
					frameId: request.data.frameId
				},
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

vAPI.watchReceivedHeaders = function(prefs) {
	const headersObserver = {
		TYPE_DOCUMENT: Ci.nsIContentPolicy.TYPE_DOCUMENT,

		updateTab: function(channel, url) {
			let loadContext;

			try {
				loadContext = channel.notificationCallbacks
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsILoadContext);
			} catch ( ex ) {
				try {
					loadContext = channel.loadGroup.notificationCallbacks
						.getInterface(Ci.nsILoadContext);
				} catch ( ex ) {
					return;
				}
			}

			if ( !loadContext ) {
				return;
			}

			if ( loadContext.topFrameElement ) {
				loadContext.topFrameElement.loadURI(url);
				return;
			}

			try {
				let win = loadContext.associatedWindow;
				(win.top || win).QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIWebNavigation)
					.QueryInterface(Ci.nsIDocShell)
					.rootTreeItem
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIDOMWindow)
					.gBrowser
					.loadURI(url);
			} catch (ex) {
				//
			}
		},

		observe: function(channel) {
			if ( channel instanceof Ci.nsIHttpChannel === false ) {
				return;
			}

			if ( (channel.loadInfo.externalContentPolicyType
				|| channel.loadInfo.contentPolicyType) !== this.TYPE_DOCUMENT ) {
				return;
			}

			let contentType;

			try {
				// Automatically removes charset and converts to lowercase
				contentType = channel.contentType;
			} catch ( ex ) {
				//
			}

			let isMedia = false;
			let streamingMediaType = null;

			if ( contentType ) {
				if ( channel.responseStatus >= 400
					&& contentType.startsWith('text/') ) {
					return;
				}

				if ( contentType === 'image/svg+xml' ) {
					if ( !prefs.viewSvg
						|| channel.requestMethod !== 'GET'
						|| channel.URI.ref === 'direct-view' ) {
						return;
					}

					this.updateTab(
						channel,
						vAPI._baseURI + 'viewer.html#svg:'
							+ channel.URI.spec.replace(/#.*/, '')
					);
					return;
				}

				if ( prefs.extraFormats ) {
					switch ( contentType ) {
						case 'application/vnd.apple.mpegurl':
						case 'application/mpegurl':
						case 'application/x-mpegurl':
						case 'audio/mpegurl':
						case 'audio/x-mpegurl':
							streamingMediaType = 'hls';
							break;
						case 'application/dash+xml':
							streamingMediaType = 'dash';
							break;
						case 'application/vnd.ms-sstr+xml':
							streamingMediaType = 'mss';
							break;
					}

					if ( streamingMediaType ) {
						isMedia = true;
					}
				}

				if ( !isMedia
					&& /^(image(?!\/svg)|video|audio)\//.test(contentType) ) {
					isMedia = true;
				}
			}

			let dispHeader;

			try {
				dispHeader = channel.contentDisposition;
			} catch ( ex ) {
				//
			}

			if ( dispHeader && !isMedia ) {
				let ext = channel.contentDispositionFilename.match(
					/\.(jp(?:g|eg?)|a?png|gif|bmp|svgz?|web[pm]|og[gv]|m(?:p[34d]|3u8))$/i
				);

				if ( ext ) {
					ext = ext[1].toLowerCase();

					if ( ext.startsWith('svg') ) {
						if ( !prefs.viewSvg
							|| channel.requestMethod !== 'GET'
							|| channel.URI.ref === 'direct-view' ) {
							return;
						}

						this.updateTab(
							channel,
							vAPI._baseURI + 'viewer.html#svg:'
								+ channel.URI.spec.replace(/#.*/, '')
						);
						return;
					}

					if ( ext === 'm3u8' ) {
						streamingMediaType = 'hls';
					} else if ( ext === 'mpd' ) {
						streamingMediaType = 'dash';
					}

					if ( streamingMediaType ) {
						if ( prefs.extraFormats ) {
							isMedia = true;
						} else {
							streamingMediaType = null;
						}
					} else {
						isMedia = true;
						// At this point we are sure that content-type is not media
						channel.contentType = /^(mp[34]|webm|og)/.test(ext)
							? 'video/mp4'
							: 'image/png';
					}
				}
			}

			if ( !isMedia && prefs.extraFormats ) {
				streamingMediaType = channel.URI.spec.match(
					/(?:\.[mM](?:3[uU]8|[pP][dD])|\/[Mm]anifest)(?=$|[?#])/
				);

				if ( streamingMediaType ) {
					isMedia = true;

					switch ( streamingMediaType[0].toLowerCase() ) {
						case '.m3u8':
							streamingMediaType = 'hls';
							break;
						case '.mpd':
							streamingMediaType = 'dash';
							break;
						case '/manifest':
							streamingMediaType = 'mss';
							break;
					}
				}
			}

			if ( streamingMediaType ) {
				if ( channel.URI.ref === 'direct-view' ) {
					return;
				}

				this.updateTab(
					channel,
					vAPI._baseURI + 'viewer.html#' + streamingMediaType + ':'
						+ channel.URI.spec.replace(/#.*/, '')
				);
				return;
			}

			if ( !isMedia ) {
				return;
			}

			if ( prefs.forceInlineMedia
				&& dispHeader === channel.DISPOSITION_ATTACHMENT ) {
				channel.setResponseHeader(
					'Content-Disposition',
					channel.contentDispositionHeader.replace(
						/^\s*attachment/i,
						'inline'
					),
					false
				);
			}

			channel.setResponseHeader('Content-Security-Policy', '', false);
		}
	};

	this.unWatchReceivedHeaders = function() {
		this.unWatchReceivedHeaders = null;
		Services.obs.removeObserver(headersObserver, 'http-on-examine-response');
		Services.obs.removeObserver(headersObserver, 'http-on-examine-cached-response');
		Services.obs.removeObserver(headersObserver, 'http-on-examine-merged-response');
	};

	Services.obs.addObserver(headersObserver, 'http-on-examine-response', false);
	Services.obs.addObserver(headersObserver, 'http-on-examine-cached-response', false);
	Services.obs.addObserver(headersObserver, 'http-on-examine-merged-response', false);
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

	if ( vAPI.unWatchReceivedHeaders ) {
		vAPI.unWatchReceivedHeaders();
	}

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
