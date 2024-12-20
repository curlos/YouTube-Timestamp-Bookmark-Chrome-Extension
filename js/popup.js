let currentVideoBookmarks = []
let currentVideoBookmarksWithDataUrlByTime = []
let currentVideoId = null
let allVideosWithBookmarks = null
let currentVideoFullObj = null

/**
 * @description Once the DOM Content has loaded, check if we're on a YouTube video page and if we are, get all the bookmarks for that video and show them.
 */
document.onreadystatechange = async () => {
    if (document.readyState === "complete") {
        const activeTab = await getActiveTab();
        const queryParams = activeTab.url.split("?")[1];
        const urlParams = new URLSearchParams(queryParams);

        const isYouTubeFullVideo = activeTab.url && activeTab.url.includes("youtube.com/watch")
        const isYouTubeShortsVideo = activeTab.url && activeTab.url.includes("youtube.com/shorts")
        const isYouTubeVideo = isYouTubeFullVideo || isYouTubeShortsVideo

        if (isYouTubeVideo) {
            currentVideoId = isYouTubeFullVideo ? urlParams.get("v") : getYouTubeShortsVideoId(activeTab.url);
        }

        if (currentVideoId) {
            renderSpinner()
            renderLeftMenuButton()
            renderSidebarModalWithVideos()

            chrome.runtime.sendMessage({ type: "background-get-current-video-bookmarks-with-frames" }, async (currentVideoBookmarksWithFrames) => {
                currentVideoBookmarks = currentVideoBookmarksWithFrames

                currentVideoBookmarksWithDataUrlByTime = arrayToObjectByKey(currentVideoBookmarksWithFrames, 'time')

                await renderElemBookmarks();
                renderDeleteVideoBookmarksButton()
            });
        } else {
            renderSidebarModalWithVideos()
            document.querySelector('.sidebar-modal').classList.add('sidebar-shown');
            document.querySelector('.title').textContent = 'Videos With Bookmarks'
        }
    }
};

const renderDeleteVideoBookmarksButton = () => {
    if (currentVideoBookmarks.length === 0) {
        return
    }

    const deleteVideoBookmarksButtonWrapper = document.createElement('div')
    deleteVideoBookmarksButtonWrapper.className = 'delete-video-bookmarks-button-wrapper'

    const deleteVideoBookmarksButton = document.createElement('div')
    deleteVideoBookmarksButton.className = 'delete-video-bookmarks-button'
    deleteVideoBookmarksButton.textContent = 'Delete Video Bookmarks'

    deleteVideoBookmarksButton.addEventListener('click', async () => {
        await handleDeleteAllBookmarks()
    })

    deleteVideoBookmarksButtonWrapper.appendChild(deleteVideoBookmarksButton)
    document.querySelector('.bookmarks').appendChild(deleteVideoBookmarksButtonWrapper)
}

const renderDeleteAllBookmarksButton = async () => {
    await getAllVideosWithBookmarks()

    if (!allVideosWithBookmarks || Object.keys(allVideosWithBookmarks).length === 0) {
        return
    }

    const deleteAllBookmarksButtonWrapper = document.createElement('div')
    deleteAllBookmarksButtonWrapper.className = 'delete-video-bookmarks-button-wrapper'

    const deleteAllBookmarksButton = document.createElement('div')
    deleteAllBookmarksButton.className = 'delete-video-bookmarks-button delete-all-bookmarks-button'
    deleteAllBookmarksButton.textContent = 'Delete All Bookmarks'

    deleteAllBookmarksButton.addEventListener('click', async () => {
        await handleDeleteAllBookmarks()
    })

    deleteAllBookmarksButtonWrapper.appendChild(deleteAllBookmarksButton)

    deleteAllBookmarksButtonWrapper.addEventListener('click', async () => {
        await chrome.storage.sync.clear()
    })

    const sidebarVideoListElem = document.querySelector('.sidebar-video-list')
    sidebarVideoListElem.appendChild(deleteAllBookmarksButtonWrapper)
}

const renderLeftMenuButton = () => {
    const menuDiv = document.getElementById("menu-svg-wrapper");
    menuDiv.innerHTML = getIconSVG("menu")
    menuDiv.addEventListener('click', () => {
        document.querySelector('.sidebar-modal').classList.add('sidebar-transition')
        document.querySelector('.sidebar-modal').classList.toggle('sidebar-shown');

        const isSidebarModalOpen = document.querySelector('.sidebar-modal').classList.contains('sidebar-shown')

        if (isSidebarModalOpen) {
            document.querySelector('.title').textContent = 'Videos With Bookmarks'
        } else {
            document.querySelector('.title').textContent = 'Bookmarks For This Video'
        }
    })
}

const renderSidebarModalWithVideos = async () => {
    const sidebarVideoListElem = document.querySelector('.sidebar-video-list')
    sidebarVideoListElem.innerHTML = ''

    await getAllVideosWithBookmarks()

    // Sort the videos from most recently updated to least recently updated.
    const sortedVideosWithBookmarksIds = Object.keys(allVideosWithBookmarks).sort((a, b) => {
        const objA = JSON.parse(allVideosWithBookmarks[a])
        const objB = JSON.parse(allVideosWithBookmarks[b])

        const dateA = new Date(objA.updatedAt)
        const dateB = new Date(objB.updatedAt)

        return dateB - dateA
    })

    sortedVideosWithBookmarksIds.forEach((videoId) => {
        const video = JSON.parse(allVideosWithBookmarks[videoId])

        const videoWithBookmarksElem = document.createElement('div')
        videoWithBookmarksElem.className = 'video-with-bookmarks'

        const thumbnailImageElement = document.createElement('img')
        thumbnailImageElement.src = video.thumbnailImageSrc

        const videoInfoElem = document.createElement('div')
        
        const titleElement = document.createElement('div')
        titleElement.textContent = video.title
        titleElement.className = 'video-with-bookmarks-title'
        
        const bookmarksNumberElement = document.createElement('div')
        bookmarksNumberElement.textContent = video.bookmarks.length > 1 ? `${video.bookmarks.length} Bookmarks` : `${video.bookmarks.length} Bookmark`

        videoInfoElem.appendChild(titleElement)
        videoInfoElem.appendChild(bookmarksNumberElement)

        videoWithBookmarksElem.appendChild(thumbnailImageElement)
        videoWithBookmarksElem.appendChild(videoInfoElem)

        // When the video container is clicked, navigate to that video's page.
        videoWithBookmarksElem.addEventListener('click', async () => {
            const videoURL = video.videoType === 'shorts' ? `https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`
            const activeTab = await getActiveTab()

            if (currentVideoId !== videoId) {
                chrome.tabs.update(activeTab.id, {
                    url: videoURL
                })
            }

            // Close the popup after navigating to the new video page.
            window.close()
        })

        sidebarVideoListElem.appendChild(videoWithBookmarksElem)
    })

    await renderDeleteAllBookmarksButton()
}

const renderSpinner = () => {
    const bookmarkListElem = document.getElementById("bookmarks");
    bookmarkListElem.innerHTML = ''
    
    const loadingSpinnerElem = document.createElement('div')
    loadingSpinnerElem.className = 'loader'
    bookmarkListElem.appendChild(loadingSpinnerElem)
}

const renderElemBookmarks = async () => {
    const bookmarkListElem = document.getElementById("bookmarks");
    bookmarkListElem.innerHTML = "";

    if (currentVideoBookmarks.length === 0) {
        bookmarkListElem.innerHTML = '<i class="row">No bookmarks to show</i>';
        return;
    }

    for (let i = 0; i < currentVideoBookmarks.length; i++) {
        const { time } = currentVideoBookmarks[i]
        const bookmark = currentVideoBookmarksWithDataUrlByTime[time]
        const isLastIndex = (i === currentVideoBookmarks.length - 1)

        await addNewBookmarkElem(bookmarkListElem, bookmark, isLastIndex);
    }
};

const addNewBookmarkElem = async (bookmarkListElem, bookmark, isLastIndex) => {
    const bookmarkTitleElement = document.createElement("div");
    const controlsElement = document.createElement("div");
    const newBookmarkElement = document.createElement("div");
    const newBookmarkBottomWrapperElement = document.createElement("div");
    const timestampImgElement = document.createElement("img");

    bookmarkTitleElement.textContent = formatTime(bookmark.time);
    bookmarkTitleElement.className = "bookmark-title";
    bookmarkTitleElement.addEventListener('click', () => {
        handlePlayVideo(bookmark.time)
    })

    controlsElement.className = "bookmark-controls";

    timestampImgElement.src = bookmark.dataUrl;
    timestampImgElement.className = "timestamp-img";
    timestampImgElement.addEventListener("click", () => {
        handlePlayVideo(bookmark.time);
    });

    setControlBookmarkSVGElem(
        "play",
        () => {
            handlePlayVideo(bookmark.time);
        },
        controlsElement,
    );
    setControlBookmarkSVGElem(
        "delete",
        () => {
            handleDeleteBookmark(bookmark.time);
        },
        controlsElement,
    );

    newBookmarkElement.id = "bookmark-" + bookmark.time;
    newBookmarkBottomWrapperElement.className = "bookmark-bottom-wrapper";

    if (isLastIndex) {
        newBookmarkBottomWrapperElement.classList.add('bookmark-no-bottom-border')
    }

    newBookmarkBottomWrapperElement.appendChild(timestampImgElement);
    newBookmarkBottomWrapperElement.appendChild(bookmarkTitleElement);
    newBookmarkBottomWrapperElement.appendChild(controlsElement);

    newBookmarkElement.appendChild(timestampImgElement);
    newBookmarkElement.appendChild(newBookmarkBottomWrapperElement);

    bookmarkListElem.appendChild(newBookmarkElement);
};

const setControlBookmarkSVGElem = (name, eventListener, controlParentElement) => {
    const controlElement = document.createElement("div");
    controlElement.innerHTML = getIconSVG(name)
    controlElement.className = "svg-wrapper"
    
    controlElement.addEventListener("click", eventListener);
    controlParentElement.appendChild(controlElement);
};

const handlePlayVideo = async (bookmarkTime) => {
    const activeTab = await getActiveTab();

    chrome.tabs.sendMessage(activeTab.id, {
        type: "play-new-timestamp-in-video",
        value: bookmarkTime,
    });
};

const handleDeleteBookmark = async (bookmarkTime) => {
    const bookmarkElementToDelete = document.getElementById("bookmark-" + bookmarkTime);
    bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);
    
    await fetchBookmarks()

    const filteredCurrentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time !== bookmarkTime)

    if (filteredCurrentVideoBookmarks.length === 0) {
        await chrome.storage.sync.remove(currentVideoId)
    } else {
        await chrome.storage.sync.set({
            [currentVideoId]: JSON.stringify({
                ...currentVideoFullObj,
                bookmarks: filteredCurrentVideoBookmarks,
                updatedAt: new Date()
            }),
        });
    }

    await handleFilteredBookmarks()
     
};

const handleDeleteAllBookmarks = async () => {
    await chrome.storage.sync.remove(currentVideoId)
    await handleFilteredBookmarks()
}

const handleFilteredBookmarks = async () => {
    await fetchBookmarks()
    await getAllVideosWithBookmarks()

    renderSidebarModalWithVideos()
    renderElemBookmarks()
}

const getAllVideosWithBookmarks = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, function(items) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                allVideosWithBookmarks = items
                resolve(items);
            }
        });
    });
}

/**
 * @description Fetch the array of bookmarks for the current video. If no bookmarks, will return an empty array.
 * @returns {Array<Object>}
 */
const fetchBookmarks = async () => {
    const obj = await chrome.storage.sync.get(currentVideoId);
    const jsonObj = obj[currentVideoId] ? JSON.parse(obj[currentVideoId]) : {}

    const { bookmarks = [] } = jsonObj

    currentVideoBookmarks = bookmarks
    currentVideoFullObj = jsonObj
};