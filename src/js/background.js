'use strict';

var cachedPrefs;

var updatePrefs = function(newPrefs, oldPrefs, forceUpdate) {
	var needsUpdate = forceUpdate || false;

	for ( var prefName in oldPrefs ) {
		if ( !newPrefs.hasOwnProperty(prefName) ) {
			newPrefs[prefName] = oldPrefs[prefName];
			needsUpdate = true;
		}
	}

	if ( needsUpdate ) {
		vAPI.storage.set('cfg', JSON.stringify(newPrefs));
	}

	return newPrefs;
};

vAPI.storage.get('cfg', function(prefs) {
	var xhr = new XMLHttpRequest;
	xhr.overrideMimeType('application/json;charset=utf-8');
	xhr.open('GET', 'defaults.json', true);
	xhr.addEventListener('load', function() {
		var forceUpdate = false;
		var defaultPrefs = JSON.parse(this.responseText);
		cachedPrefs = prefs ? JSON.parse(prefs) : {};

		// Cleanup unused preferences
		for ( var prefName in cachedPrefs ) {
			if ( !defaultPrefs.hasOwnProperty(prefName) ) {
				delete cachedPrefs[prefName];
				forceUpdate = true;
			}
		}

		cachedPrefs = updatePrefs(cachedPrefs, defaultPrefs, forceUpdate);
	});
	xhr.send();
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
			cachedPrefs = updatePrefs(message.prefs, cachedPrefs, true);
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
