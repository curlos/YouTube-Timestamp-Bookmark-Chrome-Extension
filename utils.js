export async function getActiveTabURL() {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true
    })

    return tabs[0]
}

export const formatTime = (seconds) => {
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


export const captureThumbnail = (videoSrc, time) => {
    return new Promise((resolve, reject) => {
        // Create a video element
        var hiddenVideo = document.createElement('video');

        // Set video attributes
        hiddenVideo.src = videoSrc;
        hiddenVideo.currentTime = time;
        hiddenVideo.muted = true;  // Ensure the video is muted
        hiddenVideo.style.display = 'none';  // Make video element invisible

        // Event listener for when the video is ready to seek
        hiddenVideo.addEventListener('loadedmetadata', function() {
            hiddenVideo.currentTime = time;
        });

        // Event listener for when the video has seeked to the desired time
        hiddenVideo.addEventListener('seeked', function() {
            // Create a canvas element
            var canvas = document.createElement('canvas');
            canvas.width = hiddenVideo.videoWidth;
            canvas.height = hiddenVideo.videoHeight;
            var context = canvas.getContext('2d');

            // Draw the video frame to the canvas
            context.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);

            // Create an image element for the thumbnail
            var img = document.createElement('img');
            img.alt = 'Video Thumbnail';
            img.src = canvas.toDataURL('image/png');

            // Cleanup: remove the hidden video element after use
            hiddenVideo.remove();

            // Resolve the promise with the image element
            resolve(img);
        });

        // Start loading the video
        hiddenVideo.load();
    });
}