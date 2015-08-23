'use strict';

var cachedPrefs;

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

vAPI.storage.get('cfg', function(cfg) {
	var storedPrefs;

	try {
		storedPrefs = JSON.parse(cfg || '{}');
	} catch ( ex ) {
		storedPrefs = {};
	}

	updatePrefs(storedPrefs, storedPrefs);
});

vAPI.messaging.listen(function(e, origin, postMessage) {
	var channel = vAPI.messaging.parseMessage(e, origin, postMessage);
	var message = channel.msg;

	if ( !message.cmd ) {
		return;
	}

	switch ( message.cmd ) {
		case 'loadPrefs':
			var response = {
				prefs: message.property
					? cachedPrefs[message.property]
					: cachedPrefs
			};

			if ( message.getAppInfo ) {
				response.app = vAPI.app;
			}

			channel.postMessage(response);
			break;

		case 'savePrefs':
			vAPI.storage.get('cfg', function(cfg) {
				updatePrefs(message.prefs, JSON.parse(cfg || '{}'));
			});
			break;

		case 'open':
			if ( !Array.isArray(message.url) ) {
				message.url = [message.url];
			}

			vAPI.tabs.getSelected(function(tab) {
				for ( var i = 0; i < message.url.length; ++i ) {
					vAPI.tabs.create({
						incognito: !!tab.incognito,
						url: message.url[i],
						active: !message.nf
					});
				}
			});
			break;

		case 'frames.js':
			var xhr = new XMLHttpRequest;
			xhr.overrideMimeType('text/plain;charset=utf-8');
			xhr.open('GET', 'js/frames.js', true);
			xhr.addEventListener('load', function() {
				channel.postMessage({'frames.js': this.responseText});
			});
			xhr.send();
			break;
	}

	// Chrome
	return true; // eslint-disable-line
});
