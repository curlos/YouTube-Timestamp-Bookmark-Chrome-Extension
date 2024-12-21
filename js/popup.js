console.log(state)

/**
 * @description Once the DOM Content has loaded, check if we're on a YouTube video page and if we are, get all the bookmarks for that video and show them.
 */
document.onreadystatechange = async () => {
    if (document.readyState === "complete") {
        const activeTab = await getActiveTab();
        const queryParams = activeTab.url.split("?")[1];
        const urlParams = new URLSearchParams(queryParams);

        const isYouTubeFullVideo = activeTab.url && activeTab.url.includes("youtube.com/watch");
        const isYouTubeShortsVideo = activeTab.url && activeTab.url.includes("youtube.com/shorts");
        const isYouTubeVideo = isYouTubeFullVideo || isYouTubeShortsVideo;

        if (isYouTubeVideo) {
            state.currentVideoId = isYouTubeFullVideo ? urlParams.get("v") : getYouTubeShortsVideoId(activeTab.url);
        }

        if (isYouTubeVideo && state.currentVideoId) {
            // Render everything including the bookmarks for the current video.
            renderSpinnerCurrentVideoBookmarks();
            renderLeftMenuButton();
            renderRightSettingsButton();
            renderSidebarModalWithVideos();
            renderSettingsModalContent();

            setCapturedFramesAndRender();
        } else {
            // If it's not a YouTube video, then render everything but the list of bookmarks for a specific video.
            renderLeftMenuButton();
            renderRightSettingsButton();
            renderSidebarModalWithVideos();
            renderSettingsModalContent();

            // By default, when the popup is opened on a non-YouTube video page, show the list of videos that have been bookmarked at least once.
            document.querySelector(".sidebar-modal").classList.add("sidebar-shown");
            document.querySelector(".title").textContent = "Videos With Bookmarks";
        }
    }
};

/**
 * @description Send the message to background.js that will then send a message to contentScript.js to get the captured frames of the current video at the specified bookmark timestamps and re-render the list of bookmarks.
 */
const setCapturedFramesAndRender = () => {
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
const renderDeleteVideoBookmarksButton = () => {
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
 * @description Render the "Delete All Bookmarks" button at the bottom of the "Video With Bookmarks" sidebar modal view. When clicked, it will remove all videos and their bookmarks from the Chrome Storage.
 */
const renderDeleteAllBookmarksButton = async () => {
    await getAllVideosWithBookmarks();

    if (!state.allVideosWithBookmarks || Object.keys(state.allVideosWithBookmarks).length === 0) {
        return;
    }

    const sidebarVideoListElem = document.querySelector(".sidebar-video-list");

    const deleteAllBookmarksButtonWrapper = document.createElement("div");
    deleteAllBookmarksButtonWrapper.className = "delete-all-bookmarks-button-wrapper";

    const deleteAllBookmarksButton = document.createElement("div");
    deleteAllBookmarksButton.className = "delete-all-bookmarks-button";
    deleteAllBookmarksButton.textContent = "Delete All Bookmarks";

    deleteAllBookmarksButtonWrapper.addEventListener("click", async () => {
        const videoIdsToRemove = Object.keys(state.allVideosWithBookmarks)
        await Promise.all(videoIdsToRemove.map((videoId) => chrome.storage.sync.remove(videoId)))
        await handleFilteredBookmarks();
    });

    deleteAllBookmarksButtonWrapper.appendChild(deleteAllBookmarksButton);
    sidebarVideoListElem.appendChild(deleteAllBookmarksButtonWrapper);
};

/**
 * @description Renders the left "menu" button that when clicked will open or close the "Videos With Bookmarks" sidebar modal.
 */
const renderLeftMenuButton = () => {
    const menuDiv = document.getElementById("menu-svg-wrapper");
    menuDiv.innerHTML = getIconSVG("menu");
    menuDiv.addEventListener("click", () => {
        const sidebarSettingsWrapper = document.getElementById("sidebar-settings-wrapper");
        sidebarSettingsWrapper.classList.remove("sidebar-shown-right");

        const sidebarVideosWrapper = document.getElementById("sidebar-videos-wrapper");
        sidebarVideosWrapper.classList.add("sidebar-transition");
        sidebarVideosWrapper.classList.toggle("sidebar-shown");

        const isSidebarModalOpen = sidebarVideosWrapper.classList.contains("sidebar-shown");

        if (isSidebarModalOpen) {
            document.querySelector(".title").textContent = "Videos With Bookmarks";
            return;
        }

        if (state.currentVideoId) {
            document.querySelector(".title").textContent = "Bookmarks For This Video";
            return;
        }

        // If the sidebar video list modal is not open and there's no video id, then show the settings sidebar modal
        sidebarSettingsWrapper.classList.add("sidebar-shown-right");
        document.querySelector(".title").textContent = "Settings";
    });
};

/**
 * @description Render the right "Settings" button that when clicked will open or close the "Settings" sidebar modal view.
 */
const renderRightSettingsButton = () => {
    const settingsDiv = document.getElementById("settings-svg-wrapper");
    settingsDiv.innerHTML = getIconSVG("settings");
    settingsDiv.addEventListener("click", () => {
        const sidebarVideosWrapper = document.getElementById("sidebar-videos-wrapper");
        sidebarVideosWrapper.classList.remove("sidebar-shown");

        const sidebarSettingsWrapper = document.getElementById("sidebar-settings-wrapper");
        sidebarSettingsWrapper.classList.add("sidebar-transition-right");
        sidebarSettingsWrapper.classList.toggle("sidebar-shown-right");

        const isSidebarRightModalOpen = sidebarSettingsWrapper.classList.contains("sidebar-shown-right");

        if (isSidebarRightModalOpen) {
            document.querySelector(".title").textContent = "Settings";
            return;
        }

        if (state.currentVideoId) {
            document.querySelector(".title").textContent = "Bookmarks For This Video";
            return;
        }

        // If the sidebar settings modal is not open and there's no video id, then show the sidebar video list modal
        sidebarVideosWrapper.classList.add("sidebar-shown");
        document.querySelector(".title").textContent = "Videos With Bookmarks";
    });
};

/**
 * @description Render a sidebar modal that shows a list of videos with their thumbnail image, title, and number of bookmarks.
 */
const renderSidebarModalWithVideos = async () => {
    const sidebarVideoListElem = document.querySelector(".sidebar-video-list");
    sidebarVideoListElem.innerHTML = "";

    await getAllVideosWithBookmarks();

    // Sort the videos from most recently updated to least recently updated.
    const sortedVideosWithBookmarksVideoIds = Object.keys(state.allVideosWithBookmarks).sort((a, b) => {
        const objA = JSON.parse(state.allVideosWithBookmarks[a]);
        const objB = JSON.parse(state.allVideosWithBookmarks[b]);

        const dateA = new Date(objA.updatedAt);
        const dateB = new Date(objB.updatedAt);

        return dateB - dateA;
    })

    // Go through all the videos and render the thumbnail image, video title, and the number of bookmarks for that video.
    sortedVideosWithBookmarksVideoIds.forEach((videoId) => {
        const video = JSON.parse(state.allVideosWithBookmarks[videoId]);

        const videoWithBookmarksElem = document.createElement("div");
        videoWithBookmarksElem.className = "video-with-bookmarks";

        const thumbnailImageElement = document.createElement("img");
        thumbnailImageElement.src = video.thumbnailImageSrc;

        const videoInfoElem = document.createElement("div");

        const titleElement = document.createElement("div");
        titleElement.textContent = video.title;
        titleElement.className = "video-with-bookmarks-title";

        const bookmarksNumberElement = document.createElement("div");
        bookmarksNumberElement.textContent =
            video.bookmarks.length > 1 ? `${video.bookmarks.length} Bookmarks` : `${video.bookmarks.length} Bookmark`;

        videoInfoElem.appendChild(titleElement);
        videoInfoElem.appendChild(bookmarksNumberElement);

        videoWithBookmarksElem.appendChild(thumbnailImageElement);
        videoWithBookmarksElem.appendChild(videoInfoElem);

        // When the video container is clicked, navigate to that video's page.
        videoWithBookmarksElem.addEventListener("click", async () => {
            const videoURL =
                video.videoType === "shorts"
                    ? `https://www.youtube.com/shorts/${videoId}`
                    : `https://www.youtube.com/watch?v=${videoId}`;
            const activeTab = await getActiveTab();

            if (state.currentVideoId !== videoId) {
                chrome.tabs.update(activeTab.id, {
                    url: videoURL,
                });
            }

            // Close the popup after navigating to the new video page.
            window.close();
        });

        sidebarVideoListElem.appendChild(videoWithBookmarksElem);
    });

    await renderDeleteAllBookmarksButton();
};

/**
 * @description Render the "Settings" modal.
 */
const renderSettingsModalContent = async () => {
    await fetchUserSettings();

    // if there are no user settings, set the default settings.
    if (!state.userSettings) {
        const defaultUserSettings = {
            captureFrames: true,
        };

        await chrome.storage.sync.set({
            userSettings: JSON.stringify(defaultUserSettings),
        });

        await fetchUserSettings();
    }

    const captureFramesCheckbox = document.getElementById("capture-frames-checkbox");
    captureFramesCheckbox.checked = state.userSettings.captureFrames ? true : false;

    captureFramesCheckbox.addEventListener("click", async (e) => {
        const isChecked = e.target.checked;

        await chrome.storage.sync.set({
            userSettings: JSON.stringify({
                captureFrames: isChecked,
            }),
        });

        await fetchUserSettings();

        if (isChecked) {
            // If "Capture Frames" is checked, then show the loading spinner and send the message to content script to capture frames at the specified timestamps.
            renderSpinnerCurrentVideoBookmarks();
            setCapturedFramesAndRender();
        } else {
            await renderBookmarkElementsForCurrentVideo();
        }
    });
};

/**
 * @description Render the blue spinning loader while we wait for the bookmarks for the current video to be fetched.
 */
const renderSpinnerCurrentVideoBookmarks = () => {
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
const renderBookmarkElementsForCurrentVideo = async () => {
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
const addNewBookmarkElem = async (bookmarkListElem, bookmark, isLastIndex) => {
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
const setControlBookmarkSVGElem = (name, callback, controlParentElement) => {
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
const handlePlayVideo = async (bookmarkTime) => {
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
const handleDeleteBookmark = async (bookmarkTime) => {
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

/**
 * @description After we have made a change to the bookmarks (by adding or deleting one or more of them), running this function will re-fetch the bookmarks and re-render any elements that use these bookmarks so that we use the latest information and views.
 */
const handleFilteredBookmarks = async () => {
    await fetchBookmarks();
    await getAllVideosWithBookmarks();

    renderSidebarModalWithVideos();
    renderBookmarkElementsForCurrentVideo();
};

/**
 * @description Get all the videos with bookmarks - will exclude the "userSettings" key-value pair since that's not a video.
 */
const getAllVideosWithBookmarks = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, function (items) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                const { userSettings, ...itemsWithoutUserSettings } = items

                state.allVideosWithBookmarks = itemsWithoutUserSettings;
                resolve(items);
            }
        });
    });
};

/**
 * @description Fetch the array of bookmarks for the current video. If no bookmarks, will return an empty array.
 * @returns {Array<Object>}
 */
const fetchBookmarks = async () => {
    const obj = await chrome.storage.sync.get(state.currentVideoId);
    const jsonObj = obj[state.currentVideoId] ? JSON.parse(obj[state.currentVideoId]) : {};

    const { bookmarks = [] } = jsonObj;

    state.currentVideoBookmarks = bookmarks;
    state.currentVideoFullObj = jsonObj;
};

/**
 * @description Get the user settings from Chrome's Storage.
 */
const fetchUserSettings = async () => {
    const obj = await chrome.storage.sync.get("userSettings");
    const chromeStorageUserSettingsJsonObj = obj ? JSON.parse(obj["userSettings"]) : {};
    state.userSettings = chromeStorageUserSettingsJsonObj;
};
