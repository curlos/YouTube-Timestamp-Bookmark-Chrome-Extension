// This is needed to get async/await working with "chrome.runtime.onMessage.addListener". Chrome still doesn't support Promise in the returned value of onMessage listener both in ManifestV3 and V2. This code is from StackOverflow: https://stackoverflow.com/questions/53024819/sendresponse-not-waiting-for-async-function-or-promises-resolve
const { onMessage } = chrome.runtime,
    { addListener } = onMessage;
onMessage.addListener = (fn) =>
    addListener.call(onMessage, (msg, sender, respond) => {
        const res = fn(msg, sender, respond);
        if (res instanceof Promise) return !!res.then(respond, console.error);
        if (res !== undefined) respond(res);
    });

chrome.runtime.sendMessage({ type: "ready" });

let youtubeLeftControls = null;
let videoElem = null;
let currentVideoId = "";
let currentVideoBookmarks = []
let currentVideoFullObj = null
let activeTab = null

/**
 * @description Fetch the array of bookmarks for the current video. If no bookmarks, will return an empty array.
 * @returns {Array<Object>}
 */
const fetchBookmarks = async () => {
    const obj = await chrome.storage.sync.get(currentVideoId);
    currentVideoBookmarks = obj[currentVideoId] ? JSON.parse(obj[currentVideoId]).bookmarks : [];
    currentVideoFullObj = obj[currentVideoId]

    console.log(currentVideoFullObj)
};

/**
 * @descriptionv When the "+" bookmark image is clicked, this function will be ran and will add a bookmark for the current video using the video's current time.
 */
const handleAddNewBookmark = async () => {
    const bookmarkButton = document.getElementsByClassName("bookmark-btn")[0];
    bookmarkButton.disabled = true

    const currentTime = videoElem.currentTime;
    const newBookmark = {
        time: Math.floor(currentTime),
    };

    await fetchBookmarks();
    const newCurrentVideoBookmarks = [...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time)

    console.log(activeTab)

    const title = currentVideoFullObj && currentVideoFullObj.title || activeTab.title
    const thumbnailImageSrc = (currentVideoFullObj && currentVideoFullObj.thumbnailImageSrc) || getThumbnailUrl()

    const newCurrentVideoBookmarksStr = JSON.stringify({
        bookmarks: newCurrentVideoBookmarks,
        title,
        thumbnailImageSrc
    });

    await chrome.storage.sync.set({
        [currentVideoId]: newCurrentVideoBookmarksStr,
    });

    // Get the updated bookmarks with the newly added one.
    await fetchBookmarks()

    await chrome.runtime.sendMessage({ type: "open-popup" });
};

const getThumbnailUrl = () => {
    const scriptJsonElemList = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))

    for (let scriptJsonElem of scriptJsonElemList) {
        if (scriptJsonElem.textContent) {
            const scriptJsonObj = JSON.parse(scriptJsonElem.textContent)
            const { thumbnailUrl: thumbnailUrlArray } = scriptJsonObj || {}
            
            if (thumbnailUrlArray) {
                return thumbnailUrlArray[0]
            }
        }
    }

    return ''
}

/**
 * @description When a new video is loaded, get that video's bookmarks and add the bookmark button to the video player's left controls if it hasn't been added yet.
 */
const newVideoLoaded = async () => {
    const bookmarkBtnExists = document.getElementsByClassName("bookmark-btn")[0];
    await fetchBookmarks();

    if (currentVideoId) {
        if (!videoElem) {
            videoElem = document.getElementsByClassName("video-stream")[0];
        }

        if (!bookmarkBtnExists) {
            const bookmarkSvgContainer = document.createElement('button')

            bookmarkSvgContainer.className = "ytp-button bookmark-btn";
            bookmarkSvgContainer.title = "Click to bookmark current timestamp";
            bookmarkSvgContainer.addEventListener("click", handleAddNewBookmark);

            bookmarkSvgContainer.innerHTML = getIconSVG('bookmark')

            youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
            youtubeLeftControls.appendChild(bookmarkSvgContainer);
        }
    }
};

chrome.runtime.onMessage.addListener(async (obj) => {
    const { type, value, videoId, activeTab: backgroundActiveTab } = obj;

    if (backgroundActiveTab) {
        activeTab = backgroundActiveTab
    }

    switch (type) {
        case "tab-updated-new-video":
            // Reset the global videos each time we land on a new video to prevent potential overlap of global variables.
            resetGlobalVariables()
            currentVideoId = videoId;
            newVideoLoaded();
            break;
        case "play-new-timestamp-in-video":
            videoElem.currentTime = value;

            if (videoElem.paused) {
                videoElem.play();
            }

            // Once we go to that time in the video, show the timestamp progress bar for a second before hiding it again.
            const html5VideoPlayerElem = document.querySelector(".html5-video-player");
            html5VideoPlayerElem.classList.remove("ytp-autohide");

            setTimeout(() => {
                html5VideoPlayerElem.classList.add("ytp-autohide");
            }, 1000);

            break;
        case "content-get-current-video-bookmarks-with-frames":
            const { currentVideoBookmarksWithFrames } = obj
            await fetchBookmarks()

            if (!videoElem) {
                videoElem = document.getElementsByClassName("video-stream")[0];
            }

            const timestampBeforeCapturing = videoElem.currentTime

            const newCurrentVideoBookmarksWithFrames = [];

            const currentVideoBookmarksWithFramesByTime = currentVideoBookmarksWithFrames && arrayToObjectByKey(currentVideoBookmarksWithFrames, 'time')

            let capturedAtLeastOneFrame = false

            for (let i = 0; i < currentVideoBookmarks.length; i++) {
                const bookmark = currentVideoBookmarks[i];

                const alreadyHasFrame = currentVideoBookmarksWithFramesByTime && currentVideoBookmarksWithFramesByTime[bookmark.time] && currentVideoBookmarksWithFramesByTime[bookmark.time].dataUrl

                // If we already have the captured frame for the bookmark at that time, then use the cached frame.
                if (alreadyHasFrame) {
                    const bookmarkWithFrame = currentVideoBookmarksWithFramesByTime[bookmark.time]
                    newCurrentVideoBookmarksWithFrames.push(bookmarkWithFrame)
                    continue
                }

                const dataUrl = await captureFrameAtTimestamp(videoElem, bookmark.time);

                capturedAtLeastOneFrame = true

                newCurrentVideoBookmarksWithFrames.push({
                    ...bookmark,
                    dataUrl,
                });
            }

            if (capturedAtLeastOneFrame) {
                // Because capturing a frame requires that we go to the actual time in the video, reset the time back to the timestamp that the user was on before starting to capture the bookmarked frames.
                videoElem.currentTime = timestampBeforeCapturing
            }

            const bookmarkButton = document.getElementsByClassName("bookmark-btn")[0];
            bookmarkButton.disabled = false

            return newCurrentVideoBookmarksWithFrames;
    }
});

const resetGlobalVariables = () => {
    youtubeLeftControls = null;
    videoElem = null;
    currentVideoId = "";
    currentVideoBookmarks = []
    currentVideoFullObj = null
}

// TODO: There was something the original creator mentioned regarding this. This should be taken out so that it's not called more than once when landing on a video page.
newVideoLoaded();