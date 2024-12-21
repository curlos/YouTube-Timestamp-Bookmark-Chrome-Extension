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