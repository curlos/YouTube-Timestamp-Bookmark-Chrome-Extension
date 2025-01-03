<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="[https://github.com/Curlos/Rock-Paper-Scissors](https://github.com/curlos/YouTube-Timestamp-Bookmark-Chrome-Extension)">
    <img src="/assets/bookmark.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">YouTube Timestamp Bookmarker (Chrome Extension)</h3>
</p>



<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

YouTube Timestamp Bookmarker is a Chrome Extension that allows you to bookmark timestamps in YouTube videos, add notes to those bookmarks, and see a history of every video that you've bookmarked.

### Built With

* HTML
* CSS
* JavaScript

## Features
- Add a bookmark for a specific timestamp on the current video.
- Each bookmark for the current video will allow you to play the video from that timestamp, add a note, or delete that bookmark.
- Show a picture of the frame from the video at the bookmark's timestamp.
- Show a progress bar showing how much time is left until you reach the bookmark.
- Delete all bookmarks for a specific video.
- Show a history of videos with at least one bookmark.
- Delete all bookmarks for ALL videos.
- Settings modal that will allow you to sort bookmarks and switch on or off special features.

## Videos With Bookmarks

<img src="https://github.com/user-attachments/assets/090f2c5d-e570-40ee-8ed0-26f81c842a74" height="400" />
<img src="https://github.com/user-attachments/assets/65579e35-ea88-4806-b832-7d1ccc6aa5cc" height="400" />
<img src="https://github.com/user-attachments/assets/a53050f5-97a2-420a-ba36-a35af730681b" height="400" />

- Shows a list of YouTube videos that have at least one bookmark.
- When a video is clicked, you will be redirected to that YouTube video’s page.
- When the “Delete” icon is clicked, all of the bookmarks for that video will be deleted.
- When the “Delete All Bookmarks” button is clicked, all bookmarks for all videos will be deleted.
  

## **Bookmarks For This Video**

<img src="https://github.com/user-attachments/assets/0a7e263d-c57a-409d-a77f-2eda512406af" height="400" />
<div>
  <img src="https://github.com/user-attachments/assets/4be3679a-fba8-4a43-b046-18e6861e1d8a" height="400" />
  <img src="https://github.com/user-attachments/assets/c3e7784c-bcf8-41ed-9af4-baf6ab094575" height="400" />
</div>

- Shows a list of all of the bookmarks for the video for specific timestamps.
- When the timestamp’s frame or “play” button is clicked, it will go to that timestamp in the video and play it.
- When the “Edit” button is clicked, a edit textbox will be opened which will allow you to add or edit a note for that timestamp.
    - When “Cancel” is clicked, it will close the textbox without making any changes to the note.
    - When “Submit” is clicked, it will also close the textbox and change the note to the new text.
- When the “Delete” button is clicked, the bookmark for that specific timestamp will be deleted.
- When “Delete Video Bookmarks” is clicked, delete all of the bookmarks for the current video.

## Settings

<img src="https://github.com/user-attachments/assets/44ffcbd4-f2fb-4ac9-8a5d-ee13c20f1b9f" height="400" />

- Sort By (Videos With Bookmarks)
    - Most Recently Updated → Sorts from “Most Recently Updated” to “Least Recently Updated”.
      - <img src="https://github.com/user-attachments/assets/82f9eded-4bc9-4f46-8a69-5139f4107ab8" height="400" />
    - Least Recently Updated → Sorts from “Least Recently Updated” to “Most Recently Updated”.
      - <img src="https://github.com/user-attachments/assets/7b801fed-2ad8-473e-843d-e258371fa5d3" height="400" />
    - Most Bookmarks → Sorts from “Most Bookmarks” to “Least Bookmarks”
      - <img src="https://github.com/user-attachments/assets/3cbe3774-c366-4641-a6a0-e4f65841b272" height="400" />
    - Least Bookmarks → Sorts from “Least Bookmarks” to “Most Bookmarks”
      - <img src="https://github.com/user-attachments/assets/cc38b920-215d-4f29-bab1-07634b00cfaf" height="400" />
- Other (For “Bookmarks For This Video”)
    - Capture Frames
        - If CHECKED, then show the frames or images for each bookmark in the current video.
          - <img src="https://github.com/user-attachments/assets/56596884-676a-41d5-9843-f3e336bd1d25" height="400" />
        - If NOT CHECKED, then do NOT show the timestamp frames.
          - <img src="https://github.com/user-attachments/assets/f592ed61-d4bc-4301-ac4d-8e35bbc094ee" height="400" />
    - Show Bookmarks Progress Bar
        - If CHECKED, SHOW a progress bar for each bookmark of the current video. This progress bar will represent how much time is left until we reach it. So, if you’re on a 10:00 minute video and the current time in the video is 4:06 and your next bookmark is at 4:30, then there’s 24 seconds left till’ that so the progress bar for that 4:30 bookmark will keep increasing until you get to the bookmark (4:30).
          - <img src="https://github.com/user-attachments/assets/f592ed61-d4bc-4301-ac4d-8e35bbc094ee" height="400" />
        - If NOT CHECKED, DO NOT SHOW the progress bar under each bookmark.
          - <img src="https://github.com/user-attachments/assets/84ca3407-afbc-4de5-bc5a-6e8dfab63d38" height="400" />
    - Scroll Next Bookmark Into View
        - If checked, then when the video is playing while the popup is open and we reach the next bookmark’s timestamp, then scroll to that bookmark automatically.
        - If not checked, do not automatically scroll to any of the timestamp bookmarks for the current video.
</div>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.


<!-- ACKNOWLEDGEMENTS -->
## Acknowledgements
* <div>Icons made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
