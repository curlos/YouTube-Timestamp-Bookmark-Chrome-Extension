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

const getIconSVG = (name, color = 'white', width = '16px', height = '16px') => {
    switch (name) {
        case 'bookmark':
            return (
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="${width}" height="${height}">
                    <path fill="${color}" d="M0 48C0 21.5 21.5 0 48 0l0 48 0 393.4 130.1-92.9c8.3-6 19.6-6 27.9 0L336 441.4 336 48 48 48 48 0 336 0c26.5 0 48 21.5 48 48l0 440c0 9-5 17.2-13 21.3s-17.6 3.4-24.9-1.8L192 397.5 37.9 507.5c-7.3 5.2-16.9 5.9-24.9 1.8S0 497 0 488L0 48z"/>
                </svg>`
            );
    }
}
