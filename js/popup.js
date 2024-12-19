/**
 * @description Once the DOM Content has loaded, check if we're on a YouTube video page and if we are, get all the bookmarks for that video and show them.
 */
document.onreadystatechange = async () => {
    if (document.readyState === "complete") {
        const activeTab = await getActiveTabURL();
        const queryParams = activeTab.url.split("?")[1];
        const urlParams = new URLSearchParams(queryParams);

        const currentVideoId = urlParams.get("v");

        if (activeTab.url.includes("youtube.com/watch") && currentVideoId) {
            renderSpinner()
            renderLeftMenuButton()
            renderSidebarModalWithVideos()

            chrome.runtime.sendMessage({ type: "async-get-current-video-bookmarks" }, (currentVideoBookmarks) => {
                renderElemBookmarks(currentVideoBookmarks);
            });
        } else {
            const container = document.getElementsByClassName("container")[0];
            container.innerHTML = '<div class="title">This is not a YouTube video page.</div>';
        }
    }
};

const renderLeftMenuButton = () => {
    const menuDiv = document.getElementById("menu-svg-wrapper");
    menuDiv.innerHTML = getIconSVG("menu")
    menuDiv.addEventListener('click', () => {
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
    document.querySelector('.sidebar-content')
    const allVideosWithBookmarks = await getAllVideosWithBookmarks()

    console.log(allVideosWithBookmarks)
}

const renderSpinner = () => {
    const bookmarkListElem = document.getElementById("bookmarks");
    bookmarkListElem.innerHTML = ''
    
    const loadingSpinnerElem = document.createElement('div')
    loadingSpinnerElem.className = 'loader'
    bookmarkListElem.appendChild(loadingSpinnerElem)
}

const renderElemBookmarks = async (currentVideoBookmarks = []) => {
    const bookmarkListElem = document.getElementById("bookmarks");
    bookmarkListElem.innerHTML = "";

    if (currentVideoBookmarks.length === 0) {
        bookmarkListElem.innerHTML = '<i class="row">No bookmarks to show</i>';
        return;
    }

    for (let i = 0; i < currentVideoBookmarks.length; i++) {
        const bookmark = currentVideoBookmarks[i]
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
        onPlay(bookmark.time)
    })

    controlsElement.className = "bookmark-controls";

    timestampImgElement.src = bookmark.dataUrl;
    timestampImgElement.className = "timestamp-img";
    timestampImgElement.addEventListener("click", () => {
        onPlay(bookmark.time);
    });

    setControlBookmarkSVGElem(
        "play",
        () => {
            onPlay(bookmark.time);
        },
        controlsElement,
    );
    setControlBookmarkSVGElem(
        "delete",
        () => {
            onDelete(bookmark.time);
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

const onPlay = async (bookmarkTime) => {
    const activeTab = await getActiveTabURL();

    chrome.tabs.sendMessage(activeTab.id, {
        type: "play-new-timestamp-in-video",
        value: bookmarkTime,
    });
};

const onDelete = async (bookmarkTime) => {
    const activeTab = await getActiveTabURL();
    const bookmarkElementToDelete = document.getElementById("bookmark-" + bookmarkTime);

    bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);

    chrome.tabs.sendMessage(activeTab.id, {
        type: "delete-bookmark",
        value: bookmarkTime,
    });
};

const getAllVideosWithBookmarks = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, function(items) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(items);
            }
        });
    });
}