'use strict';

/******************************************************************************/

if ( !this.requestAnimationFrame ) {
	this.requestAnimationFrame = function(callback) {
		return setTimeout(callback, 0xf);
	};

	this.cancelAnimationFrame = function(timerId) {
		return clearTimeout(timerId);
	};
}

/******************************************************************************/

var vAPI = Object.create(null);

vAPI.safari = true;

vAPI.browser = {
	irPixelated: '-webkit-crisp-edges',
	transformCSS: 'webkitTransform' in document.documentElement.style
		? '-webkit-transform'
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
	_listenerId: Math.random().toString(36).slice(2),
	listener: null,

	listen: function(listener, once) {
		if ( this.listener ) {
			safari.self.removeEventListener('message', this.listener);
		}

		if ( typeof listener !== 'function' ) {
			this.listener = null;
			return;
		}

		this.listener = function(response) {
			if ( response.name !== vAPI.messaging._listenerId ) {
				return;
			}

			if ( once ) {
				vAPI.messaging.listen(null);
			}

			listener(response.message);
		};

		safari.self.addEventListener('message', this.listener);
	},

	send: function(message, callback) {
		if ( typeof callback === 'function' ) {
			this.listen(callback, true);
		}

		safari.self.tab.dispatchMessage(this._listenerId, message);
	}
};

vAPI.insertHTML = function(node, str) {
	node.insertAdjacentHTML('beforeend', str);
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

		this._mediaType = '';

		var media = document.querySelector(
			'body[style^="margin: 0px"] > img[style^="-webkit-user"]:first-child, '
			+ 'body > video[name=media][controls][autoplay]:first-child, '
			+ 'body > video.media-document[controls][autoplay]:first-child'
		);

		if ( !media ) {
			return this._mediaType;
		}

		if ( media.src !== location.href
			&& media.currentSrc !== location.href
			&& (media.childElementCount !== 1
				|| media.firstElementChild.src !== location.href) ) {
			return this._mediaType;
		}

		this._mediaType = media.localName;
		return this._mediaType;
	},

	set: function(type) {
		this._mediaType = type;
	}
});
