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
            const bookmarkListElem = document.getElementById("bookmarks");
            bookmarkListElem.innerHTML = ''
            
            const loadingSpinnerElem = document.createElement('div')
            loadingSpinnerElem.className = 'loader'
            bookmarkListElem.appendChild(loadingSpinnerElem)

            chrome.runtime.sendMessage({ type: "async-get-current-video-bookmarks" }, (currentVideoBookmarks) => {
                renderElemBookmarks(currentVideoBookmarks);
            });
        } else {
            const container = document.getElementsByClassName("container")[0];
            container.innerHTML = '<div class="title">This is not a YouTube video page.</div>';
        }
    }
};

const renderElemBookmarks = async (currentVideoBookmarks = []) => {
    const bookmarkListElem = document.getElementById("bookmarks");
    bookmarkListElem.innerHTML = "";

    if (currentVideoBookmarks.length === 0) {
        bookmarkListElem.innerHTML = '<i class="row">No bookmarks to show</i>';
        return;
    }

    for (let bookmark of currentVideoBookmarks) {
        await addNewBookmarkElem(bookmarkListElem, bookmark);
    }
};

const addNewBookmarkElem = async (bookmarkListElem, bookmark) => {
    const bookmarkTitleElement = document.createElement("div");
    const controlsElement = document.createElement("div");
    const newBookmarkElement = document.createElement("div");
    const newBookmarkBottomWrapperElement = document.createElement("div");
    const timestampImgElement = document.createElement("img");

    bookmarkTitleElement.textContent = formatTime(bookmark.time);
    bookmarkTitleElement.className = "bookmark-title";
    controlsElement.className = "bookmark-controls";

    // const thumbnail = await captureThumbnail(videoElem.src, bookmark.time)

    // console.log(thumbnail)

    timestampImgElement.src = bookmark.dataUrl;
    timestampImgElement.className = "timestamp-img";
    timestampImgElement.addEventListener("click", () => {
        onPlay(bookmark.time);
    });

    setBookmarkAttributes(
        "play",
        () => {
            onPlay(bookmark.time);
        },
        controlsElement,
    );
    setBookmarkAttributes(
        "delete",
        () => {
            onDelete(bookmark.time);
        },
        controlsElement,
    );

    newBookmarkElement.id = "bookmark-" + bookmark.time;
    newBookmarkBottomWrapperElement.className = "bookmark-bottom-wrapper";

    newBookmarkBottomWrapperElement.appendChild(timestampImgElement);
    newBookmarkBottomWrapperElement.appendChild(bookmarkTitleElement);
    newBookmarkBottomWrapperElement.appendChild(controlsElement);

    newBookmarkElement.appendChild(timestampImgElement);
    newBookmarkElement.appendChild(newBookmarkBottomWrapperElement);

    bookmarkListElem.appendChild(newBookmarkElement);
};

const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
    const controlElement = document.createElement("img");

    controlElement.src = "assets/" + src + ".png";
    controlElement.title = src;
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
