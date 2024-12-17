let readyTabs = new Set()

chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.status === "ready" && sender.tab) {
      readyTabs.add(sender.tab.id);
    } else if (message.action === "open-popup") {
        chrome.action.openPopup()
    }
});

chrome.tabs.onUpdated.addListener((tabId, _, tab) => {
    if (tab.url && tab.url.includes("youtube.com/watch") && readyTabs.has(tabId)) {
        const queryParameters = tab.url.split("?")[1]
        const urlParameters = new URLSearchParams(queryParameters)
        const videoId = urlParameters.get("v")

        chrome.tabs.sendMessage(tabId, {
            type: "tab-updated-new-video",
            videoId
        })
    }
})