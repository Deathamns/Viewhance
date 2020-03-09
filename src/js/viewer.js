/* eslint indent:"off" */

'use strict';

// eslint-disable-next-line padded-blocks
var init = function(win, doc, response) {

var media = doc.body.querySelector('img, video, audio');

if ( !media && (vAPI.extraFormat || vAPI.isDataUrl) ) {
	media = doc.body.appendChild(doc.createElement(vAPI.mediaType));

	if ( vAPI.extraFormat === 'svg' || vAPI.isDataUrl ) {
		// Don't set "src" for extraFormat so it won't raise an error event
		media.src = vAPI.extraFormatUrl || win.location.hash.slice(1);
	}

	if ( vAPI.extraFormat && vAPI.extraFormat !== 'svg' ) {
		// viewer.html is guaranteed to have a "head" element
		doc.head.appendChild(doc.createElement('script')).src = './js/player.js';
	}
}

if ( !media ) {
	init = null;
	vAPI.suicideAttempt();
	return;
}

var cfg = response.prefs;

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

if ( cfg.favicon && !vAPI.isDataUrl ) {
	var faviconLink = doc.createElement('link');
	faviconLink.rel = 'shortcut icon';
	faviconLink.href = cfg.favicon === '%url' && vAPI.mediaType === 'img'
		? (vAPI.extraFormatUrl || win.location.href)
		: cfg.favicon.replace(
			'%url',
			encodeURIComponent((vAPI.extraFormatUrl || win.location.href))
		);
	head.appendChild(faviconLink);
}

head.appendChild(doc.createElement('meta')).name = 'referrer';
head.lastElementChild.content = 'no-referrer';

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
	'html.audio #media, html video:not([id="media"]) {',
		'position: absolute;',
		'top: 0;',
		'right: 0;',
		'bottom: 0;',
		'left: 0;',
		'margin: auto;',
	'}',
	'html.audio #media {',
		'box-sizing: inherit;',
		'width: 50%;',
		'height: 40px !important;',
		'min-width: 300px;',
		'max-width: 100%;',
		'box-shadow: none;',
		'background: transparent;',
	'}',
	'html.load-failed #media {',
		'left: 50%;',
		'margin: 10% auto 0 -25%;',
		'padding: 10px;',
		'max-width: 50%;',
		'box-shadow: 0 0 5px red;',
		'text-align: center;',
		'font-size: 20px;',
	'}',
	'html.video #media {',
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
		'display: inline-flex;',
		'position: fixed;',
		'top: 0;',
		'left: 0;',
	'}',
	'#menu:not(.permanent) {',
		'opacity: 0;',
		vAPI.browser.transitionCSS, ': opacity .1s, top .2s, right .2s, bottom .2s, left .2s;',
	'}',
	'#menu > ul {',
		'display: inline-flex;',
		'flex-direction: column;',
	'}',
	'ul {',
		'margin: 0;',
		'padding: 8px 0;',
		'background: rgba(0, 0, 0, .6); color: #fff;',
		'font-size: 25px; font-weight: 700;',
		'text-align: center;',
		'list-style: none;',
	'}',
	'li {',
		'position: relative;',
		'display: block;',
		'padding: 4px 15px;',
		'min-width: 25px;',
		'min-height: 25px;',
		'line-height: 100%;',
	'}',
	'li > svg > use {',
		'pointer-events: none;',
	'}',
	'li > svg {',
		'width: 25px;',
		'height: 25px;',
		'cursor: pointer;',
		'fill: rgba(0,0,0,0);',
		'stroke: #fff;',
		'color: #fff;',
		'transition: opacity .2s;',
	'}',
	'li > svg:hover {',
		'opacity: .6;',
	'}',
	'li ul {',
		'display: block;',
		'visibility: hidden;',
		'position: absolute;',
		'text-align: left;',
		'opacity: 0;',
	'}',
	'.top.left.vertical li ul {',
		'top: 0;',
		'left: 100%;',
	'}',
	'.top.left.horizontal li ul {',
		'top: 100%;',
		'left: 0;',
	'}',
	'.top.right.vertical li ul {',
		'top: 0;',
		'right: 100%;',
	'}',
	'.top.right.horizontal li ul {',
		'top: 100%;',
		'right: 0;',
	'}',
	'.bottom.left.vertical li ul {',
		'bottom: 0;',
		'left: 100%;',
	'}',
	'.bottom.left.horizontal li ul {',
		'bottom: 100%;',
		'left: 0;',
	'}',
	'.bottom.right.vertical li ul {',
		'bottom: 0;',
		'right: 100%;',
	'}',
	'.bottom.right.horizontal li ul {',
		'bottom: 100%;',
		'right: 0;',
	'}',
	'li:hover > ul, li:hover > form > ul {',
		'display: block;',
		'visibility: visible;',
		'opacity: 1;',
		vAPI.browser.transitionCSS, ': visibility .4s, opacity .2s .3s;',
	'}',
	'li ul > li {',
		'display: block !important;',
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
	'#menu > ul > li:hover, .send-hosts li > a:hover, .quality-picker li:hover {',
		'color: silver;',
	'}',
	'.quality-picker li:hover {',
		'cursor: pointer;',
	'}',
	'.active-quality {',
		'color: orange;',
	'}',
	'input[type="range"] {',
		'width: 125px;',
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
	'body.frames > div {',
		'width: 100%;',
		'height: 100%;',
		'box-sizing: border-box;',
		'padding: 10px;',
	'}',
	'#top-panel {',
		'position: fixed;',
		'top: 0;',
		'left: 0;',
		'width: 100%;',
		'padding: 10px;',
		'background-image: linear-gradient(to bottom, #fff, #ddd);',
		'box-shadow: 0 0 15px rgba(0, 0, 0, .4);',
	'}',
	'#frames {',
		'margin: 50px 0 5px;',
	'}',
	'#frames > canvas, #frames > img {',
		'margin: 2px;',
	'}',
	'#frames > .highlighted {',
		'outline: 2px solid #00a1ff;',
	'}',
	'#frames > canvas, #frames > img {',
		'display: none;',
	'}',
	'#current-frame + output {',
		'display: inline-block;',
		'width: 77px;',
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
	'.partial-frame:hover {',
		'outline: 1px dotted #666;',
	'}',
	// Custom CSS
	cfg.css
].join('');

root.insertBefore(head, doc.body);

init = function() {
	if ( vAPI.mediaType === 'img'
		&& (vAPI.extraFormat === 'svg' && !media.naturalWidth
			? !media.width
			: !media.naturalWidth) ) {
		if ( progress && --initPingsLeft < 1 ) {
			clearInterval(progress);
		}

		return;
	}

	media.id = 'media';
	root.classList.add(vAPI.mediaType);

	if ( progress ) {
		clearInterval(progress);
		progress = null;
	}

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

	if ( !cfg.mediaInfo ) {
		cfg.mediaInfo = false;
	}

	cfg.hiddenScrollbars = win.getComputedStyle(root).overflow === 'hidden'
		|| win.getComputedStyle(doc.body).overflow === 'hidden';

	var setOriginalDimensions = function() {
		if ( vAPI.extraFormat === 'svg' && !media.svgWidth ) {
			// Firefox sometimes doesn't set naturalWidth for SVGs
			if ( media.naturalWidth ) {
				media.svgWidth = media.naturalWidth;
				media.svgHeight = media.naturalHeight;
			} else {
				media.svgWidth = media.width;
				media.svgHeight = media.height;
			}

			var ratio = media.svgWidth / media.svgHeight;

			if ( media.svgWidth / media.svgHeight > winW / winH ) {
				media.svgWidth = winW;
				media.svgHeight = Math.round(winW / ratio);
			} else {
				media.svgHeight = winH;
				media.svgWidth = Math.round(winH * ratio);
			}
		}

		if ( vAPI.mediaType === 'img' ) {
			mOrigWidth = media.svgWidth || media.naturalWidth;
			mOrigHeight = media.svgHeight || media.naturalHeight;

			if ( vAPI.extraFormat !== 'svg' && mOrigWidth !== mOrigHeight ) {
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

		if ( cfg.scaling ) {
			if ( cfg.scaling === '*' || cfg.scaling < 0 ) {
				mOrigWidth /= win.devicePixelRatio;
				mOrigHeight /= win.devicePixelRatio;
			}

			if ( typeof cfg.scaling === 'number' ) {
				mOrigWidth *= Math.abs(cfg.scaling);
				mOrigHeight *= Math.abs(cfg.scaling);
			}
		}

		var mStyle = win.getComputedStyle(media);
		// Original dimensions with padding and border
		mFullWidth = mOrigWidth
			+ parseInt(mStyle.paddingLeft, 10)
			+ parseInt(mStyle.paddingRight, 10)
			+ parseInt(mStyle.borderLeftWidth, 10)
			+ parseInt(mStyle.borderRightWidth, 10);
		mFullHeight = mOrigHeight
			+ parseInt(mStyle.paddingTop, 10)
			+ parseInt(mStyle.paddingBottom, 10)
			+ parseInt(mStyle.borderTopWidth, 10)
			+ parseInt(mStyle.borderBottomWidth, 10);
	};

	var setMediaStyle = function() {
		var css = '';

		for ( var p in mediaCss ) {
			css += p + ':' + mediaCss[p] + ';';
		}

		media.style.cssText = css;

		if ( !cfg.hiddenScrollbars ) {
			calcViewportDimensions();
		}
	};

	var calcViewportDimensions = function() {
		winH = doc.compatMode === 'BackCompat' ? doc.body : root;
		winW = winH.clientWidth;
		winH = winH.clientHeight;
	};

	var toggleDraggable = function() {
		// draggable attribute is not respected in Firefox
		media.ondragstart = media.style.cursor === 'move' ? pdsp : null;
	};

	var calcFit = function() {
		var m = media;

		if ( m.hasAttribute('height') ) {
			m.removeAttribute('width');
			m.removeAttribute('height');
			m.removeAttribute('class');
		}

		mWidth = m.offsetWidth - (mFullWidth - mOrigWidth);
		mHeight = m.offsetHeight - (mFullHeight - mOrigHeight);
		m.box = m.getBoundingClientRect();
		noFit.cur = m.box.width <= winW && m.box.height <= winH;

		var radians = m.angle * Math.PI / 180;
		var sin = Math.abs(Math.sin(radians));
		var cos = Math.abs(Math.cos(radians));
		var boxW = mFullWidth * cos + mFullHeight * sin;
		var boxH = mFullWidth * sin + mFullHeight * cos;
		noFit.real = boxW <= winW && boxH <= winH;

		var s = m.style;

		if ( (m.mode !== MODE_FIT || m.angle )
			&& (m.box.width > winW || m.box.height > winH) ) {
			s.cursor = 'move';
		} else if ( mWidth < Math.round(mOrigWidth)
			|| mHeight < Math.round(mOrigHeight) ) {
			s.cursor = vAPI.browser.zoomIn;
		} else {
			s.cursor = '';
		}

		toggleDraggable();
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
		var ow = m.svgWidth || m.naturalWidth || m.videoWidth;
		var oh = m.svgHeight || m.naturalHeight || m.videoHeight;

		switch ( param ) {
			case 'w': return m.angle ? m.clientWidth : m.width;
			case 'h': return m.angle ? m.clientHeight : m.height;
			case 'ow': return ow;
			case 'oh': return oh;
			case 'url': return vAPI.isDataUrl
				? 'data:'
				: (vAPI.extraFormatUrl || win.location.href);
			case 'name': return m.alt;
			case 'ratio':
				return Math.round(ow / oh * 100) / 100;
			case 'perc':
				m = m.videoWidth || (m.angle ? m.clientWidth : m.width);
				m *= 100 / ow;
				return m < 2 ? m.toFixed(1) : Math.round(m);
			case 'size':
				if ( m._size !== void 0 ) {
					return m._size;
				}

				// x.open('HEAD', vAPI.extraFormatUrl || win.location.href, true);
				// var size = this.getResponseHeader('content-length') | 0;

				var xhr = new win.XMLHttpRequest;
				xhr.open('GET', vAPI.extraFormatUrl || win.location.href, true);
				xhr.overrideMimeType('text/plain; charset=x-user-defined');
				xhr.onload = function() {
					this.onload = null;
					var size = this.responseText.length;

					if ( !size ) {
						m._size = '?B';
						setTitle();
						return;
					}

					var units = {
						MiB: 1024 * 1024,
						KiB: 1024,
						B: 1
					};

					for ( var unit in units ) {
						if ( size >= units[unit] ) {
							m._size = (
								size / units[unit]
							).toFixed(2) + ' ' + unit;
							break;
						}
					}

					setTitle();
				};
				xhr.send();
				return '?B';
		}

		return a;
	};

	var setTitle = function() {
		if ( !cfg.mediaInfo ) {
			return;
		}

		doc.title = cfg.mediaInfo.replace(
			/%(o?[wh]|url|name|ratio|perc|size)/g,
			convertInfoParameter
		);
	};

	var resizeMedia = function(mode, w) {
		var boxW, sin, cos;
		var newMode = mode === void 0 ? MODE_FIT : mode;
		var boxRatio = media.angle
			? media.box.width / media.box.height
			: mOrigWidth / mOrigHeight;
		media.mode = newMode;

		calcViewportDimensions();

		if ( !w && mode === MODE_FIT && !noFit.real ) {
			newMode = boxRatio > winW / winH ? MODE_WIDTH : MODE_HEIGHT;
		}

		if ( media.angle ) {
			var radians = media.angle * Math.PI / 180;
			sin = Math.abs(Math.sin(radians));
			cos = Math.abs(Math.cos(radians));
		}

		if ( w ) {
			boxW = w;
		} else if ( newMode === MODE_WIDTH ) {
			boxW = winW;
		} else if ( newMode === MODE_HEIGHT ) {
			boxW = boxRatio * winH;
		} else if ( newMode === MODE_ORIG
			|| newMode === MODE_FIT && noFit.real ) {
			boxW = media.angle
				? mFullWidth * cos + mFullHeight * sin
				: mOrigWidth;
		}

		if ( boxW ) {
			if ( media.angle ) {
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

		var transformCss = '';

		if ( media.angle ) {
			transformCss += 'rotate(' + media.angle + 'deg)';
		}

		if ( media.scale.h !== 1 || media.scale.v !== 1 ) {
			transformCss += ' scale('
				+ media.scale.h + ',' + media.scale.v
				+ ')';
		}

		mediaCss[vAPI.browser.transformCSS] = transformCss;
		setMediaStyle();
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

		if ( progress ) {
			cancelAnimationFrame(progress);
		}

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

	cfg.zoomParams = (cfg.zoomParams || '').split(/\s*;+\s*/);
	cfg.zoomParams = {
		step: 1 + Math.max(0.01, cfg.zoomParams[0].trim() || (1 / 3)),
		snaps: (cfg.zoomParams[1] || '').trim().split(/\s+/)
			.map(parseFloat).filter(function(el, idx, list) {
				return el && list.indexOf(el, idx + 1) === -1;
			}).sort()
	};

	var wheelZoom = function(e) {
		pdsp(e);
		stopScroll();

		var boxW, zoomIn;
		var zp = cfg.zoomParams;

		if ( (e.deltaY || -e.wheelDelta) > 0 ) {
			zoomIn = false;
			boxW = Math.max(1, mWidth / zp.step);
		} else {
			zoomIn = true;
			boxW = mWidth * zp.step;
			boxW = boxW > 10 ? boxW : boxW + 3;
		}

		snap:
		if ( !(e.shiftKey || e.altKey) && zp.snaps.length > 1 ) {
			var newScale = boxW / mOrigWidth;
			var curScale = mWidth / mOrigWidth;
			var i = zp.snaps.length - 1;

			if ( zoomIn ) {
				if ( curScale >= zp.snaps[i] ) {
					break snap;
				}

				if ( curScale < zp.snaps[0] ) {
					if ( newScale > zp.snaps[0]
						|| Math.abs(newScale - zp.snaps[0]) < zp.step - 1 ) {
						newScale = zp.snaps[0] * mOrigWidth;

						if ( Math.abs(mWidth - Math.round(newScale)) > 2 ) {
							boxW = newScale;
							break snap;
						}
					}
				}
			} else {
				if ( curScale <= zp.snaps[0] ) {
					break snap;
				}

				if ( curScale > zp.snaps[i] && mWidth !== boxW ) {
					if ( newScale < zp.snaps[i]
						|| Math.abs(newScale - zp.snaps[i]) < zp.step - 1 ) {
						newScale = zp.snaps[i] * mOrigWidth;

						if ( Math.abs(mWidth - Math.round(newScale)) > 2 ) {
							boxW = newScale;
							break snap;
						}
					}
				}
			}

			while ( i-- ) {
				var lowScale = zp.snaps[i];
				var highScale = zp.snaps[i + 1];

				if ( lowScale > curScale || curScale > highScale ) {
					continue;
				}

				var lowDiff = Math.abs(curScale - lowScale);
				var highDiff = Math.abs(curScale - highScale);

				if ( lowDiff > highDiff ) {
					++i;
				}

				if ( zoomIn ) {
					++i;

					if ( zp.snaps[i] === void 0 ) {
						newScale = zp.snaps[zp.snaps.length - 1] + zp.step - 1;
					} else {
						newScale = zp.snaps[i];
					}
				} else {
					--i;

					if ( zp.snaps[i] === void 0 ) {
						newScale = zp.snaps[0] - zp.step + 1;
					} else {
						newScale = zp.snaps[i];
					}
				}

				if ( newScale > 0.05) {
					boxW = newScale * mOrigWidth;
				}

				break;
			}
		}

		if ( media.angle ) {
			var radians = media.angle * Math.PI / 180;
			var sin = Math.abs(Math.sin(radians));
			var cos = Math.abs(Math.cos(radians));
			boxW = boxW * cos + (mOrigHeight * boxW / mOrigWidth) * sin;
		}

		media.box = media.getBoundingClientRect();

		var w = media.box.width;
		var h = media.box.height;
		var x = e.clientX - media.box.left;
		var y = e.clientY - media.box.top;

		resizeMedia(MODE_CUSTOM, boxW);
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
			clientY: winH / 2,
			altKey: e.altKey,
			shiftKey: e.shiftKey
		});
	};

	var wheelPan = function(e) {
		var w = Math.round(media.box.width);
		var h = Math.round(media.box.height);

		if ( w <= winW && h <= winH
			// Pass vertical scolling to the browser
			|| e.clientX >= winW ) {
			return;
		}

		stopScroll();

		var x = 0;
		var y = (e.deltaX || e.deltaY || -e.wheelDelta) > 0 ? winH : -winH;
		y /= 5;

		if ( w <= winW && h > winH ) {
			if ( !cfg.hiddenScrollbars ) {
				return;
			}
		} else if ( h <= winH && w > winW
			|| e.clientY >= winH
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

	var onWheel = function(e) {
		if ( !isValidWheelTarget(e.target) ) {
			return;
		}

		// Ignore scollbars
		if ( cfg.wheelZoom && e.clientX < winW && e.clientY < winH
			|| cfg.wheelZoomWithKey && e[cfg.wheelZoomWithKey + 'Key'] ) {
			wheelZoom(e);
		} else {
			wheelPan(e);
		}
	};

	var toggleWheelZoom = function(noToggle) {
		if ( !noToggle ) {
			cfg.wheelZoom = !cfg.wheelZoom;
		}

		var zoomMenuItem = menu && menu.querySelector('li[data-cmd="zoom"]');

		if ( zoomMenuItem ) {
			zoomMenuItem.style.display = cfg.wheelZoom ? 'none' : '';
		}
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
			lastEvent.button = null;
			progress = null;
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

	var longpressHandler = function(forcedAction) {
		var action;
		progress = null;

		if ( forcedAction ) {
			action = forcedAction;
		} else {
			cancelAction = true;
			action = cfg[lastEvent.button === 2 ? 'lpRight' : 'lpLeft'];
		}

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
					&& media.box.width !== winW
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

	var onMouseDown = function(e) {
		if ( e.button === 1 ) {
			return;
		}

		if ( menu && menu.contains(e.target) ) {
			return;
		}

		// Try not to interfere with mouse gesture scripts
		// Can't reproduce it in latest versions, so disable for now
		/*if ( e.button !== 2 ) {
			// Firefox selects the image even with-moz-user-select: none
			// so we prevent mousedown
			pdsp(e, e.button === 0 && e.target !== media);
		}*/

		// Placed after the Firefox selection workaround
		if ( !cfg.clickOverDoc && e.target !== media ) {
			return;
		}

		if ( vAPI.mediaType === 'video' ) {
			if ( vAPI.fullScreenElement === media ) {
				return;
			}

			if ( !e.shiftKey ) {
				var topPart = media.clientHeight;
				topPart = Math.min(topPart - 40, topPart / 2);

				if ( e.offsetY > topPart ) {
					return;
				}
			}
		}

		if ( e.ctrlKey || e.altKey ) {
			media.ondragstart = null;
			return;
		}

		if ( e.button === 0 && media.mode <= MODE_HEIGHT || e.button === 2 ) {
			if ( e.button === 2 ) {
				sX = true;
			} else {
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
				pdsp(e);
				media.box = media.getBoundingClientRect();
				freeZoom = {
					counter: 0,
					left: Math.max(0, media.box.left),
					top: Math.max(0, media.box.top)
				};

				freeZoom.startX = e.clientX - freeZoom.left;
				freeZoom.startY = e.clientY - freeZoom.top;

				if ( !media.mask ) {
					media.mask = doc.createElement('canvas');
					media.mask.className = 'mask';
					media.mask.style.cssText = [
						'display: block',
						'position: fixed'
					].join(';');
					media.mctx = media.mask.getContext('2d');
				}

				doc.addEventListener('mousemove', drawMask);
				media.mask.width = Math.min(winW, media.box.width);
				media.mask.height = Math.min(winH, media.box.height);
				media.mask.style.left = freeZoom.left + 'px';
				media.mask.style.top = freeZoom.top + 'px';

				doc.body.appendChild(media.mask);

				var maskColor = win.getComputedStyle(media.mask).color;
				media.mctx.fillStyle = !maskColor || maskColor === 'rgb(0, 0, 0)'
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
	};

	var onMouseUp = function(e) {
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

			if ( w <= 0 || h <= 0 ) {
				return;
			}

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

		if ( menu && cfg.clickOverDoc && menu.contains(e.target) ) {
			return;
		}

		if ( !cfg.clickOverDoc && e.target !== media
			|| lastEvent.button === null ) {
			return;
		}

		if ( e.clientX !== lastEvent.clientX
			|| e.clientY !== lastEvent.clientY ) {
			return;
		}

		if ( media.mode < MODE_WIDTH && noFit.real ) {
			if ( media.mode === MODE_CUSTOM
				&& mWidth !== Math.round(mOrigWidth) ) {
				resizeMedia(MODE_ORIG);
			} else if ( (media.mode === MODE_FIT || media.mode === MODE_ORIG)
				&& (media.box.width === winW || media.box.height === winH) ) {
				if ( mFullWidth === winW || mFullHeight === winH ) {
					lastEvent.clientX = e.clientX;
					lastEvent.clientY = e.clientY;
					longpressHandler(1);
				} else {
					resizeMedia(MODE_ORIG);
				}
			} else {
				resizeMedia(
					MODE_FIT,
					mWidth === Math.round(mOrigWidth)
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
	};

	var onKeyDown = function(e) {
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
			zoomToCenter({
				deltaY: key === '+' ? -1 : 1,
				altKey: e.altKey,
				shiftKey: e.shiftKey
			});
			return;
		}

		if ( e.altKey ) {
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
			case cfg.key_mFill:
				resizeMedia(
					media.box.width / media.box.height < winW / winH
						? MODE_WIDTH
						: MODE_HEIGHT
				);
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

				if ( ir === vAPI.browser.irPixelated
					|| ir === vAPI.browser.irPixelated.replace(/^-(moz|webkit|ms)-/) ) {
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
	};

	var onWinResize = function() {
		media.removeAttribute('class');
		media.removeAttribute('width');
		media.removeAttribute('height');
		resizeMedia(media.mode);
	};

	var startFrameExtractor = function(params) {
		if ( !params ) {
			var hashParams = win.location.hash.slice(1).split(';');

			if ( !hashParams[0] ) {
				return;
			}

			var hasParams = false;
			var validKeys = {frm: 'initialFrame', full: 'fullFrames'};
			params = {};

			for ( var i = 0; i < hashParams.length; ++i ) {
				var param = hashParams[i].split(':');

				if ( validKeys[param[0]] ) {
					params[validKeys[param[0]]] = param[1];
					hasParams = true;
				}
			}

			if ( !hasParams ) {
				return;
			}

			params.initFromHash = true;
		}

		var message = {cmd: 'loadFile', path: 'js/frames.js'};
		var onFrameEvent = function(ev) {
			this.removeEventListener(ev.type, onFrameEvent);

			// Error if detail is not null
			if ( ev.detail !== null ) {
				// eslint-disable-next-line no-alert

				if ( !params.initFromHash ) {
					alert(ev.detail);
				}

				var item = menu.querySelector('li[data-cmd="frames"]');
				item.parentNode.removeChild(item);
				return;
			}

			win.removeEventListener('resize', onWinResize);
			doc.removeEventListener('mousedown', onMouseDown, true);
			doc.removeEventListener('mouseup', onMouseUp, true);
			doc.removeEventListener('contextmenu', onContextMenu, true);
			doc.removeEventListener('keydown', onKeyDown, true);

			if ( menu && menu.parentNode ) {
				menu.parentNode.removeChild(menu);
			}
		};

		var loadExtractorScript = function(data, url) {
			doc.addEventListener('extractor-event', onFrameEvent);
			doc.body.dataset.wheelEventName = vAPI.browser.wheel;
			doc.body.dataset.params = JSON.stringify(params);

			if ( vAPI.isDataUrl ) {
				doc.body.dataset.isDataUrl = '1';
			}

			var frames = doc.createElement('script');
			frames[url ? 'src' : 'textContent'] = data;
			doc.body.removeChild(doc.body.appendChild(frames));
		};

		if ( vAPI.isDataUrl ) {
			loadExtractorScript(message.path, true);
			return;
		}

		vAPI.messaging.send(message, loadExtractorScript);
		startFrameExtractor = function() {};
	};

	win.addEventListener('resize', onWinResize);
	doc.addEventListener(vAPI.browser.wheel, onWheel, {
		passive: false,
		capture: true
	});
	doc.addEventListener('mousedown', onMouseDown, true);
	doc.addEventListener('mouseup', onMouseUp, true);
	doc.addEventListener('contextmenu', onContextMenu, true);
	doc.addEventListener('keydown', onKeyDown, true);
	media.addEventListener('dragend', toggleDraggable);

	if ( vAPI.mediaType === 'video' ) {
		media.addEventListener('qualityChanged', function() {
			setTimeout(function() {
				setOriginalDimensions();
				resizeMedia(media.mode);
			}, 100);

			if ( !menu ) {
				return;
			}

			var active = menu.querySelector(
				'.quality-picker .active-quality'
			);

			if ( active ) {
				active.classList.remove('active-quality');
			}

			active = menu.querySelector(
				'.quality-picker li[data-index="' + media.getQuality() + '"]'
			).classList.add('active-quality');
		});

		media.addEventListener('click', function(e) {
			if ( e.button !== 0 ) {
				return;
			}

			if ( e.offsetY > media.clientHeight - 40 ) {
				return;
			}

			if ( vAPI.fullScreenElement === this
				|| e.offsetY > media.clientHeight / 2 ) {
				media.togglePlay();
			}

			pdsp(e);
		});

		media.addEventListener('dblclick', function(e) {
			if ( e.offsetY < media.clientHeight / 2 ) {
				pdsp(e);
			}
		});
	}

	calcViewportDimensions();
	setOriginalDimensions();
	media.angle = 0;
	calcFit();

	var doUpscale = [];

	if ( vAPI.mediaType === 'img' && cfg.minUpscale ) {
		if ( mOrigWidth >= winW * cfg.minUpscale / 100 ) {
			doUpscale[0] = true;
		}

		if ( mOrigHeight >= winH * cfg.minUpscale / 100 ) {
			doUpscale[1] = true;
		}
	}

	// cfg.mode values: 0 - natural size; 1 - contain; 2 - best fit (fill)
	if ( cfg.mode === 2 ) {
		if ( mOrigWidth / mOrigHeight < winW / winH ) {
			media.mode = MODE_WIDTH;

			if ( mOrigWidth < winW && !doUpscale[0] ) {
				media.mode = noFit.real && doUpscale[1] ? MODE_FIT : MODE_ORIG;
			}
		} else {
			media.mode = MODE_HEIGHT;

			if ( mOrigHeight < winH && !doUpscale[1] ) {
				media.mode = noFit.real && doUpscale[0] ? MODE_FIT : MODE_ORIG;
			}
		}
	} else {
		media.mode = cfg.mode === 0 ? MODE_ORIG : MODE_FIT;
	}

	resizeMedia(
		media.mode,
		(media.mode === MODE_FIT || media.mode === MODE_ORIG && noFit.real)
			&& doUpscale.length
			? mOrigWidth / mOrigHeight > winW / winH
				? winW
				: winH * mOrigWidth / mOrigHeight
			: void 0
	);

	if ( doc.readyState === 'loading' ) {
		(function() {
			var scrollX = 0;
			var scrollY = 0;

			// Chrome 56+ overwrites the style attribute on image load
			var rememberScrollPosition = function() {
				scrollX = win.pageXOffset;
				scrollY = win.pageYOffset;
			};

			var onLoad = function(ev) {
				this.removeEventListener(ev.type, onLoad);
				media.removeAttribute('class');
				media.removeAttribute('width');
				media.removeAttribute('height');

				if ( !vAPI.chrome ) {
					return;
				}

				win.removeEventListener('scroll', rememberScrollPosition);
				resizeMedia(media.mode, parseFloat(mediaCss.width));
				setTimeout(function() {
					win.scrollTo(scrollX, scrollY);
				}, 0xf);
			};

			doc.addEventListener('DOMContentLoaded', onLoad);

			if ( vAPI.chrome ) {
				win.addEventListener('scroll', rememberScrollPosition);
			}
		})();
	}

	menu = root.appendChild(doc.createElement('div'));
	menu.id = 'menu';

	menu.style.cssText = '-webkit-filter: blur(0px); filter: blur(0px);';

	if ( menu.style.filter || menu.style.webkitFilter ) {
		vAPI.browser.filter = menu.style.filter ? 'filter' : '-webkit-filter';
	}

	var menuStyle = win.getComputedStyle(menu);

	switch ( menuStyle.display ) {
		case 'none':
			menu.parentNode.removeChild(menu);
			menu = null;
			toggleWheelZoom(true);
			return;

		case 'block':
			menu.classList.add('permanent');
			break;

		default:
			menu.style.display = 'block';
			break;
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
			media.filters[filterName] = t.value + (t.getAttribute('unit') || '%');
			t.title = media.filters[filterName];
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
		{tag: 'li', attrs: {'data-cmd': 'cycle'}},
		{tag: 'li', attrs: {'data-cmd': 'zoom'}},
		{tag: 'li', attrs: {'data-cmd': 'flip'}},
		{tag: 'li', attrs: {'data-cmd': 'rotate'}},
		media.filters ? {tag: 'li', attrs: {class: 'filters', 'data-cmd': 'filters'}, nodes: [
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
							title: '100%'
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
							title: '100%'
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
							title: '100%'
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
							title: '0%'
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
							title: '0%'
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
							title: '0%'
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
							unit: 'deg',
							title: '0deg'
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
							unit: 'px',
							title: '0px'
						}
					},
					' blur'
				]}
			]}]}
		]} : '',
		{tag: 'li', attrs: {'data-cmd': 'reset'}},
		/^https?:$/.test(win.location.protocol) && cfg.sendToHosts.length
			? {
				tag: 'li',
				attrs: {class: 'send-hosts', 'data-cmd': 'send-hosts'},
				nodes: [{
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
		vAPI.mediaType === 'img' && !vAPI.extraFormat
			? {tag: 'li', attrs: {'data-cmd': 'frames'}}
			: null,
		media._qualityList && media._qualityList.length > 1
			? {
				tag: 'li',
				attrs: {class: 'quality-picker', 'data-svg-icon': 'frames'},
				nodes: [{
					tag: 'ul',
					nodes: media._qualityList.map(function(item) {
						return {
							tag: 'li',
							attrs: {
								'data-index': item.index,
								'data-cmd': 'quality'
							},
							text: item.name
						};
					})
				}]
			}
			: null,
		vAPI.extraFormat
			? {tag: 'li', attrs: {
				'data-cmd': 'direct-view'
			}}
			: null,
		{tag: 'li', attrs: {'data-cmd': 'options'}}
	]);

	toggleWheelZoom(true);

	menu.direction = win.getComputedStyle(menu.firstElementChild)
		.flexDirection.lastIndexOf('column', 0)
		? 'horizontal'
		: 'vertical';

	menu.animProperty = menu.direction === 'vertical'
		? menuStyle.left === '0px' ? 'left' : 'right'
		: menuStyle.top === '0px' ? 'top' : 'bottom';

	menu.classList.add(menu.direction);
	menu.classList.add(menuStyle.left === '0px' ? 'left' : 'right');
	menu.classList.add(menuStyle.top === '0px' ? 'top' : 'bottom');
	menu.isLeft = menu.classList.contains('left');
	menu.isTop = menu.classList.contains('top');
	menu.width = menu.offsetWidth;
	menu.height = menu.offsetHeight;

	if ( !menu.classList.contains('permanent') ) {
		menu.style.cssText = 'display: none;'
			+ menu.animProperty + ': -'
			+ (menu.direction === 'vertical' ? menu.width : menu.height) + 'px';
	}

	menu.addEventListener('mousedown', function(e) {
		var t = e.target;
		var href = t.href;

		if ( href && href.indexOf('%') !== -1 ) {
			t.href = href
				.replace('%raw_url', media.src)
				.replace('%url', encodeURIComponent(media.src));
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
				host = host && host.match(/^[^/]*(\/\/[^/]+)/);

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
			zoomToCenter({
				deltaY: p ? 1 : -1,
				altKey: e.altKey,
				shiftKey: e.shiftKey
			});
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
		} else if ( cmd === 'direct-view' ) {
			win.location.href = vAPI.extraFormatUrl + '#' + cmd;
		} else if ( cmd === 'frames' ) {
			startFrameExtractor({fullFrames: e.button === 0});
		} else if ( cmd === 'quality' ) {
			if ( e.button === 0 && e.target.dataset.index ) {
				media.setQuality(e.target.dataset.index | 0);
			}
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
		var trg = e.target;
		// trg is a SVG element in Opera Presto
		var cmd = trg.dataset && trg.dataset.cmd || trg.parentNode.dataset.cmd;

		if ( cmd ) {
			handleCommand(cmd, e);
			// Opera loses focus after clicking on SVGs?
			win.focus();
		}
	};

	var loadMenuIcons = function() {
		if ( menu.iconsLoaded ) {
			return;
		}

		menu.iconsLoaded = true;

		vAPI.messaging.send({
			cmd: 'loadFile',
			path: 'css/menu_icons.svg'
		}, function(svg) {
			vAPI.insertHTML(menu, svg);

			var item;
			var items = menu.querySelectorAll('#menu > ul > li');
			var i = items.length;
			var ns = 'http://www.w3.org/2000/svg';
			var svgIcon = doc.createElementNS(ns, 'svg');
			svgIcon.appendChild(doc.createElementNS(ns, 'use'));

			while ( item = items[--i] ) {
				item.insertBefore(
					svgIcon.cloneNode(true),
					item.firstChild
				).firstChild.setAttributeNS(
					'http://www.w3.org/1999/xlink',
					'href',
					'#icon-' + (item.dataset.svgIcon || item.dataset.cmd)
				);
			}
		});
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

	if ( menu.classList.contains('permanent') ) {
		loadMenuIcons();
		return;
	}

	var menuTrigger = function(e) {
		if ( panning || freeZoom || e.shiftKey ) {
			return;
		}

		var left = 0;
		var right = menu.width;
		var top = 0;
		var bottom = menu.height;
		var mta = cfg.menuTriggerArea;

		if ( Array.isArray(mta) ) {
			if ( mta[0] ) {
				var xw = typeof mta[0] === 'string'
					? parseFloat(mta[0]) * winW / 100
					: mta[0];

				if ( menu.isLeft ) {
					right = xw;
				} else {
					left = winW - xw;
					right = winW;
				}
			}

			if ( mta[1] ) {
				var yh = typeof mta[1] === 'string'
					? parseFloat(mta[1]) * winH / 100
					: mta[1];

				if ( menu.isTop ) {
					bottom = yh;
				} else {
					top = winH - yh;
					bottom = winH;
				}
			}
		} else {
			if ( !menu.isLeft ) {
				left = winW - menu.width;
				right = winW;
			}

			if ( !menu.isTop ) {
				top = winH - menu.height;
				bottom = winH;
			}
		}

		if ( right < e.clientX || bottom < e.clientY
			|| top > e.clientY || left > e.clientX ) {
			return;
		}

		if ( menu.style.display === 'block' ) {
			return;
		}

		menu.style.display = 'block';
		doc.removeEventListener('mousemove', menuTrigger);

		setTimeout(function() {
			menu.style[menu.animProperty] = '0';
			menu.style.opacity = '1';
		}, 50);

		loadMenuIcons();
	};

	menu.addEventListener('mouseenter', function() {
		if ( !this.hideTimer ) {
			return;
		}

		clearTimeout(this.hideTimer);
		this.hideTimer = null;
		this.style[menu.animProperty] = '0';
		this.style.opacity = '1';
	});

	menu.addEventListener('mouseleave', function() {
		this.hideTimer = setTimeout(function() {
			doc.addEventListener('mousemove', menuTrigger);
			menu.hideTimer = null;
			menu.style[menu.animProperty] = '-'
				+ (menu.direction === 'vertical'
					? menu.offsetWidth
					: menu.offsetHeight)
				+ 'px';
			menu.style.opacity = '0';
		}, 800);
	});

	menu.addEventListener(vAPI.browser.transitionend, function(e) {
		if ( e.propertyName === menu.animProperty
			&& this.style[menu.animProperty][0] === '-' ) {
			this.style.display = 'none';
		}
	});

	// Safari showed the menu even if the cursor wasn't at the edge
	setTimeout(function() {
		doc.addEventListener('mousemove', menuTrigger);
		startFrameExtractor();
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
	media.id = 'media';

	if ( vAPI.extraFormat ) {
		win.location.href = vAPI.extraFormatUrl + '#direct-view';
	}
});

if ( win.location.protocol === 'data:' ) {
	media.alt = 'data:' + vAPI.mediaType;

	if ( !cfg.mediaInfo ) {
		doc.title = media.alt;
	}
} else {
	media.alt = ((vAPI.extraFormatUrl || win.location.href)
		.replace(/#.*/, '')
		.match(/(?:[^/]+)?$/)[0] || vAPI.mediaType
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
	doc.title = 'data:' + vAPI.mediaType;
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

if ( window.location.protocol === 'safari-extension:' ) {
	init = null;
	vAPI.suicideAttempt();
	return;
}

var firstContact = function() {
	if ( /(-extension|^chrome):$/.test(window.location.protocol)
		&& /\/viewer\.html$/.test(window.location.pathname) ) {
		vAPI.isDataUrl = window.location.hash.startsWith('#data:');

		if ( !vAPI.isDataUrl ) {
			vAPI.extraFormat = window.location.hash.match(
				/#(svg|dash|hls|mss):(http.+)/
			);

			if ( vAPI.extraFormat ) {
				vAPI.extraFormatUrl = vAPI.extraFormat[2];
				vAPI.extraFormat = vAPI.extraFormat[1];
			}
		}

		if ( vAPI.isDataUrl ) {
			var type = window.location.hash.match(
				/^#data:([a-z]+)/i
			)[1].toLowerCase();
			vAPI._mediaType = type === 'image' ? 'img' : type;
		} else if ( vAPI.extraFormat === 'svg' ) {
			vAPI._mediaType = 'img';
		} else if ( vAPI.extraFormat ) {
			vAPI._mediaType = 'video';
		}
	} else if ( window.location.protocol === 'data:' ) {
		vAPI.isDataUrl = true;
	}

	var onPrefsReady = function(response) {
		onPrefsReady = null;
		firstContact = null;

		if ( !document || !document.body || !response || !response.prefs
			|| !response.prefs.viewDataURI
				&& window.location.protocol === 'data:' ) {
			init = null;
			vAPI.suicideAttempt();
			return;
		}

		init(window, document, response);
	};

	if ( vAPI.opera || vAPI.firefox ) {
		if ( vAPI.mediaType ) {
			vAPI.messaging.send({cmd: 'loadPrefs'}, onPrefsReady);
			return;
		}

		init = null;
		firstContact = null;
		vAPI.suicideAttempt();
		return;
	}

	vAPI.messaging.send({cmd: 'loadPrefs'}, function(response) {
		if ( vAPI.mediaType ) {
			onPrefsReady(response);
			return;
		}

		init = null;
		firstContact = null;
		vAPI.suicideAttempt();
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
