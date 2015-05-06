'use strict';

var cachedPrefs;

vAPI.storage.get('cfg', function(prefs) {
	var xhr = new XMLHttpRequest;
	xhr.overrideMimeType('application/json;charset=utf-8');
	xhr.open('GET', 'defaults.json', true);
	xhr.onload = function() {
		var needsUpdate = false;
		var defaltPrefs = JSON.parse(this.responseText);
		cachedPrefs = prefs ? JSON.parse(prefs) : {};

		for ( var p in defaltPrefs ) {
			if ( cachedPrefs[p] === void 0 ) {
				cachedPrefs[p] = defaltPrefs[p];
				needsUpdate = true;
			}
		}

		if ( needsUpdate ) {
			vAPI.storage.set('cfg', JSON.stringify(cachedPrefs));
		}
	};
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

		case 'save':
			cachedPrefs = message.prefs;
			vAPI.storage.set('cfg', JSON.stringify(cachedPrefs));
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
			xhr.onload = function() {
				channel.postMessage({'frames.js': this.responseText});
			};
			xhr.send();
			break;
	}

	// Chrome
	return true; // eslint-disable-line
});
