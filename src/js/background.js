/* eslint strict:off */

var cachedPrefs;
var onPrefsUpdatedCallbacks = [];

if ( vAPI.permissions ) {
	vAPI.prefPermissions = {
		viewDataURI: {
			perms: ['webNavigation'],
			noPermValue: false
		}
	};
}

var xhr = function(url, onLoad) {
	if ( typeof fetch !== 'undefined' && !vAPI.maxthon ) {
		fetch(url).then(function(response) {
			return response.text();
		}).then(function(responseText) {
			onLoad(responseText);
		});
		return;
	}

	var req = new XMLHttpRequest;
	req.overrideMimeType('text/plain;charset=utf-8');
	req.open('GET', url, true);
	req.addEventListener('load', function() {
		onLoad(this.responseText);
	});
	req.send();
};

var updatePrefs = function(newPrefs, storedPrefs) {
	var currentPermissions = null;

	var onDefaultsReady = function(responseText) {
		var key;
		var defPrefs = JSON.parse(responseText);
		cachedPrefs = {};

		for ( key in defPrefs ) {
			cachedPrefs[key] = storedPrefs[key] === void 0
				? defPrefs[key]
				: storedPrefs[key];

			if ( newPrefs[key] === void 0 ) {
				continue;
			}

			if ( typeof newPrefs[key] !== typeof defPrefs[key] ) {
				if ( defPrefs[key] !== null ) {
					continue;
				}
			}

			if ( newPrefs[key] === defPrefs[key] ) {
				cachedPrefs[key] = defPrefs[key];
				continue;
			}

			if ( typeof defPrefs[key] === 'object'
				&& JSON.stringify(newPrefs[key]) === JSON.stringify(defPrefs[key]) ) {
				cachedPrefs[key] = defPrefs[key];
				continue;
			}

			cachedPrefs[key] = newPrefs[key];
		}

		if ( Array.isArray(currentPermissions) ) {
			for ( var prefName in vAPI.prefPermissions ) {
				var pref = vAPI.prefPermissions[prefName];
				var i = pref.perms.length;

				while ( i-- ) {
					if ( currentPermissions.indexOf(pref.perms[i]) !== -1) {
						continue;
					}

					cachedPrefs[prefName] = pref.noPermValue;
					defPrefs[prefName] = pref.noPermValue;
					break;
				}
			}
		}

		if ( typeof vAPI.watchReceivedHeaders === 'function' ) {
			if ( vAPI.unWatchReceivedHeaders ) {
				vAPI.unWatchReceivedHeaders();
			}

			if ( cachedPrefs.extraFormats
				|| cachedPrefs.forceInlineMedia
				|| cachedPrefs.viewSvg ) {
				vAPI.watchReceivedHeaders({
					extraFormats: cachedPrefs.extraFormats,
					forceInlineMedia: cachedPrefs.forceInlineMedia,
					viewSvg: cachedPrefs.viewSvg
				});
			}
		}

		if ( typeof vAPI.watchDataTabs === 'function' ) {
			if ( vAPI.unWatchDataTabs ) {
				vAPI.unWatchDataTabs();
			}

			if ( cachedPrefs.viewDataURI ) {
				vAPI.watchDataTabs();
			}
		}

		while ( onPrefsUpdatedCallbacks.length ) {
			onPrefsUpdatedCallbacks.pop()();
		}

		var prefsToStore = {};

		for ( key in defPrefs ) {
			if ( cachedPrefs[key] === defPrefs[key] ) {
				continue;
			}

			if ( typeof defPrefs[key] === 'object' ) {
				if ( JSON.stringify(cachedPrefs[key]) === JSON.stringify(defPrefs[key]) ) {
					continue;
				}
			}

			prefsToStore[key] = cachedPrefs[key];
		}

		prefsToStore = JSON.stringify(prefsToStore);

		if ( prefsToStore === '{}' ) {
			vAPI.storage.remove('cfg');
		} else if ( prefsToStore !== JSON.stringify(storedPrefs) ) {
			vAPI.storage.set('cfg', prefsToStore);
		}
	};

	if ( !vAPI.permissions ) {
		xhr('data/defaults.json', onDefaultsReady);
		return;
	}

	vAPI.permissions.getAll(function(res) {
		currentPermissions = res.permissions;
		xhr('data/defaults.json', onDefaultsReady);
	});
};

var onMessage = function(message, source, respond) {
	var cmd = message.cmd;

	if ( cmd === 'loadPrefs' ) {
		if ( cachedPrefs === void 0 ) {
			onPrefsUpdatedCallbacks.push(function() {
				onMessage(message, source, respond);
			});
			return;
		}

		var response = {
			prefs: message.property
				? cachedPrefs[message.property]
				: cachedPrefs
		};

		if ( !message.getAppInfo ) {
			respond(response);
			return;
		}

		xhr('data/defaults.json', function(responseText) {
			if ( vAPI.prefPermissions ) {
				response._prefPermissions = vAPI.prefPermissions;
			}

			response._app = vAPI.app;
			response._defaultPrefs = responseText;
			respond(response);
		});
	} else if ( cmd === 'loadStoredPrefs' ) {
		vAPI.storage.get('cfg', function(cfg) {
			respond({prefs: JSON.parse(cfg || '{}')});
		});
	} else if ( cmd === 'savePrefs' ) {
		vAPI.storage.get('cfg', function(cfg) {
			if ( Array.isArray(message.dropPerms) && message.dropPerms.length ) {
				onPrefsUpdatedCallbacks.push(function() {
					vAPI.permissions.remove({permissions: message.dropPerms});
				});
			}

			updatePrefs(message.prefs, JSON.parse(cfg || '{}'));
		});
	} else if ( cmd === 'openURL' ) {
		if ( !Array.isArray(message.url) ) {
			message.url = [message.url];
		}

		message.url.forEach(function(url) {
			if ( !url || typeof url !== 'string' ) {
				return;
			}

			vAPI.tabs.create({
				url: url,
				active: !message.nf,
				openerTabId: source.tabId,
				index: 1e4
			});
		});
	} else if ( cmd === 'loadFile' ) {
		xhr(message.path, respond);
	}
};

vAPI.storage.get('cfg', function(cfg) {
	var storedPrefs;

	try {
		storedPrefs = JSON.parse(cfg || '{}');
	} catch ( ex ) {
		storedPrefs = {};
	}

	updatePrefs(storedPrefs, storedPrefs);
});

vAPI.messaging.listen(onMessage);
