'use strict';

var vAPI = Object.create(null);

vAPI.chrome = true;

vAPI.browser = {
	irPixelated: 'pixelated',
	transformCSS: 'transform',
	transitionCSS: 'transition',
	transitionend: 'transitionend',
	wheel: 'wheel',
	zoomIn: '-webkit-zoom-in'
};

vAPI.messaging = {
	listener: null,

	listen: function(listener) {
		if ( this.listener ) {
			chrome.runtime.onMessage.removeListener(this.listener);
		}

		if ( typeof listener !== 'function' ) {
			this.listener = null;
			return;
		}

		this.listener = listener;
		chrome.runtime.onMessage.addListener(this.listener);
	},

	send: function(message, callback) {
		var listener = callback || this.listener;

		// Reading prefs from content scripts seems noticeably faster
		// (no flicker when loading) than getting them via messaging
		if ( message.cmd === 'loadPrefs' && !message.property
			&& !message.getAppInfo ) {
			chrome.storage.sync.get('cfg', function(obj) {
				if ( typeof listener === 'function' ) {
					listener({prefs: JSON.parse(obj.cfg)});
				}
			});
			return;
		}

		// Message cannot be sent from a listener function, setTimout solves it
		setTimeout(function() {
			if ( typeof	listener === 'function' ) {
				chrome.runtime.sendMessage(message, listener);
			} else {
				chrome.runtime.sendMessage(message);
			}
		}, 0);
	}
};

if ( location.protocol === 'chrome-extension:' ) {
	if ( location.hash === '#options_ui' ) {
		vAPI.messaging.send({cmd: 'open', url: 'options.html'});
		window.close();
	}

	vAPI.l10n = function(s) {
		return chrome.i18n.getMessage(s) || s;
	};

	vAPI.insertHTML = function(n, html) {
		n.innerHTML = html;
	};
}


Object.defineProperty(vAPI, 'fullScreenElement', {
	get: function() {
		return document.webkitFullscreenElement;
	}
});

Object.defineProperty(vAPI, 'mediaType', {
	get: function() {
		if ( this._mediaType !== void 0 ) {
			return this._mediaType;
		}

		var selector = 'meta[name=viewport][content^="width=device-width"]';
		this._mediaType = '';

		if ( !document.head || !document.head.querySelector(selector) ) {
			return this._mediaType;
		}

		var media = document.querySelector(
			'body[style="margin: 0px;"] > img[style^="-webkit-"]:first-child, '
			// Chropera 29 changed the structure
			+ (navigator.appVersion.indexOf('OPR/') === 1
				? ''
				: 'body[style="margin: 0px;"] > '
					+ 'div[style^="display: table"]:only-child >'
					+ 'div[style^="display: table-cell"] > img:only-child, '
			)
			+ 'body > video[name=media][controls][autoplay]:first-child:not([src])'
		);

		if ( !media ) {
			return this._mediaType;
		}

		var source = media.querySelector('source');

		// Latest Chromium versions use <source>
		if ( source ) {
			if ( source.src !== location.href ) {
				return this._mediaType;
			}
		} else if ( media.src !== location.href ) {
			if ( media.currentSrc !== location.href ) {
				return this._mediaType;
			}
		}

		this._mediaType = media.localName;
		return this._mediaType;
	},

	set: function(type) {
		this._mediaType = type;
	}
});
