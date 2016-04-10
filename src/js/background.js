'use strict';

var cachedPrefs;
var onPrefsUpdatedCallbacks = [];

var updatePrefs = function(newPrefs, storedPrefs) {
	var xhr = new XMLHttpRequest;
	xhr.overrideMimeType('application/json;charset=utf-8');
	xhr.open('GET', 'defaults.json', true);
	xhr.addEventListener('load', function() {
		var key;
		var defPrefs = JSON.parse(this.responseText);
		cachedPrefs = {};

		for ( key in defPrefs ) {
			cachedPrefs[key] = storedPrefs[key] === void 0
				? defPrefs[key]
				: storedPrefs[key];

			if ( newPrefs[key] === void 0 ) {
				continue;
			}

			if ( typeof newPrefs[key] !== typeof defPrefs[key] ) {
				continue;
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

		while ( onPrefsUpdatedCallbacks.length ) {
			onPrefsUpdatedCallbacks.pop()();
		}

		// In order to initialize sooner on content side, Chrome reads the prefs
		// there (to avoid messaging), so we have to save all prefs
		if ( vAPI.chrome ) {
			vAPI.storage.set('cfg', JSON.stringify(cachedPrefs));
			return;
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
	});
	xhr.send();
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

		if ( message.getAppInfo ) {
			response.app = vAPI.app;
		}

		respond(response);
	} else if ( cmd === 'savePrefs' ) {
		vAPI.storage.get('cfg', function(cfg) {
			updatePrefs(message.prefs, JSON.parse(cfg || '{}'));
		});
	} else if ( cmd === 'openURL' ) {
		if ( !Array.isArray(message.url) ) {
			message.url = [message.url];
		}

		message.url.forEach(function(url) {
			if ( url && typeof url === 'string' ) {
				vAPI.tabs.create({url: url, active: !message.nf});
			}
		});
	} else if ( cmd === 'loadFile' ) {
		var xhr = new XMLHttpRequest;
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.open('GET', message.path, true);
		xhr.addEventListener('load', function() {
			respond(this.responseText);
		});
		xhr.send();
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

document.title = ':: ' + vAPI.app.name + ' ::';
