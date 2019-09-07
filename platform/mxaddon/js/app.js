'use strict';

var vAPI = Object.create(null);

vAPI.maxthon = true;
vAPI._runtime = external.mxGetRuntime();

vAPI.browser = {
	irPixelated: '-webkit-optimize-contrast',
	transformCSS: '-webkit-transform',
	transitionCSS: '-webkit-transition',
	transitionend: 'webkitTransitionEnd',
	wheel: 'mousewheel',
	zoomIn: '-webkit-zoom-in'
};

vAPI.messaging = {
	_listenerId: Math.random().toString(36).slice(2),
	_emptyListener: function() {},
	listener: null,

	listen: function(listener, once) {
		if ( this.listener ) {
			vAPI._runtime.listen(this._listenerId, this._emptyListener);
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

		vAPI._runtime.listen(this._listenerId, this.listener);
	},

	send: function(message, callback) {
		if ( typeof callback === 'function' ) {
			this.listen(callback, true);
		}

		vAPI._runtime.post('service', {
			message: JSON.stringify(message),
			listenerId: this._listenerId,
			url: location.href
		});
	}
};

vAPI.insertHTML = function(node, str) {
	node.insertAdjacentHTML('beforeend', str);
};

if ( location.protocol === 'mxaddon-pkg:' ) {
	vAPI.l10n = function(s) {
		var t = this._runtime.locale.t(s);
		return t[0] === '"' ? JSON.parse(t) : t || s;
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

		var media = document.querySelector(
			'body > img#img_elem:first-child, '
			+ 'body > '
			+ 'video[name=media][controls][autoplay]:first-child:not([src]) >'
			+ 'source[src]:only-child'
		);
		this._mediaType = '';

		if ( !media ) {
			// Newer Maxthons use chromium
			media = document.querySelector(
				'body[style^="margin: 0px;"] > '
				+ 'img[style*="user-select: none"]:first-child, '
				+ 'body > video[name=media][controls][autoplay]'
					+ ':first-child:not([src])'
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
		}

		if ( media.src !== location.href && media.currentSrc !== location.href ) {
			return this._mediaType;
		}

		if ( media.parentNode !== document.body ) {
			media = document.body.firstElementChild;
		} else if ( media.localName === 'img' ) {
			var stopPropagation = function(e) {
				e.stopPropagation();
			};
			// Suppress event listeners added by Maxthon
			document.documentElement.addEventListener('mousedown', stopPropagation);
			document.documentElement.addEventListener('keydown', stopPropagation);
			media.parentNode.replaceChild(media.cloneNode(false), media);
		}

		this._mediaType = media.localName;
		return this._mediaType;
	},

	set: function(type) {
		this._mediaType = type;
	}
});
