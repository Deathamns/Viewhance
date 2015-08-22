/* eslint new-cap:0 */

'use strict';

this.EXPORTED_SYMBOLS = ['docObserver'];

const Ci = Components.interfaces;
const hostName = Components.stack.filename.match(/:\/\/(\w+)/)[1];
const {Services} = Components.utils.import(
	'resource://gre/modules/Services.jsm',
	null
);

const docObserver = {
	contentBaseURI: 'chrome://' + hostName + '/content/includes/',
	uniqueSandboxId: 1,

	QueryInterface: (function() {
		let {XPCOMUtils} = Components.utils.import(
			'resource://gre/modules/XPCOMUtils.jsm',
			null
		);

		return XPCOMUtils.generateQI([
			Ci.nsIObserver,
			Ci.nsISupportsWeakReference
		]);
	})(),

	register: function() {
		Services.obs.addObserver(this, 'document-element-inserted', true);
	},

	unregister: function() {
		Services.obs.removeObserver(this, 'document-element-inserted');
	},

	initContentScripts: function(win, js) {
		let messager = win
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDocShell)
			.sameTypeRootTreeItem
			.QueryInterface(Ci.nsIDocShell)
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIContentFrameMessageManager);
		let sandboxId = hostName + ':sb:' + this.uniqueSandboxId++;
		let sandbox;

		if ( js ) {
			try {
				let sandboxName = [
					win.location.href.slice(0, 100),
					win.document.title.slice(0, 100)
				].join(' | ');

				sandbox = Components.utils.Sandbox([win], {
					sameZoneAs: win,
					sandboxName: sandboxId + '[' + sandboxName + ']',
					sandboxPrototype: win,
					wantComponents: false,
					wantXHRConstructor: false
				});
			} catch ( ex ) {
				// This happens with media that are loaded from privileged URL,
				// like on "chrome:" protocols, which we can freely pollute.
			}
		}

		if ( !sandbox ) {
			sandbox = win;
		}

		sandbox._sandboxId_ = sandboxId;
		sandbox._hostName_ = hostName;
		sandbox.sendAsyncMessage = messager.sendAsyncMessage;

		sandbox.addMessageListener = function(callback) {
			if ( sandbox._messageListener_ ) {
				sandbox.removeMessageListener();
			}

			sandbox._messageListener_ = function(message) {
				callback(message.data);
			};

			messager.addMessageListener(
				sandbox._sandboxId_,
				sandbox._messageListener_
			);
		};

		sandbox.removeMessageListener = function() {
			try {
				messager.removeMessageListener(
					sandbox._sandboxId_,
					sandbox._messageListener_
				);
			} catch ( ex ) {
				//
			}

			sandbox._messageListener_ = null;
		};

		if ( js ) {
			let lss = Services.scriptloader.loadSubScript;
			lss(this.contentBaseURI + 'app.js', sandbox);
			lss(this.contentBaseURI + js, sandbox);
		}
	},

	onMouseEnter: function(e) {
		this.removeEventListener(e.type, docObserver.onMouseEnter, true);
		docObserver.initContentScripts(this, 'opener.js');
	},

	observe: function(doc) {
		let win = doc.defaultView;

		if ( !win ) {
			return;
		}

		if ( doc instanceof win.HTMLDocument === false ) {
			return;
		}

		if ( doc instanceof Ci.nsIImageDocument ) {
			this.initContentScripts(win, 'viewer.js');
			return;
		}

		if ( doc.querySelector('body > video:only-child:not([src])') ) {
			this.initContentScripts(win, 'viewer.js');
			return;
		}

		let loc = win.location;

		if ( /^(https?|ftp|file):$/.test(loc.protocol) === false ) {
			if ( loc.protocol === 'chrome:' && loc.host === hostName ) {
				this.initContentScripts(win);
			}

			return;
		}

		win.addEventListener('mouseenter', docObserver.onMouseEnter, true);
	}
};

docObserver.register();
