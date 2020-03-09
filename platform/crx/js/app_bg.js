'use strict';

const vAPI = Object.create(null);

try {
	void chrome.storage.local;
	vAPI[this.browser ? 'firefox' : 'chrome'] = true;
} catch ( ex ) {
	vAPI.edge = true;
	this.chrome = this.browser;
}

vAPI.crx = true;

vAPI.app = chrome.runtime.getManifest();
vAPI.app = {
	name: vAPI.app.name,
	version: vAPI.app.version,
	platform: (function() {
		let vendor = navigator.userAgent.match(
			/((Edge|Firefox)|\S+)\/(\S+)(?: \([^/]+)?$/
		);

		if ( !vendor ) {
			return 'Chrome';
		}

		if ( vendor[2] ) {
			vendor.splice(2, 1);
		} else if ( vendor[1] === 'Safari' ) {
			vendor = navigator.userAgent.match(/(Chrome)\/(\S+)/);
		}

		return vendor.slice(1).join(' ')
			.replace('_', ' ')
			.replace('OPR', 'Opera');
	})()
};

vAPI.storage = {
	get: function(key, callback) {
		chrome.storage.local.get(key, function(obj) {
			callback(obj[key] === void 0 ? null : obj[key]);
		});
	},

	set: function(key, value) {
		let data = {};
		data[key] = value;
		chrome.storage.local.set(data);
	},

	remove: function(key) {
		chrome.storage.local.remove(key);
	}
};

vAPI.tabs = {
	create: chrome.tabs.create
};

vAPI.messaging = {
	listen: function(callback) {
		chrome.runtime.onMessage.addListener(function(message, sender, respond) {
			callback(message, {
				url: sender.url,
				tabId: sender.tab.id,
				frameId: sender.frameId
			}, respond);
			return true;
		});
	}
};

vAPI.permissions = chrome.permissions;

vAPI.watchReceivedHeaders = function(prefs) {
	if ( !chrome.webRequest ) {
		return;
	}

	const onHeadersReceived = function(details) {
		let headers = {};

		for ( let header of details.responseHeaders ) {
			let headerName = header.name.toLowerCase();

			switch ( headerName ) {
				case 'content-type':
				case 'content-disposition':
				case 'content-security-policy':
					headers[headerName] = header;
			}
		}

		let contentType = headers['content-type']
			&& headers['content-type'].value.split(';', 1)[0].trim().toLowerCase();
		let isMedia = false;
		let streamingMediaType = null;

		if ( contentType ) {
			if ( details.statusCode >= 400
				&& contentType.startsWith('text/') ) {
				return {};
			}

			if ( contentType === 'image/svg+xml' ) {
				if ( !prefs.viewSvg
					|| details.method !== 'GET'
					|| details.url.endsWith('#direct-view') ) {
					return {};
				}

				chrome.tabs.update(details.tabId, {
					url: chrome.runtime.getURL(
						'viewer.html#svg:' + details.url.replace(/#.*/, '')
					)
				});
				return {cancel: true};
			}

			if ( prefs.extraFormats ) {
				switch ( contentType ) {
					case 'application/vnd.apple.mpegurl':
					case 'application/mpegurl':
					case 'application/x-mpegurl':
					case 'audio/mpegurl':
					case 'audio/x-mpegurl':
						streamingMediaType = 'hls';
						break;
					case 'application/dash+xml':
						streamingMediaType = 'dash';
						break;
					case 'application/vnd.ms-sstr+xml':
						streamingMediaType = 'mss';
						break;
				}

				if ( streamingMediaType ) {
					isMedia = true;
				}
			}

			if ( !isMedia
				&& /^(image(?!\/svg)|video|audio)\//.test(contentType) ) {
				isMedia = true;
			}
		}

		let dispHeader = headers['content-disposition'];

		if ( dispHeader && !isMedia ) {
			let ext = dispHeader.value.match(
				/;\s*filename\*?\s*=.+\.(jp(?:g|eg?)|a?png|gif|bmp|svgz?|web[pm]|og[gv]|m(?:p[34d]|3u8))(?:\s*")?(?:\s*;|$)/i
			);

			if ( ext ) {
				ext = ext[1].toLowerCase();

				if ( ext.startsWith('svg') ) {
					if ( !prefs.viewSvg
						|| details.method !== 'GET'
						|| details.url.endsWith('#direct-view') ) {
						return {};
					}

					chrome.tabs.update(details.tabId, {
						url: chrome.runtime.getURL(
							'viewer.html#svg:' + details.url.replace(/#.*/, '')
						)
					});
					return {cancel: true};
				}

				if ( ext === 'm3u8' ) {
					streamingMediaType = 'hls';
				} else if ( ext === 'mpd' ) {
					streamingMediaType = 'dash';
				}

				if ( streamingMediaType ) {
					if ( prefs.extraFormats ) {
						isMedia = true;
					} else {
						streamingMediaType = null;
					}
				} else {
					isMedia = true;

					let mediaType = /^(mp[34]|webm|og)/.test(ext)
						? 'video/mp4'
						: 'image/png';

					// At this point we are sure that content-type is not media
					if ( headers['content-type'] ) {
						headers['content-type'].value = mediaType;
					} else {
						details.responseHeaders.push({
							name: 'Content-Type',
							value: mediaType
						});
					}
				}
			}
		}

		if ( !isMedia && prefs.extraFormats ) {
			streamingMediaType = details.url.match(
				/(?:\.[mM](?:3[uU]8|[pP][dD])|\/[Mm]anifest)(?=$|[?#])/
			);

			if ( streamingMediaType ) {
				isMedia = true;

				switch ( streamingMediaType[0].toLowerCase() ) {
					case '.m3u8':
						streamingMediaType = 'hls';
						break;
					case '.mpd':
						streamingMediaType = 'dash';
						break;
					case '/manifest':
						streamingMediaType = 'mss';
						break;
				}
			}
		}

		if ( streamingMediaType ) {
			if ( details.url.endsWith('#direct-view') ) {
				return {};
			}

			chrome.tabs.update(details.tabId, {
				url: chrome.runtime.getURL(
					'viewer.html#' + streamingMediaType + ':'
						+ details.url.replace(/#.*/, '')
				)
			});

			return {cancel: true};
		}

		if ( !isMedia ) {
			return {};
		}

		if ( headers['content-security-policy'] ) {
			headers['content-security-policy'].value = '';
		}

		if ( dispHeader && prefs.forceInlineMedia ) {
			dispHeader.value = dispHeader.value.replace(
				/^\s*attachment/i,
				'inline'
			);
		}

		return {responseHeaders: details.responseHeaders};
	};

	this.unWatchReceivedHeaders = function() {
		chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceived);
		this.unWatchReceivedHeaders = null;
	};

	chrome.webRequest.onHeadersReceived.addListener(onHeadersReceived, {
		urls: ['<all_urls>'],
		types: ['main_frame']
	}, ['responseHeaders', 'blocking']);
};

vAPI.watchDataTabs = function() {
	if ( !chrome.webNavigation ) {
		return;
	}

	let onBeforeNavigate = function(details) {
		if ( details.parentFrameId !== -1 ) {
			return;
		}

		chrome.tabs.update(details.tabId, {
			url: chrome.runtime.getURL('viewer.html#' + details.url)
		});
	};

	chrome.webNavigation.onBeforeNavigate.addListener(
		onBeforeNavigate,
		{url: [{urlMatches: '^data:(?:image|audio|video)/'}]}
	);

	this.unWatchDataTabs = function() {
		this.unWatchDataTabs = null;
		chrome.webNavigation.onBeforeNavigate.removeListener(onBeforeNavigate);
	};
};
