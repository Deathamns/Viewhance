/* global APP_SHUTDOWN, ADDON_UNINSTALL */
/* exported startup, shutdown, install, uninstall */
/* eslint func-style:off */

'use strict';

let bgProcess;
const addonName = '{{name}}';

// Components.utils.import('resource://gre/modules/Console.jsm');

function startup(data) {
	let appShell = Components
		.classes['@mozilla.org/appshell/appShellService;1']
		.getService(Components.interfaces.nsIAppShellService);

	let timer = Components.classes['@mozilla.org/timer;1']
		.createInstance(Components.interfaces.nsITimer);

	let isReady = function() {
		let hDoc;
		timer.cancel();

		try {
			hDoc = appShell.hiddenDOMWindow.document;

			if ( !hDoc || hDoc.readyState !== 'complete' ) {
				throw Error('Not ready');
			}
		} catch ( ex ) {
			timer.init({observe: isReady}, 300, timer.TYPE_ONE_SHOT);
			return false;
		}

		// Sending data synchronously to the background page with the fragment
		let bgURI = 'chrome://' + addonName + '/content/background.html#'
			+ [addonName, data.version];

		if ( appShell.createWindowlessBrowser ) {
			let sp = Components.classes['@mozilla.org/scriptsecuritymanager;1']
				.getService(Components.interfaces.nsIScriptSecurityManager)
				.getSystemPrincipal();
			bgProcess = appShell.createWindowlessBrowser(false);
			bgProcess.loadURI(bgURI, 0, null, null, null, sp);
		} else {
			bgProcess = hDoc.documentElement.appendChild(
				hDoc.createElementNS('http://www.w3.org/1999/xhtml', 'iframe')
			);
			bgProcess.src = bgURI + '#' + [addonName, data.version];
		}

		timer = null;
		return true;
	};

	isReady();
}

function shutdown(data, reason) {
	if ( reason === APP_SHUTDOWN || !bgProcess ) {
		return;
	}

	if ( bgProcess.parentNode ) {
		bgProcess.parentNode.removeChild(bgProcess);
	} else if ( typeof bgProcess.close === 'function' ) {
		bgProcess.close();
	}

	bgProcess = null;
}

function install() {
	// https://bugzil.la/719376
	Components.classes['@mozilla.org/intl/stringbundle;1']
		.getService(Components.interfaces.nsIStringBundleService)
		.flushBundles();
}

function uninstall(data, reason) {
	if ( reason !== ADDON_UNINSTALL ) {
		return;
	}

	Components.classes['@mozilla.org/preferences-service;1']
		.getService(Components.interfaces.nsIPrefService)
		.getBranch('extensions.' + addonName + '.')
		.deleteBranch('');
}
