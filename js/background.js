/**
 * @filename background.js
 * @description Service Worker that runs in the background and listens for messages from contentScript.js and popup.js. The three main JS files in this project run in 3 different environments/contexts for each one with a separate devtools window for each (background.js, contentScript.js, popup.js).
 */

// Global Variables
let readyTabs = new Set();
let currentVideoBookmarksWithFrames = null;
let activeTabIsReadyAndUpdated = false

/**
 * @description Listen for messages from contentScript.js and popup.js
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "ready":
            sender.tab && readyTabs.add(sender.tab.id);
            break;
        case "open-popup":
            chrome.action.openPopup();
            break;
        case "background-get-current-video-bookmarks-with-frames":
            getCurrentVideoBookmarksWithFrames(sendResponse);
            return true;
    }
});

/**
 * @description When a tab is updated (such as going to a new page), check if the current page is a YouTube video and if it is, then send a message with information about the video and the tab.
 */
chrome.tabs.onUpdated.addListener((tabId, _, tab) => {
    const isYouTubeFullVideo = tab.url && tab.url.includes("youtube.com/watch");
    const isYouTubeShortsVideo = tab.url && tab.url.includes("youtube.com/shorts");
    const isYouTubeVideo = isYouTubeFullVideo || isYouTubeShortsVideo;

    if (isYouTubeVideo && readyTabs.has(tabId)) {
        const queryParameters = tab.url.split("?")[1];
        const urlParameters = new URLSearchParams(queryParameters);
        const videoId = isYouTubeFullVideo ? urlParameters.get("v") : getYouTubeShortsVideoId(tab.url);

        currentVideoBookmarksWithFrames = null;

        activeTabIsReadyAndUpdated = false

        waitForContentScriptWithInterval(tabId, () => {
            chrome.tabs.sendMessage(tabId, {
                type: "tab-updated-new-video",
                videoId,
                videoType: isYouTubeFullVideo ? "watch" : "shorts",
                activeTab: tab,
            }, {}, () => {
                activeTabIsReadyAndUpdated = true
            })
        });
    }
});

/**
 * @description Get the active tab.
 * @param {Function} sendResponse
 * @returns {Object}
 */
async function getActiveTab(sendResponse) {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true,
    });

    if (sendResponse) {
        sendResponse(tabs[0]);
    }

    return tabs[0];
}

/**
 * @description Parses the URL string to get the Video ID of the YouTube Shorts Video.
 * @param {String} url 
 * @returns {String}
 */
const getYouTubeShortsVideoId = (url) => {
    const match = url.match(/\/shorts\/([^/?]+)/);
    const shortsId = match ? match[1] : null; // Exclude query params
    return shortsId;
};

/**
 * @description Sends a message to contentScript.js that will eventually give it the captured visual frames of the different bookmarked timestamps for the current video. This is sent back to popup.js to display these frames.
 * @param {Function} sendResponse Chrome has this weird system for sending responses back with async/await functions instead of just returning the response so the only way I got this to properly work was doing it this way by passing in "sendResponse". Got this idea from a StackOverflow answer here: https://stackoverflow.com/questions/14094447/chrome-extension-dealing-with-asynchronous-sendmessage
 */
const getCurrentVideoBookmarksWithFrames = async (sendResponse) => {
    const activeTab = await getActiveTab();

    waitForContentScriptWithInterval(activeTab.id, () => {
        chrome.tabs.sendMessage(
            activeTab.id,
            { type: "content-get-current-video-bookmarks-with-frames", currentVideoBookmarksWithFrames },
            {},
            (response) => {
                currentVideoBookmarksWithFrames = response;
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to tab:", chrome.runtime.lastError.message);
                } else {
                    sendResponse(response);
                }
            },
        );
    })
};

const waitForContentScriptWithInterval = (tabId, callback) => {
    // Set up a variable to track the interval ID
    const intervalId = setInterval(() => {
        chrome.tabs.sendMessage(
            tabId,
            { type: "check-ready" }, // Message to check readiness
            (response) => {
                if (chrome.runtime.lastError || !response?.ready) {
                    // Content script is not ready yet, continue polling
                    return;
                }

                // Content script is ready, clear the interval
                clearInterval(intervalId);

                // Proceed with the actual message
                callback();
            }
        );
    }, 100); // Check every 100ms
}
