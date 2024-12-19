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
        case "background-get-current-video-bookmarks-with-frames":
            getCurrentVideoBookmarksWithFrames(sendResponse);
            return true;
    }
});

chrome.tabs.onUpdated.addListener((tabId, _, tab) => {
    if (tab.url && tab.url.includes("youtube.com/watch") && readyTabs.has(tabId)) {
        const queryParameters = tab.url.split("?")[1];
        const urlParameters = new URLSearchParams(queryParameters);
        const videoId = urlParameters.get("v");

        currentVideoBookmarksWithFrames = null

        chrome.tabs.sendMessage(tabId, {
            type: "tab-updated-new-video",
            videoId,
        });
    }
});

// Chrome sadly has this weird system for sending responses back with async/await functions so the only way I got this to properly work was doing it this way by passing in "sendResponse". Got this idea from a StackOverflow answer here: https://stackoverflow.com/questions/14094447/chrome-extension-dealing-with-asynchronous-sendmessage
const getCurrentVideoBookmarksWithFrames = async (sendResponse) => {
    const activeTab = await getActiveTabURL();
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

async function getActiveTabURL() {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true,
    });

    return tabs[0];
}
