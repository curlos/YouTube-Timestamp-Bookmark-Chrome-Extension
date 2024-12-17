chrome.runtime.sendMessage({status: "ready"});

let youtubeLeftControls = null;
let youtubePlayer = null;
let currentVideo = ""
let currentVideoBookmarks = []

/**
 * @description Fetch the array of bookmarks for the current video. If no bookmarks, will return an empty array.
 * @returns {Array<Object>}
 */
const fetchBookmarks = async () => {
    const obj = await chrome.storage.sync.get(currentVideo)
    return obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []
}

/**
 * @descriptionv When the "+" bookmark image is clicked, this function will be ran and will add a bookmark for the current video using the video's current time.
 */
const handleAddNewBookmark = async () => {
    const currentTime = youtubePlayer.currentTime
    const newBookmark = {
        time: Math.floor(currentTime),
        desc: `Bookmark at ${getTime(currentTime)}`
    }

    currentVideoBookmarks = await fetchBookmarks()

    const newCurrentVideoBookmarks = JSON.stringify([...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time))

    await chrome.storage.sync.set({
        [currentVideo]: newCurrentVideoBookmarks
    })

    await chrome.runtime.sendMessage({ action: "open-popup" });
}

/**
 * @description When a new video is loaded, get that video's bookmarks and add the bookmark button to the video player's left controls if it hasn't been added yet.
 */
const newVideoLoaded = async () => {
    const bookmarkBtnExists = document.getElementsByClassName('bookmark-btn')[0]
    currentVideoBookmarks = await fetchBookmarks()

    if (!bookmarkBtnExists) {
        const bookmarkBtn = document.createElement('img')

        bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png")
        bookmarkBtn.className = "ytp-button bookmark-btn"
        bookmarkBtn.title = "Click to bookmark current timestamp"
        bookmarkBtn.addEventListener("click", handleAddNewBookmark)

        youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0]
        youtubePlayer = document.getElementsByClassName('video-stream')[0]

        youtubeLeftControls.appendChild(bookmarkBtn)
    }
}

chrome.runtime.onMessage.addListener(async (obj, sender, response) => {
    const { type, value, videoId } = obj

    switch(type) {
        case "tab-updated-new-video":
            currentVideo = videoId
            await newVideoLoaded()
            break
        case "PLAY":
            youtubePlayer.currentTime = value
            break
        case "DELETE":
            currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time !== value)
            await chrome.storage.sync.set({
                [currentVideo]: JSON.stringify(currentVideoBookmarks)
            })
            response(currentVideoBookmarks)
            break
    }
})

const testingStart = async () => {
    newVideoLoaded()

    // chrome.storage.sync.clear()
}

testingStart()

const getTime = (t) => {
    const date = new Date(0)
    date.setSeconds(t)

    return date.toISOString().substr(11, 8)
}