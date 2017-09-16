
vAPI.contentScriptCount = 2;

vAPI.suicideAttempt = function() {
	if ( --vAPI.contentScriptCount > 0 ) {
		return;
	}

	if ( typeof vAPI.releaseVendorListeners === 'function' ) {
		vAPI.releaseVendorListeners();
	}

	vAPI = null;
};

vAPI.buildNodes = function(host, items) {
	if ( !host || !Array.isArray(items) ) {
		return null;
	}

	if ( !items.length ) {
		return host;
	}

	var doc = host.ownerDocument;
	var fragment = doc.createDocumentFragment();

	for ( var i = 0, l = items.length; i < l; ++i ) {
		var item = items[i];

		if ( !item ) {
			continue;
		}

		if ( typeof item === 'string' ) {
			fragment.appendChild(doc.createTextNode(item));
			continue;
		}

		var element = doc.createElement(item.tag);

		if ( item.attrs ) {
			for ( var attr in item.attrs ) {
				// bypass CSP
				if ( attr === 'style' ) {
					element.style.cssText = item.attrs[attr];
				} else {
					element.setAttribute(attr, item.attrs[attr]);
				}
			}
		}

		if ( item.nodes ) {
			this.buildNodes(element, item.nodes);
		} else if ( item.text ) {
			element.textContent = item.text;
		}

		fragment.appendChild(element);
	}

	if ( fragment.childNodes.length ) {
		host.appendChild(fragment);
	}

	return host;
};
