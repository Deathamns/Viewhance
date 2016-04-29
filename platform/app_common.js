
vAPI.contentScriptCount = 2;

vAPI.suicideAttempt = function() {
	if ( --vAPI.contentScriptCount === 0 ) {
		vAPI = null;
	}
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
		if ( !items[i] ) {
			continue;
		}

		if ( typeof items[i] === 'string' ) {
			fragment.appendChild(doc.createTextNode(items[i]));
			continue;
		}

		var element = doc.createElement(items[i].tag);

		if ( items[i].attrs ) {
			for ( var attr in items[i].attrs ) {
				// bypass CSP
				if ( attr === 'style' ) {
					element.style.cssText = items[i].attrs[attr];
				} else {
					element.setAttribute(attr, items[i].attrs[attr]);
				}
			}
		}

		if ( items[i].nodes ) {
			this.buildNodes(element, items[i].nodes);
		} else if ( items[i].text ) {
			element.textContent = items[i].text;
		}

		fragment.appendChild(element);
	}

	if ( fragment.childNodes.length ) {
		host.appendChild(fragment);
	}

	return host;
};
