/* eslint indent:"off" */

'use strict';
// eslint-disable-next-line padded-blocks
(function() {

if ( document instanceof window.HTMLDocument === false ) {
	vAPI = null;
	return;
}

// Should not run on media documents
if ( vAPI.mediaType ) {
	return;
}

if ( vAPI.safari && location.protocol === 'safari-extension:' ) {
	vAPI = null;
	return;
}

vAPI.messaging.send({cmd: 'loadPrefs', property: 'opener'}, function(response) {
	var opener = response && response.prefs;

	if ( !opener ) {
		vAPI = null;
		return;
	}

	var lastMouseDownTime, lastMouseDownX, lastMouseDownY;

	var checkBG = function(cs) {
		// ("...\"") - Gecko
		// (...) or ('...)') - WebKit
		// ("...&quot;") - Presto
		// eslint-disable-next-line max-len
		var rgxCssUrl = /\burl\(([^'"\)][^\)]*|"[^"\\]+(?:\\.[^"\\]*)*|'[^'\\]+(?:\\.[^'\\]*)*)(?=['"]?\))/g;
		var imgs = cs.backgroundImage + cs.content + cs.listStyleImage;

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
		var nname = node.localName;

		if ( nname === 'img' || nname === 'embed' || node.type === 'image' ) {
			return node.src || node.currentSrc;
		} else if ( nname === 'canvas' ) {
			return node.toDataURL();
		} else if ( nname === 'object' ) {
			if ( node.data ) {
				return node.data;
			}
		} else if ( nname === 'area' ) {
			var img = document.querySelector(
				'img[usemap="#' + node.parentNode.name + '"]'
			);

			if ( img && img.src ) {
				return img.src;
			}
		} else if ( nname === 'video' ) {
			try {
				var canvas = document.createElement('canvas');
				canvas.width = node.clientWidth;
				canvas.height = node.clientHeight;
				canvas.getContext('2d').drawImage(
					node, 0, 0, canvas.width, canvas.height
				);
				return canvas.toDataURL('image/jpeg');
			} catch ( ex ) {
				return node.poster || null;
			}
		} else if ( /^\[object SVG/.test(node.toString()) ) {
			var svgString = (new window.XMLSerializer).serializeToString(
				node.ownerSVGElement === null
					? node
					: node.ownerSVGElement
			);

			if ( typeof svgString === 'string' ) {
				return 'data:image/svg+xml,' + encodeURIComponent(
					svgString
				);
			}
		} else if ( node.poster ) {
			return node.poster;
		}

		return null;
	};

	window.addEventListener('mousedown', function(e) {
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

		var elapsed = e.timeStamp - lastMouseDownTime >= 300;

		if ( !(e.ctrlKey && e.altKey && !e.shiftKey && !elapsed && opener > 1
			|| elapsed && (opener === 1 || opener === 3)
				&& !e.ctrlKey && !e.shiftKey && !e.altKey) ) {
			return;
		}

		var url, r;
		var urls = [];
		var el = 30;
		var rgxIgnore = /^(html|body)$/;
		// not exactly what we want
		var xpath = document.evaluate(
			[
				'.',
				'./ancestor::*[position()<' + el + ']',
				'./preceding::*[position()<' + el + '][not(head) and not(ancestor::head)]',
				'./descendant::*[position()<' + el + ']',
				'./following::*[position()<' + el + ']'
			].join(' | '),
			e.target,
			null,
			4,
			null
		);

		while ( el = xpath.iterateNext() ) {
			if ( rgxIgnore.test(el.localName) ) {
				if ( !rgxIgnore.test(e.target.localName) ) {
					continue;
				}
			}

			r = el.getBoundingClientRect();

			if ( !r ) {
				continue;
			}

			if ( e.clientX < r.left || e.clientX > r.left + r.width
				|| e.clientY < r.top || e.clientY > r.top + r.height ) {
				continue;
			}

			if ( url = checkIMG(el) ) {
				urls.push(url);
			}

			if ( url = checkBG(window.getComputedStyle(el)) ) {
				urls = urls.concat(url);
			}
		}

		if ( !urls || !urls.length ) {
			return;
		}

		e.stopImmediatePropagation();
		e.preventDefault();

		var filter = {};

		for ( var i = 0; i < urls.length; ++i ) {
			if ( urls[i] === 'about:blank' ) {
				continue;
			}

			filter[urls[i]] = true;
		}

		vAPI.messaging.send({
			cmd: 'openURL',
			url: Object.keys(filter).reverse()
		});
	}, true);
});
// eslint-disable-next-line padded-blocks
})();
