/* eslint indent:"off" */

'use strict';

// eslint-disable-next-line padded-blocks
(function(win) {

if ( document instanceof win.HTMLDocument === false ) {
	vAPI.suicideAttempt();
	return;
}

// Should not run on media documents
if ( vAPI.mediaType ) {
	return;
}

if ( win.location.protocol === 'safari-extension:' ) {
	vAPI.suicideAttempt();
	return;
}

vAPI.messaging.send({cmd: 'loadPrefs', property: 'opener'}, function(response) {
	var opener = response && response.prefs;

	if ( !opener ) {
		vAPI.suicideAttempt();
		return;
	}

	var elementsFromPoint, lastMouseDownTime, lastMouseDownX, lastMouseDownY;

	var checkBG = function(s) {
		// ("...\"") - Gecko
		// (...) or ('...)') - WebKit
		// ("...&quot;") - Presto
		// eslint-disable-next-line max-len
		var rgxCssUrl = /\burl\(([^'")][^)]*|"[^"\\]+(?:\\.[^"\\]*)*|'[^'\\]+(?:\\.[^'\\]*)*)(?=['"]?\))/g;
		var imgs = [s.backgroundImage, s.content, s.listStyleImage].join(' ');

		imgs = imgs.match(rgxCssUrl);

		if ( imgs === null ) {
			return imgs;
		}

		for ( var i = 0, pos; i < imgs.length; ++i ) {
			pos = imgs[i][4];
			pos = pos === '"' || pos === "'" ? 5 : 4;
			imgs[i] = imgs[i].slice(pos);
		}

		return imgs;
	};

	var checkIMG = function(node) {
		var lname = node.localName;

		if ( lname === 'img' || lname === 'embed' || node.type === 'image' ) {
			return node.currentSrc || node.src;
		} else if ( lname === 'canvas' ) {
			return node.toDataURL();
		} else if ( lname === 'object' ) {
			if ( node.data ) {
				return node.data;
			}
		} else if ( lname === 'area' ) {
			var img = document.querySelector(
				'img[usemap="#' + node.parentNode.name + '"]'
			);

			if ( img && img.src ) {
				return img.src;
			}
		} else if ( lname === 'video' ) {
			try {
				var canvas = document.createElement('canvas');
				canvas.width = node.clientWidth;
				canvas.height = node.clientHeight;
				canvas.getContext('2d').drawImage(
					node, 0, 0, canvas.width, canvas.height
				);
				return canvas.toDataURL('image/jpeg');
			} catch ( ex ) {
				return node.poster || node.currentSrc;
			}
		} else if ( node instanceof win.SVGElement ) {
			if ( node.localName === 'image' && node.href ) {
				return node.href.baseVal;
			}

			var svgString = new win.XMLSerializer().serializeToString(
				node.ownerSVGElement || node
			);

			if ( typeof svgString === 'string' ) {
				return 'data:image/svg+xml,' + encodeURIComponent(svgString);
			}
		} else if ( node.poster ) {
			return node.poster;
		}

		return null;
	};

	if ( typeof document.elementsFromPoint === 'function' ) {
		elementsFromPoint = function(x, y, target) {
			var urls = [];
			var rgxIgnore = /^(html|body)$/;
			var pseudos = [
				null,
				'::before',
				'::after',
				'::first-letter',
				'::first-line',
				'::placeholder'
			];
			var tmpStyle = document.createElement('style');
			tmpStyle.textContent = '*{pointer-events:auto!important}';

			document.head.appendChild(tmpStyle);
			var elements = document.elementsFromPoint(x, y);
			document.head.removeChild(tmpStyle);

			for ( var i = 0; i < elements.length; ++i ) {
				var node = elements[i];

				if ( urls.length > 0
					&& rgxIgnore.test(node.localName)
					&& !rgxIgnore.test(target.localName) ) {
					continue;
				}

				var url = checkIMG(node);

				if ( url ) {
					urls.push(url);
				}

				for ( var j = 0; j < pseudos.length; ++j ) {
					if ( url = checkBG(win.getComputedStyle(node, pseudos[j])) ) {
						urls = urls.concat(url);
					}
				}

				var shadowRoot = node.openOrClosedShadowRoot || node.shadowRoot;

				if ( shadowRoot ) {
					shadowRoot.appendChild(tmpStyle);
					elements.splice.apply(
						elements,
						[i + 1, 0].concat(
							shadowRoot.elementsFromPoint(x, y)
						)
					);
					shadowRoot.removeChild(tmpStyle);
				}
			}

			return urls;
		};
	} else {
		// Not exactly what we want
		elementsFromPoint = function(x, y, target) {
			var node;
			var urls = [];
			var rgxIgnore = /^(html|body)$/;
			var xpath = document.evaluate(
				[
					'.',
					'./ancestor::*[position()<30]',
					'./preceding::*[position()<30]'
						+ '[not(head) and not(ancestor::head)]',
					'./descendant::*[position()<30]',
					'./following::*[position()<30]'
				].join(' | '),
				target,
				null,
				4,
				null
			);

			while ( node = xpath.iterateNext() ) {
				if ( rgxIgnore.test(node.localName) ) {
					if ( !rgxIgnore.test(target.localName) ) {
						continue;
					}
				}

				var rect = node.getBoundingClientRect();

				if ( !rect || x < rect.left || x > rect.left + rect.width
					|| y < rect.top || y > rect.top + rect.height ) {
					continue;
				}

				var url = checkIMG(node);

				if ( url ) {
					urls.push(url);
				}

				if ( url = checkBG(win.getComputedStyle(node)) ) {
					urls = urls.concat(url);
				}
			}

			return urls;
		};
	}

	win.addEventListener('mousedown', function(e) {
		if ( e.button !== 2 ) {
			return;
		}

		lastMouseDownTime = e.timeStamp;
		// context menu should work where the mousedown happened (Chrome...)
		lastMouseDownX = e.clientX;
		lastMouseDownY = e.clientY;
	}, true);

	document.addEventListener('contextmenu', function(e) {
		if ( e.button !== 2 || !lastMouseDownTime ) {
			return;
		}

		if ( lastMouseDownX !== e.clientX || lastMouseDownY !== e.clientY ) {
			return;
		}

		var longPress = e.timeStamp - lastMouseDownTime >= 300;

		if ( !(e.ctrlKey && e.altKey && !e.shiftKey && !longPress && opener > 1
			|| longPress && (opener === 1 || opener === 3)
				&& !e.ctrlKey && !e.shiftKey && !e.altKey) ) {
			return;
		}

		var urls = elementsFromPoint(e.clientX, e.clientY, e.target);

		if ( !urls || !urls.length ) {
			return;
		}

		var filter = {};

		for ( var i = 0; i < urls.length; ++i ) {
			if ( urls[i] === 'about:blank' ) {
				continue;
			}

			if ( /^data:[^,]*,\s*$/.test(urls[i]) ) {
				continue;
			}

			filter[urls[i]] = true;
		}

		filter = Object.keys(filter);

		if ( !filter.length ) {
			return;
		}

		e.stopImmediatePropagation();
		e.preventDefault();

		vAPI.messaging.send({
			cmd: 'openURL',
			url: filter.reverse()
		});
	}, true);
});
// eslint-disable-next-line padded-blocks
})(window);
