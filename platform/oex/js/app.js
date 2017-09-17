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

vAPI.opera = true;

vAPI.browser = {
	irPixelated: '-o-crisp-edges',
	transformCSS: 'transform',
	transitionCSS: 'transition',
	transitionend: 'transitionend',
	wheel: 'mousewheel',
	zoomIn: 'zoom-in'
};

vAPI.messaging = {
	listener: null,

	listen: function(listener, once) {
		if ( this.listener ) {
			opera.extension.removeEventListener('message', this.listener);
		}

		if ( typeof listener !== 'function' ) {
			this.listener = null;
			return;
		}

		this.listener = function(response) {
			if ( once ) {
				vAPI.messaging.listen(null);
			}

			listener(response.data);
		};

		opera.extension.addEventListener('message', this.listener);
	},

	send: function(message, callback) {
		if ( typeof callback === 'function' ) {
			this.listen(callback, true);
		}

		opera.extension.postMessage(message);
	}
};

vAPI.insertHTML = function(node, str) {
	node.insertAdjacentHTML('beforeend', str);
};

if ( window.location.protocol === 'widget:' ) {
	document.head.appendChild(
		document.createElement('script')
	).src = './strings.js';

	vAPI.l10n = function(s) {
		if ( !this.l10nData || !this.l10nData.hasOwnProperty(s) ) {
			return s;
		}

		return this.l10nData[s];
	};
}


Object.defineProperty(vAPI, 'fullScreenElement', {
	get: function() {
		return document.fullscreenElement;
	}
});

Object.defineProperty(vAPI, 'mediaType', {
	get: function() {
		if ( this._mediaType !== void 0 ) {
			return this._mediaType;
		}

		this._mediaType = '';

		var selector = 'link[rel=stylesheet][href^="opera:style/"]';

		if ( !document.head || !document.head.querySelector(selector) ) {
			return this._mediaType;
		}

		var media = document.querySelector([
			'body > img[src=""]',
			'body > div > video[src=""]:only-child',
			'body > div > audio[src=""]:only-child'
		].join(', '));

		if ( !media ) {
			return this._mediaType;
		}

		this._mediaType = media.localName;

		if ( this._mediaType === 'img' ) {
			// Clean up default image viewer
			media = document.body.querySelector('img[src=""]');
			window.donotrun = true;
			media.error = true;
			// media.naturalWidth = 0;
			media.onclick = null;
			media.onerror = null;
			window.onkeypress = null;
			window.ondragstart = null;
			window.onmousedown = null;
			window.onmouseup = null;
			window.onmousemove = null;
		}

		return this._mediaType;
	},

	set: function(type) {
		this._mediaType = type;
	}
});
