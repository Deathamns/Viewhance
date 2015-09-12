/* global win, errorHandler, drawFullFrame */

'use strict';

var $ = function(id) {
	return document.getElementById(id);
};

var crc32 = (function() {
	var c, k;
	var n = 0;
	var crcTable = [];

	for ( ; n < 256; ++n ) {
		for ( c = n, k = 0; k < 8; ++k ) {
			c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1;
		}

		crcTable[n] = c;
	}

	return function(s) {
		var i = 0;
		var length = s.length;
		var crc = -1;

		while ( i < length ) {
			crc = crcTable[(crc ^ s.charCodeAt(i++)) & 0xff] ^ crc >>> 8;
		}

		return crc ^ -1;
	};
})();

var BinaryTools = function(data) {
	this.pos = 0;
	this.data = data;
	this.length = data.length;
	this.littleEndian = false;
	this.zeropad = '00000000';

	this.readByte = function(position) {
		var pos = position === void 0 || position < 0 ? this.pos++ : position;
		return this.data.charCodeAt(pos) & 0xff;
	};

	this.readString = function(length, position) {
		var pos;

		if ( position === void 0 || position < 0 ) {
			pos = this.pos;
			this.pos += length || 0;
		} else {
			pos = position;
		}

		return this.data.substr(pos, length || 0);
	};

	this.readBits = function(length, pos) {
		var curbyte;
		var bitarray = [];
		var i = 0;

		while ( i++ < length ) {
			curbyte = this.readByte(pos).toString(2);
			bitarray.push(
				this.zeropad.substr(0, this.zeropad.length - curbyte.length) + curbyte
			);
		}

		return (this.littleEndian ? bitarray.reverse() : bitarray).join('');
	};

	this.readInt = function(bytes, position) {
		if ( bytes < 1 ) {
			return null;
		}

		var pos;

		if ( position === void 0 || position < 0 ) {
			pos = this.pos;
			this.pos += bytes;
		} else {
			pos = position;
		}

		var i;
		var integer = 0;

		if ( this.littleEndian ) {
			i = bytes - 1;

			while ( i >= 0 ) {
				integer += this.readByte(pos + i) << i-- * 8;
			}
		} else {
			i = 0;

			while ( i < bytes ) {
				integer += this.readByte(pos + i++) << (bytes - i) * 8;
			}
		}

		return integer >>> 0;
	};

	this.intToBytes = function(integer, numberOfBytes) {
		var i = numberOfBytes || 4;
		var bytes = [];

		while ( i-- ) {
			bytes.push(integer >> i * 8 & 0xff);
		}

		return String.fromCharCode.apply(
			null,
			this.littleEndian ? bytes.reverse() : bytes
		);
	};
};

if ( !win.opera ) {
	// Solves utf8 problems
	win.btoa = function(b64str) {
		var b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
		var c1, c2;
		var pos = 0;
		var res = '';
		var mod = b64str.length % 3;
		var l = b64str.length - mod;

		while ( pos < l ) {
			c1 = b64str.charCodeAt(pos++) & 0xff;
			c2 = b64str.charCodeAt(pos++) & 0xff;
			res += b64chars[c1 >> 2];
			res += b64chars[(c1 & 3) << 4 | c2 >> 4];
			c1 = b64str.charCodeAt(pos++) & 0xff;
			res += b64chars[(c2 & 0x0f) << 2 | c1 >> 6];
			res += b64chars[c1 & 0x3f];
		}

		if ( mod ) {
			c1 = b64str.charCodeAt(pos++) & 0xff;
			res += b64chars[c1 >> 2];

			if ( mod === 1 ) {
				res += b64chars[(c1 & 3) << 4];
				res += '==';
			} else {
				c2 = b64str.charCodeAt(pos++) & 0xff;
				res += b64chars[(c1 & 3) << 4 | c2 >> 4];
				res += b64chars[(c2 & 0x0f) << 2];
				res += '=';
			}
		}

		return res;
	};
}

var maxSize = 20 * 1024 * 1024;
var xhr = new win.XMLHttpRequest;

xhr.overrideMimeType('text/plain; charset=x-user-defined');
xhr.addEventListener('readystatechange', function() {
	if ( this.readyState === 2 ) {
		var contentLength = this.getResponseHeader('Content-Length');

		if ( contentLength && contentLength > maxSize ) {
			this.abort();
			errorHandler('Image is too large...');
			return;
		}
	}

	if ( !this.responseText ) {
		return;
	}

	if ( !this.imgType ) {
		// PNG or GIF or WEBP signature
		imgHead = /^(?:\x89(PNG)\r\n\x1a\n|(GIF)8[79]a|RIFF....(WEBP)VP8X)/;

		this.imgType = this.responseText.match(imgHead);

		// Seems like in some cases a character encoding is applied anyway,
		// however it's enough to check only the signature
		if ( !this.imgType && (this.responseText[1] === 'P' && (chunkSize = 8)
			|| this.responseText[0] === 'G' && (chunkSize = 6)
			|| this.responseText[0] === 'R' && (chunkSize = 16)) ) {
			this.imgType = this.responseText.slice(0, chunkSize).split('');

			for ( i = 0; i < this.imgType.length; ++i ) {
				this.imgType[i] = this.imgType[i].charCodeAt(0) & 0xff;
			}

			this.imgType = String.fromCharCode.apply(null, this.imgType).match(imgHead);
		}

		if ( !this.imgType ) {
			this.abort();
			errorHandler('Not animated...');
			return;
		}

		this.imgType = this.imgType[2] || this.imgType[1] || this.imgType[3];
	}

	if ( this.readyState !== 4 ) {
		/* || this.status !== 200*/
		return;
	}

	if ( this.responseText.length > maxSize ) {
		errorHandler('Image is too large...');
		return;
	}

	var i, IHDR, chunkType, chunkSize;
	var frames = [];
	var bin = new BinaryTools(this.responseText);
	var animation = {};
	var imgHead = '';

	if ( this.imgType === 'PNG' ) {
		// https://wiki.mozilla.org/APNG_Specification

		// Skip signature
		bin.pos = 8;

		while ( bin.pos < bin.length ) {
			// Read the chunk type
			chunkType = bin.readString(4, bin.pos + 4);

			// console.log(i, chunkType, bin.readInt(4, bin.pos));

			if ( chunkType === 'IHDR' ) {
				// Skip chunk length and name
				bin.pos += 8;
				animation.width = bin.readInt(4);
				animation.height = bin.readInt(4);
				IHDR = bin.readString(5);
				// Skip crc
				bin.pos += 4;
			} else if ( !frames.length && chunkType === 'acTL' ) {
				animation.numFrames = bin.readInt(4, bin.pos + 8);
				animation.numPlays = bin.readInt(4, bin.pos + 12);
				bin.pos += 20;
			} else if ( chunkType === 'fcTL' ) {
				bin.pos += 12;
				i = frames.length;

				frames.push({
					width: bin.readInt(4),
					height: bin.readInt(4),
					xOffset: bin.readInt(4),
					yOffset: bin.readInt(4),
					delay: 1000 * bin.readInt(2) / (bin.readInt(2) || 100),
					disposeOp: bin.readInt(1),
					blendOp: bin.readInt(1),
					data: 'IDAT'
				});

				if ( i === 0 && frames[i].disposeOp === 2 ) {
					frames[i].disposeOp = 1;
				}

				// Skip crc
				bin.pos += 4;
				// console.log(frames[frames.length - 1]);
			} else if ( chunkType === 'IDAT' || chunkType === 'fdAT' ) {
				if ( !animation.numFrames || animation.numFrames < 2 ) {
					break;
				// IDAT without acTL chunk should be ignored
				} else if ( chunkType === 'IDAT' && !frames.length ) {
					// console.log('PNG: ignoring IDAT from animation...');
					bin.pos += bin.readInt(4, bin.pos) + 12;
					continue;
				}

				i = chunkType === 'fdAT' ? 4 : 0;
				// Read the length, also skip the sequence number from fdAT
				chunkSize = bin.readInt(4) - i;
				// Skip chunk type,
				// also the sequence number in case of the fdAT chunk type
				bin.pos += 4 + i;

				frames[frames.length - 1].data += bin.readString(chunkSize);

				// Skip crc
				bin.pos += 4;
			} else if ( !frames.length ) {
				// Read the full chunk (length + chunk type + chunkdate + crc)
				imgHead += bin.readString(bin.readInt(4, bin.pos) + 12);
			} else {
				bin.pos += bin.readInt(4, bin.pos) + 12;
			}
		}
	} else if ( this.imgType === 'GIF' ) {
		// http://www.w3.org/Graphics/GIF/spec-gif89a.txt

		bin.littleEndian = true;
		bin.skipSubBlock = function() {
			do {
				this.pos += this.readInt(1, this.pos) + 1;

				if ( bin.pos >= bin.length ) {
					throw this.imgType + ': end reached...';
				}
			} while ( this.readInt(1, this.pos) !== 0x00 );

			++this.pos;
		};

		// Skip signature
		bin.pos = 6;

		// Logical Screen Descriptor
		animation.width = bin.readInt(2);
		animation.height = bin.readInt(2);

		bin.packed = bin.readBits(1, 10);
		bin.packed = bin.packed[0] === '1'
			? 3 * 1 << parseInt(bin.packed.slice(-3), 2) + 1
			: 0;

		imgHead += bin.readString(3 + bin.packed);
		// Frame index
		i = 0;

		while ( bin.pos < bin.length ) {
			chunkType = bin.readString(1);
			// console.log("sentinel: " + chunkType);

			// Extension block (0x21, an exclamation point '!')
			// optional
			if ( chunkType === '!' ) {
				chunkType = bin.readInt(1);
				// console.log("ext_label: " + chunkType.toString(16));

				// Plain Text Extension
				if ( chunkType === 0x01 ) {
					// No support for this, so skip
					bin.pos += 13;
					bin.skipSubBlock();
				// Graphics Control Extension
				} else if ( chunkType === 0xf9 ) {
					bin.packed = bin.readBits(1, bin.pos + 1);

					frames.push({
						delay: bin.readInt(2, bin.pos + 2) * 10 || 100,
						// -1 in order to match PNG's indexes, also treat 0 as 1
						disposeOp: Math.max(0, parseInt(bin.packed.slice(3, -2), 2) - 1),
									// sentinel + ext_label
						data: bin.readString(4, bin.pos - 2) +
									// with zero delay
									bin.intToBytes(0, 2) +
									// transparent color index + block terminator
									bin.readString(2, bin.pos + 4)
					});

					bin.pos += 6;
				// Comment Block Extension
				} else if ( chunkType === 0xfe ) {
					bin.skipSubBlock();
				// Application Block Extension
				} else if ( chunkType === 0xff ) {
					bin.pos += 12;
					bin.skipSubBlock();
				// Try to skip anything else
				} else {
					bin.pos = bin.data.indexOf('\x00', bin.pos);

					if ( bin.pos === -1 ) {
						bin.pos = bin.length;
					} else {
						++bin.pos;
					}
				}
			// Image (0x2C, a comma ',')
			} else if ( chunkType === ',' ) {
				if ( !frames[i] ) {
					frames.push({
						delay: 100,
						disposeOp: 0,
						// sentinel, ext_label, block size, packed field, delay,
						// transparent color index, terminator
						data: '\x21\xf9\x04\x00\x00\x00\x00\x00'
					});
				}

				frames[i].xOffset = bin.readInt(2);
				frames[i].yOffset = bin.readInt(2);

				bin._pos = bin.pos;

				frames[i].width = bin.readInt(2);
				frames[i].height = bin.readInt(2);

				bin.packed = bin.readBits(1);
				bin.pos += bin.packed[0] === '1'
					? 3 * (1 << parseInt(bin.packed.slice(-3), 2) + 1)
					: 0;

				// LZW minimum code size
				++bin.pos;

				bin.skipSubBlock();

				frames[i]._data = [bin.pos - bin._pos, bin._pos];

				++i;
			// Trailer (0x3B, a semi-colon ';') or something else
			} else {
				break;
			}
		}
	} else if ( this.imgType === 'WEBP' ) {
		// https://developers.google.com/speed/webp/docs/riff_container

		bin.littleEndian = true;

		// WebP file header + VP8X and its chunk size
		bin.pos = 20;
		// VP8X flags
		bin.packed = bin.readBits(1);

		// Animation flag
		if ( bin.packed[6] === '0' ) {
			errorHandler(this.imgType + ': not animated...');
			return;
		}

		// Reserved 24 bits
		bin.pos += 3;
		// Canvas width
		animation.width = bin.readInt(3) + 1;
		// Canvas height
		animation.height = bin.readInt(3) + 1;

		while ( bin.pos < bin.length ) {
			chunkType = bin.readString(4);

			if ( chunkType === 'ANIM' ) {
				// Skip Background Color: 32 bits + Loop Count: 16 bits
				// chunk size + chunk payload
				bin.pos += 4 + bin.readInt(4);
				animation.ANIM = true;
				continue;
			}

			if ( chunkType !== 'ANMF' ) {
				// Skip chunk
				bin.pos += 4 + bin.readInt(4);
				continue;
			}

			if ( !animation.ANIM ) {
				errorHandler(this.imgType + ': ANIM chunk not found!');
				return;
			}

			i = frames.length;
			// Size of the Frame Data
			chunkSize = bin.readInt(4);
			// If the chunk size is odd, then a padding byte is added
			chunkSize += chunkSize & 1;
			// Remove the size of the ANMF properties listed below
			chunkSize -= 16;

			frames.push({
				xOffset: bin.readInt(3) * 2,
				yOffset: bin.readInt(3) * 2,
				width: bin.readInt(3) + 1,
				height: bin.readInt(3) + 1,
				delay: bin.readInt(3),
				disposeOp: bin.readInt(1) & 1,
				data: ''
			});

			bin._pos = bin.pos + chunkSize;

			while ( bin.pos < bin._pos ) {
				chunkType = bin.readString(4);
				chunkSize = bin.readInt(4);
				chunkSize += chunkSize & 1;

				// Should exist before the 'VP8 ' chunk only
				/* if ( chunkType === 'ALPH' ) {
					if ( bin.readString(4, bin.pos + chunkSize) === 'VP8 ' ) {
						// The whole ALPH chunk
						frames[i].data += bin.readString(8, bin.pos - 8);
						frames[i].data += bin.readString(chunkSize);
					} else {
						bin.pos += chunkSize;
					}
				} else */
				if ( chunkType === 'VP8 ' || chunkType === 'VP8L' ) {
					// chunk type + chunk size + VP8? bitstream;
					frames[i].data += bin.readString(8, bin.pos - 8);
					frames[i].data += bin.readString(chunkSize);
				} else {
					bin.pos += chunkSize;
				}
			}

			// frames[i].data += bin.readString(chunkSize);
		}
	}

	if ( frames.length < 1 ) {
		errorHandler(this.imgType + ': not animated...');
		return;
	}

	var generateImageSRC, wrap, speed, currentFrame;
	var canvas = document.createElement('canvas');
	var ctx = canvas.getContext('2d');
	// "new Image" doesn't work in Maxthon
	var img = document.createElement('img');

	canvas.width = animation.width;
	canvas.height = animation.height;

	if ( this.imgType === 'PNG' ) {
		chunkSize = bin.intToBytes(13);
		var imgEnd = bin.readString(12, bin.length - 12);

		generateImageSRC = function() {
			var frm = frames[frames.idx];
			var _IHDR = 'IHDR' +
				bin.intToBytes(frm.width) +
				bin.intToBytes(frm.height) +
				IHDR;

			_IHDR += bin.intToBytes(crc32(_IHDR));

			return 'data:image/png;base64,' + win.btoa(
				'\x89PNG\r\n\x1a\n' +
				chunkSize + _IHDR +
				imgHead +
				bin.intToBytes(frm.data.length - 4) + frm.data +
				bin.intToBytes(crc32(frm.data)) +
				imgEnd
			);
		};
	} else if ( this.imgType === 'GIF' ) {
		chunkSize = bin.intToBytes(0, 2);
		chunkSize = ',' + chunkSize + chunkSize;

		generateImageSRC = function() {
			var frm = frames[frames.idx];

			return 'data:image/gif;base64,' + win.btoa(
				'GIF89a' +
				bin.intToBytes(frm.width, 2) + bin.intToBytes(frm.height, 2) +
				imgHead +
				frm.data + chunkSize +
				bin.readString(frm._data[0], frm._data[1]) +
				';'
			);
		};
	} else if ( this.imgType === 'WEBP' ) {
		generateImageSRC = function() {
			var frm = frames[frames.idx];

			return 'data:image/webp;base64,' + win.btoa(
				'RIFF' + bin.intToBytes(frm.data.length + 4) + 'WEBP' + frm.data
			);
		};
	}

	var onImgLoad = function() {
		if ( drawFullFrame ) {
			var frame = frames[frames.idx];
			var prev = frames[frames.idx - 1];

			if ( prev ) {
				if ( prev.disposeOp === 1 ) {
					ctx.clearRect(
						prev.xOffset, prev.yOffset,
						prev.width, prev.height
					);
				} else if ( prev.disposeOp === 2 ) {
					ctx.putImageData(
						this.prevDisposeData,
						prev.xOffset, prev.yOffset
					);
				}
			}

			if ( frame.disposeOp === 2 ) {
				this.prevDisposeData = ctx.getImageData(
					frame.xOffset, frame.yOffset,
					frame.width, frame.height
				);
			}

			// only for PNG
			if ( frame.blendOp === 0 ) {
				ctx.clearRect(
					frame.xOffset, frame.yOffset,
					frame.width, frame.height
				);
			}

			ctx.drawImage(
				this,
				frame.xOffset, frame.yOffset
			);
		}

		var c = canvas.cloneNode(false);

		if ( drawFullFrame ) {
			c.getContext('2d').putImageData(
				ctx.getImageData(0, 0, canvas.width, canvas.height),
				0, 0
			);
		} else {
			c.width = this.width;
			c.height = this.height;
			c.getContext('2d').drawImage(this, 0, 0);
		}

		wrap.appendChild(c);
		this.removeAttribute('src');
		c.style.display = 'inline-block';

		if ( c.previousElementSibling ) {
			c.previousElementSibling.style.display = '';
		}

		++frames.idx;
		currentFrame.value = frames.idx;

		processNextFrame(); // eslint-disable-line
	};

	var processNextFrame = function() {
		if ( frames.idx < frames.length ) {
			img.src = generateImageSRC();
			frames[frames.idx].data = null;
		} else {
			img.removeEventListener('load', onImgLoad);
			img = null;
			done();
			errorHandler(null);
		}
	};

	var done = function() {
		wrap.current = 0;
		wrap.children[wrap.children.length - 1].style.display = '';
		wrap.children[wrap.current].style.display = 'inline-block';
		currentFrame.value = 1;

		var onWrapMouseUp = function(e) {
			if ( e.button !== 0 ) {
				return;
			}

			if ( e.ctrlKey ) {
				if ( e.target.toDataURL && speed.value < 1 ) {
					var canvasImg = document.createElement('img');
					canvasImg.src = e.target.toDataURL();
					this.replaceChild(canvasImg, e.target);
					wrap.step(null);
				}

				return;
			}

			this.stop();

			if ( this.classList.contains('showall') ) {
				if ( e.target && e.target.parentNode === wrap ) {
					currentFrame.value = [].indexOf.call(wrap.childNodes, e.target) + 1;
					wrap.step(null);
				}

				this.addEventListener(vAPI.browser.wheel, this.wheeler, false);
			} else {
				this.removeEventListener(vAPI.browser.wheel, this.wheeler, false);
			}

			this.classList.toggle('showall');
		};

		wrap.addEventListener('mouseup', onWrapMouseUp);
		wrap.addEventListener(vAPI.browser.wheel, wrap.wheeler, false);
		currentFrame.addEventListener(vAPI.browser.wheel, wrap.wheeler, false);

		currentFrame.addEventListener('input', function() {
			if ( parseFloat(speed.value, 10) !== 0 ) {
				wrap.stop();
			}

			if ( wrap.classList.contains('showall') ) {
				onWrapMouseUp.call(wrap, {button: 0});
			}

			wrap.step(null);
		});

		speed.addEventListener('input', function() {
			wrap.speedValue = parseFloat(speed.value) || 0;

			if ( wrap.speedValue === 0 ) {
				wrap.stop();
				wrap.addEventListener(vAPI.browser.wheel, wrap.wheeler, false);
				return;
			}

			wrap.classList.remove('showall');
			wrap.removeEventListener(vAPI.browser.wheel, wrap.wheeler, false);
			wrap.animate();
		});

		wrap.wheeler = function(e) {
			wrap.step((e.deltaY || -e.wheelDelta) > 0);
			wrap.sotp();
			e.preventDefault();
			e.stopImmediatePropagation();
		};

		wrap.animate = function() {
			clearTimeout(wrap.animationTimer);
			wrap.step(wrap.speedValue < 0);

			if ( wrap.speedValue ) {
				wrap.animationTimer = setTimeout(
					wrap.animate,
					frames[wrap.current].delay / Math.abs(wrap.speedValue)
				);
			}
		};

		wrap.stop = function() {
			clearTimeout(this.animationTimer);
			speed.value = 0;
		};

		wrap.step = function(backward) {
			wrap.children[wrap.current].style.display = '';

			if ( backward === null ) {
				wrap.current = Math.max(
					1,
					Math.min(
						parseInt(currentFrame.value, 10) || 1,
						currentFrame.max
					)
				) - 1;
			} else if ( backward ) {
				--wrap.current;
			} else {
				++wrap.current;
			}

			if ( wrap.current >= wrap.children.length ) {
				wrap.current = 0;
			} else if ( wrap.current < 0 ) {
				wrap.current = wrap.children.length - 1;
			}

			wrap.children[wrap.current].style.display = 'inline-block';
			currentFrame.value = wrap.current + 1;
			currentFrame.nextElementSibling.value = currentFrame.value
				+ ' / ' + frames.length;
		};
	};

	img.addEventListener('load', onImgLoad);

	img.addEventListener('error', function() {
		wrap.textContent = xhr.imgType
			+ ': frame (' + (frames.idx + 1) + ") couldn't be parsed!";
		wrap.appendChild(this);
	});

	wrap = document.body;
	wrap.className = 'frames';
	wrap.textContent = '';
	vAPI.buildNodes(wrap, [
		{tag: 'a', attrs: {
			'class': 'back',
			href: win.location.href
		}, text: '\u2190'},
		' ',
		{tag: 'input', attrs: {
			type: 'number',
			id: 'speed',
			style: 'width: 55px; text-align: center;',
			value: 0,
			step: 0.5,
			min: -10,
			max: 10
		}}, 'x ',
		{tag: 'input', attrs: {
			type: 'range',
			id: 'current-frame',
			style: 'width: 500px; vertical-align: middle;',
			size: 6,
			value: 1,
			step: 1,
			min: 1
		}}, ' ',
		{tag: 'output', attrs: {
			'for': 'currentFrame'
		}, text: '1 / ' + frames.length}, ' ',
		{tag: 'div', attrs: {id: 'frames'}}
	]);

	wrap = $('frames');
	speed = $('speed');
	currentFrame = $('current-frame');
	currentFrame.max = frames.length;
	frames.idx = 0;
	processNextFrame();
});

xhr.addEventListener('error', function() {
	errorHandler('Failed to load!');
});

xhr.open('GET', win.location.href, true);
xhr.send();
