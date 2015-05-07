'use strict';

(function() {

if ( document instanceof window.HTMLDocument === false ) {
	return;
}

// Should not run on media documents
if ( vAPI.mediaType ) {
	return;
}

if ( vAPI.safari && location.protocol === 'safari-extension:' ) {
	return;
}

vAPI.messaging.send({cmd: 'loadPrefs', property: 'opener'}, function(response) {
	var opener = response && response.prefs;

	if ( !opener ) {
		return;
	}

	var lastMouseDownTime, lastMouseDownX, lastMouseDownY;

	var checkBG = function(cs) {
		// ("...\"") - Gecko
		// (...) or ('...)') - WebKit
		// ("...&quot;") - Presto
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
		var nname = node.nodeName.toUpperCase();

		if ( nname === 'IMG' || nname === 'EMBED' || node.type === 'image' ) {
			return node.src;
		} else if ( nname === 'CANVAS' ) {
			return node.toDataURL();
		} else if ( nname === 'OBJECT' ) {
			if ( node.data ) {
				return node.data;
			}
		} else if ( nname === 'AREA' ) {
			var img = document.querySelector(
				'img[usemap="#' + node.parentNode.name + '"]'
			);

			if ( img && img.src ) {
				return img.src;
			}
		} else if ( nname === 'VIDEO' ) {
			nname = document.createElement('canvas');
			nname.width = node.clientWidth;
			nname.height = node.clientHeight;
			nname.getContext('2d').drawImage(
				node, 0, 0, nname.width, nname.height
			);
			return nname.toDataURL('image/jpeg');
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

	window.addEventListener('contextmenu', function(e) {
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
		var rgxIgnore = /^(html|body)$/i;
		// not exactly what we want
		var xpath = document.evaluate([
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
			if ( rgxIgnore.test(el.nodeName) && !rgxIgnore.test(e.target.nodeName) ) {
				continue;
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

		var i;
		var filter = {};

		for ( i = 0; i < urls.length; ++i ) {
			if ( urls[i] === 'about:blank' ) {
				continue;
			}

			filter[urls[i]] = true;
		}

		vAPI.messaging.send({
			cmd: 'open',
			url: Object.keys(filter).reverse()
		});
	}, true);
});

})();
