'use strict';

var defaultPrefs;
var inputChanges = Object.create(null);

var $ = function(id) {
	return document.getElementById(id);
};

var localizeNodes = function(nodes) {
	var i = nodes.length;

	while ( i-- ) {
		if ( nodes[i]._nodeLocalized ) {
			continue;
		}

		var els = nodes[i].querySelectorAll('[data-i18n]');
		var l = els.length;

		while ( l-- ) {
			var i18nString = vAPI.i18n(els[l].dataset.i18n);
			var i18nAttr = els[l].dataset.i18nAttr;
			els[l].removeAttribute('data-i18n');

			if ( !i18nAttr ) {
				vAPI.insertHTML(els[l], i18nString);
				continue;
			}

			if ( /^(title|placeholder)$/i.test(i18nAttr) ) {
				els[l][i18nAttr] = i18nString;
			}

			els[l].removeAttribute('data-i18n-attr');
		}

		nodes[i]._nodeLocalized = true;
	}
};

var changeColor = function(node, color, time) {
	clearTimeout(node.colorTransitionTimer);

	if ( typeof color !== 'string' ) {
		node.style.color = '';
		delete node.colorTransitionTimer;
		return;
	}

	node.style.color = color;
	node.colorTransitionTimer = setTimeout(function() {
		changeColor(node, null);
	}, time || 2000);
};

var fillOutput = function(node) {
	var op = node.previousElementSibling;
	op.value = node.value;
	op.defaultValue = defaultPrefs[node.name];
};

var colorOnInput = function(node) {
	var target = node.type === 'input' ? this : node;
	var c = /^#([\da-f]{3}){1,2}$/i.test(target.value)
		? target.value
		: '#ffffff';

	if ( c.length === 4 ) {
		c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
	}

	target.previousElementSibling.value = c;
};

var colorOnChange = function() {
	this.nextElementSibling.value = this.value;
};

var setDefault = function(selector) {
	if ( !selector ) {
		return;
	}

	var nodeList = typeof selector === 'string'
		? document.querySelectorAll(selector)
		: [selector];

	[].forEach.call(nodeList, function(el) {
		if ( el.type === 'checkbox' ) {
			el.checked = el.defaultChecked;
			return;
		}

		if ( /^SELECT/i.test(el.type) ) {
			var i = el.length;

			while ( i-- ) {
				if ( el[i].hasAttribute('selected') ) {
					el.selectedIndex = i;
					break;
				}
			}

			return;
		}

		el.value = el.defaultValue;

		if ( el.type === 'range' ) {
			fillOutput(el);
		}
	});
};

var load = function(prefs) {
	var m, field, fieldType, pref;
	var fields = document.querySelectorAll('[name]');
	var i = fields.length;

	while ( i-- ) {
		field = fields[i];
		pref = field.name;

		if ( field.disabled || field.readOnly || defaultPrefs[pref] === void 0 ) {
			continue;
		}

		fieldType = field.getAttribute('type') || 'text';

		if ( field.type !== fieldType ) {
			fieldType = field.type;
		}

		if ( fieldType === 'checkbox' ) {
			field.defaultChecked = defaultPrefs[pref];
			pref = !!(prefs[pref] === void 0 ? defaultPrefs : prefs)[pref];
			field.checked = field.defChecked = pref;
			continue;
		}

		if ( pref === 'sendTo' ) {
			if ( !Array.isArray(prefs[pref]) ) {
				prefs[pref] = defaultPrefs[pref];
			}

			field.rows = prefs[pref].length || 2;
			field.defaultValue = defaultPrefs[pref].join('\n');
			prefs[pref] = prefs[pref].join('\n');
		} else if ( fieldType.slice(0, 6) === 'select' ) {
			/* eslint-disable */
			[].some.call(field, function(el) {
				if ( el.value == defaultPrefs[pref] ) {
					el.defaultSelected = true;
					return true;
				}
			});
			/* eslint-enable */
		} else {
			field.defaultValue = defaultPrefs[pref];
		}

		pref = (prefs[pref] === void 0 ? defaultPrefs : prefs)[pref];
		field.value = field.defValue = pref;

		if ( fieldType === 'range' ) {
			m = field.previousElementSibling;

			if ( m && m.nodeName === 'OUTPUT' ) {
				fillOutput(field);
			}

			m = m.previousElementSibling;

			if ( m && m.getAttribute('type') === 'color' ) {
				m.style.opacity = field.value;
			}

			field.addEventListener('change', fillOutput);
		} else if ( fieldType === 'text' ) {
			if ( !field.previousElementSibling ) {
				continue;
			}

			if ( field.previousElementSibling.getAttribute('type') === 'color' ) {
				continue;
			}

			field.addEventListener('input', colorOnInput);
			colorOnInput(field);
			field.previousElementSibling.addEventListener('change', colorOnChange);
		}
	}
};

var save = function() {
	var i, field, fieldType, pref;
	var fields = document.querySelectorAll('[name]');
	var prefs = Object.create(null);

	for ( i = 0; i < fields.length; ++i ) {
		field = fields[i];
		pref = field.name;

		if ( field.disabled || field.readOnly || defaultPrefs[pref] === void 0 ) {
			continue;
		}

		fieldType = field.getAttribute('type');

		if ( fieldType === 'checkbox' ) {
			prefs[pref] = field.checked;
		} else if ( fieldType === 'range' || fieldType === 'number'
			|| field.classList.contains('number') ) {

			prefs[pref] = parseFloat(field.value);

			if ( field.min ) {
				prefs[pref] = Math.max(
					field.min,
					Math.min(field.max, prefs[pref])
				);
			}

			if ( typeof prefs[pref] !== 'number' ) {
				prefs[pref] = parseFloat(field.defaultValue);
			}

			field.value = prefs[pref];
		} else {
			if ( pref === 'sendTo' ) { // eslint-disable-line
				prefs[pref] = field.value.trim().split(/[\r\n]+/).filter(Boolean);
				field.rows = prefs[pref].length || 2;
			} else {
				prefs[pref] = field.value;
			}
		}

		if ( prefs[pref] === void 0 ) {
			prefs[pref] = defaultPrefs[pref];
		}
	}

	vAPI.messaging.send({cmd: 'savePrefs', prefs: prefs});
};

var onHashChange = function() {
	var args = [];
	var menu = $('nav-menu');
	var prevHash = menu.activeLink && menu.activeLink.hash.slice(1) || 'general';
	var hash = location.hash.slice(1) || 'general';

	if ( hash.indexOf('/') > -1 ) {
		args = hash.split('/');
		hash = args.shift();
	}

	var section = $(hash + '-sec') || $((hash = 'general') + '-sec');

	if ( hash === 'info' ) {
		if ( !section._nodeLocalized ) {
			if ( args[0] ) {
				args = args[0] === '0' ? 'app-installed' : 'app-updated';
				$(args).style.display = 'block';
			}

			var fillLocalesTable = function() {
				this.onload = null;

				var alpha2, td;
				var rows = [];
				var lngMap = function(el, idx) {
					el.name = [
						el.name || el.fullname || '',
						el.fullname && el.name ? ' (' + el.fullname + ')' : ''
					].join('');

					if ( !el.name ) {
						el.name = el.email || el.web;
					}

					if ( idx ) {
						td.nodes.push(', ');
					}

					td.nodes.push(el.email || el.web
						? {
							tag: 'a',
							attrs: {href: el.email
								? 'mailto:' + el.email
								: el.web
							},
							text: el.name
						}
						: el.name
					);
				};

				var locales = JSON.parse(this.responseText);

				for ( alpha2 in locales ) {
					// _ is the default language
					if ( alpha2 === '_' ) {
						continue;
					}

					td = {tag: 'td'};

					rows.push({tag: 'tr', nodes: [
						{
							tag: 'td',
							attrs: locales[alpha2]['%']
								? {title: locales[alpha2]['%'] + '%'}
								: null,
							text: alpha2 + ', ' + locales[alpha2].name
						},
						td
					]});

					if ( locales[alpha2].translators ) {
						td.nodes = [];
						locales[alpha2].translators.forEach(lngMap);
					} else {
						td.text = 'anonymous';
					}
				}

				vAPI.buildNodes($('locales-table'), rows);
			};

			var xhr = new XMLHttpRequest;
			xhr.overrideMimeType('application/json;charset=utf-8');
			xhr.open('GET', 'locales.json', true);
			xhr.onload = fillLocalesTable;
			xhr.send();
		}
	}

	if ( prevHash !== hash && (prevHash = $(prevHash + '-sec')) ) {
		prevHash.style.display = 'none';
	}

	if ( section ) {
		localizeNodes([section]);
		section.style.display = 'block';
	}

	if ( menu.activeLink ) {
		menu.activeLink.classList.remove('active');
	}

	if ( menu.activeLink = menu.querySelector('a[href="#' + hash + '"]') ) {
		menu.activeLink.classList.add('active');
	}
};

window.addEventListener('hashchange', onHashChange);

window.addEventListener('load', function() {
	['opera', 'firefox', 'chrome', 'safari', 'maxthon'].some(function(el) {
		if ( vAPI[el] ) {
			document.body.classList.add(el);
			return true;
		}

		return false;
	});

	var menu = $('nav-menu');
	var colorHelper = document.body.querySelector(
		'.color-helper > input[type=text]'
	);

	if ( colorHelper ) {
		colorHelper.addEventListener('input', colorOnInput);
		colorOnInput(colorHelper);
		colorHelper.previousElementSibling.addEventListener('change', colorOnChange);
	}

	localizeNodes([menu, $('right-panel').firstElementChild]);

	menu.addEventListener('click', function(e) {
		if ( e.button === 0 && e.target.hash ) {
			e.preventDefault();
			location.hash = e.target.hash;
		}
	});

	onHashChange();

	var form = document.forms[0];
	var onFormChange = function(e) {
		if ( e.stopPropagation ) {
			e.stopPropagation();
		}

		var defval;
		var t = e.target;

		if ( t.formSaved ) {
			delete t.formSaved;
		} else if ( t.parentNode.dataset.form
			|| t.parentNode.parentNode.dataset.form ) {
			defval = 'default';
		} else if ( t.id.indexOf('_') > 0 ) {
			defval = 'def';
		}

		if ( !defval ) {
			return;
		}

		if ( t.type === 'checkbox' && t[defval + 'Checked'] !== t.checked ) {
			inputChanges[t.name] = true;
		} else if ( t.type !== 'checkbox'
			&& t[defval + 'Value'] != t.value ) { // eslint-disable-line
			inputChanges[t.name] = true;
		} else {
			delete inputChanges[t.name];
		}

		$('save-button').style.color = Object.keys(inputChanges).length
			? '#e03c00'
			: '';
	};

	form.addEventListener('keydown', function(e) {
		e.stopPropagation();

		if ( e.which === 13 ) {
			e.target.formSaved = true;
		}

		if ( e.repeat || !e.target.name || e.target.name.indexOf('key_') !== 0
			|| e.ctrlKey || e.altKey || e.metaKey
			|| e.which < 47 ) {
			return;
		}

		e.preventDefault();
		changeColor(e.target);

		var keys = {
			96: '0', 97: '1', 98: '2', 99: '3', 100: '4',
			101: '5', 102: '6', 103: '7', 104: '8', 105: '9',
			106: '*', 107: '+', 109: '-', 110: '.', 111: '/',
			186: ';', 187: '=', 188: ',', 189: '-', 190: '.',
			191: '/', 192: '`', 219: '[', 220: '\\', 221: ']', 222: "'",
			112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
			118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12'
		};
		var key = keys[e.which] || String.fromCharCode(e.which).toUpperCase();

		keys = document.body.querySelectorAll('input[name^="key_"]');

		for ( var i = 0; i < keys.length; ++i ) {
			if ( keys[i].value.toUpperCase() !== key ) {
				continue;
			}

			if ( e.target !== keys[i] ) {
				changeColor(e.target, 'red');
			}

			return;
		}

		e.target.value = key;
		form.onchange(e);
	});

	form.addEventListener('contextmenu', function(e) {
		e.stopPropagation();
		var t = e.target;

		if ( t.classList.contains('checkbox') ) {
			t = t.previousElementSibling;
		}

		if ( !t.name ) {
			return;
		}

		if ( e.ctrlKey ) {
			e.preventDefault();
			setDefault(t);
			onFormChange({target: t});
		}
	});

	form.addEventListener('change', onFormChange);

	var resetButton = $('reset-button');

	resetButton.reset = function() {
		delete resetButton.pending;
		resetButton.style.color = '#000';
	};

	resetButton.addEventListener('click', function(e) {
		if ( e.button !== 0 ) {
			return;
		}

		if ( this.pending ) {
			clearTimeout(this.pending);
			delete this.pending;

			this.style.color = '';
			this.nextElementSibling.style.color = '#e03c00';

			inputChanges.formReset = true;

			if ( e.ctrlKey ) {
				e.preventDefault();
				var sec = (location.hash || '#general') + '-sec ';
				setDefault(e + 'input,' + sec + 'select,' + sec + 'textarea');
				this.style.color = 'lime';
			} else {
				this.style.color = 'green';
			}

			this.pending = setTimeout(this.reset, 2000);
			return;
		}

		this.style.color = 'orange';
		this.pending = setTimeout(this.reset, 2000);
		e.preventDefault();
	});

	$('save-button').addEventListener('click', function(e) {
		e.preventDefault();

		if ( e.button !== 0 ) {
			return;
		}

		save();
		changeColor(resetButton);
		changeColor(this, 'green');
	});

	[].forEach.call(document.body.querySelectorAll('.action-buttons') || [], function(el) {
		el.addEventListener('mousedown', function(e) {
			e.preventDefault();
		});
	});

	vAPI.messaging.send({cmd: 'loadPrefs', getAppInfo: true}, function(data) {
		$('app-name').textContent = data.app.name;
		$('app-version').textContent = data.app.version;
		$('platform-info').textContent = data.app.platform;
		document.title = ':: ' + data.app.name + ' ::';

		var xhr = new XMLHttpRequest;
		xhr.overrideMimeType('application/json;charset=utf-8');
		xhr.open('GET', 'defaults.json', true);
		xhr.onload = function() {
			defaultPrefs = JSON.parse(this.responseText);
			load(data.prefs);
			document.body.style.display = 'block';
		};
		xhr.send();
	});
});
