'use strict';

/******************************************************************************/

if ( typeof browser === 'object' && this.browser.extension ) {
	this.chrome = this.browser;

	if ( !chrome.storage.sync ) {
		chrome.storage.sync = chrome.storage.local;
	}
}

/******************************************************************************/

var vAPI = Object.create(null);

vAPI.chrome = true;

vAPI.browser = {
	irPixelated: 'pixelated',
	transformCSS: 'transform',
	transitionCSS: 'transition',
	transitionend: 'transitionend',
	wheel: 'wheel',
	zoomIn: (typeof browser === 'object' ? '' : '-webkit-') + 'zoom-in'
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
		// than getting them via messaging
		if ( message.cmd === 'loadPrefs' && !message.getAppInfo ) {
			chrome.storage.sync.get('cfg', function(obj) {
				if ( typeof listener === 'function' ) {
					var cfg = JSON.parse(obj.cfg);
					listener({
						prefs: message.property ? cfg[message.property] : cfg
					});
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

if ( /^(chrome|ms-browser|moz)-extension:/.test(location.protocol) ) {
	if ( location.hash === '#options_ui' ) {
		vAPI.messaging.listen(window.close);
		vAPI.messaging.send({cmd: 'openURL', url: 'options.html'});
		throw Error('Exiting embedded options page...');
	}

	vAPI.l10n = function(s) {
		try {
			return chrome.i18n.getMessage(s) || s;
		} catch ( ex ) {
			return s;
		}
	};

	vAPI.insertHTML = function(n, html) {
		n.innerHTML = html;
	};
}


Object.defineProperty(vAPI, 'fullScreenElement', {
	get: function() {
		return document.fullscreenElement || document.webkitFullscreenElement;
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

		// Since Edge isn't actually a Chromium platform
		if ( typeof browser === 'object' ) {
			selector = 'body >'
				+ 'input#zoom[type="checkbox"] + label#imgContainer > '
					+ 'img[src]:only-child, '
				+ 'body[style^="background-color: rgb(41,41,41)"] > '
					+ 'video[style][autoplay][controls][src]:empty, '
				+ 'body[style^="background-color: rgb(41,41,41)"] > '
					+ 'audio[style][autoplay][controls][src]:empty';
		} else {
			selector = 'body[style="margin: 0px;"] > ';

			// Chropera 29 changed the structure
			selector = navigator.appVersion.indexOf('OPR/') === -1
				? 'img[style^="-webkit-"]:first-child'
				: 'div[style^="display: table"] > '
					+ 'div[style^="display: table-cell"]:only-child >'
					+ 'img:only-child';

			selector += ', body >'
				+ 'video[name=media][controls][autoplay]'
				+ ':first-child:not([src])';
		}

		var media = document.querySelector(selector);

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
