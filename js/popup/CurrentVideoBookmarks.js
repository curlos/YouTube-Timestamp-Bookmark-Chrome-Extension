import { state } from "./state.js";
import { handleFilteredBookmarks, fetchBookmarks } from './helpers.js'

/**
 * @description Send the message to background.js that will then send a message to contentScript.js to get the captured frames of the current video at the specified bookmark timestamps and re-render the list of bookmarks.
 */
export const setCapturedFramesAndRender = () => {
    chrome.runtime.sendMessage(
        { type: "background-get-current-video-bookmarks-with-frames" },
        async (currentVideoBookmarksWithFrames) => {
            state.currentVideoBookmarks = currentVideoBookmarksWithFrames;

            state.currentVideoBookmarksWithDataUrlByTime = arrayToObjectByKey(currentVideoBookmarksWithFrames, "time", true);

            await renderBookmarkElementsForCurrentVideo();
        },
    );
};

/**
 * @description Render the "Delete Video Bookmarks" button at the bottom of the "Bookmarks For This Video" view.
 */
export const renderDeleteVideoBookmarksButton = () => {
    if (state.currentVideoBookmarks.length === 0) {
        return;
    }

    const deleteVideoBookmarksButtonWrapper = document.createElement("div");
    deleteVideoBookmarksButtonWrapper.className = "delete-video-bookmarks-button-wrapper";

    const deleteVideoBookmarksButton = document.createElement("div");
    deleteVideoBookmarksButton.className = "delete-video-bookmarks-button";
    deleteVideoBookmarksButton.textContent = "Delete Video Bookmarks";

    deleteVideoBookmarksButton.addEventListener("click", async () => {
        await chrome.storage.sync.remove(state.currentVideoId);
        await handleFilteredBookmarks();
    });

    deleteVideoBookmarksButtonWrapper.appendChild(deleteVideoBookmarksButton);
    document.querySelector(".bookmarks").appendChild(deleteVideoBookmarksButtonWrapper);
};

/**
 * @description Render the blue spinning loader while we wait for the bookmarks for the current video to be fetched.
 */
export const renderSpinnerCurrentVideoBookmarks = () => {
    const bookmarkListElem = document.getElementById("bookmarks");
    bookmarkListElem.innerHTML = "";

    const loadingSpinnerElem = document.createElement("div");
    loadingSpinnerElem.className = "loader";
    bookmarkListElem.appendChild(loadingSpinnerElem);
};

/**
 * 
 * @returns Render the list
 */
export const renderBookmarkElementsForCurrentVideo = async () => {
    const bookmarkListElem = document.getElementById("bookmarks");
    bookmarkListElem.innerHTML = "";

    if (state.currentVideoBookmarks.length === 0) {
        bookmarkListElem.innerHTML = '<i class="row">No bookmarks to show</i>';
        return;
    }

    for (let i = 0; i < state.currentVideoBookmarks.length; i++) {
        const { time } = state.currentVideoBookmarks[i];
        const bookmark = state.currentVideoBookmarksWithDataUrlByTime[Math.floor(time)];
        const isLastIndex = i === state.currentVideoBookmarks.length - 1;

        await addNewBookmarkElem(bookmarkListElem, bookmark, isLastIndex);
    }

    renderDeleteVideoBookmarksButton()
};

/**
 * @description Create a bookmark element and append it to the parent "bookmarkListElem". This will contain the captured frame for the bookmark's time stamp (if "captureFrames" is turned on), the timestamp number, a "play" button that will jump to that point in the video, and a "delete" button that will remove the bookmark.
 * @param {HTMLElement} bookmarkListElem 
 * @param {Object} bookmark 
 * @param {Boolean} isLastIndex 
 */
export const addNewBookmarkElem = async (bookmarkListElem, bookmark, isLastIndex) => {
    const showCapturedFrames = state.userSettings.captureFrames;

    const bookmarkTitleElement = document.createElement("div");
    const controlsElement = document.createElement("div");
    const newBookmarkElement = document.createElement("div");
    const newBookmarkBottomWrapperElement = document.createElement("div");
    const timestampImgElement = showCapturedFrames && document.createElement("img");

    bookmarkTitleElement.textContent = formatTime(Math.floor(bookmark.time));
    bookmarkTitleElement.className = "bookmark-title";
    bookmarkTitleElement.addEventListener("click", () => {
        handlePlayVideo(bookmark.time);
    });

    controlsElement.className = "bookmark-controls";

    showCapturedFrames && (timestampImgElement.src = bookmark.dataUrl);
    showCapturedFrames && (timestampImgElement.className = "timestamp-img");
    showCapturedFrames &&
        timestampImgElement.addEventListener("click", () => {
            handlePlayVideo(bookmark.time);
        });

    setControlBookmarkSVGElem(
        "play",
        () => {
            handlePlayVideo(bookmark.time);
        },
        controlsElement,
    );
    setControlBookmarkSVGElem(
        "delete",
        () => {
            handleDeleteBookmark(bookmark.time);
        },
        controlsElement,
    );

    newBookmarkElement.id = "bookmark-" + bookmark.time;
    newBookmarkElement.className = "bookmark-container";
    newBookmarkBottomWrapperElement.className = "bookmark-bottom-wrapper";

    if (isLastIndex) {
        newBookmarkBottomWrapperElement.classList.add("bookmark-no-bottom-border");
    }

    showCapturedFrames && newBookmarkBottomWrapperElement.appendChild(timestampImgElement);
    newBookmarkBottomWrapperElement.appendChild(bookmarkTitleElement);
    newBookmarkBottomWrapperElement.appendChild(controlsElement);

    showCapturedFrames && newBookmarkElement.appendChild(timestampImgElement);
    newBookmarkElement.appendChild(newBookmarkBottomWrapperElement);

    bookmarkListElem.appendChild(newBookmarkElement);
};

/**
 * @description Create a new element with an SVG icon and a callback that runs when the element is clicked.
 * @param {String} name 
 * @param {Function} callback 
 * @param {HTMLElement} controlParentElement 
 */
export const setControlBookmarkSVGElem = (name, callback, controlParentElement) => {
    const controlElement = document.createElement("div");
    controlElement.innerHTML = getIconSVG(name);
    controlElement.className = "svg-wrapper";

    controlElement.addEventListener("click", callback);
    controlParentElement.appendChild(controlElement);
};

/**
 * @description Sends a message from the "popup.js" to "background.js" who will then send a message to "contentScript.js" to change the video element's "currentTime" to "bookmarkTime".
 * @param {Number} bookmarkTime 
 */
export const handlePlayVideo = async (bookmarkTime) => {
    const activeTab = await getActiveTab();

    chrome.tabs.sendMessage(activeTab.id, {
        type: "play-new-timestamp-in-video",
        value: bookmarkTime,
    });
};

/**
 * @description Delete a bookmark from the current video's "bookmarks" array. If the current video has no more bookmarks left after deleting this, then remove the video's key-value pair from the Chrome Storage.
 * @param {Number} bookmarkTime 
 */
export const handleDeleteBookmark = async (bookmarkTime) => {
    const bookmarkElementToDelete = document.getElementById("bookmark-" + bookmarkTime);
    bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);

    await fetchBookmarks();

    const filteredCurrentVideoBookmarks = state.currentVideoBookmarks.filter((b) => b.time !== bookmarkTime);

    if (filteredCurrentVideoBookmarks.length === 0) {
        await chrome.storage.sync.remove(state.currentVideoId);
    } else {
        await chrome.storage.sync.set({
            [state.currentVideoId]: JSON.stringify({
                ...state.currentVideoFullObj,
                bookmarks: filteredCurrentVideoBookmarks,
                updatedAt: new Date(),
            }),
        });
    }

    await handleFilteredBookmarks();
};