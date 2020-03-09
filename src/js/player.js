/* globals dashjs, Hls */
/* eslint indent:"off" */

'use strict';

(function() {

let startPlayer = function() {
	startPlayer = null;

	let media = document.body.querySelector('video');

	let onQualityChanged = function() {
		media.dispatchEvent(new CustomEvent('qualityChanged', {bubbles: false}));
	};

	let onError = function() {
		media.dispatchEvent(new Event('error', {bubbles: false}));
	};

	let generateQualityList = function(list, indexProp = null) {
		let i = list.length;
		let qualityList = [];

		while ( i-- ) {
			let quality = list[i];
			qualityList.push({
				index: indexProp ? quality[indexProp] : i,
				name: [
					quality.width + '×' + quality.height,
					(quality.bitrate / 1e6).toFixed(2) + 'Mbit/s'
				].join(' ')
			});
		}

		return media._qualityList = qualityList;
	};

	if ( vAPI.extraFormat === 'dash' || vAPI.extraFormat === 'mss' ) {
		let dash = dashjs.MediaPlayer().create();

		/*if ( protData ) {
			dash.setProtectionData(protData);
		}*/

		dash.updateSettings({
			streaming: {
				fastSwitchEnabled: true,
				abr: {
					autoSwitchBitrate: {
						video: false
					},
					minBitrate: {
						video: 1000000
					}
				}
			}
		});

		dash.initialize(media, vAPI.extraFormatUrl, false);

		dash.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function() {
			generateQualityList(
				dash.getBitrateInfoListFor('video'),
				'qualityIndex'
			);
		});

		dash.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, onQualityChanged);

		dash.on(dashjs.MediaPlayer.events.ERROR, function() {
			dash.reset();
			onError();
		});

		media.getQuality = function() {
			return dash.getQualityFor('video');
		};

		media.setQuality = function(index) {
			dash.updateSettings({streaming: {abr: {
				autoSwitchBitrate: {video: false}
			}}});
			dash.setQualityFor('video', index);
		};
	} else if ( vAPI.extraFormat === 'hls' ) {
		let hls = new Hls({enableWorker: !vAPI.firefox});
		hls._recoverAttempted = 0;
		hls.attachMedia(media);
		hls.loadSource(vAPI.extraFormatUrl);

		hls.on(Hls.Events.MANIFEST_PARSED, function() {
			hls.currentLevel = hls.levels.length - 1;
			generateQualityList(hls.levels);
			media.play();
		});

		hls.on(Hls.Events.LEVEL_SWITCHED, onQualityChanged);

		hls.on(Hls.Events.ERROR, function(ev, data) {
			if ( !data.fatal ) {
				return;
			}

			// https://video-dev.github.io/hls.js/latest/docs/API.html#fatal-error-recovery
			if ( Hls._recoverAttempted > 1 ) {
				hls.destroy();
				onError();
				return;
			}

			switch ( data.type ) {
				case Hls.ErrorTypes.NETWORK_ERROR:
					hls.startLoad();
					break;

				case Hls.ErrorTypes.MEDIA_ERROR:
					if ( Hls._recoverAttempted === 1 ) {
						hls.swapAudioCodec();
					}

					Hls._recoverAttempted++;
					hls.recoverMediaError();
					break;

				default: hls.destroy();
			}
		});

		media.getQuality = function() {
			return hls.currentLevel;
		};

		media.setQuality = function(index) {
			hls.loadLevel = index;
			hls.nextLevel = index;
			hls.currentLevel = index;
		};
	}
};

let jsLibUrl;
let jsLibs = {
	dash: ['./js/lib/dash.all.min.js'],
	mss: ['./js/lib/dash.all.min.js', './js/lib/dash.mss.min.js'],
	hls: ['./js/lib/hls.min.js']
}[vAPI.extraFormat];

while ( jsLibUrl = jsLibs.shift() ) {
	let script = document.createElement('script');

	if ( !jsLibs.length ) {
		script.onload = startPlayer;
	}

	script.async = false;
	script.src = jsLibUrl;
	document.head.appendChild(script);
}

})();
