import { state } from "./state.js";
import { handleFilteredBookmarks, fetchBookmarks } from './helpers.js'

/**
 * @description Send the message to background.js that will then send a message to contentScript.js to get the captured frames of the current video at the specified bookmark timestamps and re-render the list of bookmarks.
 */
export const setCapturedFramesAndRender = () => {
    // TODO: Replace this with "chrome.tabs" to send a message to "contentScript.js" directly. Hopefully it fixes the other big bug too!
    chrome.runtime.sendMessage(
        { type: "background-get-current-video-bookmarks-with-frames" },
        async (currentVideoBookmarksWithFrames) => {
            state.currentVideoBookmarks = currentVideoBookmarksWithFrames;

            state.currentVideoBookmarksWithDataUrlByTime = arrayToObjectByKey(currentVideoBookmarksWithFrames, "time", true);

            await renderBookmarkElementsForCurrentVideo();
        },
    );
};

/**
 * @description Render the "Delete Video Bookmarks" button at the bottom of the "Bookmarks For This Video" view.
 */
export const renderDeleteVideoBookmarksButton = () => {
    if (state.currentVideoBookmarks.length === 0) {
        return;
    }

    const deleteVideoBookmarksButtonWrapper = document.createElement("div");
    deleteVideoBookmarksButtonWrapper.className = "delete-video-bookmarks-button-wrapper";

    const deleteVideoBookmarksButton = document.createElement("div");
    deleteVideoBookmarksButton.className = "delete-video-bookmarks-button";
    deleteVideoBookmarksButton.textContent = "Delete Video Bookmarks";

    deleteVideoBookmarksButton.addEventListener("click", async () => {
        await chrome.storage.sync.remove(state.currentVideoId);
        await handleFilteredBookmarks();
    });

    deleteVideoBookmarksButtonWrapper.appendChild(deleteVideoBookmarksButton);
    document.querySelector(".bookmarks").appendChild(deleteVideoBookmarksButtonWrapper);
};

/**
 * @description Render the blue spinning loader while we wait for the bookmarks for the current video to be fetched.
 */
export const renderSpinnerCurrentVideoBookmarks = () => {
    const bookmarkListElem = document.getElementById("bookmarks");
    bookmarkListElem.innerHTML = "";

    const loadingSpinnerElem = document.createElement("div");
    loadingSpinnerElem.className = "loader";
    bookmarkListElem.appendChild(loadingSpinnerElem);
};

/**
 * 
 * @returns Render the list
 */
export const renderBookmarkElementsForCurrentVideo = async () => {
    const bookmarkListElem = document.getElementById("bookmarks");
    bookmarkListElem.innerHTML = "";

    if (state.currentVideoBookmarks.length === 0) {
        bookmarkListElem.innerHTML = '<i class="row">No bookmarks to show</i>';
        return;
    }

    const bookmarksWithProgress = state.currentVideoBookmarks && state.currentVideoBookmarks.map((bookmark) => {
        return {
            ...bookmark,
            finished: false
        }
    })

    state.bookmarkElements = []

    for (let index = 0; index < state.currentVideoBookmarks.length; index++) {
        const { time } = state.currentVideoBookmarks[index];
        const bookmark = state.currentVideoBookmarks[index]
        const bookmarkWithDataUrl = state.currentVideoBookmarksWithDataUrlByTime[Math.floor(time)];
        const dataUrl = bookmarkWithDataUrl && bookmarkWithDataUrl.dataUrl
        const isLastIndex = index === state.currentVideoBookmarks.length - 1;

        await addNewBookmarkElem(bookmarkListElem, bookmark, dataUrl, isLastIndex, index, bookmarksWithProgress);
    }

    renderDeleteVideoBookmarksButton()
};

/**
 * @description Create a bookmark element and append it to the parent "bookmarkListElem". This will contain the captured frame for the bookmark's time stamp (if "captureFrames" is turned on), the timestamp number, a "play" button that will jump to that point in the video, and a "delete" button that will remove the bookmark.
 * @param {HTMLElement} bookmarkListElem 
 * @param {Object} bookmark 
 * @param {Boolean} isLastIndex 
 */
export const addNewBookmarkElem = async (bookmarkListElem, bookmark, dataUrl, isLastIndex, index, bookmarksWithProgress) => {
    const showCapturedFrames = state.userSettings.captureFrames;

    const bookmarkTitleElement = document.createElement("div");
    const controlsElement = document.createElement("div");
    const newBookmarkElement = document.createElement("div");
    const newBookmarkBottomWrapperElement = document.createElement("div");
    const timestampImgElement = showCapturedFrames && document.createElement("img");
    const formElement = document.createElement('form')
    const textareaElement = document.createElement('textarea')
    const noteElement = document.createElement('div')
    const progressContainer = document.createElement("div");

    const toggleEditNoteForm = () => {
        formElement.classList.toggle('show-edit-form')
        noteElement.classList.toggle('hide-note')

        if (formElement.classList.contains('show-edit-form')) {
            textareaElement.focus()
            textareaElement.selectionStart = textareaElement.value.length;
        }
    }

    const setControlElems = (bookmark, controlsElement, toggleEditNoteForm) => {
        setControlBookmarkSVGElem(
            "play",
            () => {
                handlePlayVideo(bookmark.time);
            },
            controlsElement,
        );
    
        setControlBookmarkSVGElem(
            "pen-to-square",
            () => {
                toggleEditNoteForm()
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
    }

    const addTimestampControlsAndFrame = () => {
        bookmarkTitleElement.textContent = formatTime(Math.floor(bookmark.time));
        bookmarkTitleElement.className = "bookmark-title";
        bookmarkTitleElement.addEventListener("click", () => {
            handlePlayVideo(bookmark.time);
        });

        controlsElement.className = "bookmark-controls";

        showCapturedFrames && (timestampImgElement.src = dataUrl);
        showCapturedFrames && (timestampImgElement.className = "timestamp-img");
        showCapturedFrames &&
            timestampImgElement.addEventListener("click", () => {
                handlePlayVideo(bookmark.time);
            });

        setControlElems(bookmark, controlsElement, toggleEditNoteForm)

        newBookmarkElement.id = "bookmark-" + bookmark.time;
        newBookmarkElement.className = "bookmark-container";
        newBookmarkBottomWrapperElement.className = "bookmark-bottom-wrapper";

        showCapturedFrames && newBookmarkBottomWrapperElement.appendChild(timestampImgElement);
        newBookmarkBottomWrapperElement.appendChild(bookmarkTitleElement);
        newBookmarkBottomWrapperElement.appendChild(controlsElement);

        if (isLastIndex) {
            newBookmarkElement.classList.add("bookmark-no-bottom-border");
        }
    }

    const addFormWithTextareaAndButtons = () => {
        noteElement.textContent = bookmark.note || ''
        textareaElement.textContent = bookmark.note || ''

        textareaElement.addEventListener("input", function () {
            this.style.height = "auto"; // Reset the height
            this.style.height = `${this.scrollHeight}px`; // Set it to the scroll height
        });

        const submitButton = document.createElement('button')
        submitButton.textContent = 'Submit'
        submitButton.className = 'submit-button'
        submitButton.type = 'submit'
        
        formElement.addEventListener('submit', async (e) => {
            e.preventDefault()
            const newNote = textareaElement.value
            await handleEditBookmarkNote(bookmark, newNote)
        })

        const cancelButton = document.createElement('button')
        cancelButton.textContent = 'Cancel'
        cancelButton.className = 'cancel-button'
        cancelButton.addEventListener('click', (e) => {
            e.preventDefault()
            toggleEditNoteForm()
        })

        const buttonsWrapper = document.createElement('div')
        buttonsWrapper.className = 'form-buttons-wrapper'
        buttonsWrapper.appendChild(cancelButton)
        buttonsWrapper.appendChild(submitButton)

        formElement.appendChild(textareaElement)
        formElement.appendChild(buttonsWrapper)
    }

    const addProgressBar = () => {
        progressContainer.classList.add("progress-container");

        // Create progress bar
        const progressBar = document.createElement("div");
        progressBar.classList.add("progress-bar");

        // Create progress fill
        const progressFill = document.createElement("div");
        progressFill.classList.add("progress-fill");

        // Append progress fill to progress bar
        progressBar.appendChild(progressFill);

        // Create progress thumb
        const progressThumb = document.createElement("div");
        progressThumb.classList.add("progress-thumb");

        // Append progress bar and thumb to the container
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressThumb);

        let progress = 0; // Initial progress (0 to 100)

        // Function to update progress bar
        function updateProgress(value) {
            progress = Math.min(Math.max(value, 0), 100); // Clamps the value between 0 and 100
            const widthPercentage = `${progress}%`;

            progressBar.style.width = widthPercentage;
            progressThumb.style.left = `calc(${widthPercentage} - 5.5px)`; // Adjust thumb position
        }

        setInterval(() => {
            if (state.video.currentTime >= bookmark.time) {
                const bookmarkJustFinished = !bookmarksWithProgress[index].finished
                const notTheLastBookmark = index !== bookmarksWithProgress.length - 1

                // Scroll the next bookmark into view once the current one finishes.
                if (bookmarkJustFinished && notTheLastBookmark) {
                    const nextBookmarkElement = state.bookmarkElements[index + 1]
                    
                    nextBookmarkElement.scrollIntoView({
                        behavior: "smooth",
                        block: "end"
                    })
                }

                bookmarksWithProgress[index].finished = true
            } else {
                bookmarksWithProgress[index].finished = false
            }

            const prevBookmark = index !== 0 && bookmarksWithProgress[index - 1]
            const prevTimestampCompleted = prevBookmark && prevBookmark.finished

            if (index === 0) {
                progress = (state.video.currentTime / bookmark.time) * 100;
            } else if (prevTimestampCompleted) {
                // TODO: Still a little confused but visually this does what I want.
                progress = ((state.video.currentTime - prevBookmark.time) / (bookmark.time - prevBookmark.time)) * 100;
            } else {
                progress = 0
            }
            
            updateProgress(progress);
        }, 100);
    }

    addTimestampControlsAndFrame()
    addFormWithTextareaAndButtons()
    addProgressBar()

    showCapturedFrames && newBookmarkElement.appendChild(timestampImgElement);
    newBookmarkElement.appendChild(progressContainer);
    newBookmarkElement.appendChild(newBookmarkBottomWrapperElement);
    newBookmarkElement.appendChild(noteElement);
    newBookmarkElement.appendChild(formElement);

    state.bookmarkElements.push(newBookmarkElement)

    bookmarkListElem.appendChild(newBookmarkElement);
};

/**
 * @description Create a new element with an SVG icon and a callback that runs when the element is clicked.
 * @param {String} name 
 * @param {Function} callback 
 * @param {HTMLElement} controlParentElement 
 */
export const setControlBookmarkSVGElem = (name, callback, controlParentElement) => {
    const controlElement = document.createElement("div");
    controlElement.innerHTML = getIconSVG(name);
    controlElement.className = "svg-wrapper";

    controlElement.addEventListener("click", callback);
    controlParentElement.appendChild(controlElement);
};

/**
 * @description Sends a message from the "popup.js" to "background.js" who will then send a message to "contentScript.js" to change the video element's "currentTime" to "bookmarkTime".
 * @param {Number} bookmarkTime 
 */
export const handlePlayVideo = async (bookmarkTime) => {
    const activeTab = await getActiveTab();

    chrome.tabs.sendMessage(activeTab.id, {
        type: "play-new-timestamp-in-video",
        value: bookmarkTime,
    });
};

/**
 * @description Delete a bookmark from the current video's "bookmarks" array. If the current video has no more bookmarks left after deleting this, then remove the video's key-value pair from the Chrome Storage.
 * @param {Number} bookmarkTime 
 */
export const handleDeleteBookmark = async (bookmarkTime) => {
    const bookmarkElementToDelete = document.getElementById("bookmark-" + bookmarkTime);
    bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);

    await fetchBookmarks();

    const filteredCurrentVideoBookmarks = state.currentVideoBookmarks.filter((b) => b.time !== bookmarkTime);

    if (filteredCurrentVideoBookmarks.length === 0) {
        await chrome.storage.sync.remove(state.currentVideoId);
    } else {
        await chrome.storage.sync.set({
            [state.currentVideoId]: JSON.stringify({
                ...state.currentVideoFullObj,
                bookmarks: filteredCurrentVideoBookmarks,
                updatedAt: new Date(),
            }),
        });
    }

    await handleFilteredBookmarks();
};

/**
 * @description Edit the bookmark with a new "note".
 * @param {Object} bookmarkToEdit 
 * @param {String} newNote 
 */
export const handleEditBookmarkNote = async (bookmarkToEdit, newNote) => {
    await fetchBookmarks();

    const newCurrentVideoBookmarks = state.currentVideoBookmarks.map((bookmark) => {
        if (bookmark.time !== bookmarkToEdit.time) {
            return bookmark
        }

        const { dataUrl, ...restOfBookmarkToEdit } = bookmarkToEdit

        return {
            ...restOfBookmarkToEdit,
            note: newNote
        }
    });

    await chrome.storage.sync.set({
        [state.currentVideoId]: JSON.stringify({
            ...state.currentVideoFullObj,
            bookmarks: newCurrentVideoBookmarks,
            updatedAt: new Date(),
        }),
    });

    await handleFilteredBookmarks();
};
