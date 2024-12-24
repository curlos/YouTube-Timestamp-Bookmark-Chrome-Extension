/**
 * @description Get the active tab.
 * @param {Function} sendResponse
 * @returns {Object}
 */
async function getActiveTab(sendResponse) {
	const tabs = await chrome.tabs.query({
		currentWindow: true,
		active: true,
	});

	if (sendResponse) {
		sendResponse(tabs[0]);
	}

	return tabs[0];
}

/**
 * @description Formats a number of seconds into a timestamp string formatted like HH:MM:SS. For example, 300 seconds would be "05:00". 3600 seconds (1 hour) would be 01:00:00.
 * @param {Number} seconds
 * @returns {String}
 */
const formatTime = (seconds) => {
	// Calculate hours, minutes, and remaining seconds
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	// Pad the numbers with leading zeros where necessary
	const formattedMinutes = String(minutes).padStart(2, '0');
	const formattedSeconds = String(remainingSeconds).padStart(2, '0');

	if (hours > 0) {
		const formattedHours = String(hours).padStart(2, '0');
		return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
	} else {
		return `${formattedMinutes}:${formattedSeconds}`;
	}
};

/**
 * @description Capture the visual frame of a video by taking the video element at the current time, drawing it on an HTML Canvas, and then converting that into a Data URL for that timestamp that can be used as an image's URL to display the image of the frame from that timestamp.
 * @param {HTMLVideoElement} videoElement
 * @param {Number} timestamp
 * @returns {String} A "Data URL" string. For example, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...". The main thing to know is that these strings are HUGE compared to a normal string so they won't fit in Chrome's Storage.
 */
const captureFrameAtTimestamp = async (videoElement, timestamp) => {
	if (!videoElement) {
		throw new Error('Video element not provided');
	}

	return new Promise((resolve, reject) => {
		if (videoElement.readyState < 2) {
			reject('Video is not ready for playback');
			return;
		}

		const onSeeked = () => {
			try {
				// Create a canvas, draw the videoElement at that specific timestamp, and convert it to a dataUrl.
				const canvas = document.createElement('canvas');
				canvas.width = videoElement.videoWidth;
				canvas.height = videoElement.videoHeight;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
				const dataUrl = canvas.toDataURL('image/png');

				resolve(dataUrl);
			} catch (error) {
				reject('Failed to capture frame: ' + error.message);
			} finally {
				videoElement.removeEventListener('seeked', onSeeked);
			}
		};

		// Add the listener before setting currentTime to avoid any race condition
		videoElement.addEventListener('seeked', onSeeked, { once: true });

		// Set currentTime after adding listener
		videoElement.currentTime = timestamp;
	});
};

/**
 * @description Get an SVG Icon from a list of FontAwesome SVGs.
 * @param {String} name
 * @param {String} color
 * @param {String} width
 * @param {String} height
 * @returns {String}
 */
const getIconSVG = (name, color = 'white', width = '16px', height = '16px') => {
	const getIconSVGPath = () => {
		switch (name) {
			case 'bookmark':
				return `<path fill="${color}" d="M0 48C0 21.5 21.5 0 48 0l0 48 0 393.4 130.1-92.9c8.3-6 19.6-6 27.9 0L336 441.4 336 48 48 48 48 0 336 0c26.5 0 48 21.5 48 48l0 440c0 9-5 17.2-13 21.3s-17.6 3.4-24.9-1.8L192 397.5 37.9 507.5c-7.3 5.2-16.9 5.9-24.9 1.8S0 497 0 488L0 48z"/>`;
			case 'play':
				return `<path fill="${color}" d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/>`;
			case 'delete':
				return `<path fill="${color}" d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/>`;
			case 'menu':
				return `<path fill="${color}" d="M0 96C0 78.3 14.3 64 32 64l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 128C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 288c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32L32 448c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c17.7 0 32 14.3 32 32z"/>`;
			case 'settings':
				return `<path fill="${color}" d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/>`;
			case 'pen-to-square':
				return `<path fill="${color}" d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160L0 416c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 64z"/>`;
		}
	};

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="${width}" height="${height}">
            <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
            ${getIconSVGPath()}
        </svg>`;
};

/**
 * @description Using a "keyProperty", go through an array of objects and create a new object with the keys being the value of the "keyProperty" for each object.
 * @param {Array} array
 * @param {any} keyProperty
 * @param {Boolean} isNumberAndRoundDown Only used for a very specific use case. "time" comes back as a decimal. This will round it down to a whole number.
 * @returns
 */
const arrayToObjectByKey = (array, keyProperty, isNumberAndRoundDown = false) => {
	return array.reduce((acc, obj) => {
		const key = keyProperty ? (isNumberAndRoundDown ? Math.floor(obj[keyProperty]) : obj[keyProperty]) : obj;
		acc[key] = obj;
		return acc;
	}, {});
};

/**
 * @description Parses the URL string to get the Video ID of the YouTube Shorts Video.
 * @param {String} url
 * @returns {String}
 */
const getYouTubeShortsVideoId = (url) => {
	const match = url.match(/\/shorts\/([^/?]+)/);
	const shortsId = match ? match[1] : null; // Exclude query params
	return shortsId;
};

const waitForContentScriptWithInterval = (tabId, callback) => {
	// Set up a variable to track the interval ID
	const intervalId = setInterval(() => {
		chrome.tabs.sendMessage(
			tabId,
			{ type: 'check-ready' }, // Message to check readiness
			(response) => {
				console.log(response);

				if (chrome.runtime.lastError || !response?.ready) {
					console.log('ERROR');
					console.log(response);
					// Content script is not ready yet, continue polling
					return;
				}

				// Content script is ready, clear the interval
				clearInterval(intervalId);

				// Proceed with the actual message
				callback();
			}
		);
	}, 100); // Check every 100ms
};
