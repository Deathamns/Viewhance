'use strict';

var vAPI = Object.create(null);

try {
	void chrome.storage.local;
	vAPI[this.browser ? 'firefox' : 'chrome'] = true;
} catch ( ex ) {
	vAPI.edge = true;
	this.chrome = this.browser;
}

vAPI.crx = true;

vAPI.browser = {
	irPixelated: vAPI.firefox ? 'crisp-edges' : 'pixelated',
	transformCSS: 'transform',
	transitionCSS: 'transition',
	transitionend: 'transitionend',
	wheel: 'wheel',
	zoomIn: (vAPI.chrome ? '-webkit-' : '') + 'zoom-in'
};

vAPI.messaging = {
	listener: null,

	_createListener: function(listener) {
		if ( !vAPI.l10n ) {
			return listener;
		}

		// Skip messages in extension pages from content scripts (Firefox, Edge)
		return function(message, sender) {
			if ( !sender ) {
				listener(message);
			}
		};
	},

	listen: function(listener) {
		if ( this.listener ) {
			chrome.runtime.onMessage.removeListener(this.listener);
		}

		if ( typeof listener !== 'function' ) {
			this.listener = null;
			return;
		}

		this.listener = this._createListener(listener);
		chrome.runtime.onMessage.addListener(this.listener);
	},

	send: function(message, callback) {
		var listener = callback
			? this._createListener(callback)
			: this.listener;

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
		var i = container.childElementCount;
		// Edge doesn't have children on SVG elements
		var children = container.children || container.childNodes;

		while ( i-- ) {
			var n = children[i];

			if ( n.nodeType === Node.TEXT_NODE ) {
				continue;
			}

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

			if ( n.childElementCount ) {
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
	vAPI.l10n = function(s) {
		try {
			return chrome.i18n.getMessage(s) || s;
		} catch ( ex ) {
			return s;
		}
	};

	vAPI.permissions = chrome.permissions;
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
			media = document.head && document.head.querySelector(
				'link[rel=stylesheet][href^="chrome://global/skin/media/TopLevel"]'
			);
			this._mediaType = '';

			if ( !media ) {
				return this._mediaType;
			}

			media = media.href.match(/TopLevel(Video|Image)/);

			if ( !media ) {
				return this._mediaType;
			}

			this._mediaType = media[1] === 'Video' ? 'video' : 'img';
			return this._mediaType;
		} else {
			selector = 'meta[name=viewport][content^="width=device-width"]';
			this._mediaType = '';

			if ( !document.head || !document.head.querySelector(selector) ) {
				return this._mediaType;
			}

			if ( vAPI.edge ) {
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
