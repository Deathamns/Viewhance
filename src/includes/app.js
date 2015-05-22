/* global addMessageListener, removeMessageListener, sendAsyncMessage, _hostName_, _sandboxId_ */

// » header
'use strict';

var vAPI = Object.create(null);

if ( document instanceof window.HTMLDocument ) {
	vAPI.browser = document.documentElement || document.createElement('div');

	if ( !window.requestAnimationFrame ) {
		window.requestAnimationFrame = function(cb) {
			return window.setTimeout(cb, 25);
		};
	}

	if ( vAPI.browser.style ) {
		vAPI._ = vAPI.browser.style;
		vAPI.browser = {
			wheel: 'onwheel' in vAPI.browser ? 'wheel' : 'mousewheel',
			transform: ('webkitTransform' in vAPI._ ? 'webkitT' : 't') + 'ransform',
			'transition-css': ('webkitTransition' in vAPI._
				? '-webkit-'
				: ''
			) + 'transition',
			transitionend: 'webkitTransition' in vAPI._
				? 'webkitTransitionEnd'
				: 'transitionend',
			'box-sizing-css': ('MozBoxSizing' in vAPI._
				? '-moz-'
				: 'WebkitBoxSizing' in vAPI._ ? '-webkit-' : ''
			) + 'box-sizing',
			'zoom-in': this.chrome || this.mx || this.safari
				? '-webkit-zoom-in'
				: 'zoom-in'
		};
		delete vAPI._;
	}
}

vAPI.buildNodes = function(host, nodes) {
	if ( !host || !Array.isArray(nodes) ) {
		return null;
	}

	if ( !nodes.length ) {
		return host;
	}

	var doc = host.ownerDocument;
	var fragment = doc.createDocumentFragment();

	for ( var i = 0, l = nodes.length; i < l; ++i ) {
		if ( !nodes[i] ) {
			continue;
		}

		if ( typeof nodes[i] === 'string' ) {
			fragment.appendChild(doc.createTextNode(nodes[i]));
			continue;
		}

		var node = doc.createElement(nodes[i].tag);

		if ( nodes[i].attrs ) {
			for ( var attr in nodes[i].attrs ) {
				// bypass CSP
				if ( attr === 'style' ) {
					node.style.cssText = nodes[i].attrs[attr];
				} else {
					node.setAttribute(attr, nodes[i].attrs[attr]);
				}
			}
		}

		if ( nodes[i].nodes ) {
			this.buildNodes(node, nodes[i].nodes);
		} else if ( nodes[i].text ) {
			node.textContent = nodes[i].text;
		}

		fragment.appendChild(node);
	}

	if ( fragment.childNodes.length ) {
		host.appendChild(fragment);
	}

	return host;
};
// «

if ( self.opera ) {
	// » oex
	vAPI.opera = true;

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

			return this._mediaType = media.nodeName.toLowerCase();
		},
		set: function(type) {
			this._mediaType = type;
		}
	});

	vAPI.messaging = {
		listen: function(listener, once) {
			if ( this.listener ) {
				opera.extension.removeEventListener('message', this.listener);
			}

			if ( typeof listener !== 'function' ) {
				this.listener = null;
				return;
			}

			this.listener = function(e) {
				listener(e.data);

				if ( once ) {
					vAPI.messaging.listen(null);
				}
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

		vAPI.i18n = function(s) {
			if ( !this.i18nData || !this.i18nData.hasOwnProperty(s) ) {
				return s;
			}

			return this.i18nData[s];
		};

		vAPI.insertHTML = function(n, html) {
			n.innerHTML = html;
		};
	}
	// «
} else if ( self.chrome && !self.mx ) {
	// » crx
	vAPI.chrome = true;

	Object.defineProperty(vAPI, 'fullScreenElement', {
		get: function() {
			return document.webkitFullscreenElement;
		}
	});

	Object.defineProperty(vAPI, 'mediaType', {get: function() {
		if ( this._mediaType !== void 0 ) {
			return this._mediaType;
		}

		var selector = 'meta[name=viewport][content^="width=device-width"]';
		this._mediaType = '';

		if ( !document.head || !document.head.querySelector(selector) ) {
			return this._mediaType;
		}

		var media = document.querySelector(
			'body[style="margin: 0px;"] > img[style^="-webkit-"]:first-child, ' +
			// Chropera 29 changed the structure
			(navigator.appVersion.indexOf('OPR/') !== -1
				? 'body[style="margin: 0px;"] > ' +
					'div[style^="display: table"]:only-child >' +
					'div[style^="display: table-cell"] > img:only-child, '
				: ''
			) +
			'body > video[name=media][controls][autoplay]:first-child:not([src])'
		);

		if ( !media ) {
			return this._mediaType;
		}

		if ( media.src !== location.href && media.currentSrc !== location.href ) {
			return this._mediaType;
		}

		if ( media.parentNode !== document.body ) {
			document.body.replaceChild(
				media,
				document.body.firstElementChild
			);
		}

		return this._mediaType = media.nodeName.toLowerCase();
	}, set: function(type) {
		this._mediaType = type;
	}});

	vAPI.messaging = {
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

			if ( message.cmd === 'loadPrefs' && !message.property
				&& !message.getAppInfo ) {
				chrome.storage.sync.get('cfg', function(obj) {
					if ( typeof listener === 'function' ) {
						listener({prefs: JSON.parse(obj.cfg)});
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

	if ( location.protocol === 'chrome-extension:' ) {
		if ( location.hash === '#options_ui' ) {
			vAPI.messaging.send({cmd: 'open', url: 'options.html'});
			window.close();
		}

		vAPI.i18n = function(s) {
			return chrome.i18n.getMessage(s) || s;
		};

		vAPI.insertHTML = function(n, html) {
			n.innerHTML = html;
		};
	}
	// «
} else if ( self.safari ) {
	// » safariextz
	vAPI.safari = true;

	Object.defineProperty(vAPI, 'fullScreenElement', {
		get: function() {
			return document.webkitFullscreenElement;
		}
	});

	Object.defineProperty(vAPI, 'mediaType', {get: function() {
		if ( this._mediaType !== void 0 ) {
			return this._mediaType;
		}

		this._mediaType = '';

		if ( document.head ) {
			return this._mediaType;
		}

		var media = document.querySelector(
			'body[style^="margin: 0px"] > img[style^="-webkit-user"]:first-child, ' +
			'body > video[name=media][controls][autoplay]'
		);

		if ( !media ) {
			return this._mediaType;
		}

		if ( media.src !== location.href && media.currentSrc !== location.href ) {
			return this._mediaType;
		}

		return this._mediaType = media.nodeName.toLowerCase();
	}, set: function(type) {
		this._mediaType = type;
	}});

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

			this.listener = function(e) {
				if ( e.name !== vAPI.messaging.listenerId ) {
					return;
				}

				listener(e.message);

				if ( once ) {
					vAPI.messaging.listen(null);
				}
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

	// Only for pages of the current extension
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

		vAPI.i18n = function(s) {
			if ( !this.i18nData || !this.i18nData.hasOwnProperty(s) ) {
				return s;
			}

			return this.i18nData[s];
		};

		vAPI.insertHTML = function(n, html) {
			n.innerHTML = html;
		};
	}
	// «
} else if ( self.mx ) {
	// » mxaddon
	vAPI.maxthon = true;
	vAPI.runtime = external.mxGetRuntime();

	Object.defineProperty(vAPI, 'fullScreenElement', {
		get: function() {
			return document.webkitFullscreenElement;
		}
	});

	Object.defineProperty(vAPI, 'mediaType', {get: function() {
		if ( this._mediaType !== void 0 ) {
			return this._mediaType;
		}

		var media = document.querySelector(
			'body > img#img_elem:first-child, ' +
			'body > ' +
				'video[name=media][controls][autoplay]:first-child:not([src]) >' +
				'source[src]:only-child'
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

		return this._mediaType = media.nodeName.toLowerCase();
	}, set: function(type) {
		this._mediaType = type;
	}});

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

			this.listener = function(e) {
				listener(e);

				if ( once ) {
					vAPI.messaging.listen(null);
				}
			};

			vAPI.runtime.listen(this.listenerId, this.listener);
		},

		send: function(message, callback) {
			if ( typeof callback === 'function' ) {
				this.listen(callback, true);
			}

			vAPI.runtime.post('service', {
				message: message,
				listenerId: this.listenerId,
				origin: location.href
			});
		}
	};

	if ( location.protocol === 'mxaddon-pkg:' ) {
		vAPI.i18n = function(s) {
			var t = this.runtime.locale.t(s);
			return t[0] === '"' ? JSON.parse(t) : t || s;
		};

		vAPI.insertHTML = function(n, html) {
			n.innerHTML = html;
		};
	}
	// «
} else {
	// » xpi
	vAPI.firefox = true;

	Object.defineProperty(vAPI, 'fullScreenElement', {
		get: function() {
			return document.mozFullScreenElement || null;
		}
	});

	Object.defineProperty(vAPI, 'mediaType', {get: function() {
		if ( this._mediaType !== void 0 ) {
			return this._mediaType;
		}

		var selector =
			'meta[content="width=device-width; height=device-height;"],' +
			'link[rel=stylesheet][href^="resource://gre/res/TopLevel"],' +
			'link[rel=stylesheet][href^="chrome://global/skin/media/TopLevel"]';

		var head = document.head;
		this._mediaType = '';

		if ( !head || head.querySelectorAll(selector).length !== 3 ) {
			return this._mediaType;
		}

		var media = document.querySelector(
			'body > img:first-child, ' +
			'body > video[controls][autoplay]:not([src]):empty'
		);

		if ( !media ) {
			return this._mediaType;
		}

		if ( media.src && media.src === window.location.href ) {
			return this._mediaType = 'img';
		}

		// When media is redirected the currentSrc doesn't change
		/*if ( media.parentNode.currentSrc !== location.href ) {
			return this._mediaType;
		}*/

		return this._mediaType = 'video';
	}, set: function(type) {
		this._mediaType = type;
	}});

	vAPI.messaging = {
		listen: function(listener, once) {
			if ( this.listener ) {
				removeMessageListener();
			}

			if ( typeof listener !== 'function' ) {
				this.listener = null;
				return;
			}

			this.listener = function(e) {
				listener(JSON.parse(e));

				if ( once ) {
					vAPI.messaging.listen(null);
				}
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
				origin: window.location.href
			});
		},

		toggleListener: function(e) {
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
		}
	};

	window.addEventListener('pagehide', vAPI.messaging.toggleListener, true);
	window.addEventListener('pageshow', vAPI.messaging.toggleListener, true);

	if ( location.protocol === 'chrome:' && location.hostname === _hostName_ ) {
		vAPI.i18n = (function() {
			var stringBundle = Components
				.classes['@mozilla.org/intl/stringbundle;1']
				.getService(Components.interfaces.nsIStringBundleService)
				.createBundle(
					'chrome://' + location.host + '/locale/options.properties'
				);

			return function(s) {
				try {
					return stringBundle.GetStringFromName(s); // eslint-disable-line
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
					io.newURI(document.baseURI, null, null),
					document.documentElement
				));
			};
		})();
	}
	// «
}
