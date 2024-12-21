import { state } from './state.js'
import { renderSpinnerCurrentVideoBookmarks, setCapturedFramesAndRender } from './currentVideoBookmarks.js'
import { renderLeftMenuButton, renderSidebarModalWithVideos } from './videosWithBookmarks.js';
import { renderRightSettingsButton, renderSettingsModalContent } from './settings.js';

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