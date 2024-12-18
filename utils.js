async function getActiveTabURL() {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true
    })

    return tabs[0]
}

const formatTime = (seconds) => {
    // Calculate hours, minutes, and remaining seconds
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
  
    // Pad the numbers with leading zeros where necessary
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");
  
    if (hours > 0) {
      const formattedHours = String(hours).padStart(2, "0");
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
      return `${formattedMinutes}:${formattedSeconds}`;
    }
  }

const captureFrameAtTimestamp = async (video, timestamp) => {
    if (!video) {
        throw new Error("Video element not provided");
    }

    return new Promise((resolve, reject) => {
        // Error handling if the video cannot be played
        if (video.readyState < 2) {
            reject("Video is not ready for playback");
            return;
        }

        // Function to perform the capture
        const onSeeked = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL("image/png");

                resolve(dataUrl);
            } catch (error) {
                reject("Failed to capture frame: " + error.message);
            } finally {
                video.removeEventListener("seeked", onSeeked);
            }
        };

        // Add the listener before setting currentTime to avoid any race condition
        video.addEventListener("seeked", onSeeked, { once: true });

        // Set currentTime after adding listener
        video.currentTime = timestamp;
    });
};