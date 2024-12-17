chrome.runtime.sendMessage({status: "ready"});

let youtubeLeftControls = null;
let youtubePlayer = null;
let currentVideoId = ""
let currentVideoBookmarks = []

/**
 * @description Fetch the array of bookmarks for the current video. If no bookmarks, will return an empty array.
 * @returns {Array<Object>}
 */
const fetchBookmarks = async () => {
    const obj = await chrome.storage.sync.get(currentVideoId)
    return obj[currentVideoId] ? JSON.parse(obj[currentVideoId]) : []
}

/**
 * @descriptionv When the "+" bookmark image is clicked, this function will be ran and will add a bookmark for the current video using the video's current time.
 */
const handleAddNewBookmark = async () => {
    const currentTime = youtubePlayer.currentTime
    const newBookmark = {
        time: Math.floor(currentTime),
    }

    currentVideoBookmarks = await fetchBookmarks()

    const newCurrentVideoBookmarks = JSON.stringify([...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time))

    await chrome.storage.sync.set({
        [currentVideoId]: newCurrentVideoBookmarks
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

chrome.runtime.onMessage.addListener(async (obj) => {
    const { type, value, videoId } = obj

    switch(type) {
        case "tab-updated-new-video":
            currentVideoId = videoId
            await newVideoLoaded()
            break
        case "play-new-timestamp-in-video":
            youtubePlayer.currentTime = value

            // Once we go to that time in the video, show the timestamp progress bar for a second before hiding it again.
            const html5VideoPlayerElem = document.querySelector('.html5-video-player')
            html5VideoPlayerElem.classList.remove("ytp-autohide")

            setTimeout(() => {
                html5VideoPlayerElem.classList.add("ytp-autohide")
            }, 1000)

            break
        case "delete-bookmark":
            currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time !== value)
            await chrome.storage.sync.set({
                [currentVideoId]: JSON.stringify(currentVideoBookmarks)
            })
            break
    }
})

// TODO: There was something the original creator mentioned regarding this. This should be taken out so that it's not called more than once when landing on a video page.
newVideoLoaded()

const getTime = (t) => {
    const date = new Date(0)
    date.setSeconds(t)

    return date.toISOString().substr(11, 8)
}