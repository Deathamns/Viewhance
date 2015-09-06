'use strict';

var vAPI = Object.create(null);

vAPI.opera = true;

vAPI.browser = {
	irPixelated: '-o-crisp-edges',
	transform: 'transform',
	transitionCSS: 'transition',
	transitionend: 'transitionend',
	wheel: 'mousewheel',
	zoomIn: 'zoom-in'
};

vAPI.messaging = {
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

	vAPI.insertHTML = function(n, html) {
		n.innerHTML = html;
	};
}

if ( !window.requestAnimationFrame ) {
	window.requestAnimationFrame = function(cb) {
		return window.setTimeout(cb, 1000 / 60);
	};
}


Object.defineProperty(vAPI, 'fullScreenElement', {
	get: function() {
		return document.fullscreenElement;
	}
});

Object.defineProperty(vAPI, 'mediaType', {
	get: function() {
		if ( typeof this._mediaType !== 'undefined' ) {
			return this._mediaType;
		}

		var selector = 'link[rel=stylesheet][href^="opera:style/"]';

		if ( !document.head || !document.head.querySelector(selector) ) {
			return this._mediaType = '';
		}

		var media = document.querySelector(
			'body > img[src=""], body > div > video[src=""]'
		);

		if ( !media ) {
			return this._mediaType = '';
		}

		if ( media.parentNode !== document.body ) {
			// media file
			document.body.replaceChild(
				media,
				document.body.firstElementChild
			);
		} else {
			// image
			window.donotrun = media.error = true;
			media.naturalWidth = 0;

			media.onclick = null;
			window.ondragstart = null;
			window.onkeypress = null;
			window.onmousedown = null;
			window.onmouseup = null;
			window.onmousemove = null;
		}

		return this._mediaType = media.localName;
	},

	set: function(type) {
		this._mediaType = type;
	}
});
