'use strict';

var vAPI = Object.create(null);

vAPI.safari = true;

vAPI.browser = {
	irPixelated: '-webkit-crisp-edges',
	transform: 'webkitTransform' in document.documentElement.style
		? 'webkitTransform'
		: 'transform',
	transitionCSS: 'webkitTransition' in document.documentElement.style
		? '-webkit-transition'
		: 'transition',
	transitionend: 'webkitTransition' in document.documentElement.style
		? 'webkitTransitionEnd'
		: 'transitionend',
	wheel: 'onwheel' in document.documentElement ? 'wheel' : 'mousewheel',
	zoomIn: '-webkit-zoom-in'
};

vAPI.messaging = {
	listenerId: Math.random().toString(36).slice(2),

	listen: function(listener, once) {
		if ( this.listener ) {
			safari.self.removeEventListener('message', this.listener, false);
		}

		if ( typeof listener !== 'function' ) {
			this.listener = null;
			return;
		}

		this.listener = function(response) {
			if ( response.name !== vAPI.messaging.listenerId ) {
				return;
			}

			if ( once ) {
				vAPI.messaging.listen(null);
			}

			listener(response.message);
		};

		safari.self.addEventListener('message', this.listener, false);
	},

	send: function(message, callback) {
		if ( typeof callback === 'function' ) {
			this.listen(callback, true);
		}

		safari.self.tab.dispatchMessage(this.listenerId, message);
	}
};

if ( location.protocol === 'safari-extension:' ) {
	(function() {
		var xhr = new XMLHttpRequest;
		xhr.overrideMimeType('application/json;charset=utf-8');
		xhr.open('GET', './locales.json', false);
		xhr.send();
		var supportedLocales = JSON.parse(xhr.responseText);
		var alpha2 = navigator.language;

		if ( !supportedLocales[alpha2] ) {
			alpha2 = alpha2.slice(0, 2);

			if ( !supportedLocales[alpha2] ) {
				// Choose the default language
				alpha2 = supportedLocales._;
			}
		}

		var js = document.createElement('script');
		js.src = './locales/' + alpha2 + '/strings.js';
		document.head.appendChild(js);
	})();

	vAPI.l10n = function(s) {
		if ( !this.l10nData || !this.l10nData.hasOwnProperty(s) ) {
			return s;
		}

		return this.l10nData[s];
	};

	vAPI.insertHTML = function(n, html) {
		n.innerHTML = html;
	};
}

if ( !window.requestAnimationFrame ) {
	window.requestAnimationFrame = function(cb) {
		return window.setTimeout(cb, 0xf);
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

		this._mediaType = '';

		if ( document.head ) {
			return this._mediaType;
		}

		var media = document.querySelector(
			'body[style^="margin: 0px"] > img[style^="-webkit-user"]:first-child, '
			+ 'body > video[name=media][controls][autoplay]'
		);

		if ( !media ) {
			return this._mediaType;
		}

		if ( media.src !== location.href && media.currentSrc !== location.href ) {
			return this._mediaType;
		}

		return this._mediaType = media.localName;
	},

	set: function(type) {
		this._mediaType = type;
	}
});
