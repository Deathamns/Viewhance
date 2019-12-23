'use strict';

var defaultPrefs;
var inputChanges = Object.create(null);

var $ = function(selector, n) {
	return (n || document).querySelector(selector);
};

var localizeNodes = function(nodes) {
	var i = nodes.length;

	while ( i-- ) {
		if ( nodes[i]._nodeLocalized ) {
			continue;
		}

		var els = nodes[i].querySelectorAll('[data-l10n]');
		var l = els.length;

		while ( l-- ) {
			var l10nString = vAPI.l10n(els[l].dataset.l10n);
			var l10nAttr = els[l].dataset.l10nAttr;
			els[l].removeAttribute('data-l10n');

			if ( !l10nAttr ) {
				vAPI.insertHTML(els[l], l10nString);
				continue;
			}

			if ( /^(title|placeholder)$/i.test(l10nAttr) ) {
				els[l][l10nAttr] = l10nString;
			}

			els[l].removeAttribute('data-l10n-attr');
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
		changeColor(node);
	}, time || 2000);
};

var fillOutput = function(e) {
	var node = e.target || e;
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
		} else if ( el.type.lastIndexOf('select', 0) === 0 ) {
			var i = el.length;

			while ( i-- ) {
				if ( el[i].hasAttribute('selected') ) {
					el.selectedIndex = i;
					break;
				}
			}
		} else {
			el.value = el.defaultValue;

			if ( el.type === 'range' ) {
				fillOutput(el);
			}
		}
	});
};

var load = function(prefs) {
	var fields = document.querySelectorAll('form [name]');
	var i = fields.length;

	while ( i-- ) {
		var field = fields[i];
		var pref = field.name;

		if ( field.disabled || field.readOnly ) {
			continue;
		}

		if ( defaultPrefs[pref] === void 0 ) {
			continue;
		}

		if ( field.type === 'checkbox' ) {
			field.defaultChecked = defaultPrefs[pref];
			pref = !!(prefs[pref] === void 0 ? defaultPrefs : prefs)[pref];
			field.checked = pref;
			field.defChecked = pref;
			continue;
		}

		if ( pref === 'sendToHosts' ) {
			if ( !Array.isArray(prefs[pref]) ) {
				prefs[pref] = defaultPrefs[pref];
			}

			field.rows = prefs[pref].length || 2;
			field.defaultValue = defaultPrefs[pref].join('\n');
			prefs[pref] = prefs[pref].join('\n');
		} else if ( field.type.lastIndexOf('select', 0) === 0 ) {
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
		field.value = pref;
		field.defValue = pref;

		var prevSib = field.previousElementSibling;

		if ( field.type === 'range' ) {
			if ( prevSib && prevSib.localName === 'output' ) {
				fillOutput(field);
			}

			prevSib = prevSib.previousElementSibling;

			if ( prevSib && prevSib.getAttribute('type') === 'color' ) {
				prevSib.style.opacity = field.value;
			}

			field.addEventListener('change', fillOutput);
		} else if ( field.type === 'text' ) {
			if ( !prevSib ) {
				continue;
			}

			if ( prevSib.getAttribute('type') === 'color' ) {
				continue;
			}

			field.addEventListener('input', colorOnInput);
			prevSib.addEventListener('change', colorOnChange);
			colorOnInput(field);
		}
	}
};

var save = function() {
	var fields = document.querySelectorAll('form [name]');
	var prefs = Object.create(null);

	for ( var i = 0; i < fields.length; ++i ) {
		var field = fields[i];
		var pref = field.name;

		if ( field.disabled || field.readOnly ) {
			continue;
		}

		if ( defaultPrefs[pref] === void 0 ) {
			continue;
		}

		if ( field.type === 'checkbox' ) {
			prefs[pref] = field.checked;
		} else if ( field.type === 'range'
			|| field.type === 'number'
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
			// eslint-disable-next-line no-lonely-if
			if ( pref === 'sendToHosts' ) {
				prefs[pref] = field.value.trim()
					.split(/[\r\n]+/).filter(Boolean);
				field.value = prefs[pref].join('\n');
				field.rows = prefs[pref].length || 2;
			} else {
				if ( field.type.lastIndexOf('text', 0) === 0 ) {
					field.value = field.value.trim();
				}

				prefs[pref] = field.value;
			}
		}

		if ( prefs[pref] === void 0 ) {
			prefs[pref] = defaultPrefs[pref];
		}
	}

	if ( !vAPI.permissions ) {
		vAPI.messaging.send({cmd: 'savePrefs', prefs: prefs});
		changeColor($('#button-reset'));
		changeColor($('#button-save'), 'green');
		return;
	}

	if ( $('.overlay-dim') ) {
		return;
	}

	vAPI.permissions.getAll(function(res) {
		var newPerms = {};
		var newPermsMsg = [];
		var dropPerms = {};
		var keepPerms = {};

		for ( var prefName in vAPI.prefPermissions ) {
			var pref = vAPI.prefPermissions[prefName];
			var f = $('[name=' + prefName + ']');

			if ( (f.type === 'checkbox' ? f.checked : f.value) === pref.noPermValue ) {
				pref.perms.forEach(function(perm) {
					if ( res.permissions.indexOf(perm) !== -1) {
						dropPerms[perm] = true;
					}
				});
				continue;
			}

			var i = pref.perms.length;
			var permsNeeded = [];

			while ( i-- ) {
				keepPerms[pref.perms[i]] = true;

				if ( res.permissions.indexOf(pref.perms[i]) === -1 ) {
					permsNeeded.push(pref.perms[i]);
					newPerms[pref.perms[i]] = true;
				}
			}

			if ( !permsNeeded.length ) {
				continue;
			}

			newPermsMsg.push(
				$('.prow > label[for="' + f.id + '"]').textContent
					+ ' <= ' + permsNeeded
			);
		}

		for ( var perm in keepPerms ) {
			delete dropPerms[perm];
		}

		dropPerms = Object.keys(dropPerms);
		newPerms = Object.keys(newPerms);

		if ( !newPerms.length ) {
			vAPI.messaging.send({
				cmd: 'savePrefs',
				prefs: prefs,
				dropPerms: dropPerms
			});
			changeColor($('#button-reset'));
			changeColor($('#button-save'), 'green');
			return;
		}

		newPermsMsg.unshift(vAPI.l10n('permisssionWarning') + '\n');

		vAPI.buildNodes(document.body, [{
			tag: 'div',
			attrs: {class: 'overlay-dim'},
			nodes: [{
				tag: 'div',
				nodes: [{
					tag: 'div', text: newPermsMsg.join('\n')
				}, {
					tag: 'br'
				}, {
					tag: 'button',
					text: '✔',
					attrs: {class: 'accept'}
				}, {
					tag: 'button',
					text: '✘',
					attrs: {class: 'reject'}
				}]
			}]
		}]);

		$('.overlay-dim').onclick = function(ev) {
			if ( ev.target.localName === 'button' ) {
				this.parentNode.removeChild(this);
				this.onclick = null;
			}

			if ( !ev.target.classList.contains('accept') ) {
				return;
			}

			vAPI.permissions.request({permissions: newPerms}, function() {
				vAPI.permissions.getAll(function(res) {
					for ( var prefName in vAPI.prefPermissions ) {
						var pref = vAPI.prefPermissions[prefName];
						var i = pref.perms.length;

						while ( i-- ) {
							if ( res.permissions.indexOf(pref.perms[i]) !== -1 ) {
								continue;
							}

							var f = $('[name=' + prefName + ']');

							if ( f.type === 'checkbox' ) {
								f.checked = pref.noPermValue;
							} else {
								f.value = pref.noPermValue;
							}

							break;
						}
					}

					vAPI.messaging.send({
						cmd: 'savePrefs',
						prefs: prefs,
						dropPerms: dropPerms
					});
					changeColor($('#button-reset'));
					changeColor($('#button-save'), 'green');
				});
			});
		};
	});
};

var onHashChange = function() {
	var args = [];
	var menu = $('#nav-menu');
	var prevHash = menu.activeLink ? menu.activeLink.hash.slice(1) : 'general';
	var hash = location.hash.slice(1) || 'general';

	if ( hash.indexOf('/') > -1 ) {
		args = hash.split('/');
		hash = args.shift();
	}

	if ( prevHash !== hash && (prevHash = $('#' + prevHash + '-sec')) ) {
		prevHash.style.display = 'none';
	}

	if ( menu.activeLink ) {
		menu.activeLink.classList.remove('active');
	}

	menu.activeLink = menu.querySelector('a[href="#' + hash + '"]');

	if ( menu.activeLink ) {
		menu.activeLink.classList.add('active');
	}

	var section = $('#' + hash + '-sec') || $('#' + (hash = 'general') + '-sec');

	if ( section._nodeLocalized ) {
		section.style.display = 'block';
		return;
	}

	localizeNodes([section]);
	section.style.display = 'block';

	if ( hash === 'info' ) {
		vAPI.messaging.send({cmd: 'loadFile', path: 'data/locales.json'}, function(response) {
			var translators;
			var rows = [];
			var locales = JSON.parse(response);
			var lngMap = function(el, idx) {
				el.name = [
					el.name || el.realname || '',
					el.realname && el.name ? ' (' + el.realname + ')' : ''
				].join('');

				if ( el.email ) {
					el.email = el.email
						.replace(/\(dot\)/g, '.')
						.replace('(at)', '@');
				}

				if ( !el.name ) {
					el.name = el.email || el.web;
				}

				if ( idx ) {
					translators.nodes.push(', ');
				}

				translators.nodes.push(el.email || el.web
					? {
						tag: 'a',
						attrs: {
							href: el.email
								? 'mailto:' + el.email
								: el.web
						},
						text: el.name
					}
					: el.name
				);
			};

			// _ is the default language
			delete locales._;

			for ( var alpha2 in locales ) {
				var locale = locales[alpha2];
				translators = {tag: 'span'};

				if ( locale.translators ) {
					translators.nodes = [];
					locale.translators.forEach(lngMap);
				} else {
					translators.text = 'anonymous';
				}

				rows.push({tag: 'div', nodes: [
					alpha2 + ', ' + locale.name,
					translators
				]});
			}

			vAPI.buildNodes($('#locales-table'), rows);
		});
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

	var menu = $('#nav-menu');
	var colorHelper = document.body.querySelector(
		'.color-helper > input[type=text]'
	);

	if ( colorHelper ) {
		colorHelper.addEventListener('input', colorOnInput);
		colorOnInput(colorHelper);
		colorHelper.previousElementSibling.addEventListener(
			'change',
			colorOnChange
		);
	}

	localizeNodes([menu, $('#right-panel').firstElementChild]);

	menu.addEventListener('click', function(e) {
		if ( e.button === 0 && e.target.hash ) {
			e.preventDefault();
			location.hash = e.target.hash;
		}
	});

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
		// eslint-disable-next-line eqeqeq
		} else if ( t.type !== 'checkbox' && t[defval + 'Value'] != t.value ) {
			inputChanges[t.name] = true;
		} else {
			delete inputChanges[t.name];
		}

		$('#button-save').style.color = Object.keys(inputChanges).length
			? '#e03c00'
			: '';
	};

	form.addEventListener('keydown', function(e) {
		e.stopPropagation();

		if ( e.which === 13 ) {
			e.target.formSaved = true;
		}

		if ( e.repeat || !e.target.name ) {
			return;
		}

		if ( e.target.name.indexOf('key_') !== 0 ) {
			return;
		}

		if ( e.ctrlKey || e.altKey || e.metaKey || e.which < 47 ) {
			return;
		}

		e.preventDefault();
		changeColor(e.target);

		var keys = {
			96: '0', 97: '1', 98: '2', 99: '3', 100: '4',
			101: '5', 102: '6', 103: '7', 104: '8', 105: '9',
			106: '*', 107: '+', 109: '-', 110: '.', 111: '/', 173: '-',
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
		onFormChange(e);
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

	var resetButton = $('#button-reset');

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
			this.nextElementSibling.style.color = '#e03c00';
			inputChanges.formReset = true;

			if ( e.ctrlKey ) {
				e.preventDefault();
				var sec = (location.hash || '#general') + '-sec ';
				setDefault(sec + 'input,' + sec + 'select,' + sec + 'textarea');
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

	$('#button-save').addEventListener('click', function(e) {
		e.preventDefault();

		if ( e.button !== 0 ) {
			return;
		}

		save();
	});

	$('#eximport').addEventListener('click', function(e) {
		var trg = e.target;

		if ( trg.localName !== 'button' ) {
			return;
		}

		if ( trg.id === 'exprt-btn' ) {
			vAPI.messaging.send({cmd: e.ctrlKey
				? 'loadPrefs'
				: 'loadStoredPrefs'}, function(data) {
				var txtArea = $('#eximport > textarea');
				txtArea.value = JSON.stringify(
					data.prefs,
					null,
					e.shiftKey ? '\t' : 0
				);
				txtArea.selectionStart = 0;
				txtArea.selectionEnd = txtArea.value.length;
				txtArea.focus();
			});
		} else if ( trg.id === 'imprt-btn' ) {
			var prefs;

			try {
				prefs = JSON.parse($('#eximport > textarea').value);
			} catch ( ex ) {
				changeColor(e.target, 'red', 2000);
				return;
			}

			vAPI.messaging.send({cmd: 'savePrefs', prefs: prefs});
			location.reload(true);
		}
	});

	form.querySelector('.op-buttons').addEventListener('mousedown', function(e) {
		e.preventDefault();
	});

	vAPI.messaging.send({cmd: 'loadPrefs', getAppInfo: true}, function(data) {
		$('#app-name').textContent = data._app.name;
		$('#app-version').textContent = data._app.version;
		$('#platform-info').textContent = data._app.platform;
		document.title = ':: ' + data._app.name + ' ::';
		defaultPrefs = JSON.parse(data._defaultPrefs);

		if ( data._prefPermissions ) {
			vAPI.prefPermissions = data._prefPermissions;
		}

		load(data.prefs);
		onHashChange();
		document.body.style.display = 'block';
	});
});
