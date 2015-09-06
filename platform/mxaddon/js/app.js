'use strict';

var vAPI = Object.create(null);

vAPI.maxthon = true;
vAPI.runtime = external.mxGetRuntime();

vAPI.browser = {
	irPixelated: '-webkit-optimize-contrast',
	transform: 'transform',
	transitionCSS: 'transition',
	transitionend: 'transitionend',
	wheel: 'wheel',
	zoomIn: '-webkit-zoom-in'
};

vAPI.messaging = {
	listenerId: Math.random().toString(36).slice(2),
	emptyListener: function() {},

	listen: function(listener, once) {
		if ( this.listener ) {
			vAPI.runtime.listen(this.listenerId, this.emptyListener);
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

		vAPI.runtime.listen(this.listenerId, this.listener);
	},

	send: function(message, callback) {
		if ( typeof callback === 'function' ) {
			this.listen(callback, true);
		}

		vAPI.runtime.post('service', {
			message: JSON.stringify(message),
			listenerId: this.listenerId,
			origin: location.href
		});
	}
};

if ( location.protocol === 'mxaddon-pkg:' ) {
	vAPI.l10n = function(s) {
		var t = this.runtime.locale.t(s);
		return t[0] === '"' ? JSON.parse(t) : t || s;
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
		if ( typeof this._mediaType !== 'undefined' ) {
			return this._mediaType;
		}

		var media = document.querySelector(
			'body > img#img_elem:first-child, '
			+ 'body > '
			+ 'video[name=media][controls][autoplay]:first-child:not([src]) >'
			+ 'source[src]:only-child'
		);

		if ( !media ) {
			return this._mediaType;
		}

		if ( media.src !== location.href && media.currentSrc !== location.href ) {
			return this._mediaType;
		}

		if ( media.parentNode !== document.body ) {
			media = document.body.firstElementChild;
		}

		return this._mediaType = media.localName;
	},

	set: function(type) {
		this._mediaType = type;
	}
});
