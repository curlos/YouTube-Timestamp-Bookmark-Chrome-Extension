// This is needed to get async/await working with "chrome.runtime.onMessage.addListener". Chrome still doesn't support Promise in the returned value of onMessage listener both in ManifestV3 and V2. This code is from StackOverflow: https://stackoverflow.com/questions/53024819/sendresponse-not-waiting-for-async-function-or-promises-resolve
const { onMessage } = chrome.runtime;
const { addListener } = chrome.runtime.onMessage;

onMessage.addListener = (fn) =>
	addListener.call(onMessage, (msg, sender, respond) => {
		const res = fn(msg, sender, respond);
		if (res instanceof Promise) return !!res.then(respond, console.error);
		if (res !== undefined) respond(res);
	});

// Global Variables
let youtubeRightControls = null;
let videoElem = null;
let currentVideoId = '';
// "currentVideoType" can either be "watch" or "shorts".
let currentVideoType = '';
let currentVideoBookmarks = [];
let currentVideoFullObj = null;
let activeTab = null;
let userSettings = null;

/**
 * @description Fetch the array of bookmarks for the current video. If no bookmarks, will return an empty array.
 * @returns {Array<Object>}
 */
const fetchBookmarks = async () => {
	if (!currentVideoId) {
		await getCurrentVideoId();
	}

	const obj = await chrome.storage.sync.get(currentVideoId);
	currentVideoBookmarks = obj[currentVideoId] ? JSON.parse(obj[currentVideoId]).bookmarks : [];
	currentVideoFullObj = obj[currentVideoId];
};

/**
 * @description Add a new bookmark to the current video using the current time.
 */
const handleAddNewBookmark = async () => {
	const bookmarkButtons = Array.from(document.querySelectorAll('.bookmark-btn'));
	bookmarkButtons.forEach((bookmarkButton) => {
		bookmarkButton.disabled = true;
	});

	const currentTime = videoElem.currentTime;
	const newBookmark = {
		time: currentTime,
		note: '',
	};

	await fetchBookmarks();
	const newCurrentVideoBookmarks = [...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time);

	const title = (currentVideoFullObj && currentVideoFullObj.title) || activeTab.title;
	const thumbnailImageSrc = (currentVideoFullObj && currentVideoFullObj.thumbnailImageSrc) || getThumbnailUrl();
	const videoType = currentVideoType;

	const newCurrentVideoBookmarksStr = JSON.stringify({
		bookmarks: newCurrentVideoBookmarks,
		title,
		thumbnailImageSrc,
		videoType,
		updatedAt: new Date(),
	});

	await chrome.storage.sync.set({
		[currentVideoId]: newCurrentVideoBookmarksStr,
	});

	// Get the updated bookmarks with the newly added one.
	await fetchBookmarks();

	// Open the popup after adding the bookmark to show it in the list of bookmarks.
	await chrome.runtime.sendMessage({ type: 'open-popup' });
};

/**
 * @description Gets the thumbnail's image URL for a video.
 * @returns {String}
 */
const getThumbnailUrl = () => {
	if (currentVideoType === 'watch') {
		// Luckily, this script DOM element is dynamic on page-by-page basis so even if we go to a new video, it currently has the updated video information.
		const scriptJsonElemList = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

		for (let scriptJsonElem of scriptJsonElemList) {
			if (scriptJsonElem.textContent) {
				// TODO: Uncaught (in promise) SyntaxError: Bad escaped character in JSON at position 194 (line 1 column 195) for this video "https://www.youtube.com/watch?v=UnKW7bL8HEI"
				const scriptJsonObj = JSON.parse(scriptJsonElem.textContent);
				const { thumbnailUrl: thumbnailUrlArray } = scriptJsonObj || {};

				if (thumbnailUrlArray) {
					return thumbnailUrlArray[0];
				}
			}
		}
	}

	if (currentVideoType === 'shorts') {
		// This doesn't technically get the thumbnail but rather the first frame of the video "frame0". It's possible to get the thumbnail of a short in the elements but as soon as you scroll to the next short, that DOM element will become stale and will reference the previous short (or the first short). Thus, the most reliable "thumbnail" image is the first frame of the video.
		return `https://i.ytimg.com/vi/${currentVideoId}/frame0.jpg`;
	}

	return '';
};

/**
 * @description When a new video is loaded, get that video's bookmarks and add the bookmark button to the video player's right controls if it hasn't been added yet.
 */
const addBookmarkButtonToVideo = async () => {
	await fetchBookmarks();

	if (currentVideoId) {
		if (!videoElem) {
			videoElem = await getAndWaitForVideoToExist();
		}

		const bookmarkBtnExists = document.getElementsByClassName('bookmark-btn')[0];

		if (!bookmarkBtnExists || currentVideoType === 'shorts') {
			switch (currentVideoType) {
				case 'watch':
					// Add the bookmark button to the "right" controls.
					const bookmarkBtnElement = createAndGetBookmarkBtnElement();
					youtubeRightControls = document.getElementsByClassName('ytp-right-controls')[0];
					youtubeRightControls.insertBefore(bookmarkBtnElement, youtubeRightControls.firstChild);
					break;
				case 'shorts':
					// "Shorts" work differently than normal videos. On a normal video page, you'll have only video element with a set of left and right controls so I'd only have to edit the one set of controls. However, with a short, there's infinite scrolling. For YouTube to have infinite scrolling enabled, they load many "Shorts" at once. So, if we're on a shorts video page, there could be 10-15+ videos loaded in the DOM.
					// Because of the above, this means that the control element called "#actions" will appear for each video. So, we have to go through ALL of the actions elements and add the bookmark button to all of the ones that don't have it yet.
					const actionsElemList = Array.from(document.querySelectorAll('#actions'));

					actionsElemList.forEach((actionsElem) => {
						const hasBookmarkBtn = actionsElem.querySelector('.bookmark-btn');

						if (!hasBookmarkBtn) {
							// A new bookmark element has to be created for each "actions" container.
							const bookmarkBtnElement = createAndGetBookmarkBtnElement();
							actionsElem.insertBefore(bookmarkBtnElement, actionsElem.firstChild);
						}
					});
			}
		}
	}
};

/**
 * @description Creates and gets the bookmark SVG icon HTML Button element.
 * @returns {HTMLButtonElement}
 */
const createAndGetBookmarkBtnElement = () => {
	const bookmarkSvgContainer = document.createElement('button');

	bookmarkSvgContainer.className = 'ytp-button bookmark-btn';
	bookmarkSvgContainer.title = 'Click to bookmark current timestamp';
	bookmarkSvgContainer.addEventListener('click', handleAddNewBookmark);
	bookmarkSvgContainer.innerHTML = getIconSVG('bookmark');

	return bookmarkSvgContainer;
};

// Listen to messages from background.js
chrome.runtime.onMessage.addListener(async (obj) => {
	const { type, value, videoId, videoType, activeTab: backgroundActiveTab } = obj;

	if (backgroundActiveTab) {
		activeTab = backgroundActiveTab;
	}

	switch (type) {
		case 'check-ready':
			return { ready: true };
		case 'tab-updated-new-video':
			// Reset the global videos each time we land on a new video to prevent potential overlap of global variables.
			resetGlobalVariables();
			currentVideoId = videoId;
			currentVideoType = videoType;
			addBookmarkButtonToVideo();
			break;
		// For popup.js
		case 'play-new-timestamp-in-video':
			videoElem.currentTime = value;

			if (videoElem.paused) {
				videoElem.play();
			}

			// Once we go to that time in the video, show the timestamp progress bar for a second before hiding it again.
			const html5VideoPlayerElem = document.querySelector('.html5-video-player');
			html5VideoPlayerElem.classList.remove('ytp-autohide');

			setTimeout(() => {
				html5VideoPlayerElem.classList.add('ytp-autohide');
			}, 1000);

			break;
		// For popup.js
		case 'content-get-current-video-bookmarks-with-frames':
			await fetchUserSettings();
			addBookmarkButtonToVideo();

			const bookmarkButtons = Array.from(document.querySelectorAll('.bookmark-btn'));

			// If we don't need to capture frames, then return the current bookmarks. These bookmarks will have no "thumbnailImageSrc".
			if (!userSettings.captureFrames) {
				bookmarkButtons.forEach((bookmarkButton) => {
					bookmarkButton.disabled = false;
				});
				return currentVideoBookmarks;
			}

			const { currentVideoBookmarksWithFrames } = obj;
			await fetchBookmarks();

			if (!videoElem) {
				videoElem = await getAndWaitForVideoToExist();
			}

			await waitForVideoToBeReady(videoElem);

			const timestampBeforeCapturing = videoElem.currentTime;

			const newCurrentVideoBookmarksWithFrames = [];

			const currentVideoBookmarksWithFramesByTime =
				currentVideoBookmarksWithFrames && arrayToObjectByKey(currentVideoBookmarksWithFrames, 'time', true);

			let capturedAtLeastOneFrame = false;

			// Go through the array of video bookmarks and use their "time" and the video element, go and capture the frame of the video at each "time" and store the dataUrl of these frames in a new array.
			for (let i = 0; i < currentVideoBookmarks.length; i++) {
				const bookmark = currentVideoBookmarks[i];
				const bookmarkTimeKey = Math.floor(bookmark.time);

				const alreadyHasFrame =
					currentVideoBookmarksWithFramesByTime &&
					currentVideoBookmarksWithFramesByTime[bookmarkTimeKey] &&
					currentVideoBookmarksWithFramesByTime[bookmarkTimeKey].dataUrl;

				// If we already have the captured frame for the bookmark at that time, then use the cached frame.
				if (alreadyHasFrame) {
					const bookmarkWithFrame = currentVideoBookmarksWithFramesByTime[bookmarkTimeKey];
					newCurrentVideoBookmarksWithFrames.push(bookmarkWithFrame);
					continue;
				}

				try {
					const dataUrl = await captureFrameAtTimestamp(videoElem, bookmark.time);

					capturedAtLeastOneFrame = true;

					newCurrentVideoBookmarksWithFrames.push({
						...bookmark,
						dataUrl,
					});
				} catch (error) {
					console.error(error);
				}
			}

			if (capturedAtLeastOneFrame) {
				// Because capturing a frame requires that we go to the actual time in the video, reset the time back to the timestamp that the user was on before starting to capture the bookmarked frames.
				videoElem.currentTime = timestampBeforeCapturing;
			}

			bookmarkButtons.forEach((bookmarkButton) => {
				bookmarkButton.disabled = false;
			});

			return newCurrentVideoBookmarksWithFrames;
		case 'content-get-current-video-time-and-duration':
			if (!videoElem) {
				videoElem = await getAndWaitForVideoToExist();
			}

			const { currentTime, duration } = videoElem;

			return {
				currentTime,
				duration,
			};
	}
});

/**
 * @description Fetch the "userSettings" property from Chrome's Storage.
 */
const fetchUserSettings = async () => {
	const obj = await chrome.storage.sync.get('userSettings');
	const chromeStorageUserSettingsJsonObj = obj ? JSON.parse(obj['userSettings']) : {};
	userSettings = chromeStorageUserSettingsJsonObj;
};

/**
 * @description Resets all the global variables to their default values. Useful for when we land on a new video page.
 */
const resetGlobalVariables = () => {
	youtubeRightControls = null;
	videoElem = null;
	currentVideoId = '';
	currentVideoType = '';
	currentVideoBookmarks = [];
	currentVideoFullObj = null;
	userSettings = null;
};

const getCurrentVideoId = async () => {
	const currentUrl = window.location.href;
	const isYouTubeFullVideo = currentUrl && currentUrl.includes('youtube.com/watch');
	const isYouTubeShortsVideo = currentUrl && currentUrl.includes('youtube.com/shorts');
	const isYouTubeVideo = isYouTubeFullVideo || isYouTubeShortsVideo;

	if (isYouTubeVideo) {
		const queryParameters = currentUrl.split('?')[1];
		const urlParameters = new URLSearchParams(queryParameters);
		const videoId = isYouTubeFullVideo ? urlParameters.get('v') : getYouTubeShortsVideoId(currentUrl);

		currentVideoId = videoId;
	} else {
		currentVideoId = '';
	}
};

/**
 * @description Waits for a video element with the class "video-stream" to exist in the DOM.
 * @returns {Promise<HTMLVideoElement>} Resolves with the video element once it exists, or rejects after 5 seconds if not found.
 */
const getAndWaitForVideoToExist = async () => {
	return new Promise((resolve, reject) => {
		const timeout = 5000; // Timeout after 5 seconds
		const checkInterval = 100; // Check every 100ms

		// Check if the video element already exists
		const videoElem = document.getElementsByClassName('video-stream')[0];
		if (videoElem) {
			resolve(videoElem); // Resolve immediately if it exists
			return;
		}

		// Set up a timeout to reject the promise after 5 seconds
		const timeoutId = setTimeout(() => {
			clearInterval(intervalId); // Stop the interval if the timeout occurs
			reject(new Error('Video element not found within 5 seconds.'));
		}, timeout);

		// Set up an interval to check for the video element
		const intervalId = setInterval(() => {
			const videoElem = document.getElementsByClassName('video-stream')[0];
			if (videoElem) {
				clearInterval(intervalId); // Stop checking once the video element is found
				clearTimeout(timeoutId); // Clear the timeout to prevent rejection
				resolve(videoElem); // Resolve with the video element
			}
		}, checkInterval);
	});
};

/**
 * @description Checks if a video element exists and is ready for playback. Resolves when the video is ready.
 * @param {HTMLVideoElement} videoElement - The video element to check.
 * @returns {Promise} - A promise that resolves when the video is ready for playback.
 */
const waitForVideoToBeReady = (videoElement) => {
	return new Promise((resolve, reject) => {
		if (!videoElement) {
			reject('Video element not provided');
			return;
		}

		// If the video is already ready, resolve immediately
		if (videoElement.readyState >= 2) {
			resolve();
			return;
		}

		// Listen for the "loadeddata" event as a backup trigger for readiness
		videoElement.addEventListener(
			'loadeddata',
			() => {
				if (videoElement.readyState >= 2) {
					resolve();
				}
			},
			{ once: true }
		);
	});
};

/**
 * @description Monitor the video element on the page for any changes to its current time to visually change the progress bar and timestamp on the page to be for the "part" of the video that we are on.
 */
const monitorVideoElement = async () => {
	await fetchBookmarks()

	if (!videoElem) {
		videoElem = await getAndWaitForVideoToExist();
	}

	editVideoProgressBarAndTimeVisually()

	// Add an event listener for the 'timeupdate' event
	videoElem.addEventListener('timeupdate', () => {
		editVideoProgressBarAndTimeVisually()
	});

	// TODO: Possibly add this so that everything updates constantly. Not sure if necessary. Will have to test this out as it could impact performance.
	// setInterval(() => {
	// 	editVideoProgressBarAndTimeVisually
	// }, 100)
}

/**
 * @description
 */
const editVideoProgressBarAndTimeVisually = () => {
	const { currentTime, endTime, currentBookmarkIndex } = currentVideoBookmarks && getCurrentBookmarkBasedOnTime(videoElem.currentTime)

	document.querySelector('.ytp-time-current').textContent = formatTime(Math.floor(currentTime))
	document.querySelector('.ytp-time-duration').textContent = formatTime(Math.floor(endTime))

	const progressBarWidth = document.querySelector('.ytp-progress-bar-container').getBoundingClientRect().width
	const progressNum = currentTime / endTime

	const currentTimeCircleThumb = document.querySelector('.ytp-scrubber-container')
	currentTimeCircleThumb.style.transform = `translateX(${progressBarWidth * progressNum}px)`

	const playProgressElem = document.querySelector('.ytp-play-progress')
	playProgressElem.style.transform = `scaleX(${progressNum})`

	addCurrentBookmarkInfoToLeftControls(currentBookmarkIndex)
}

const addCurrentBookmarkInfoToLeftControls = (currentBookmarkIndex) => {
	const totalBookmarksNum = currentVideoBookmarks.length

	let partElem = document.querySelector('.left-controls-part-elem')

	if (!partElem) {
		partElem = document.createElement('div')
		partElem.className = 'left-controls-part-elem'
		partElem.addEventListener('click', async () => {
			await chrome.runtime.sendMessage({ type: 'open-popup' });
		})
	}

	partElem.innerHTML = `• Part ${currentBookmarkIndex + 1}/${totalBookmarksNum} ${getIconSVG('chevron-right', 'white', '10px','10px')}`

	const ytpLeftControlsElem = document.querySelector('.ytp-left-controls')
	ytpLeftControlsElem.appendChild(partElem)
}

const getCurrentBookmarkBasedOnTime = (videoCurrentTime) => {
	for (let i = 0; i < currentVideoBookmarks.length; i++) {
		const bookmark = currentVideoBookmarks[i]

		if (bookmark.time > videoCurrentTime) {
			return getBookmarkCurrentAndEndTime(currentVideoBookmarks, videoCurrentTime, bookmark, i)
		}
	}
}

// TODO: There was something the original creator mentioned regarding this. This should be taken out so that it's not called more than once when landing on a video page.
addBookmarkButtonToVideo();

monitorVideoElement()

// Send a message to background.js telling it that the contentScript is ready.
chrome.runtime.sendMessage({ type: 'ready' });
