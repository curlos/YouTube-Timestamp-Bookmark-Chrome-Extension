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

/**
 * @description After we have made a change to the bookmarks (by adding or deleting one or more of them), running this function will re-fetch the bookmarks and re-render any elements that use these bookmarks so that we use the latest information and views.
 */
const handleFilteredBookmarks = async () => {
    await fetchBookmarks();
    await getAllVideosWithBookmarks();

    renderSidebarModalWithVideos();
    renderBookmarkElementsForCurrentVideo();
};