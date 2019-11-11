/* eslint new-cap:0 */

'use strict';

this.EXPORTED_SYMBOLS = ['docObserver'];

const Ci = Components.interfaces;
const hostName = Components.stack.filename.match(/:\/\/(\w+)/)[1];
const contentBaseURI = 'chrome://' + hostName + '/content';
const {Services} = Components.utils.import(
	'resource://gre/modules/Services.jsm',
	null
);

const docObserver = {
	uniqueSandboxId: 1,
	io: Components.classes['@mozilla.org/network/io-service;1']
		.getService(Components.interfaces.nsIIOService),
	parser: Components.classes['@mozilla.org/parserutils;1']
		.getService(Components.interfaces.nsIParserUtils),

	QueryInterface: (function() {
		let XPCOMUtils;

		if ( typeof ChromeUtils === 'object' ) {
			XPCOMUtils = ChromeUtils;
		} else {
			XPCOMUtils = Components.utils.import(
				'resource://gre/modules/XPCOMUtils.jsm',
				null
			).XPCOMUtils;
		}

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
		let messager, sandbox;
		let sandboxId = hostName + ':sb:' + this.uniqueSandboxId++;

		try {
			messager = win.docShell.messageManager;
		} catch	( ex ) {
			messager = win
				.QueryInterface(Ci.nsIInterfaceRequestor)
				.getInterface(Ci.nsIDocShell)
				.sameTypeRootTreeItem
				.QueryInterface(Ci.nsIDocShell)
				.QueryInterface(Ci.nsIInterfaceRequestor)
				.getInterface(Ci.nsIContentFrameMessageManager);
		}

		if ( js ) {
			let sandboxName = [
				win.location.href.slice(0, 100),
				win.document.title.slice(0, 50)
			].join(' | ');

			try {
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
		sandbox._tabId_ = win.top.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDOMWindowUtils).outerWindowID;
		sandbox._frameId_ = win.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDOMWindowUtils).outerWindowID;

		sandbox.sendAsyncMessage = messager.sendAsyncMessage.bind(messager);

		sandbox.addMessageListener = function(callback) {
			if ( sandbox._messageListener_ ) {
				sandbox.removeMessageListener();
			}

			sandbox._messageListener_ = function(message) {
				callback(Components.utils.cloneInto(message.data, callback));
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

		sandbox._safeHTML_ = function(node, str) {
			if ( str.indexOf('<') === -1 ) {
				node.insertAdjacentText('beforeend', str);
				return;
			}

			node.appendChild(docObserver.parser.parseFragment(
				str,
				docObserver.parser.SanitizerAllowStyle,
				false,
				docObserver.io.newURI('about:blank', null, null),
				sandbox.document.documentElement
			));
		};

		if ( js ) {
			let lss = Services.scriptloader.loadSubScript;
			lss(contentBaseURI + '/js/app.js', sandbox, 'UTF-8');
			lss(contentBaseURI + '/js/' + js, sandbox, 'UTF-8');
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
