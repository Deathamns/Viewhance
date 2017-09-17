'use strict';

/******************************************************************************/

if ( typeof browser === 'object' && this.browser.extension ) {
	this.chrome = this.browser;
}

/******************************************************************************/

var vAPI = Object.create(null);

vAPI.browser = navigator.userAgent.match(/(Edge|Firefox)\/\S/);
vAPI[vAPI.browser ? vAPI.browser[1].toLowerCase() : 'chrome'] = true;

vAPI.browser = {
	irPixelated: vAPI.firefox ? '-moz-crisp-edges' : 'pixelated',
	transformCSS: 'transform',
	transitionCSS: 'transition',
	transitionend: 'transitionend',
	wheel: 'wheel',
	zoomIn: (vAPI.chrome ? '-webkit-' : '') + 'zoom-in'
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

		if ( typeof listener === 'function' ) {
			chrome.runtime.sendMessage(message, listener);
		} else {
			chrome.runtime.sendMessage(message);
		}
	}
};

vAPI.insertHTML = function(node, str) {
	var allowedTags = /^([apbiusq]|d(iv|el)|em|h[1-6]|i(mg|ns)|s((pan|mall)|u[bp])|[bh]r|pre|code|blockquote|[ou]l|li|d[ltd]|t([rhd]|able|head|body|foot)|svg|symbol|line|path)$/i;
	var allowedAttrs = /^(data-|stroke-|(class|style|xmlns|viewBox|i?d|fill|line(cap|join)|transform|[xy][12])$)/i;
	var safeContainer = document.implementation.createHTMLDocument('').body;

	var cleanContainer = function(container) {
		var i = container.children.length;

		while ( i-- ) {
			var n = container.children[i];

			if ( !allowedTags.test(n.nodeName) ) {
				n.parentNode.removeChild(n);
				continue;
			}

			var j = n.attributes.length;

			while ( j-- ) {
				if ( !allowedAttrs.test(n.attributes[j].name) ) {
					n.removeAttribute(n.attributes[j].name);
				}
			}

			if ( n.children.length ) {
				cleanContainer(n);
			}
		}
	};

	vAPI.insertHTML = function(node, str) {
		if ( !node || typeof str !== 'string' ) {
			return;
		}

		if ( str.indexOf('<') === -1 ) {
			node.insertAdjacentText('beforeend', str);
			return;
		}

		safeContainer.innerHTML = str;
		cleanContainer(safeContainer);

		var nodeDoc = node.ownerDocument;
		var frag = nodeDoc.createDocumentFragment();

		while ( safeContainer.firstChild ) {
			frag.appendChild(nodeDoc.adoptNode(safeContainer.firstChild));
		}

		node.appendChild(frag);
	};

	vAPI.insertHTML(node, str);
};

if ( /^(chrome|ms-browser|moz)-extension:/.test(location.protocol) ) {
	if ( location.hash === '#options_ui' ) {
		if ( vAPI.firefox ) {
			location.replace('options.html');
		} else {
			vAPI.messaging.listen(window.close);
			vAPI.messaging.send({cmd: 'openURL', url: 'options.html'});
			throw Error('Exiting embedded options page...');
		}
	}

	vAPI.l10n = function(s) {
		try {
			return chrome.i18n.getMessage(s) || s;
		} catch ( ex ) {
			return s;
		}
	};
}


Object.defineProperty(vAPI, 'fullScreenElement', {
	get: function() {
		return document.fullscreenElement
			|| document.mozFullScreenElement
			|| document.webkitFullscreenElement
			|| null;
	}
});

Object.defineProperty(vAPI, 'mediaType', {
	get: function() {
		if ( typeof this._mediaType !== 'undefined' ) {
			return this._mediaType;
		}

		var selector, media;

		if ( vAPI.firefox ) {
			var head = document.head;
			selector
				= 'meta[content="width=device-width; height=device-height;"],'
				+ 'link[rel=stylesheet][href^="resource://gre/res/TopLevel"],'
				+ 'link[rel=stylesheet][href^="resource://content-accessible/TopLevel"],'
				+ 'link[rel=stylesheet][href^="chrome://global/skin/media/TopLevel"]';
			this._mediaType = '';

			if ( !head || head.querySelectorAll(selector).length !== 3 ) {
				return this._mediaType;
			}

			media = document.querySelector(
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
		} else {
			selector = 'meta[name=viewport][content^="width=device-width"]';
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
				selector = 'body[style^="margin: 0px;"] > '
					+ 'img[style*="user-select: none"]:first-child, '
					+ 'body > video[name=media][controls][autoplay]'
						+ ':first-child:not([src])';
			}

			media = document.querySelector(selector);

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
		}

		this._mediaType = media.localName;
		return this._mediaType;
	},

	set: function(type) {
		this._mediaType = type;
	}
});
