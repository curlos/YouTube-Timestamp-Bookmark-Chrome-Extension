/**
 * @description Shared state for the popup (across the 3 views "Videos With Bookmarks", "Bookmarks for current video", "Settings").
 */
export const state = {
    currentVideoBookmarks: [],
    currentVideoBookmarksWithFrames: [],
    currentVideoBookmarksWithDataUrlByTime: [],
    currentVideoId: null,
    allVideosWithBookmarks: null,
    currentVideoFullObj: null,
    userSettings: null,
    activeTab: null,
    video: {
        currentTime: 0,
        duration: 100,
        intervalId: null
    },
    bookmarkElements: [],
    bookmarkProgressBarIntervalIds: [],
}