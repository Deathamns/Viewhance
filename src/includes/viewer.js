/* eslint indent:"off" */

'use strict';

// eslint-disable-next-line padded-blocks
var init = function(win, doc, response) {

if ( !doc || !doc.body || !response || !response.prefs ) {
	init = null;
	vAPI.suicideAttempt();
	return;
}

var cfg = response.prefs;
var media = doc.body.querySelector('img, video, audio');

if ( !media ) {
	init = null;
	vAPI.suicideAttempt();
	return;
}

var pdsp = function(e, d, p) {
	if ( !e || !e.preventDefault || !e.stopPropagation ) {
		return;
	}

	if ( d === void 0 || d === true ) {
		e.preventDefault();
	}

	if ( p !== false ) {
		e.stopImmediatePropagation();
	}
};

var shortcut = {
	specKeys: {
		8: 'Backspace', 9: 'Tab', 13: 'Enter',
		16: 'Shift', 17: 'Ctrl', 18: 'Alt',
		27: 'Esc', 32: 'Space',
		33: 'PgUp', 34: 'PgDn', 35: 'End', 36: 'Home',
		37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down',
		45: 'Ins', 46: 'Del',
		96: '0', 97: '1', 98: '2', 99: '3', 100: '4',
		101: '5', 102: '6', 103: '7', 104: '8', 105: '9',
		106: '*', 107: '+', 109: '-', 110: '.', 111: '/', 173: '-',
		186: ';', 187: '=', 188: ',', 189: '-', 190: '.',
		191: '/', 192: '`', 219: '[', 220: '\\', 221: ']', 222: "'",
		112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
		118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12'
	},

	isModifier: function(e) {
		return e.which > 15 && e.which < 19;
	},

	key: function(e) {
		return this.specKeys[e.which]
			|| String.fromCharCode(e.which).toUpperCase();
	}
};

[doc.documentElement, doc.body, media].forEach(function(node) {
	var i = node.attributes.length;

	while ( i-- ) {
		var attrName = node.attributes[i].name;

		if ( node !== media || attrName !== 'src' ) {
			node.removeAttribute(attrName);
		}
	}
});

var root = doc.documentElement;
var progress = null;
var initPingsLeft = 600;
var head = doc.querySelector('head');

if ( head ) {
	doc.documentElement.removeChild(head);
}

head = doc.createElement('head');

if ( cfg.favicon ) {
	var faviconLink = doc.createElement('link');
	faviconLink.rel = 'shortcut icon';
	faviconLink.href = cfg.favicon === '%url' && vAPI.mediaType === 'img'
		? win.location.href
		: cfg.favicon.replace('%url', encodeURIComponent(win.location.href));
	head.appendChild(faviconLink);
}

head.appendChild(doc.createElement('style')).textContent = [
	'html, body {',
		'width: 100%;',
		'height: 100%;',
		'margin: 0;',
		'padding: 0;',
		'font: 12px "Trebuchet MS", sans-serif;',
		'cursor: default;',
		'-webkit-user-select: none;',
		'-moz-user-select: none;',
		'-ms-user-select: none;',
	'}',
	'#media {',
		'display: block;',
		'box-sizing: border-box;',
		'max-width: none;',
		'max-height: none;',
		'position: absolute;',
		'margin: 0;',
		'background-clip: padding-box;',
		'image-orientation: from-image;',
	'}',
	'html.audio #media {',
		'box-sizing: inherit;',
		'width: 50%;',
		'height: 40px !important;',
		'min-width: 300px;',
		'max-width: 1000px;',
		'position: absolute;',
		'top: 0;',
		'right: 0;',
		'bottom: 0;',
		'left: 0;',
		'margin: auto;',
		'box-shadow: none;',
		'background: transparent;',
	'}',
	'html.load-failed #media {',
		'margin: auto;',
		'box-shadow: 0 0 10px red;',
	'}',
	'html.fullscreen #media {',
		'background: black !important;',
	'}',
	'#media:-moz-full-screen {',
		'background: black !important;',
	'}',
	'a {',
		'text-decoration: none;',
	'}',
	':focus {',
		'outline: 0;',
	'}',
	':invalid {',
		'box-shadow: none;',
	'}',
	'#menu {',
		'width: 50px;',
		'height: 33.33%;',
		'position: fixed;',
		'top: 0;',
		'opacity: 0;',
		vAPI.browser.transitionCSS, ': opacity .15s, left .2s;',
	'}',
	'ul {',
		'display: inline-block;',
		'margin: 0;',
		'padding: 5px 15px;',
		'background: rgba(0, 0, 0, .6); color: #fff;',
		'font-size: 25px; font-weight: 700;',
		'text-align: center;',
		'list-style: none;',
	'}',
	'li {',
		'position: relative;',
		'display: block;',
	'}',
	'li[data-cmd] > div {',
		'width: 25px;',
		'height: 25px;',
		'margin: 8px 0;',
		'background-repeat: no-repeat;',
		'background-size: 100%;',
		'cursor: pointer;',
	'}',
	'li[data-cmd] > div:hover {',
		'opacity: .6;',
	'}',
	'li[data-cmd="cycle"] > div {',
		'background-position: 0 0;',
	'}',
	'li[data-cmd="zoom"] > div {',
		'background-position: 0 -125px;',
	'}',
	'li[data-cmd="flip"] > div {',
		'background-position: 0 -50px;',
	'}',
	'li[data-cmd="rotate"] > div {',
		'background-position: 0 -175px;',
	'}',
	'li[data-cmd].filters > div {',
		'background-position: 0 -25px;',
	'}',
	'li[data-cmd="reset"] > div {',
		'background-position: 0 -150px;',
	'}',
	'li[data-cmd].send-hosts > div {',
		'background-position: 0 -200px;',
	'}',
	'li[data-cmd="frames"] > div {',
		'background-position: 0 -75px;',
	'}',
	'li[data-cmd="options"] > div {',
		'background-position: 0 -100px;',
	'}',
	'li ul {',
		'visibility: hidden;',
		'position: absolute;',
		'top: 0;',
		'left: 100%;',
		'text-align: left;',
		'opacity: 0;',
	'}',
	'li:hover ul {',
		'display: block;',
		'visibility: visible;',
		'opacity: 1;',
		vAPI.browser.transitionCSS, ': visibility .4s, opacity .2s .3s;',
	'}',
	'li ul > li {',
		'display: block !important;',
		'padding: 3px 0;',
		'font-size: 15px;',
	'}',
	'.send-hosts li > a {',
		'padding-bottom: 3px;',
		'padding-left: 25px;',
		'background-size: 16px 16px;',
		'background-repeat: no-repeat;',
		'background-position: 0 3px;',
		'color: #fff;',
		'cursor: pointer;',
	'}',
	'#menu > ul > li:hover, .send-hosts li > a:hover {',
		'color: silver;',
	'}',
	'input[type="range"] {',
		'vertical-align: middle;',
	'}',
	'li ul > li {',
		'white-space: nowrap;',
	'}',
	'.filters > ul {',
		'font-size: 15px;',
	'}',
	'.filters > form {',
		'margin: 0;',
		'padding: 0;',
	'}',
	'body.frames {',
		'overflow-y: scroll !important;',
		'text-align: center;',
	'}',
	'body.frames * {',
		'margin: 2px;',
	'}',
	'#frames > canvas, #frames > img {',
		'display: none;',
	'}',
	'#current-frame + output {',
		'display: inline-block;',
		'width: 65px;',
		'font-family: Conoslas, monospace;',
		'text-align: right;',
	'}',
	'.back {',
		'font-size: 150%;',
		'text-decoration: none;',
		'color: black;',
	'}',
	'#frames.showall > img, #frames.showall > canvas {',
		'display: inline-block !important;',
	'}',
	// Custom CSS
	cfg.css
].join('');
root.insertBefore(head, doc.body);

init = function() {
	if ( vAPI.mediaType === 'img' && !media.naturalWidth ) {
		if ( progress && --initPingsLeft < 1 ) {
			initPingsLeft = null;
			clearInterval(progress);
		}

		return;
	}

	if ( progress ) {
		clearInterval(progress);
		progress = null;
	}

	media.id = 'media';
	root.classList.add(vAPI.mediaType);

	if ( media.parentNode !== doc.body ) {
		doc.body.replaceChild(media, doc.body.firstElementChild);
	}

	while ( media.previousSibling || media.nextSibling ) {
		media.parentNode.removeChild(
			media.previousSibling || media.nextSibling
		);
	}

	if ( vAPI.mediaType === 'audio' ) {
		return;
	}

	var winW, winH, panning, sX, sY, mWidth, mHeight, setTitleTimer, menu;
	var mOrigWidth, mOrigHeight, mFullWidth, mFullHeight, lastMoveX, lastMoveY;
	var mediaCss = Object.create(null);
	var noFit = {cur: null, real: null};
	var lastEvent = {};
	var dragSlide = [];
	var freeZoom = null;
	var cancelAction = false;
	// var MAX_SIZE = 0x7fff;
	var MODE_CUSTOM = 0;
	var MODE_ORIG = 1;
	var MODE_FIT = 2;
	var MODE_WIDTH = 3;
	var MODE_HEIGHT = 4;

	if ( vAPI.mediaType === 'img' ) {
		mOrigWidth = media.naturalWidth;
		mOrigHeight = media.naturalHeight;

		if ( mOrigWidth !== mOrigHeight ) {
			// image-orientation in Firefox doesn't flip natural sizes
			if ( mOrigWidth / mOrigHeight === media.height / media.width ) {
				mOrigWidth = media.naturalHeight;
				mOrigHeight = media.naturalWidth;
			}
		}
	} else {
		mOrigWidth = media.videoWidth;
		mOrigHeight = media.videoHeight;
	}

	if ( !cfg.mediaInfo ) {
		cfg.mediaInfo = false;
	}

	cfg.hiddenScrollbars = win.getComputedStyle(root).overflow === 'hidden'
		|| win.getComputedStyle(doc.body).overflow === 'hidden';

	var setMediaStyle = function() {
		var css = '';

		for ( var p in mediaCss ) {
			css += p + ':' + mediaCss[p] + ';';
		}

		media.style.cssText = css;
	};

	var setCursor = function() {
		var m = media;
		var s = m.style;

		if ( (m.mode !== MODE_FIT || m.angle )
			&& (m.box.width > winW || m.box.height > winH) ) {
			s.cursor = 'move';
		} else if ( mWidth < mOrigWidth
			|| mHeight < mOrigHeight ) {
			s.cursor = vAPI.browser.zoomIn;
		} else {
			s.cursor = '';
		}
	};

	var calcViewportDimensions = function() {
		winH = doc.compatMode === 'BackCompat' ? doc.body : root;
		winW = winH.clientWidth;
		winH = winH.clientHeight;
	};

	var calcFit = function() {
		var m = media;
		mWidth = m.clientWidth - (mFullWidth - mOrigWidth);
		mHeight = m.clientHeight - (mFullHeight - mOrigHeight);
		m.box = m.getBoundingClientRect();
		noFit.cur = m.box.width <= winW && m.box.height <= winH;

		var radians = m.angle * Math.PI / 180;
		var sin = Math.abs(Math.sin(radians));
		var cos = Math.abs(Math.cos(radians));
		var boxW = mFullWidth * cos + mFullHeight * sin;
		var boxH = mFullWidth * sin + mFullHeight * cos;
		noFit.real = boxW <= winW && boxH <= winH;

		setCursor();
	};

	var adjustPosition = function() {
		var radians = media.angle * Math.PI / 180;
		var sin = Math.abs(Math.sin(radians));
		var cos = Math.abs(Math.cos(radians));
		var w = parseFloat(mediaCss.width || mFullWidth);
		var h = w * mFullHeight / mFullWidth;
		var boxW = w * cos + h * sin;
		var boxH = w * sin + h * cos;

		if ( cfg.center ) {
			mediaCss.left = Math.max(0, (winW - boxW) / 2);
			mediaCss.top = Math.max(0, (winH - boxH) / 2);
		} else {
			mediaCss.left = 0;
			mediaCss.top = 0;
		}

		if ( media.angle ) {
			mediaCss.left += (boxW - w) / 2;
			mediaCss.top += (boxH - h) / 2;
		}

		mediaCss.left += 'px';
		mediaCss.top += 'px';
		setMediaStyle();
		calcFit();
	};

	var convertInfoParameter = function(a, param) {
		var m = media;

		switch ( param ) {
			case 'w': return m.width;
			case 'h': return m.height;
			case 'ow': return mOrigWidth;
			case 'oh': return mOrigHeight;
			case 'url': return win.location.href;
			case 'name': return m.alt;
			case 'ratio':
				return Math.round(m.width / m.height * 100) / 100;
			case 'perc': return Math.round(m.width * 100 / mOrigWidth);
		}

		return '';
	};

	var setTitle = function() {
		if ( !cfg.mediaInfo ) {
			return;
		}

		doc.title = cfg.mediaInfo.replace(
			/%(o?[wh]|url|name|ratio|perc)/g,
			convertInfoParameter
		);
	};

	var resizeMedia = function(mode, w) {
		var boxW;
		var newMode = mode === void 0 ? MODE_FIT : mode;
		var boxRatio = media.box.width / media.box.height;
		media.mode = newMode;

		calcViewportDimensions();

		if ( !w && mode === MODE_FIT && !noFit.real ) {
			newMode = boxRatio > winW / winH ? MODE_WIDTH : MODE_HEIGHT;
		}

		if ( w ) {
			boxW = w;
		} else if ( newMode === MODE_WIDTH ) {
			boxW = winW;
		} else if ( newMode === MODE_HEIGHT ) {
			boxW = boxRatio * winH;
		} else if ( newMode === MODE_ORIG
			|| newMode === MODE_FIT && noFit.real ) {
			delete mediaCss.width;
		}

		if ( boxW ) {
			if ( media.angle ) {
				var radians = media.angle * Math.PI / 180;
				var sin = Math.abs(Math.sin(radians));
				var cos = Math.abs(Math.cos(radians));
				mediaCss.width = boxW * cos - boxW / boxRatio * sin;
				mediaCss.width /= cos * cos - sin * sin;
				boxW = mediaCss.width;
			} else {
				mediaCss.width = boxW;
			}

			mediaCss.width += 'px';
		}

		/*if ( mediaCss.width ) {
			var offsetWidth = boxW || parseInt(mediaCss.width, 10);

			if ( offsetWidth > MAX_SIZE ) {
				offsetWidth = MAX_SIZE;
				mediaCss.width = MAX_SIZE + 'px';
			}

			if ( offsetWidth * mFullHeight / mFullWidth > MAX_SIZE ) {
				mediaCss.width = MAX_SIZE * mFullWidth / mFullHeight;
				mediaCss.width += 'px';
			}
		}*/

		adjustPosition();
		clearTimeout(setTitleTimer);
		setTitleTimer = setTimeout(setTitle, 50);
	};

	var cycleModes = function(back) {
		var mode = media.mode === MODE_FIT ? MODE_ORIG : media.mode;
		var dir = back ? 1 : -1;
		mode -= dir;

		if ( mode === MODE_FIT ) {
			mode -= dir;
		} else if ( mode < MODE_ORIG ) {
			mode = MODE_HEIGHT;
		} else if ( mode > MODE_HEIGHT ) {
			mode = MODE_ORIG;
		}

		resizeMedia(mode);
	};

	var flipMedia = function(el, direction) {
		if ( !media.scale ) {
			media.scale = {h: 1, v: 1};
		}

		media.scale[direction] *= -1;

		var transformCss = media.scale.h !== 1 || media.scale.v !== 1
			? 'scale(' + media.scale.h + ',' + media.scale.v + ')'
			: '';

		if ( media.angle ) {
			transformCss += ' rotate(' + media.angle + 'deg)';
		}

		mediaCss[vAPI.browser.transformCSS] = transformCss;
		setMediaStyle();
		setCursor();
	};

	var rotateMedia = function(direction, fine) {
		var rot = '';

		if ( direction === 'right' ) {
			media.angle += fine ? 5 : 90;
		} else {
			media.angle -= fine ? 5 : 90;
		}

		media.angle %= 360;

		if ( media.angle ) {
			rot += 'rotate(' + media.angle + 'deg)';
		}

		if ( media.scale ) {
			rot += ' scale(' + media.scale.h + ', ' + media.scale.v + ')';
		}

		win.status = media.angle + '°';
		mediaCss[vAPI.browser.transformCSS] = rot;
		adjustPosition();
	};

	var stopScroll = function(e) {
		if ( e ) {
			this.removeEventListener(e.type, stopScroll);
		}

		if ( !dragSlide.length ) {
			return;
		}

		cancelAnimationFrame(progress);
		progress = null;
		cancelAction = false;
		dragSlide.length = 0;
		media.dragSlideTime = false;
	};

	var startScroll = function() {
		win.scrollBy(dragSlide[0], dragSlide[1]);

		if ( dragSlide[0] ) {
			if ( Math.abs(dragSlide[0]) < 1 ) {
				dragSlide[0] = 0;
			}

			dragSlide[0] /= 1.11;
		}

		if ( dragSlide[1] ) {
			if ( Math.abs(dragSlide[1]) < 1 ) {
				dragSlide[1] = 0;
			}

			dragSlide[1] /= 1.11;
		}

		var box = media.box;
		var atRight = Math.max(winW, box.width) - win.pageXOffset === winW;
		var atBottom = Math.max(winH, box.height) - win.pageYOffset === winH;

		if ( !(dragSlide[0] && dragSlide[1])
			|| !win.pageYOffset && !win.pageXOffset
			|| !win.pageYOffset && atRight
			|| atBottom && !win.pageXOffset
			|| atBottom && atRight ) {
			stopScroll();
			return;
		}

		progress = requestAnimationFrame(startScroll);
	};

	var isValidWheelTarget = function(t) {
		var d = doc;
		return t === media || t === d.body || t === d.documentElement;
	};

	var wheelZoom = function(e) {
		if ( !isValidWheelTarget(e.target) ) {
			return;
		}

		pdsp(e);
		stopScroll();
		media.box = media.getBoundingClientRect();

		var x = e.clientX - media.box.left;
		var y = e.clientY - media.box.top;
		var w = media.box.width;
		var h = media.box.height;

		if ( (e.deltaY || -e.wheelDelta) > 0 ) {
			resizeMedia(MODE_CUSTOM, Math.max(1, w * 0.75));
		} else {
			var nW = w * (4 / 3);
			resizeMedia(MODE_CUSTOM, nW > 10 ? nW : nW + 3);
		}

		win.scrollTo(
			x * media.box.width / w - e.clientX,
			y * media.box.height / h - e.clientY
		);
	};

	var zoomToCenter = function(e) {
		wheelZoom({
			target: media,
			keypress: true,
			deltaY: e.deltaY || -e.wheelDelta,
			clientX: winW / 2,
			clientY: winH / 2
		});
	};

	var onWheel = function(e) {
		if ( !isValidWheelTarget(e.target) ) {
			return;
		}

		var w = Math.round(media.box.width);
		var h = Math.round(media.box.height);

		if ( w <= winW && h <= winH ) {
			return;
		}

		stopScroll();

		var x = 0;
		var y = ((e.deltaX || e.deltaY || -e.wheelDelta) > 0 ? winH : -winH) / 5;

		if ( w <= winW && h > winH ) {
			if ( !cfg.hiddenScrollbars ) {
				return;
			}
		} else if ( h <= winH && w > winW
			|| e.clientX < winW / 2 && e.clientY > winH - 100
			|| e.deltaX && !e.deltaY ) {
			x = (y < 0 ? -winW : winW) / 5;
			y = 0;
		} else if ( !cfg.hiddenScrollbars ) {
			return;
		}

		pdsp(e);
		win.scrollBy(x, y);
	};

	var toggleWheelZoom = function() {
		var evName = vAPI.browser.wheel;
		var zoomMenuItem = menu && menu.querySelector('li[data-cmd="zoom"]');

		if ( zoomMenuItem ) {
			zoomMenuItem.style.display = cfg.wheelZoom ? 'none' : '';
		}

		if ( cfg.wheelZoom ) {
			doc.removeEventListener(evName, onWheel, true);
			doc.addEventListener(evName, wheelZoom, true);
		} else {
			doc.removeEventListener(evName, wheelZoom, true);
			doc.addEventListener(evName, onWheel, true);
		}

		cfg.wheelZoom = !cfg.wheelZoom;
	};

	var onMoveFrame = function() {
		win.scrollBy(sX - lastMoveX, sY - lastMoveY);
		sX = lastMoveX;
		sY = lastMoveY;
		panning = null;
	};

	var onMove = function(e) {
		lastMoveX = e.clientX;
		lastMoveY = e.clientY;

		if ( lastMoveX === lastEvent.clientX
			&& lastMoveY === lastEvent.clientY ) {
			return;
		}

		if ( progress ) {
			clearTimeout(progress);
			progress = lastEvent.button = null;
		}

		if ( sX === true || noFit.cur ) {
			doc.removeEventListener('mousemove', onMove, true);
			return;
		}

		if ( !panning ) {
			// Smoother in Opera without setTimeout
			if ( vAPI.opera ) {
				onMoveFrame();
			} else {
				panning = requestAnimationFrame(onMoveFrame);
			}
		}

		if ( dragSlide.length !== 3 ) {
			dragSlide = [
				[lastMoveX, lastMoveY],
				[lastMoveX, lastMoveY],
				[lastMoveX, lastMoveY]
			];
			return;
		}

		// Opera fires move event before mouseup
		if ( dragSlide[2][0] === lastMoveX && dragSlide[2][1] === lastMoveY ) {
			return;
		}

		dragSlide[0] = [dragSlide[1][0], dragSlide[1][1]];
		dragSlide[1] = [dragSlide[2][0], dragSlide[2][1]];
		dragSlide[2] = [lastMoveX, lastMoveY];

		media.dragSlideTime = e.timeStamp;
		pdsp(e);
	};

	var onContextMenu = function(e) {
		doc.removeEventListener('mousemove', onMove, true);

		if ( progress ) {
			clearTimeout(progress);
			progress = null;
		}

		if ( cancelAction ) {
			cancelAction = false;
			pdsp(e, true, false);
		}
	};

	var drawMask = function(e) {
		if ( ++freeZoom.counter % 3 ) {
			return;
		}

		var x = e.clientX - freeZoom.left;
		var y = e.clientY - freeZoom.top;

		if ( e.ctrlKey ) {
			var rx = freeZoom.prevX ? x - freeZoom.prevX : 0;
			var ry = freeZoom.prevY ? y - freeZoom.prevY : 0;

			freeZoom.prevX = x;
			freeZoom.prevY = y;

			freeZoom.x += rx;
			freeZoom.y += ry;
			freeZoom.startX += rx;
			freeZoom.startY += ry;
		} else {
			if ( freeZoom.prevX !== void 0 ) {
				delete freeZoom.prevX;
				delete freeZoom.prevY;
			}

			freeZoom.w = Math.abs(freeZoom.startX - x);
			freeZoom.h = Math.abs(freeZoom.startY - y);
			freeZoom.x = freeZoom.startX < x
				? freeZoom.startX
				: freeZoom.startX - freeZoom.w;
			freeZoom.y = freeZoom.startY < y
				? freeZoom.startY
				: freeZoom.startY - freeZoom.h;
		}

		media.mctx.clearRect(0, 0, media.mask.width, media.mask.height);
		media.mctx.fillRect(0, 0, media.mask.width, media.mask.height);
		media.mctx.clearRect(freeZoom.x, freeZoom.y, freeZoom.w, freeZoom.h);
		pdsp(e);
	};

	var longpressHandler = function() {
		progress = null;
		cancelAction = true;

		var action = cfg[lastEvent.button === 2 ? 'lpRight' : 'lpLeft'];

		if ( action === 1 ) {
			var m = media;
			media.box = m.getBoundingClientRect();
			var x = (lastEvent.clientX - m.box.left) / m.box.width;
			var y = (lastEvent.clientY - m.box.top) / m.box.height;

			if ( media.mode === MODE_WIDTH ) {
				resizeMedia(MODE_HEIGHT);
			} else if ( media.mode === MODE_HEIGHT ) {
				resizeMedia(MODE_WIDTH);
			} else {
				resizeMedia(
					media.box.width / media.box.height < winW / winH
						? MODE_WIDTH
						: MODE_HEIGHT
				);
			}

			if ( m.mode === MODE_WIDTH ) {
				x = 0;
				y = y * m.box.height - winH / 2;
			} else {
				x = x * m.box.width - winW / 2;
				y = 0;
			}

			win.scrollTo(x, y);
		} else if ( action === 2 ) {
			toggleWheelZoom();
		}
	};

	var resetMedia = function() {
		if ( freeZoom ) {
			doc.removeEventListener('mousemove', drawMask);
			doc.body.removeChild(media.mask);
			freeZoom = null;
			cancelAction = false;
			return;
		}

		if ( vAPI.mediaType === 'img' && doc.readyState !== 'complete' ) {
			return;
		}

		var filters = doc.querySelector('#menu li.filters > form');

		if ( filters ) {
			media.filters = {};
			media.style[vAPI.browser.filter] = '';
			filters.reset();
		}

		delete media.scale;
		delete media.bgList;
		delete media.bgListIndex;
		mediaCss = {};
		media.angle = 0;
		resizeMedia(MODE_ORIG);
		win.scrollTo(0, 0);
	};

	media.addEventListener('mousedown', function(e) {
		pdsp(e, false);

		if ( e.button === 1 || e.ctrlKey || e.altKey ) {
			return;
		}

		if ( vAPI.fullScreenElement === media && vAPI.mediaType === 'video' ) {
			return;
		}

		if ( menu && menu.style.display === 'block' ) {
			menu.style.display = 'none';
		}

		if ( !e.shiftKey && vAPI.mediaType === 'video' ) {
			var topPart = this.clientHeight;
			topPart = Math.min(topPart - 40, topPart / 2);

			if ( (e.offsetY || e.layerY || 0) > topPart ) {
				return;
			}
		}

		if ( e.button === 0 && this.mode <= MODE_HEIGHT || e.button === 2 ) {
			if ( e.button === 2 ) {
				sX = true;
			} else {
				if ( !e.shiftKey && noFit.cur && this.box.width >= 60 ) {
					if ( this.box.left + this.box.width - e.clientX <= 30 ) {
						lastEvent.clientX = e.clientX;
						lastEvent.clientY = e.clientY;
						return;
					}
				}

				pdsp(e, true, false);
				win.focus();
				sX = e.clientX;
				sY = e.clientY;
			}

			if ( !e.shiftKey ) {
				doc.addEventListener('mousemove', onMove, true);
			}
		}

		// For fine move and free zoom
		if ( e.shiftKey ) {
			cancelAction = true;

			if ( e.button === 0 ) {
				this.box = this.getBoundingClientRect();
				freeZoom = {
					counter: 0,
					left: Math.max(0, this.box.left),
					top: Math.max(0, this.box.top)
				};

				freeZoom.startX = e.clientX - freeZoom.left;
				freeZoom.startY = e.clientY - freeZoom.top;

				if ( !this.mask ) {
					this.mask = doc.createElement('canvas');
					this.mask.className = 'mask';
					this.mask.style.cssText = [
						'display: block',
						'position: fixed'
					].join(';');
					this.mctx = this.mask.getContext('2d');
				}

				doc.addEventListener('mousemove', drawMask);
				this.mask.width = Math.min(winW, this.box.width);
				this.mask.height = Math.min(winH, this.box.height);
				this.mask.style.left = freeZoom.left + 'px';
				this.mask.style.top = freeZoom.top + 'px';

				doc.body.appendChild(this.mask);

				var maskColor = win.getComputedStyle(this.mask).color;
				this.mctx.fillStyle = !maskColor || maskColor === 'rgb(0, 0, 0)'
					? 'rgba(0, 0, 0, .4)'
					: maskColor;
			}
		}

		// Is dragSlideing
		if ( progress ) {
			if ( stopScroll ) {
				stopScroll();
				cancelAction = e.button === 0;
			}

			if ( e.button === 0 ) {
				return;
			}
		}

		if ( e.shiftKey ) {
			return;
		}

		if ( e.button === 0 && !cfg.lpLeft ) {
			return;
		}

		if ( e.button === 2 && !cfg.lpRight ) {
			return;
		}

		lastEvent.clientX = e.clientX;
		lastEvent.clientY = e.clientY;
		lastEvent.button = e.button;
		progress = setTimeout(longpressHandler, 300);
	}, true);

	doc.addEventListener('mouseup', function(e) {
		if ( e.button !== 0 ) {
			return;
		}

		if ( vAPI.fullScreenElement === media && vAPI.mediaType === 'video' ) {
			return;
		}

		var x, y, w, h;

		doc.removeEventListener('mousemove', onMove, true);

		if ( freeZoom ) {
			cancelAction = false;
			doc.removeEventListener('mousemove', drawMask);
			media.mctx.clearRect(0, 0, media.mask.width, media.mask.height);
			doc.body.removeChild(media.mask);

			if ( freeZoom.counter < 1 ) {
				freeZoom = null;
				return;
			}

			w = Math.min(
				media.mask.width,
				freeZoom.w + Math.min(freeZoom.x, 0)
					+ (freeZoom.x + freeZoom.w > media.mask.width
						? media.mask.width - freeZoom.x - freeZoom.w
						: 0)
			) || 1;

			h = Math.min(
				media.mask.height,
				freeZoom.h + Math.min(freeZoom.y, 0)
					+ (freeZoom.y + freeZoom.h > media.mask.height
						? media.mask.height - freeZoom.y - freeZoom.h
						: 0)
			) || 1;

			x = Math.max(0, freeZoom.x);
			y = Math.max(0, freeZoom.y);

			if ( x >= media.box.width || y >= media.box.height ) {
				return;
			}

			var nimgw;
			var fitW = winW < w * winH / h;
			fitW = e.ctrlKey ? !fitW : fitW;

			if ( fitW ) {
				nimgw = media.box.width * winW / w;
			} else {
				nimgw = media.box.height * winH / h;
				nimgw *= media.box.width / media.box.height;
			}

			x = freeZoom.left + x + w / 2 - media.box.left;
			y = freeZoom.top + y + h / 2 - media.box.top;
			w = media.box.width;
			h = media.box.height;
			freeZoom = null;

			resizeMedia(MODE_CUSTOM, nimgw);

			win.scrollTo(
				x * media.box.width / w - winW / 2,
				y * media.box.height / h - winH / 2
			);
			return;
		}

		if ( dragSlide.length === 3 ) {
			x = dragSlide[0][0] - dragSlide[2][0];
			y = dragSlide[0][1] - dragSlide[2][1];

			if ( e.timeStamp - media.dragSlideTime > 100 ) {
				cancelAction = false;
				dragSlide.length = 0;
				return;
			}

			if ( x || y ) {
				dragSlide.length = 2;
				dragSlide[0] = x * 1.5;
				dragSlide[1] = y * 1.5;
				startScroll();
				win.addEventListener(vAPI.browser.wheel, stopScroll, true);
				return;
			}
		}

		if ( progress ) {
			clearTimeout(progress);
			progress = null;
		}

		if ( cancelAction ) {
			cancelAction = false;
			return;
		}

		if ( e.shiftKey || e.ctrlKey || e.altKey ) {
			return;
		}

		if ( e.target !== media || lastEvent.button === null ) {
			return;
		}

		if ( e.clientX !== lastEvent.clientX
			|| e.clientY !== lastEvent.clientY ) {
			return;
		}

		if ( media.mode < MODE_WIDTH && noFit.real ) {
			if ( media.mode === MODE_CUSTOM && mWidth !== mOrigWidth ) {
				resizeMedia(MODE_ORIG);
			} else if ( (media.mode === MODE_FIT || media.mode === MODE_ORIG)
				&& (media.box.width === winW || media.box.height === winH) ) {
				resizeMedia(MODE_ORIG);
			} else {
				resizeMedia(
					MODE_FIT,
					mWidth === mOrigWidth
						? media.box.width / media.box.height > winW / winH
							? winW
							: winH * media.box.width / media.box.height
						: void 0
				);
			}
		} else if ( media.mode === MODE_FIT || noFit.cur ) {
			x = e.clientX - media.box.left;
			y = e.clientY - media.box.top;
			w = media.box.width;
			h = media.box.height;
			resizeMedia(MODE_ORIG);
			win.scrollTo(
				x * media.box.width / w - winW / 2,
				y * media.box.height / h - winH / 2
			);
		} else {
			resizeMedia(MODE_FIT);
		}
	}, true);

	doc.addEventListener('keydown', function(e) {
		if ( stopScroll ) {
			stopScroll();
		}

		if ( shortcut.isModifier(e) ) {
			return;
		}

		var key = shortcut.key(e);

		if ( e.ctrlKey || freeZoom && key !== 'Esc' ) {
			return;
		}

		if ( key === '+' || key === '-' ) {
			pdsp(e);
			zoomToCenter({deltaY: key === '+' ? -1 : 1});
			return;
		}

		var x, y, z;

		switch ( key ) {
			case 'Esc':
				resetMedia();
				break;

			case 'Left':
				x = e.shiftKey ? -10 : -50;
				y = 0;
				break;

			case 'Right':
				x = e.shiftKey ? 10 : 50;
				y = 0;
				break;

			case 'Up':
				x = 0;
				y = e.shiftKey ? -10 : -50;
				break;

			case 'Down':
				x = 0;
				y = e.shiftKey ? 10 : 50;
				break;

			case 'PgUp':
				x = e.shiftKey ? -winW / 2 : 0;
				y = e.shiftKey ? 0 : -winH / 2;
				break;

			case 'PgDn':
				x = e.shiftKey ? winW / 2 : 0;
				y = e.shiftKey ? 0 : winH / 2;
				break;

			case 'End':
				x = e.shiftKey
					? Math.max(winW, media.box.width)
					: win.pageXOffset;
				y = e.shiftKey
					? win.pageYOffset
					: Math.max(winH, media.box.height);
				z = true;
				break;

			case 'Home':
				x = e.shiftKey ? 0 : win.pageXOffset;
				y = e.shiftKey ? win.pageYOffset : 0;
				z = true;
				break;

			default: x = true;
		}

		if ( x !== true ) {
			if ( x !== void 0 ) {
				win[z ? 'scrollTo' : 'scrollBy'](x, y);
				pdsp(e, true, false);
			}

			return;
		}

		switch ( key ) {
			case cfg.key_mOrig:
				resizeMedia(MODE_ORIG);
				break;
			case cfg.key_mFit:
				resizeMedia(MODE_FIT);
				break;
			case cfg.key_mFitW:
				resizeMedia(MODE_WIDTH);
				break;
			case cfg.key_mFitH:
				resizeMedia(MODE_HEIGHT);
				break;
			case cfg.key_cycle:
				cycleModes(e.shiftKey);
				break;
			case cfg.key_rotL:
				rotateMedia('left', e.shiftKey);
				break;
			case cfg.key_rotR:
				rotateMedia('right', e.shiftKey);
				break;
			case cfg.key_flipH:
				flipMedia(media, 'h');
				break;
			case cfg.key_flipV:
				flipMedia(media, 'v');
				break;
			case cfg.key_wheelZoom:
				toggleWheelZoom();
				break;
			case cfg.key_pixelate:
				if ( vAPI.mediaType !== 'img' ) {
					break;
				}

				var ir = win.getComputedStyle(media).imageRendering;

				if ( ir === vAPI.browser.irPixelated ) {
					mediaCss['image-rendering'] = 'auto';
				} else {
					mediaCss['image-rendering'] = vAPI.browser.irPixelated;
				}

				setMediaStyle();
				break;
			case cfg.key_imgBg:
				if ( vAPI.mediaType !== 'img' ) {
					break;
				}

				// eslint-disable-next-line no-alert
				var bgValue = e.shiftKey && prompt(
					'background',
					media.style.background
				);

				if ( bgValue === null ) {
					break;
				}

				if ( bgValue !== false ) {
					mediaCss.background = bgValue;
					setMediaStyle();
					break;
				}

				if ( !media.bgList ) {
					bgValue = win.getComputedStyle(media);
					bgValue = bgValue.background || bgValue.backgroundColor;
					media.bgList = {};
					media.bgList[bgValue] = true;
					media.bgList['rgb(0, 0, 0)'] = true;
					media.bgList['rgb(255, 255, 255)'] = true;
					media.bgList['url(data:image/gif;base64,R0lGODlhFAAUAPABAO'
						+ 'jo6P///yH5BAAKAAAALAAAAAAUABQAAAIohI+hy+jAYnhJLnrsx'
						+ 'VBP7n1YyHVaSYKhh7Lq+VotPLo1TaW3HEtlAQA7)'] = true;
					media.bgList = Object.keys(media.bgList).filter(Boolean);
					media.bgListIndex = 0;
				}

				mediaCss.background = media.bgList[
					++media.bgListIndex % media.bgList.length
				];
				setMediaStyle();
				break;
			default: x = true;
		}

		if ( vAPI.mediaType === 'video' ) {
			x = null;

			if ( key === 'Space' ) {
				media.togglePlay();
			} else if ( key === 'Up' || key === 'Down' ) {
				key = media.volume + (key === 'Up' ? 0.1 : -0.1);
				// Must check the range manually,
				// otherwise browsers will throw an error
				media.volume = key < 0
					? 0
					: key > 1 ? 1 : key;
			} else {
				x = true;
			}
		}

		pdsp(e, x !== true, true);
	}, true);

	doc.addEventListener('contextmenu', onContextMenu, true);
	win.addEventListener('resize', function() {
		media.removeAttribute('width');
		media.removeAttribute('height');
		resizeMedia(media.mode);
	});
	toggleWheelZoom();

	if ( vAPI.mediaType === 'video' ) {
		media.addEventListener('click', function(e) {
			if ( e.button !== 0 ) {
				return;
			}

			var y = e.offsetY || e.layerY || 0;

			if ( y > media.clientHeight - 40 ) {
				return;
			}

			if ( vAPI.fullScreenElement === this
				|| y > media.clientHeight / 2 ) {
				media.togglePlay();
			}

			pdsp(e);
		});

		media.addEventListener('dblclick', function(e) {
			if ( (e.offsetY || e.layerY || 0) < media.clientHeight / 2 ) {
				pdsp(e);
			}
		});
	}

	progress = [];
	media.angle = 0;
	media.setAttribute('width', mOrigWidth);
	media.setAttribute('height', mOrigHeight);
	// Original dimensions with padding and border
	mFullWidth = media.offsetWidth;
	mFullHeight = media.offsetHeight;
	calcViewportDimensions();
	calcFit();
	media.removeAttribute('width');
	media.removeAttribute('height');

	if ( vAPI.mediaType === 'img' && cfg.minUpscale && noFit.real ) {
		if ( mOrigWidth >= winW * cfg.minUpscale / 100 ) {
			progress[0] = true;
		}

		if ( mOrigHeight >= winH * cfg.minUpscale / 100 ) {
			progress[1] = true;
		}
	}

	// cfg.mode values: 0 - natural size; 1 - contain; 2 - best fit (fill)
	if ( cfg.mode === 2 ) {
		if ( noFit.real ) {
			media.mode = MODE_FIT;
		} else {
			media.mode = mOrigWidth / mOrigHeight < winW / winH
				? MODE_WIDTH
				: MODE_HEIGHT;
		}
	} else {
		media.mode = cfg.mode === 0 ? MODE_ORIG : MODE_FIT;
	}

	if ( media.mode === MODE_WIDTH && mOrigWidth < winW && !progress[0] ) {
		media.mode = MODE_ORIG;
	} else if ( !progress[1] ) {
		if ( media.mode === MODE_HEIGHT && mOrigHeight < winH ) {
			media.mode = MODE_ORIG;
		}
	}

	resizeMedia(
		media.mode,
		media.mode <= MODE_FIT && progress.length
			? mOrigWidth / mOrigHeight > winW / winH
				? winW
				: winH * mOrigWidth / mOrigHeight
			: void 0
	);
	progress = null;

	menu = root.appendChild(doc.createElement('div'));
	menu.id = 'menu';

	// Chrome 56+ overwrites the style attribute on image load
	if ( vAPI.chrome && document.readyState === 'loading' ) {
		(function() {
			var scrollX = 0;
			var scrollY = 0;
			var tmpStyle = doc.head.appendChild(doc.createElement('style'));

			var rememberScrollPosition = function() {
				scrollX = win.pageXOffset;
				scrollY = win.pageYOffset;
			};

			var onDOMLoad = function(e) {
				doc.removeEventListener(e.type, onDOMLoad);
				win.removeEventListener('scroll', rememberScrollPosition);
				resizeMedia(media.mode);
				doc.head.removeChild(tmpStyle);
				setTimeout(function() {
					win.scrollTo(scrollX, scrollY);
				}, 0xf);
			};

			doc.addEventListener('DOMContentLoaded', onDOMLoad);
			win.addEventListener('scroll', rememberScrollPosition);
		})();
	}

	if ( win.getComputedStyle(menu).display === 'none' ) {
		menu.parentNode.removeChild(menu);
		menu = null;
		return;
	}

	menu.style.cssText = '-webkit-filter: blur(0px); filter: blur(0px);';

	if ( menu.style.filter || menu.style.webkitFilter ) {
		vAPI.browser.filter = menu.style.filter
			? 'filter'
			: '-webkit-filter';
	}

	var onMenuChange = function(e) {
		var filterName;
		var filterCSS = '';
		var t = e.target;

		if ( !t.value ) {
			media.style[vAPI.browser.filter] = filterCSS;
			return;
		}

		if ( t.value === t.defaultValue ) {
			delete media.filters[t.parentNode.textContent.trim()];
		} else {
			filterName = t.parentNode.textContent.trim();
			media.filters[filterName] = t.value + t.getAttribute('unit');
		}

		for ( filterName in media.filters ) {
			filterCSS += filterName;
			filterCSS += '(' + media.filters[filterName] + ') ';
		}

		if ( filterCSS ) {
			mediaCss[vAPI.browser.filter] = filterCSS;
		} else {
			delete mediaCss[vAPI.browser.filter];
		}

		media.style[vAPI.browser.filter] = filterCSS;
	};

	if ( vAPI.browser.filter ) {
		media.filters = Object.create(null);
		menu.addEventListener('change', onMenuChange);
	} else {
		onMenuChange = null;
	}

	vAPI.buildNodes(menu.appendChild(doc.createElement('ul')), [
		{tag: 'li', attrs: {'data-cmd': 'cycle'}, nodes: [{tag: 'div'}]},
		{tag: 'li', attrs: {'data-cmd': 'zoom'}, nodes: [{tag: 'div'}]},
		{tag: 'li', attrs: {'data-cmd': 'flip'}, nodes: [{tag: 'div'}]},
		{tag: 'li', attrs: {'data-cmd': 'rotate'}, nodes: [{tag: 'div'}]},
		media.filters ? {tag: 'li', attrs: {class: 'filters', 'data-cmd': 'filters'}, nodes: [
			{tag: 'div'},
			{tag: 'form', nodes: [{tag: 'ul', nodes: [
				{tag: 'li', nodes: [
					{
						tag: 'input',
						attrs: {
							type: 'range',
							min: 0,
							max: 250,
							step: 10,
							value: 100,
							unit: '%'
						}
					},
					' brightness'
				]},
				{tag: 'li', nodes: [
					{
						tag: 'input',
						attrs: {
							type: 'range',
							min: 0,
							max: 300,
							step: 25,
							value: 100,
							unit: '%'
						}
					},
					' contrast'
				]},
				{tag: 'li', nodes: [
					{
						tag: 'input',
						attrs: {
							type: 'range',
							min: 0,
							max: 1000,
							step: 50,
							value: 100,
							unit: '%'
						}
					},
					' saturate'
				]},
				{tag: 'li', nodes: [
					{
						tag: 'input',
						attrs: {
							type: 'range',
							min: 0,
							max: 100,
							step: 25,
							value: 0,
							unit: '%'
						}
					},
					' grayscale'
				]},
				{tag: 'li', nodes: [
					{
						tag: 'input',
						attrs: {
							type: 'range',
							min: 0,
							max: 100,
							step: 100,
							value: 0,
							unit: '%'
						}
					},
					' invert'
				]},
				{tag: 'li', nodes: [
					{
						tag: 'input',
						attrs: {
							type: 'range',
							min: 0,
							max: 100,
							step: 20,
							value: 0,
							unit: '%'
						}
					},
					' sepia'
				]},
				{tag: 'li', nodes: [
					{
						tag: 'input',
						attrs: {
							type: 'range',
							min: 0,
							max: 360,
							step: 36,
							value: 0,
							unit: 'deg'
						}
					},
					' hue-rotate'
				]},
				{tag: 'li', nodes: [
					{
						tag: 'input',
						attrs: {
							type: 'range',
							min: 0,
							max: 20,
							step: 1,
							value: 0,
							unit: 'px'
						}
					},
					' blur'
				]}
			]}]}
		]} : '',
		{tag: 'li', attrs: {'data-cmd': 'reset'}, nodes: [{tag: 'div'}]},
		/^https?:$/.test(win.location.protocol) && cfg.sendToHosts.length
			? {
				tag: 'li',
				attrs: {class: 'send-hosts', 'data-cmd': ''},
				nodes: [{tag: 'div'}, {
					tag: 'ul',
					nodes: cfg.sendToHosts.map(function(item) {
						var host = item.split('|');
						return {
							tag: 'li',
							nodes: [{
								tag: 'a',
								attrs: {href: host.slice(1).join('|')},
								text: host[0]
							}]
						};
					})
				}]
			}
			: null,
		vAPI.mediaType === 'img'
			? {
				tag: 'li',
				attrs: {'data-cmd': 'frames'},
				nodes: [{tag: 'div'}]
			}
			: '',
		{tag: 'li', attrs: {'data-cmd': 'options'}, nodes: [{tag: 'div'}]}
	]);

	menu.style.cssText = 'display: none; left: -' + menu.offsetWidth + 'px';

	menu.addEventListener('mousedown', function(e) {
		var t = e.target;
		var href = t.getAttribute('href');

		if ( href && href.indexOf('%') !== -1 ) {
			t.href = href.replace('%url', encodeURIComponent(media.src));
		}

		pdsp(e, !!t.textContent);
	});

	// Load favicons only when the menu item is hovered for the first time
	if ( cfg.sendToHosts.length && /^https?:$/.test(win.location.protocol) ) {
		menu.onHostsHover = function(e) {
			this.removeEventListener(e.type, menu.onHostsHover);
			delete menu.onHostsHover;
			var links = this.querySelectorAll('.send-hosts > ul > li > a');
			[].forEach.call(links, function(a) {
				var host = a.getAttribute('href');
				host = host && host.match(/^[^\/]*(\/\/[^\/]+)/);

				if ( !host ) {
					return;
				}

				a.style.backgroundImage = 'url(' + host[1] + '/favicon.ico)';
			});
		};

		menu.querySelector('.send-hosts > ul').addEventListener(
			vAPI.browser.transitionend,
			menu.onHostsHover
		);
	}

	var handleCommand = function(cmd, e) {
		if ( e.button === 1 ) {
			return;
		}

		var p = e.button === 2
			|| e.type === vAPI.browser.wheel
				&& (e.deltaY || -e.wheelDelta) > 0;

		if ( cmd === 'cycle' ) {
			cycleModes(!p);
		} else if ( cmd === 'flip' ) {
			flipMedia(media, p ? 'v' : 'h');
		} else if ( cmd === 'rotate' ) {
			rotateMedia(p ? 'left' : 'right', e.ctrlKey);
		} else if ( cmd === 'zoom' ) {
			pdsp(e);
			zoomToCenter({deltaY: p ? 1 : -1});
		} else if ( cmd === 'reset' ) {
			if ( e.button === 0 ) {
				resetMedia();
			}
		} else if ( cmd === 'filters' ) {
			if ( e.button === 2 ) {
				media.filters = {};
				delete mediaCss[vAPI.browser.filter];
				media.style[vAPI.browser.filter] = '';
				doc.querySelector('#menu li.filters > form').reset();
			}
		} else if ( cmd === 'frames' ) {
			var message = {cmd: 'loadFile', path: 'js/frames.js'};
			vAPI.messaging.send(message, function(data) {
				var errorHandler = function(alertMessage) {
					// Success
					if ( alertMessage !== null ) {
						// eslint-disable-next-line no-alert
						alert(alertMessage);
						menu.querySelector('li[data-cmd="frames"]')
							.removeAttribute('data-cmd');
						return;
					}

					if ( menu ) {
						menu.parentNode.removeChild(menu);
					}
				};

				// eslint-disable-next-line no-new-func
				Function('win', 'drawFullFrame', 'errorHandler', data)(
					win,
					e.button === 0,
					errorHandler
				);
			});
		} else if ( cmd === 'options' && e.button !== 1 ) {
			vAPI.messaging.send({
				cmd: 'openURL',
				url: 'options.html' + (e.button === 2 ? '#shortcuts' : '')
			});
		} else {
			p = null;
		}

		if ( p !== null ) {
			pdsp(e);
		}
	};

	var onMenuClick = function(e) {
		var cmd = e.target.parentNode.getAttribute('data-cmd');

		if ( cmd ) {
			handleCommand(cmd, e);
		}
	};

	var menuTrigger = function(e) {
		if ( panning || freeZoom || e.shiftKey ) {
			return;
		}

		if ( e.clientX > 40 || e.clientX < 0 ) {
			return;
		}

		if ( e.clientY > win.innerHeight / 3 || e.clientY < 0 ) {
			return;
		}

		if ( menu.style.display === 'block' ) {
			return;
		}

		if ( !menu.iconsLoaded ) {
			var bgImage = win.getComputedStyle(menu).backgroundImage;

			if ( bgImage && bgImage !== 'none' ) {
				menu.iconsLoaded = true;
			}
		}

		if ( !menu.iconsLoaded ) {
			var message = {cmd: 'loadFile', path: 'css/menu_icons.b64png'};

			vAPI.messaging.send(message, function(img) {
				var sheet = doc.head.querySelector('style').sheet;
				sheet.insertRule(
					'li[data-cmd] > div {background-image: url(' + img + ');}',
					sheet.cssRules.length
				);
				menu.iconsLoaded = true;
			});
		}

		menu.style.display = 'block';

		setTimeout(function() {
			menu.style.left = '0';
			menu.style.opacity = '1';
		}, 50);

		doc.removeEventListener('mousemove', menuTrigger);
	};

	menu.addEventListener(vAPI.browser.wheel, function(e) {
		pdsp(e);

		var t = e.target;

		if ( t.nodeType === 3 ) {
			t = t.parentNode;
		}

		if ( t.type === 'range' ) {
			var delta = (e.deltaY || -e.wheelDelta) > 0 ? -1 : 1;
			t.value = Math.max(
				t.getAttribute('min'),
				Math.min(
					parseInt(t.value, 10) + t.getAttribute('step') * delta,
					t.getAttribute('max')
				)
			);
			onMenuChange(e);
		} else if ( !/reset|frames|options/.test(t.getAttribute('data-cmd')
			|| (t = t.parentNode) && t.getAttribute('data-cmd')) ) {
			handleCommand(t.getAttribute('data-cmd'), e);
		}
	});

	menu.addEventListener('click', onMenuClick);

	menu.addEventListener('contextmenu', function(e) {
		var target = e.target;

		if ( target.type === 'range' ) {
			target.value = target.defaultValue;
			onMenuChange(e);
			pdsp(e);
			return;
		}

		onMenuClick(e);
	});

	menu.addEventListener(vAPI.browser.transitionend, function(e) {
		if ( e.propertyName === 'left' && this.style.left[0] === '-' ) {
			this.style.display = 'none';
		}
	});

	menu.addEventListener('mouseenter', function() {
		if ( !this.hideTimer ) {
			return;
		}

		clearTimeout(this.hideTimer);
		this.hideTimer = null;
		this.style.left = '0';
		this.style.opacity = '1';
	});

	menu.addEventListener('mouseleave', function() {
		this.hideTimer = setTimeout(function() {
			doc.addEventListener('mousemove', menuTrigger);
			menu.hideTimer = null;
			menu.style.left = '-' + menu.offsetWidth + 'px';
			menu.style.opacity = '0';
		}, 800);
	});

	// Safari showed the menu even if the cursor wasn't at the edge
	setTimeout(function() {
		doc.addEventListener('mousemove', menuTrigger);
	}, 500);
};

root = doc.documentElement;

media.addEventListener('error', function() {
	// Opera fires an error event on local video files
	// when they're close to the end
	// Firefox did it a few times too,
	// even if there was nothing wrong with the video
	if ( media.currentTime > 0.1 && win.location.protocol === 'file:' ) {
		return;
	}

	clearInterval(progress);
	root.classList.add('load-failed');
});

if ( win.location.protocol === 'data:' ) {
	media.alt = vAPI.mediaType + ' (data:)';

	if ( !cfg.mediaInfo ) {
		doc.title = media.alt;
	}
} else {
	media.alt = (win.location.href
		.replace(/#.*/, '')
		.match(/(?:[^\/]+)?$/)[0] || vAPI.mediaType
	).split('?')[0];

	try {
		// Some Unicode characters caused problems for decodeURIComponent
		media.alt = decodeURIComponent(media.alt);
	} catch ( ex ) {
		//
	}
}

if ( vAPI.mediaType === 'img' ) {
	// Try to prevent default browser action
	doc.body.addEventListener('click', function(e) {
		e.stopImmediatePropagation();
	}, true);

	if ( media.naturalWidth ) {
		initPingsLeft = 0;
		init();
		return;
	}

	progress = setInterval(init, 100);
	return;
}

var attributeValues = {};
var mediaAttributes = ['autoplay', 'controls', 'loop', 'muted', 'volume'];

cfg.mediaAttrs.split(/\s+/).forEach(function(attribute) {
	var attr = attribute.split('=');

	if ( attr[0] === 'volume' ) {
		attributeValues[attr[0]] = Math.min(
			100,
			Math.max(0, parseInt(attr[1], 10) / 100)
		);
	} else {
		attributeValues[attr[0]] = true;
	}
});

mediaAttributes.forEach(function(attr) {
	if ( attr === 'volume' ) {
		media[attr] = attributeValues[attr] === void 0
			? 1
			: attributeValues[attr];
	} else {
		media[attr] = attributeValues[attr] || false;
	}
});

media.togglePlay = function() {
	if ( this.paused || Math.abs(this.duration - this.currentTime) < 0.01 ) {
		this.play();
	} else {
		this.pause();
	}
};

media.addEventListener('loadedmetadata', function onLoadedMetadata(e) {
	this.removeEventListener(e.type, onLoadedMetadata);

	if ( this.videoHeight && (vAPI.opera || vAPI.chrome) ) {
		doc.addEventListener('fullscreenchange', function() {
			root.classList.toggle('fullscreen');
		});
	}

	var playerStateSaver;
	var monitoredAttrs = mediaAttributes.slice(1, -2);

	var savePlayerState = function() {
		var mediaAttrs = [];

		mediaAttributes.forEach(function(attr) {
			if ( attr === 'volume' ) {
				if ( media.volume < 1 ) {
					mediaAttrs.push(attr + '=' + (100 * media.volume | 0));
				}
			} else if ( media[attr] ) {
				mediaAttrs.push(attr);
			}
		});

		vAPI.messaging.send({cmd: 'savePrefs', prefs: {
			mediaAttrs: mediaAttrs.join(' ')
		}});
	};

	var onAttributeChange = function() {
		if ( !media.controls && vAPI.mediaType === 'audio' ) {
			media.controls = true;
		}

		clearTimeout(playerStateSaver);
		playerStateSaver = setTimeout(savePlayerState, 500);
	};

	if ( win.MutationObserver ) {
		new MutationObserver(onAttributeChange).observe(media, {
			attributes: true,
			attributeFilter: monitoredAttrs
		});
	} else {
		// Legacy
		media.addEventListener('DOMAttrModified', function(ev) {
			if ( monitoredAttrs.indexOf(ev.attrName) > -1 ) {
				onAttributeChange();
			}
		});
	}

	media.addEventListener('volumechange', onAttributeChange);

	doc.addEventListener('keydown', function(ev) {
		var key = shortcut.key(ev);

		if ( key === 'Space' ) {
			media.togglePlay();
		} else if ( key === 'Up' || key === 'Down' ) {
			key = media.volume + (key === 'Up' ? 0.1 : -0.1);
			media.volume = key < 0
				? 0
				: key > 1 ? 1 : key;
		} else {
			return;
		}

		pdsp(ev);
	});

	media.addEventListener('dblclick', function(ev) {
		pdsp(ev);
	});

	if ( media.autoplay ) {
		setTimeout(media.play.bind(media), 50);
	}

	if ( this.videoHeight ) {
		init();
		return;
	}

	vAPI.mediaType = 'audio';
	media.controls = true;
	doc.title = media.alt;
	init();

	if ( vAPI.opera || vAPI.firefox ) {
		return;
	}

	// To not show the black poster when audio restarts or if seek happens
	media.addEventListener('playing', function() {
		this.poster = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
	});
});
// eslint-disable-next-line padded-blocks
};
// eslint-disable-next-line padded-blocks
(function() {

if ( vAPI.safari && location.protocol === 'safari-extension:' ) {
	init = null;
	vAPI.suicideAttempt();
	return;
}

var firstContact = function() {
	if ( vAPI.opera || vAPI.firefox ) {
		if ( !vAPI.mediaType ) {
			init = null;
			firstContact = null;
			vAPI.suicideAttempt();
			return;
		}

		vAPI.messaging.send({cmd: 'loadPrefs'}, function(response) {
			firstContact = null;
			init(window, document, response);
		});
		return;
	}

	vAPI.messaging.send({cmd: 'loadPrefs'}, function(response) {
		firstContact = null;

		if ( !vAPI.mediaType ) {
			init = null;
			vAPI.suicideAttempt();
			return;
		}

		init(window, document, response);
	});
};

firstContact();

var count = 0;
var pingBackground = setInterval(function() {
	if ( firstContact === null || ++count > 4 ) {
		clearInterval(pingBackground);
		return;
	}

	firstContact();
}, 3000);
// eslint-disable-next-line padded-blocks
})();
