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
let currentVideoBookmarks = [];

/**
 * @description Fetch the array of bookmarks for the current video. If no bookmarks, will return an empty array.
 * @returns {Array<Object>}
 */
const fetchBookmarks = async () => {
    const obj = await chrome.storage.sync.get(currentVideoId);
    return obj[currentVideoId] ? JSON.parse(obj[currentVideoId]) : [];
};

/**
 * @descriptionv When the "+" bookmark image is clicked, this function will be ran and will add a bookmark for the current video using the video's current time.
 */
const handleAddNewBookmark = async () => {
    const currentTime = videoElem.currentTime;
    const newBookmark = {
        time: Math.floor(currentTime),
    };

    currentVideoBookmarks = await fetchBookmarks();
    const newCurrentVideoBookmarks = [...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time)

    const newCurrentVideoBookmarksStr = JSON.stringify(newCurrentVideoBookmarks);

    await chrome.storage.sync.set({
        [currentVideoId]: newCurrentVideoBookmarksStr,
    });

    await chrome.runtime.sendMessage({ type: "open-popup" });
};

/**
 * @description When a new video is loaded, get that video's bookmarks and add the bookmark button to the video player's left controls if it hasn't been added yet.
 */
const newVideoLoaded = async () => {
    const bookmarkBtnExists = document.getElementsByClassName("bookmark-btn")[0];
    currentVideoBookmarks = await fetchBookmarks();

    if (currentVideoId) {
        if (!videoElem) {
            videoElem = document.getElementsByClassName("video-stream")[0];
        }

        if (!bookmarkBtnExists) {
            const bookmarkBtn = document.createElement("img");

            bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
            bookmarkBtn.className = "ytp-button bookmark-btn";
            bookmarkBtn.title = "Click to bookmark current timestamp";
            bookmarkBtn.addEventListener("click", handleAddNewBookmark);

            youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
            youtubeLeftControls.appendChild(bookmarkBtn);
        }
    }
};

chrome.runtime.onMessage.addListener(async (obj) => {
    const { type, value, videoId } = obj;

    switch (type) {
        case "tab-updated-new-video":
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
        case "delete-bookmark":
            currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time !== value);
            chrome.storage.sync.set({
                [currentVideoId]: JSON.stringify(currentVideoBookmarks),
            });
            break;
        case "get-current-video-bookmarks-with-data-url":
            const { currentVideoBookmarks: backgroundCurrentVideoBookmarks } = obj

            if (backgroundCurrentVideoBookmarks) {
                return backgroundCurrentVideoBookmarks
            }

            if (!videoElem) {
                videoElem = document.getElementsByClassName("video-stream")[0];
            }

            const newCurrentVideoBookmarks = [];

            console.log(currentVideoBookmarks)

            for (let i = 0; i < currentVideoBookmarks.length; i++) {
                const bookmark = currentVideoBookmarks[i];
                const dataUrl = await captureFrameAtTimestamp(videoElem, bookmark.time);

                newCurrentVideoBookmarks.push({
                    ...bookmark,
                    dataUrl,
                });
            }

            currentVideoBookmarks = newCurrentVideoBookmarks;

            return currentVideoBookmarks;
    }
});

// TODO: There was something the original creator mentioned regarding this. This should be taken out so that it's not called more than once when landing on a video page.
newVideoLoaded();

const getTime = (t) => {
    const date = new Date(0);
    date.setSeconds(t);

    return date.toISOString().substr(11, 8);
};

const captureFrameAtTimestamp = async (video, timestamp) => {
    if (!video) {
        throw new Error("Video element not provided");
    }

    return new Promise((resolve, reject) => {
        // Error handling if the video cannot be played
        if (video.readyState < 2) {
            reject("Video is not ready for playback");
            return;
        }

        // Function to perform the capture
        const onSeeked = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL("image/png");

                resolve(dataUrl);
            } catch (error) {
                reject("Failed to capture frame: " + error.message);
            } finally {
                video.removeEventListener("seeked", onSeeked);
            }
        };

        // Add the listener before setting currentTime to avoid any race condition
        video.addEventListener("seeked", onSeeked, { once: true });

        // Set currentTime after adding listener
        video.currentTime = timestamp;
    });
};
