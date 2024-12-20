let readyTabs = new Set();
let currentVideoBookmarksWithFrames = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "ready":
            sender.tab && readyTabs.add(sender.tab.id);
            break;
        case "open-popup":
            chrome.action.openPopup();
            break;
        case "get-active-tab":
            getActiveTab(sendResponse)
        case "background-get-current-video-bookmarks-with-frames":
            getCurrentVideoBookmarksWithFrames(sendResponse);
            return true;
    }
});

chrome.tabs.onUpdated.addListener((tabId, _, tab) => {
    const isYouTubeFullVideo = tab.url && tab.url.includes("youtube.com/watch")
    const isYouTubeShortsVideo = tab.url && tab.url.includes("youtube.com/shorts")
    const isYouTubeVideo = isYouTubeFullVideo || isYouTubeShortsVideo

    if (isYouTubeVideo && readyTabs.has(tabId)) {
        const queryParameters = tab.url.split("?")[1];
        const urlParameters = new URLSearchParams(queryParameters);
        const videoId = isYouTubeFullVideo ? urlParameters.get("v") : getYouTubeShortsVideoId(tab.url);

        currentVideoBookmarksWithFrames = null

        chrome.tabs.sendMessage(tabId, {
            type: "tab-updated-new-video",
            videoId,
            videoType: isYouTubeFullVideo ? 'watch' : 'shorts',
            activeTab: tab
        });
    }
});

// Chrome sadly has this weird system for sending responses back with async/await functions so the only way I got this to properly work was doing it this way by passing in "sendResponse". Got this idea from a StackOverflow answer here: https://stackoverflow.com/questions/14094447/chrome-extension-dealing-with-asynchronous-sendmessage
const getCurrentVideoBookmarksWithFrames = async (sendResponse) => {
    const activeTab = await getActiveTab();
    const tabId = activeTab.id;

    chrome.tabs.sendMessage(tabId, { type: "content-get-current-video-bookmarks-with-frames", currentVideoBookmarksWithFrames }, {}, (response) => {
        currentVideoBookmarksWithFrames = response;

        if (chrome.runtime.lastError) {
            // Handle any errors that might occur
            console.error("Error sending message to tab:", chrome.runtime.lastError.message);
        } else {
            sendResponse(response);
        }
    });
};

async function getActiveTab(sendResponse) {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true,
    });

    if (sendResponse) {
        sendResponse(tabs[0])
    }

    return tabs[0];
}

const getYouTubeShortsVideoId = (url) => {
    const match = url.match(/\/shorts\/([^/?]+)/);
    const shortsId = match ? match[1] : null; // Exclude query params
    return shortsId
}

