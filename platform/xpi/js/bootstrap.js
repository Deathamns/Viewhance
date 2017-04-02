/* global APP_SHUTDOWN, ADDON_UNINSTALL */

'use strict';

let bgProcess;
const addonName = 'Viewhance';

this.startup = function(data) {
	let appShell = Components
		.classes['@mozilla.org/appshell/appShellService;1']
		.getService(Components.interfaces.nsIAppShellService);

	let onReady = function(e) {
		if ( e ) {
			this.removeEventListener(e.type, onReady);
		}

		// Sending data synchronously to the background page with the fragment
		let bgURI = 'chrome://' + addonName + '/content/background.html#'
			+ [addonName, data.version];

		if ( appShell.createWindowlessBrowser ) {
			bgProcess = appShell.createWindowlessBrowser(false);
			bgProcess.loadURI(bgURI, 0, null, null, null);
			return;
		}

		let hDoc = appShell.hiddenDOMWindow.document;
		bgProcess = hDoc.documentElement.appendChild(
			hDoc.createElementNS('http://www.w3.org/1999/xhtml', 'iframe')
		);
		bgProcess.src = bgURI + '#' + [addonName, data.version];
	};

	try {
		void appShell.hiddenDOMWindow.document;
		onReady();
		return;
	} catch ( ex ) {
		//
	}

	let ww = Components
		.classes['@mozilla.org/embedcomp/window-watcher;1']
		.getService(Components.interfaces.nsIWindowWatcher);

	ww.registerNotification({
		observe: function(win, topic) {
			if ( topic !== 'domwindowopened' ) {
				return;
			}

			try {
				void appShell.hiddenDOMWindow;
			} catch ( ex ) {
				return;
			}

			ww.unregisterNotification(this);
			win.addEventListener('DOMContentLoaded', onReady);
		}
	});
};

this.shutdown = function(data, reason) {
	if ( reason === APP_SHUTDOWN || !bgProcess ) {
		return;
	}

	if ( bgProcess.parentNode ) {
		bgProcess.parentNode.removeChild(bgProcess);
	} else if ( typeof bgProcess.close === 'function' ) {
		bgProcess.close();
	}

	bgProcess = null;
};

this.install = function() {
	// https://bugzil.la/719376
	Components.classes['@mozilla.org/intl/stringbundle;1']
		.getService(Components.interfaces.nsIStringBundleService)
		.flushBundles();
};

this.uninstall = function(data, reason) {
	if ( reason !== ADDON_UNINSTALL ) {
		return;
	}

	Components.classes['@mozilla.org/preferences-service;1']
		.getService(Components.interfaces.nsIPrefService)
		.getBranch('extensions.' + addonName + '.')
		.deleteBranch('');
};
