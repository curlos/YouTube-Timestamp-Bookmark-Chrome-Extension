import { state } from "./state.js";
import { getAllVideosWithBookmarks, handleFilteredBookmarks } from './helpers.js'

/**
 * @description Renders the left "menu" button that when clicked will open or close the "Videos With Bookmarks" sidebar modal.
 */
export const renderLeftMenuButton = () => {
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
 * @description Render a sidebar modal that shows a list of videos with their thumbnail image, title, and number of bookmarks.
 */
export const renderSidebarModalWithVideos = async () => {
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
        const videoWithBookmarksElem = getVideoWithBookmarksElem(videoId)
        sidebarVideoListElem.appendChild(videoWithBookmarksElem);
    });

    await renderDeleteAllBookmarksButton();
};

const getVideoWithBookmarksElem = (videoId) => {
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
    
    const deleteIconOuterWrapper = document.createElement('div')
    deleteIconOuterWrapper.className = 'delete-icon-outer-wrapper'

    const deleteIconInnerWrapper = document.createElement('div')
    deleteIconInnerWrapper.className = 'delete-icon-inner-wrapper'
    deleteIconInnerWrapper.innerHTML = getIconSVG("delete");

    deleteIconInnerWrapper.addEventListener('click', async (e) => {
        e.stopPropagation()
        await chrome.storage.sync.remove(state.currentVideoId);
        await handleFilteredBookmarks();
    })

    deleteIconOuterWrapper.appendChild(deleteIconInnerWrapper)

    videoInfoElem.appendChild(titleElement);
    videoInfoElem.appendChild(bookmarksNumberElement);
    videoInfoElem.appendChild(deleteIconOuterWrapper);

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

    return videoWithBookmarksElem
}

/**
 * @description Render the "Delete All Bookmarks" button at the bottom of the "Video With Bookmarks" sidebar modal view. When clicked, it will remove all videos and their bookmarks from the Chrome Storage.
 */
export const renderDeleteAllBookmarksButton = async () => {
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