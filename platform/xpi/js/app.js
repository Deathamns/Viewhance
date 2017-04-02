/* global addMessageListener, removeMessageListener, sendAsyncMessage, _hostName_, _sandboxId_ */

'use strict';

var vAPI = Object.create(null);

vAPI.firefox = true;

vAPI.browser = {
	wheel: 'wheel',
	irPixelated: '-moz-crisp-edges',
	transformCSS: 'transform',
	transitionCSS: 'transition',
	transitionend: 'transitionend',
	zoomIn: 'zoom-in'
};

vAPI.messaging = {
	listener: null,

	_toggleListener: function(e) {
		if ( !vAPI.messaging.listener ) {
			return;
		}

		if ( e.type === 'pagehide' ) {
			removeMessageListener();
			return;
		}

		if ( e.persisted ) {
			addMessageListener(vAPI.messaging.listener);
		}
	},

	listen: function(listener, once) {
		if ( this.listener ) {
			removeMessageListener();
		}

		if ( typeof listener !== 'function' ) {
			this.listener = null;
			return;
		}

		this.listener = function(response) {
			if ( once ) {
				vAPI.messaging.listen(null);
			}

			listener(JSON.parse(response));
		};

		addMessageListener(this.listener);
	},

	send: function(message, callback) {
		if ( typeof callback === 'function' ) {
			this.listen(callback, true);
		}

		sendAsyncMessage(_hostName_ + ':background', {
			listenerId: _sandboxId_,
			data: message,
			url: window.location.href
		});
	}
};

vAPI.releaseVendorListeners = function() {
	window.removeEventListener(
		'pagehide',
		vAPI.messaging._toggleListener,
		true
	);
	window.removeEventListener(
		'pageshow',
		vAPI.messaging._toggleListener,
		true
	);
	vAPI.messaging._toggleListener({type: 'pagehide'});
};

window.addEventListener('pagehide', vAPI.messaging._toggleListener, true);
window.addEventListener('pageshow', vAPI.messaging._toggleListener, true);

if ( location.protocol === 'chrome:' && location.hostname === _hostName_ ) {
	vAPI.l10n = (function() {
		var stringBundle = Components
			.classes['@mozilla.org/intl/stringbundle;1']
			.getService(Components.interfaces.nsIStringBundleService)
			.createBundle(
				'chrome://' + location.host + '/locale/strings.properties'
			);

		return function(s) {
			try {
				return stringBundle.GetStringFromName(s);
			} catch ( ex ) {
				return s;
			}
		};
	})();

	vAPI.insertHTML = (function() {
		var io = Components.classes['@mozilla.org/network/io-service;1']
			.getService(Components.interfaces.nsIIOService);
		var parser = Components.classes['@mozilla.org/parserutils;1']
			.getService(Components.interfaces.nsIParserUtils);

		return function(node, html) {
			while ( node.firstChild ) {
				node.removeChild(node.firstChild);
			}

			node.appendChild(parser.parseFragment(
				html,
				parser.SanitizerAllowStyle,
				false,
				io.newURI('about:blank', null, null),
				document.documentElement
			));
		};
	})();
}


Object.defineProperty(vAPI, 'fullScreenElement', {
	get: function() {
		if ( 'fullscreenElement' in document ) {
			return document.fullscreenElement;
		}

		return document.mozFullScreenElement || null;
	}
});

Object.defineProperty(vAPI, 'mediaType', {
	get: function() {
		if ( typeof this._mediaType !== 'undefined' ) {
			return this._mediaType;
		}

		var head = document.head;
		var selector
			= 'meta[content="width=device-width; height=device-height;"],'
			+ 'link[rel=stylesheet][href^="resource://gre/res/TopLevel"],'
			+ 'link[rel=stylesheet][href^="chrome://global/skin/media/TopLevel"]';
		this._mediaType = '';

		if ( !head || head.querySelectorAll(selector).length !== 3 ) {
			return this._mediaType;
		}

		var media = document.querySelector(
			'body > img:first-child, '
			+ 'body > video[controls][autoplay]:not([src]):empty'
		);

		if ( !media ) {
			return this._mediaType;
		}

		if ( media.src && media.src === window.location.href ) {
			this._mediaType = 'img';
			return this._mediaType;
		}

		// When media is redirected the currentSrc doesn't change
		/*if ( media.parentNode.currentSrc !== location.href ) {
			return this._mediaType;
		}*/

		this._mediaType = 'video';
		return this._mediaType;
	},

	set: function(type) {
		this._mediaType = type;
	}
});
