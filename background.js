// // This is needed to get async/await working with "chrome.runtime.onMessage.addListener". Chrome still doesn't support Promise in the returned value of onMessage listener both in ManifestV3 and V2. This code is from StackOverflow: https://stackoverflow.com/questions/53024819/sendresponse-not-waiting-for-async-function-or-promises-resolve
// const {onMessage} = chrome.runtime, {addListener} = onMessage; 
// onMessage.addListener = fn => addListener.call(onMessage, (msg, sender, respond) => {
//     const res = fn(msg, sender, respond);
//     if (res instanceof Promise) return !!res.then(respond, console.error);
//     if (res !== undefined) respond(res);
// });


let readyTabs = new Set()
let currentVideoBookmarks = null

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "ready":
            sender.tab && readyTabs.add(sender.tab.id);
            break;
        case "open-popup":
            chrome.action.openPopup()
            break;
        case "get-current-video-bookmarks":
            return currentVideoBookmarks
        case "async-get-current-video-bookmarks":
            getCurrentVideoBookmarks(sendResponse)
            return true
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

const getCurrentVideoBookmarks = async (sendResponse) => {
    const activeTab = await getActiveTabURL()
    const tabId = activeTab.id

    chrome.tabs.sendMessage(tabId, { type: "get-current-video-bookmarks-with-data-url" }, {},(response) => {
        console.log('bookmarks with data url response')
        console.log(response)
        debugger

        currentVideoBookmarks = response

        if (chrome.runtime.lastError) {
            // Handle any errors that might occur
            console.error("Error sending message to tab:", chrome.runtime.lastError.message);
        } else {
            sendResponse(response)
        }
    });
}

async function getActiveTabURL() {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true
    })

    return tabs[0]
}