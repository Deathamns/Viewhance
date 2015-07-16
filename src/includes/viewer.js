'use strict';

var init = function(win, doc, response) {

if ( !doc || !doc.body || !response || !response.prefs ) {
	init = null;
	return;
}

var cfg = response.prefs;
var media = doc.body.querySelector('img, video');

if ( !media ) {
	init = null;
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
		106: '*', 107: '+', 109: '-', 110: '.', 111: '/',
		186: ';', 187: '=', 188: ',', 189: '-', 190: '.',
		191: '/', 192: '`', 219: '[', 220: '\\', 221: ']', 222: "'",
		112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
		118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12'
	},

	isModifier: function(e) {
		return e.which > 15 && e.which < 19;
	},

	key: function(e) {
		return this.specKeys[e.which] || String.fromCharCode(e.which).toUpperCase();
	}
};

var root, head, initParams, panning, winW, winH, sX, sY;
var noFit = {cur: false, real: false};
var lastEvent = {};
var progress = null;
var cancelAction = false;
var freeZoom = null;
var dragSlide = [];
var borderSize = 0;
var MAXSIZE = 0x7fff;

['class', 'style', 'name'].forEach(function(attr) {
	doc.documentElement.removeAttribute(attr);
	doc.body.removeAttribute(attr);
	media.removeAttribute(attr);
});

media.style.display = 'none';

if ( head = doc.querySelector('head') ) {
	doc.documentElement.removeChild(head);
}

head = doc.createElement('head');

if ( cfg.favicon ) {
	root = doc.createElement('link');
	root.rel = 'shortcut icon';
	root.href = cfg.favicon === '%url' && vAPI.mediaType === 'img'
		? win.location.href
		: cfg.favicon.replace('%url', encodeURIComponent(win.location.href));
	head.appendChild(root);
}

head.appendChild(doc.createElement('style')).textContent = [
	'html, body {',
		'width: 100%;',
		'height: 100%;',
		'-webkit-user-select: none;',
		'-moz-user-select: none;',
		'-ms-user-select: none;',
	'}',
	'body {',
		'margin: 0;',
		'padding: 0;',
		'font: 12px "Trebuchet MS", sans-serif;',
		'cursor: default;',
	'}',
	'#main-media {',
		vAPI.browser['box-sizing-css'], ': border-box;',
		'position: absolute;',
		'margin: 0;',
		'background-clip: padding-box;',
	'}',
	'html.audio #main-media {',
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
	'html.load-failed #main-media {',
		'margin: auto',
		'box-shadow: 0 0 10px red;',
	'}',
	'html.fullscreen #main-media {',
		'background: black !important;',
	'}',
	'#main-media:-moz-full-screen {',
		'background: black !important;',
	'}',
	'html.load-failed > body > h2 {',
		'text-shadow: 1px 1px 15px firebrick;',
	'}',
	'#main-media.m-1 {',
		'width: auto;',
		'height: auto;',
		'max-width: 100%;',
		'max-height: 100%;',
	'}',
	'#main-media.m-2 {',
		'width: 100%;',
		'height:auto;',
	'}',
	'#main-media.m-3 {',
		'height: 100%;',
		'width: auto;',
	'}',
	'h2 {',
		'margin: 0;',
		'padding-top: 15%;',
		'text-align: center;',
		'text-shadow: 1px 1px 15px #000;',
		'font: 700 30px "Trebuchet MS", sans-serif;',
		'color: #fff;',
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
		vAPI.browser['transition-css'], ': opacity .25s, left .2s;',
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
		'display: block;',
		'position: relative;',
	'}',
	'li[data-cmd] {',
		'cursor: pointer;',
	'}',
	'li[data-cmd=cycle], li[data-cmd=rotate] {',
		'position: relative;',
	'}',
	'li[data-cmd=cycle]::after {',
		'position: absolute;',
		'left: 25%;',
		'content: "\u2195";',
	'}',
	'li[data-cmd=rotate]::after {',
		'position: absolute;',
		'left: 2px;',
		'content: "\u21BB";',
	'}',
	'li ul {',
		'visibility: hidden;',
		'position: absolute;',
		'left: 100%;',
		'top: 0;',
		'text-align: left;',
		'opacity: 0;',
		vAPI.browser['transition-css'], ': visibility .4s, opacity .2s .3s;',
	'}',
	'li:hover ul {',
		'display: block;',
		'visibility: visible;',
		'opacity: 1;',
	'}',
	'li ul > li {',
		'display: block !important;',
		'padding: 3px 0;',
		'font-size: 15px;',
	'}',
	'.send-hosts li > a {',
		'padding-left: 25px;',
		'background-size: 16px 16px;',
		'background-repeat: no-repeat;',
		'background-position: 0 3px;',
		'color: #fff;',
	'}',
	'#menu > ul > li:hover, .send-hosts li > a:hover {',
		'color: silver;',
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
	// Custom or default styling
	cfg.customCSS || 'body {background: silver; overflow: hidden;}' +
		'#main-media {background: white; box-shadow: 0 0 5px grey;}'
].join('');
doc.documentElement.insertBefore(head, doc.body);

init = function() {
	if ( !(media.naturalWidth || media.width || media.videoWidth
		|| vAPI.mediaType === 'audio' || initParams === null) ) {
		if ( initParams && ++initParams.loop >= initParams.maxLoop && progress ) {
			clearInterval(progress);
		}

		return;
	}

	if ( progress ) {
		clearInterval(progress);
		progress = null;
	}

	root.classList.add(vAPI.mediaType);

	if ( vAPI.mediaType === 'img' ) {
		doc.body.replaceChild(media, doc.images[0]);
	} else if ( vAPI.mediaType === 'video' ) {
		media.naturalWidth = media.videoWidth;
		media.naturalHeight = media.videoHeight;
	}

	[].forEach.call(doc.body.childNodes, function(node) {
		if ( media !== node ) {
			node.parentNode.removeChild(node);
		}
	});

	media.style.display = 'block';

	if ( vAPI.mediaType === 'audio' ) {
		return;
	}

	head.appendChild(doc.createElement('style')).textContent =
		'#main-media {max-width:' +
			Math.min(
				MAXSIZE,
				Math.floor(media.naturalWidth * MAXSIZE / media.naturalHeight)
			) +
			'px;max-height:' +
			Math.min(
				MAXSIZE,
				Math.floor(media.naturalHeight * MAXSIZE / media.naturalWidth)
			) + 'px}';

	if ( !cfg.mediaInfo ) {
		cfg.mediaInfo = false;
	}

	cfg.hiddenScrollbars = win.getComputedStyle(root).overflow === 'hidden'
		|| win.getComputedStyle(doc.body).overflow === 'hidden';

	var menu = doc.body.appendChild(doc.createElement('div'));
	menu.id = 'menu';

	if ( win.getComputedStyle(menu).display === 'none' ) {
		doc.body.removeChild(menu);
		menu = null;
	} else {
		menu.style.cssText = '-webkit-filter: blur(0px); filter: blur(0px)';

		if ( menu.style.filter || menu.style.webkitFilter ) {
			var onMenuChange = function(e) {
				var t = e.target;
				var filterCSS = '';
				var filterName;

				if ( !t.value ) {
					media.style.filter = media.style.webkitFilter = filterCSS;
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

				media.style.filter = media.style.webkitFilter = filterCSS;
			};

			media.filters = Object.create(null);
			menu.addEventListener('change', onMenuChange);
		}

		vAPI.buildNodes(menu.appendChild(doc.createElement('ul')), [
			{tag: 'li', attrs: {'data-cmd': 'cycle'}, text: '\u2194'},
			{tag: 'li', attrs: {'data-cmd': 'zoom'}, nodes: [
				{tag: 'span', attrs: {style: 'visibility: hidden'}, text: '.'},
				{
					tag: 'span',
					attrs: {
						style: [
							'transform: rotate(-45deg)',
							'position: absolute',
							'left: 20%',
							'font-size: 125%'
						].join(';')
					},
					text: '\u26B2'
				}
			]},
			{tag: 'li', attrs: {'data-cmd': 'flip'}, text: '\u21CB'},
			{tag: 'li', attrs: {'data-cmd': 'rotate'}, text: '\u21BA'},
			media.filters ? {tag: 'li', attrs: {'class': 'filters'}, nodes: [
				'\u2261',
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
			{tag: 'li', attrs: {'data-cmd': 'reset'}, text: '\u2715'},
			/^https?:$/.test(win.location.protocol) && cfg.sendTo.length
				? {tag: 'li', attrs: {'class': 'send-hosts'}, nodes: [
					'\u2197', {tag: 'ul', nodes: cfg.sendTo.map(function(item) {
						var host = item.split('|');
						return {tag: 'li', nodes: [{
							tag: 'a', attrs: {
								href: host.slice(1).join('|')
							},
							text: host[0]
						}]};
					})}
				]}
				: null,
			vAPI.mediaType === 'img' ? {tag: 'li', attrs: {'data-cmd': 'frames'}, text: '\u22EF'} : '',
			{tag: 'li', attrs: {'data-cmd': 'options'}, text: '\u2713'}
		]);

		menu.style.cssText = 'display: none; left: -' + menu.offsetWidth + 'px';

		menu.addEventListener('mousedown', function(e) {
			var t = e.target;

			if ( t.href && t.href.indexOf('%', t.host.length) > -1 ) {
				t.href = t.href.replace(/%url/, encodeURIComponent(media.src));
			}

			pdsp(e, !!t.textContent);
		}, false);

		// Load favicons only when the menu item is hovered the first time
		if ( /^https?:$/.test(win.location.protocol) && cfg.sendTo.length ) {
			menu.querySelector('.send-hosts')
				.addEventListener('mouseover', function onHostsHover() {
				var links = this.querySelectorAll('.send-hosts > ul > li > a');

				[].forEach.call(links, function(a) {
					var url = a.getAttribute('data-favicon')
						|| a.host + '/favicon.ico';
					url = a.protocol + '//' + url;
					a.style.backgroundImage = 'url(' + url + ')';
				});
				this.removeEventListener('mouseover', onHostsHover);
			});
		}

		var handleCommand = function(cmd, e) {
			if ( e.button === 1 ) {
				return;
			}

			var p = e.button === 2
				|| e.type.indexOf('wheel') > -1
					&& (-e.wheelDelta || e.deltaY) > 0;

			if ( cmd === 'cycle' ) {
				media.cycle(!p);
			} else if ( cmd === 'flip' ) {
				media.flip(media, p);
			} else if ( cmd === 'rotate' ) {
				media.rotate(!p, e.ctrlKey);
			} else if ( cmd === 'zoom' ) {
				pdsp(e);
				zoomToCenter({wheelDelta: p ? -1 : 1});
			} else if ( cmd === 'reset' && e.button === 0 ) {
				media.reset();
			} else if ( cmd === 'frames' ) {
				vAPI.messaging.send({cmd: 'frames.js'}, function(data) {
					var errorHandler = function(msg) {
						// Success
						if ( msg !== null ) {
							alert(msg); // eslint-disable-line
							var frms = menu.querySelector('li[data-cmd="frames"]');
							frms.removeAttribute('data-cmd');
							frms.style.opacity = '0.2';
							return;
						}

						if ( vAPI.maxthon ) {
							win.addEventListener('mousedown', function(ev) {
								pdsp(ev, false);
							}, true);
						}
					};

					Function(
						'win',
						'drawFullFrame',
						'errorHandler',
						data['frames.js']
					)(win, e.button === 0, errorHandler);
				});
			} else if ( cmd === 'options' && e.button === 0 ) {
				vAPI.messaging.send({cmd: 'open', url: 'options.html'});
			} else {
				p = null;
			}

			if ( p !== null ) {
				pdsp(e);
			}
		};

		var onMenuClick = function(e) {
			var target = e.target;

			if ( !target.hasAttribute('data-cmd') ) {
				target = target.parentNode;
			}

			if ( target.hasAttribute('data-cmd') ) {
				handleCommand(target.getAttribute('data-cmd'), e);
			}
		};

		var menuTrigger = function(e) {
			if ( panning || freeZoom ) {
				return;
			}

			if ( e.clientX > 40 || e.clientY > win.innerHeight / 3 ) {
				return;
			}

			if ( menu.style.display === 'block' ) {
				return;
			}

			menu.style.display = 'block';

			setTimeout(function() {
				menu.style.left = '0';
				menu.style.opacity = '1';
			}, 50);

			doc.removeEventListener('mousemove', menuTrigger, false);
		};

		if ( win.Node.prototype && !win.Node.prototype.contains ) {
			win.Node.prototype.contains = function(n) {
				if ( n instanceof Node === false ) {
					return false;
				}

				return this === n || !!(this.compareDocumentPosition(n) & 16);
			};
		}

		menu.addEventListener(vAPI.browser.wheel, function(e) {
			var t = e.target;

			if ( t.nodeType === 3 ) {
				t = t.parentNode;
			}

			if ( t.type === 'range' ) {
				var delta = (-e.wheelDelta || e.deltaY) > 0 ? -1 : 1;
				t.value = Math.max(
					t.getAttribute('min'),
					Math.min(
						parseInt(t.value, 10) + t.getAttribute('step') * delta,
						t.getAttribute('max')
					)
				);
				onMenuChange(e);
				pdsp(e);
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
				menu.style.display = 'none';
			}
		});

		menu.addEventListener('mouseover', function() {
			if ( !menu.mtimer ) {
				return;
			}

			clearTimeout(menu.mtimer);
			menu.mtimer = null;
			menu.style.left = '0';
			menu.style.opacity = '1';
		});

		menu.addEventListener('mouseout', function(e) {
			if ( this.contains(e.relatedTarget) ) {
				return;
			}

			doc.addEventListener('mousemove', menuTrigger, false);
			menu.mtimer = setTimeout(function() {
				menu.style.left = '-' + menu.offsetWidth + 'px';
				menu.style.opacity = '0';
				menu.mtimer = null;
			}, 800);
		});


		// Safari showed the menu even if the cursor wasn't at the edge
		setTimeout(function() {
			doc.addEventListener('mousemove', menuTrigger, false);
		}, 500);
	}

	var convertInfoParameter = function(a, param) {
		var m = media;

		switch ( param ) {
			case 'w': return m.clientWidth;
			case 'h': return m.clientHeight;
			case 'ow': return m.naturalWidth;
			case 'oh': return m.naturalHeight;
			case 'url': return win.location.href;
			case 'name': return m.alt;
			case 'ratio':
				return Math.round(m.clientWidth / m.clientHeight * 100) / 100;
			case 'perc': return Math.round(m.clientWidth * 100 / m.naturalWidth);
		}
	};

	var afterCalcCallback = function() {
		// Gecko and WebKit/Blink render scrollbars for a split of a second,
		// even if the image fits into the view-port
		winH = doc.compatMode[0] === 'B' ? doc.body : root;
		winW = winH.clientWidth;
		winH = winH.clientHeight;

		var m = media;

		m.calcFit();

		// Change curosr according to sizing
		if ( m.clientWidth > winW || m.clientHeight > winH ) {
			m.style.cursor = 'move';
		} else if ( winH >= m.clientHeight && winW >= m.clientWidth
			&& winH < m.naturalHeight || winW < m.naturalWidth ) {
			m.style.cursor = vAPI.browser['zoom-in'];
		} else if ( noFit.cur && noFit.real
			&& (m.clientHeight < m.naturalHeight
				|| m.clientWidth < m.naturalWidth) ) {
			m.style.cursor = vAPI.browser['zoom-in'];
		} else {
			m.style.cursor = 'default';
		}

		if ( !cfg.mediaInfo || !(m.naturalWidth && m.naturalHeight) ) {
			return;
		}

		doc.title = cfg.mediaInfo.replace(
			/%(o?[wh]|url|name|ratio|perc)/g,
			convertInfoParameter
		);
	};

	var afterCalc = function() {
		if ( !media.calcFit ) {
			return;
		}

		winH = doc.compatMode[0] === 'B' ? doc.body : root;
		winW = winH.clientWidth;
		winH = winH.clientHeight;

		media.setPos();
		setTimeout(afterCalcCallback, 0xf);
	};

	media.resize = function(m, w) {
		var mode = m === void 0 ? 1 : m;

		if ( mode === -1 ) {
			if ( w ) {
				this.style.width = w;
			}
		} else if ( this.mode === -1 ) {
			this.style.width = '';
			this.style.height = '';
		}

		this.mode = mode;
		this.className = 'm-' + mode;

		if ( this.naturalWidth ) {
			afterCalc();
		}
	};

	media.setPos = function() {
		var s = this.style;

		if ( cfg.center ) {
			s.top = Math.max(0, (winH - this.offsetHeight) / 2) + 'px';
			s.left = Math.max(0, (winW - this.offsetWidth) / 2) + 'px';
		} else {
			s.top = s.left = '0';
		}

		var box = this.getBoundingClientRect();
		this.box = box;

		if ( box.left < 0 ) {
			s.left = (parseInt(s.left, 10) - box.left - win.pageXOffset) + 'px';
		}

		if ( box.top < 0 ) {
			s.top = (parseInt(s.top, 10) - box.top - win.pageYOffset) + 'px';
		}
	};

	media.calcFit = function() {
		var box = this.box || this.getBoundingClientRect();

		noFit = {
			cur: box.width <= winW && box.height <= winH,
			real: this.naturalWidth <= winW && this.naturalHeight <= winH
		};
	};

	media.cycle = function(back) {
		var mode = (this.mode === 1 ? 0 : this.mode) - (back ? 1 : -1);

		if ( mode === 1 ) {
			mode -= back ? 1 : -1;
		} else if ( mode < 0 ) {
			mode = 3;
		} else if ( mode > 3 ) {
			mode = 0;
		}

		this.resize(mode);
	};

	media.reset = function() {
		if ( freeZoom ) {
			doc.removeEventListener('mousemove', drawMask, false);
			doc.body.removeChild(media.mask);

			freeZoom = null;
			cancelAction = false;
			return;
		}

		if ( vAPI.mediaType === 'img' && doc.readyState !== 'complete' ) {
			return;
		}

		var filters = doc.body.querySelector('#menu li.filters > form');
		var style = this.style;

		if ( filters ) {
			style.filter = style.webkitFilter = '';
			media.filters = {};
			filters.reset();
		}

		delete this.curdeg;
		delete this.scale;
		style[vAPI.browser.transform] = '';
		style.width = '';
		style.height = '';
		this.resize(0);
	};

	media.flip = function(el, horizontal) {
		if ( !this.scale ) {
			this.scale = {h: 1, v: 1};
		}

		this.scale[horizontal ? 'h' : 'v'] *= -1;

		var transformCss = this.scale.h !== 1 || this.scale.v !== 1
			? 'scale(' + this.scale.h + ',' + this.scale.v + ')'
			: '';

		if ( this.curdeg ) {
			transformCss += ' rotate(' + this.curdeg + 'deg)';
		}

		this.style[vAPI.browser.transform] = transformCss;
	};

	media.rotate = function(deg, fine) {
		var rot;

		if ( !this.curdeg ) {
			this.curdeg = 0;
		}

		if ( deg ) {
			this.curdeg += fine ? 10 : 90;
		} else {
			this.curdeg -= fine ? 10 : 90;
		}

		win.status = this.curdeg + '°';

		rot = 'rotate(' + this.curdeg + 'deg)';

		if ( this.scale ) {
			rot += ' scale(' + this.scale.h + ', ' + this.scale.v + ')';
		}

		this.style[vAPI.browser.transform] = rot;
		this.setPos();
	};

	var wheelZoom = function(e) {
		stopScroll(); // eslint-disable-line
		pdsp(e);

		var w = media.offsetWidth;
		var h = media.offsetHeight;

		if ( (-e.wheelDelta || e.deltaY) > 0 ) {
			media.resize(-1, Math.max(1, w * 0.75) + 'px');
		} else {
			var width = w * (4 / 3);
			media.resize(-1, (width > 10 ? width : width + 3) + 'px');
		}

		if ( !e.keypress && e.target.nodeName.toUpperCase() !== 'IMG' ) {
			return;
		}

		var layerX = e.offsetX || e.layerX || 0;
		var layerY = e.offsetY || e.layerY || 0;

		win.scrollTo(
			layerX * media.offsetWidth / w - e.clientX + borderSize,
			layerY * media.offsetHeight / h - e.clientY + borderSize
		);
	};

	var zoomToCenter = function(e) {
		pdsp(e);
		wheelZoom({
			keypress: true,
			wheelDelta: e.wheelDelta,
			clientX: winW / 2,
			clientY: winH / 2,
			offsetX: win.pageXOffset + media.offsetLeft + winW / 2,
			offsetY: win.pageYOffset + media.offsetTop + winH / 2
		});
	};

	var onContextMenu = function(e) {
		doc.removeEventListener('mousemove', onMove, true); // eslint-disable-line

		if ( progress ) {
			clearTimeout(progress);
			progress = null;
		}

		if ( cancelAction ) {
			cancelAction = false;
			e.preventDefault();
		}
	};

	var onWheel = function(e) {
		if ( media.clientWidth <= winW && media.clientHeight <= winH ) {
			return;
		}

		stopScroll(); // eslint-disable-line

		var x = 0;
		var y = ((-e.wheelDelta || e.deltaY) > 0 ? winH : -winH) / 5;

		if ( media.clientWidth <= winW && media.clientHeight > winH ) {
			if ( !cfg.hiddenScrollbars ) {
				return;
			}
		} else if ( media.clientHeight <= winH && media.clientWidth > winW
			|| e.clientX < winW / 2 && e.clientY > winH - 100 ) {
			x = (y < 0 ? -winW : winW) / 5;
			y = 0;
		} else if ( !cfg.hiddenScrollbars ) {
			return;
		}

		win.scrollBy(x, y);
		pdsp(e);
	};

	var toggleWheelZoom = function(keepCfg) {
		var evName = vAPI.browser.wheel;
		var zoomMenuItemStyle = menu.querySelector('li[data-cmd=zoom]').style;

		if ( cfg.wheelZoom ) {
			doc.removeEventListener(evName, onWheel, false);
			doc.addEventListener(evName, wheelZoom, false);
			zoomMenuItemStyle.display = 'none';
		} else {
			doc.removeEventListener(evName, wheelZoom, false);
			doc.addEventListener(evName, onWheel, false);
			zoomMenuItemStyle.display = '';
		}

		if ( !keepCfg ) {
			cfg.wheelZoom = !cfg.wheelZoom;
		}
	};

	var lastMoveX, lastMoveY;

	var onMoveFrame = function() {
		win.scrollBy(sX - lastMoveX, sY - lastMoveY);
		sX = lastMoveX;
		sY = lastMoveY;
		panning = null;
	};

	var onMove = function(e) {
		lastMoveX = e.clientX;
		lastMoveY = e.clientY;

		if ( lastMoveX === lastEvent.clientX && lastMoveY === lastEvent.clientY ) {
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
				panning = win.requestAnimationFrame(onMoveFrame);
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

		media.dragSlideTime = Date.now();
	};

	var startScroll = function() {
		progress = setInterval(function() {
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

			var atRight = root.scrollWidth - win.pageXOffset === winW;
			var atBottom = root.scrollHeight - win.pageYOffset === winH;

			if ( !(dragSlide[0] && dragSlide[1])
				|| !win.pageYOffset && !win.pageXOffset
				|| !win.pageYOffset && atRight
				|| atBottom && !win.pageXOffset
				|| atBottom && atRight ) {
				stopScroll();
			}
		}, 25);
	};

	var stopScroll = function(e) {
		if ( e ) {
			doc.removeEventListener(e.type, stopScroll);
		}

		if ( !dragSlide.length ) {
			return;
		}

		clearInterval(progress);
		progress = null;
		cancelAction = false;
		dragSlide.length = 0;
		media.dragSlideTime = false;
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
			freeZoom.X += rx;
			freeZoom.Y += ry;
		} else {
			if ( freeZoom.prevX ) {
				delete freeZoom.prevX;
				delete freeZoom.prevY;
			}

			freeZoom.w = Math.abs(freeZoom.X - x);
			freeZoom.h = Math.abs(freeZoom.Y - y);
			freeZoom.x = freeZoom.X < x ? freeZoom.X : freeZoom.X - freeZoom.w;
			freeZoom.y = freeZoom.Y < y ? freeZoom.Y : freeZoom.Y - freeZoom.h;
		}

		media.mctx.clearRect(0, 0, media.mask.width, media.mask.height);
		media.mctx.fillRect(0, 0, media.mask.width, media.mask.height);
		media.mctx.clearRect(freeZoom.x, freeZoom.y, freeZoom.w, freeZoom.h);
	};

	var longpressHandler = function() {
		cancelAction = true;
		progress = null;

		var action = cfg[lastEvent.button === 2 ? 'lpRight' : 'lpLeft'];

		if ( action === 1 ) {
			var x, y;
			var b = doc.body;

			if ( media.mode === 2 || media.clientWidth === b.clientWidth
				|| b.clientHeight > media.clientHeight && winW < b.clientWidth ) {
				x = media.clientWidth;
				media.resize(3);
				x = lastEvent.layerX * media.clientWidth / x - winW / 2;
				y = 0;
			} else {
				y = media.clientHeight;
				media.resize(2);
				x = 0;
				y = lastEvent.layerY * media.clientHeight / y - winH / 2;
			}

			win.scrollTo(x, y);
		} else if ( action === 2 ) {
			toggleWheelZoom();
		}
	};

	media.addEventListener('mousedown', function(e) {
		pdsp(e, false);

		if ( e.button === 1 || e.ctrlKey || e.altKey ) {
			return;
		}

		if ( vAPI.fullScreenElement === media && vAPI.mediaType === 'video' ) {
			return;
		}

		if ( !e.shiftKey && vAPI.mediaType === 'video' ) {
			var topPart = Math.min(
				this.clientHeight - 40,
				this.clientHeight / 2
			);

			if ( (e.offsetY || e.layerY || 0) > topPart ) {
				return;
			}
		}

		if ( e.button === 0 && this.mode < 4 || e.button === 2 ) {
			if ( e.button === 2 ) {
				sX = true;
			} else {
				if ( !e.shiftKey && noFit.cur && this.clientWidth >= 60 ) {
					if ( this.clientWidth - (e.offsetX || e.layerX || 0) <= 30 ) {
						lastEvent.clientX = e.clientX;
						lastEvent.clientY = e.clientY;
						return;
					}
				}

				e.preventDefault();

				win.focus();
				sX = e.clientX;
				sY = e.clientY;
			}

			if ( !e.shiftKey ) {
				doc.addEventListener('mousemove', onMove, true);
			}
		}

		if ( !cfg.lpDelay ) {
			return;
		}

		// For fine move and free zoom
		if ( e.shiftKey ) {
			cancelAction = true;

			if ( e.button === 0 ) {
				freeZoom = {
					counter: 0,
					left: parseInt(this.style.left, 10),
					top: parseInt(this.style.top, 10)
				};

				freeZoom.X = e.clientX - freeZoom.left;
				freeZoom.Y = e.clientY - freeZoom.top;

				if ( !this.mask ) {
					this.mask = doc.createElement('canvas');
					this.mask.className = 'mask';
					this.mask.style.cssText = [
						'display: block',
						'position: fixed',
						'left: 0',
						'top: 0'
					].join(';');
					this.mctx = this.mask.getContext('2d');
				}

				doc.addEventListener('mousemove', drawMask, false);

				var h = !!(this.curdeg && Math.sin(this.curdeg));
				var w = h ? this.offsetHeight : this.offsetWidth;
				h = h ? this.offsetWidth : this.offsetHeight;
				this.mask.width = Math.min(winW, w);
				this.mask.height = Math.min(winH, h);

				this.mask.style.left = this.style.left;
				this.mask.style.top = this.style.top;

				this.mctx.clearRect(0, 0, this.mask.width, this.mask.height);
				doc.body.appendChild(this.mask);

				w = win.getComputedStyle(this.mask).color;
				this.mctx.fillStyle = !w || w === 'rgb(0, 0, 0)'
					? 'rgba(0,0,0,.4)'
					: w;
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

		if ( e.shiftKey || e.button === 0 && !cfg.lpLeft
			|| e.button === 2 && !cfg.lpRight ) {
			return;
		}

		lastEvent.clientX = e.clientX;
		lastEvent.clientY = e.clientY;
		lastEvent.layerX = e.offsetX || e.layerX || 0;
		lastEvent.layerY = e.offsetY || e.layerY || 0;
		lastEvent.button = e.button;

		progress = setTimeout(longpressHandler, cfg.lpDelay);
	}, true);

	doc.addEventListener('mouseup', function(e) {
		if ( e.button !== 0 ) {
			return;
		}

		if ( vAPI.fullScreenElement === media && vAPI.mediaType === 'video' ) {
			return;
		}

		var x, y;

		if ( media.mode < 4 ) {
			doc.removeEventListener('mousemove', onMove, true);

			if ( freeZoom ) {
				doc.removeEventListener('mousemove', drawMask, false);
				doc.body.removeChild(media.mask);

				var w = Math.min(
					media.clientWidth,
					freeZoom.w + Math.min(freeZoom.x, 0)
						+ (freeZoom.x + freeZoom.w > media.mask.width
							? media.mask.width - freeZoom.x - freeZoom.w
							: 0)
				);

				var h = Math.min(
					media.clientHeight,
					freeZoom.h + Math.min(freeZoom.y, 0)
						+ (freeZoom.y + freeZoom.h > media.mask.height
							? media.mask.height - freeZoom.y - freeZoom.h
							: 0)
				);

				x = Math.max(0, freeZoom.x);
				y = Math.max(0, freeZoom.y);

				freeZoom = null;
				cancelAction = false;

				if ( !w || !h ) {
					return;
				}

				if ( x >= media.clientWidth || y >= media.clientHeight ) {
					return;
				}

				var nimgw, nimgh;
				var scrollbars = win.innerWidth - winW || win.innerHeight - winH;
				var fitW = winW < w * winH / h;

				fitW = e.ctrlKey ? !fitW : fitW;

				if ( fitW ) {
					nimgw = media.clientWidth * winW / w;
					nimgh = nimgw * media.clientHeight / media.clientWidth;
				} else {
					nimgh = media.clientHeight * winH / h;
					nimgw = nimgh * media.clientWidth / media.clientHeight;
				}

				if ( nimgw > MAXSIZE ) {
					nimgw = MAXSIZE;
					nimgh = media.clientHeight * MAXSIZE / media.clientWidth;
				}

				if ( nimgh > MAXSIZE ) {
					nimgw = media.clientWidth * MAXSIZE / media.clientHeight;
					nimgh = MAXSIZE;
				}

				var cx = (win.pageXOffset + x + w / 2) * nimgw /
					media.clientWidth - winW / 2 - scrollbars;
				var cy = (win.pageYOffset + y + h / 2) * nimgh /
					media.clientHeight - winH / 2 - scrollbars;

				media.resize(-1, nimgw + 'px');

				win.scrollTo(cx, cy);
				return;
			} else if ( dragSlide.length === 3 ) {
				x = dragSlide[0][0] - dragSlide[2][0];
				y = dragSlide[0][1] - dragSlide[2][1];

				if ( Date.now() - media.dragSlideTime > 100 ) {
					cancelAction = false;
					dragSlide.length = 0;
					return;
				}

				if ( x || y ) {
					dragSlide.length = 2;
					dragSlide[0] = x;
					dragSlide[1] = y;
					startScroll();
					doc.addEventListener(vAPI.browser.wheel, stopScroll);
					return;
				}
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

		if ( e.clientX !== lastEvent.clientX || e.clientY !== lastEvent.clientY ) {
			return;
		}

		if ( media.mode < 2 && noFit.real ) {
			if ( media.mode === -1 ) {
				media.resize(0);
			} else if ( winW / winH < media.naturalWidth / media.naturalHeight ) {
				media.resize(2);
			} else if ( winH === media.offsetHeight && winW > media.offsetWidth ) {
				media.resize(2);
			} else {
				media.resize(3);
			}
		} else if ( media.mode === 1 || noFit.cur ) {
			if ( media.naturalWidth === media.clientWidth
				&& media.naturalHeight === media.clientHeight ) {
				return;
			}

			x = e.offsetX || e.layerX || 0;
			y = e.offsetY || e.layerY || 0;

			if ( media.scale ) {
				if ( media.scale.h === -1 ) {
					x = media.clientWidth - x;
				}

				if ( media.scale.v === -1 ) {
					y = media.clientHeight - y;
				}
			}

			x = x * media.naturalWidth / media.clientWidth - winW / 2;
			y = y * media.naturalHeight / media.clientHeight - winH / 2;

			media.resize(0);
			win.scrollTo(x, y);
		} else {
			media.resize(1);
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
			e.wheelDelta = key === '+' ? 1 : -1;
			zoomToCenter(e);
			return;
		}

		var x, y, z;

		switch ( key ) {
			case 'Esc':
				media.reset();
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
				x = e.shiftKey ? root.scrollWidth : win.pageXOffset;
				y = e.shiftKey ? win.pageYOffset : root.scrollHeight;
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
				e.preventDefault();
			}

			return;
		}

		switch ( key ) {
			case cfg.key_mOrig: media.resize(0); break;
			case cfg.key_mFit: media.resize(1); break;
			case cfg.key_mFitW: media.resize(2); break;
			case cfg.key_mFitH: media.resize(3); break;
			case cfg.key_cycle: media.cycle(e.shiftKey); break;
			case cfg.key_rotL: media.rotate(false, e.shiftKey); break;
			case cfg.key_rotR: media.rotate(true, e.shiftKey); break;
			case cfg.key_flipH: media.flip(media, 0); break;
			case cfg.key_flipV: media.flip(media, 1); break;
			case cfg.key_wheelZoom: toggleWheelZoom(); break;
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

		if ( x !== true ) {
			pdsp(e);
		}
	}, true);

	doc.addEventListener('contextmenu', onContextMenu, false);
	win.addEventListener('resize', afterCalc, false);
	toggleWheelZoom(true);

	if ( vAPI.mediaType === 'video' ) {
		media.addEventListener('click', function(e) {
			if ( e.button !== 0 ) {
				return;
			}

			var y = e.offsetY || e.layerY || 0;

			if ( y > media.clientHeight - 40 ) {
				return;
			}

			if ( vAPI.fullScreenElement === this || y > media.clientHeight / 2 ) {
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

	media.mode = cfg.mode;
	media.calcFit();
	progress = [];

	if ( cfg.minUpscale ) {
		if ( media.naturalWidth >= winW * cfg.minUpscale / 100 ) {
			progress[0] = 1;
		}

		if ( media.naturalHeight >= winH * cfg.minUpscale / 100 ) {
			progress[1] = 1;
		}
	}

	if ( media.mode === 4 ) {
		if ( media.naturalWidth / media.naturalHeight > winW / winH ) {
			media.mode = 3;
		} else {
			media.mode = 2;
		}
	} else if ( media.mode === 1 || media.mode === 0 && noFit.real ) {
		if ( progress.length ) {
			if ( media.naturalWidth / media.naturalHeight > winW / winH ) {
				media.mode = 2;
			} else {
				media.mode = 3;
			}
		}
	}

	if ( media.mode === 2 && media.naturalWidth < winW && !progress[0] ) {
		media.mode = 0;
	} else if ( media.mode === 3 && media.naturalHeight < winH && !progress[1] ) {
		media.mode = 0;
	}

	progress = null;
	media.resize(media.mode);

	// Some browsers (Safari, Firefox) won't position the media without this
	setTimeout(function() {
		media.setPos();
	}, 30);
};

if ( vAPI.mediaType === 'video' ) {
	var attributeValues = {};
	var mediaAttributes = ['autoplay', 'loop', 'controls', 'muted', 'volume'];

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

		if ( media.autoplay ) {
			setTimeout(media.play.bind(media), 50);
		}

		if ( this.videoHeight ) {
			return;
		}

		vAPI.mediaType = 'audio';
		media.controls = true;
		doc.title = media.alt;

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

		if ( vAPI.opera || vAPI.firefox ) {
			return;
		}

		// To not show the black poster when audio restarts or if seek happens
		media.addEventListener('playing', function() {
			this.poster = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
		});
	});
} else {
	media = doc.createElement('img');
	media.src = win.location.href;
}

root = doc.documentElement;
media.id = 'main-media';

media.addEventListener('error', function() {
	// Opera fires an error event on local video files when they're close to the end
	// Firefox did it a few times too, even if there was nothing wrong with the video
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

if ( media.naturalWidth || media.videoWidth || vAPI.mediaType === 'audio' ) {
	initParams = null;
	init();
	return;
}

initParams = {loop: 0, wait: 150, maxLoop: 900};
progress = setInterval(init, initParams.wait);

setTimeout(function() {
	if ( root.classList.contains(vAPI.mediaType) ) {
		return;
	}

	// Firefox won't show the image if a site uses CSP settings,
	// so we should use the default image
	if ( (vAPI.firefox || vAPI.maxthon)
		&& (vAPI.mediaType === 'img'
			? !media.naturalWidth && doc.images[0].naturalWidth
			: !media.videoWidth && doc.body.querySelector('video').videoWidth) ) {
		// TODO: audio/video
		doc.images[0].style.display = 'block';
		clearInterval(progress);
		return;
	}

	media.style.display = 'none';

	var header = doc.body.appendChild(doc.createElement('h2'));
	header.textContent = media.alt;
	header.addEventListener('click', function() {
		doc.body.removeChild(this);
		media.style.display = 'block';
	});
}, 1000);

};

(function() {

if ( vAPI.safari && location.protocol === 'safari-extension:' ) {
	init = null;
	return;
}

if ( vAPI.opera || vAPI.firefox ) {
	if ( !vAPI.mediaType ) {
		init = null;
		return;
	}

	vAPI.messaging.send({cmd: 'loadPrefs'}, function(response) {
		init(window, document, response);
	});
	return;
}

vAPI.messaging.send({cmd: 'loadPrefs'}, function(response) {
	if ( !vAPI.mediaType ) {
		init = null;
		return;
	}

	init(window, document, response);
});

})();
