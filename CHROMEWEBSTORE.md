# Chrome Web Store Listing & Publishing Guide — Ramupod Companion

Single source of truth for publishing **Ramupod Companion** to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 1. Store Metadata

| Field | Value |
| :--- | :--- |
| **Extension Name** | Ramupod Companion · Screen Recorder & QA Capture |
| **Version** | `0.4.0` |
| **Category** | Productivity / Developer Tools |
| **Primary Language** | English |
| **Website** | `https://ramupod.com` |
| **Support URL** | `https://ramupod.com/tools/screen-recorder` |

### Short Description (max 132 chars)
> All-in-one browser companion: screen recording with floating dock controls and camera bubble, plus QA network bug reporting.

### Detailed Description (Markdown formatting)
```markdown
Ramupod Companion turns your browser into a local-first recording studio and developer evidence capture tool.

🎥 IN-TAB SCREEN RECORDER
• Record any browser tab with high-definition video and microphone narration.
• Floating Dock Controls: Keep controls handy with intuitive Pause, Resume, Stop, and Minimize actions.
• Floating Camera Bubble: Show your webcam overlay anywhere on the page, with fluid dragging support.
• Live Screen Annotations: Draw arrows, circles, and notes directly on the web page while speaking. All drawings are captured into the video in real-time.
• Click-to-Zoom Focus: Click any element or region to smoothly zoom in (1.75x) to direct audience attention.
• Hotkey Support: Control recording without touching on-screen buttons (Alt+Shift+H to hide dock, Alt+Shift+S to stop, Alt+Shift+P to pause, Alt+Shift+D to draw, Alt+Shift+Z to zoom).

🐞 QA BUG & NETWORK REPORTING
• Capture HTTP requests, response headers, and bodies directly from the active tab.
• Copy clean cURL commands with auto-redaction of sensitive authorization headers and cookies.
• Save evidence packages with annotated screenshots and HAR data.

🔒 100% PRIVATE & LOCAL
• Zero external uploads: Video encoding and network logs are processed entirely in your browser using local Web APIs.
• No analytics or telemetry.
• No account or subscription required.
```

---

## 2. Permissions Justification (For Chrome Review Team)

Chrome Web Store reviewers require an explicit, plain-English justification for each declared permission:

| Permission | Review Justification |
| :--- | :--- |
| `tabCapture` | Required to capture the audio and video stream of the user-selected tab when they initiate a screen recording session. |
| `offscreen` | Required to host an offscreen MediaRecorder document that encodes tab audio and microphone streams into a WebM video file without interrupting page navigation. |
| `activeTab` | Required to inject floating recorder controls, the camera preview bubble, and drawing canvas into the active tab after explicit user action. |
| `scripting` | Required to inject user-interface elements (dock toolbar, camera bubble, drawing overlay) into the active tab when recording or screenshotting starts. |
| `storage` | Required to remember user preferences locally (last selected tab between Recorder and QA Bug Report, and viewer URL preference). |
| `debugger` | Required strictly for the QA Bug Report mode to collect network request timings, status codes, and HTTP headers when the user explicitly clicks "Start testing". |

---

## 3. Privacy & Data Use Disclosures

When completing the **Privacy** tab in the Chrome Developer Dashboard, declare the following:

- **Single Purpose Description**:  
  > Provide local screen recording with in-tab presentation controls and developer QA network logging.
- **Does this extension collect user data?**  
  > **No.** All recordings, screenshots, and network logs are stored strictly on the user's local device (`chrome.storage.local` and in-memory WebM blobs).
- **Does this extension sell user data to third parties?**  
  > **No.**
- **Does this extension use or transfer data for purposes unrelated to the extension's core functionality?**  
  > **No.**
- **Does this extension use or transfer data to determine creditworthiness or for lending purposes?**  
  > **No.**

---

## 4. Visual Assets Checklist

Before submitting, prepare the following image assets:

- [x] **Icons (already generated in build)**:
  - `icon-16.png` (16×16 px)
  - `icon-32.png` (32×32 px)
  - `icon-48.png` (48×48 px)
  - `icon-128.png` (128×128 px) — also used as the primary store icon.
- [ ] **Store Screenshots** (Minimum 1 required, 1280×800 px or 640×400 px, 16:10 or 4:3 aspect ratio, PNG/JPEG):
  - *Screenshot 1*: Extension popup showing the 2 tabs (Screen Recorder & QA Bug Report).
  - *Screenshot 2*: Active screen recording with floating dock, camera bubble, and live pen drawings.
  - *Screenshot 3*: Video preview & download hub on `ramupod.com`.
- [ ] **Small Promo Tile** (440×280 px PNG) — Optional but recommended for store discovery.

---

## 5. Step-by-Step Upload Instructions

1. **Build the extension archive**:
   ```bash
   npm run build:qa-extension
   ```
   This generates the verified production package at:
   `public/qa-capture/ramupod-qa-capture.zip`

2. **Open Chrome Developer Dashboard**:
   Navigate to [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).  
   *(If this is your first time, Google charges a one-time $5 developer registration fee).*

3. **Create New Item**:
   - Click **Add new item**.
   - Upload `public/qa-capture/ramupod-qa-capture.zip`.

4. **Fill in Store Listing**:
   - Copy & paste the Name, Summary, and Detailed Description from Section 1 above.
   - Upload the 128×128 icon (`dist/qa-capture/icon-128.png`).
   - Upload at least 1 screenshot (1280×800 px).

5. **Fill in Privacy Practices**:
   - Fill in the Permissions Justifications from Section 2 above.
   - Check the Single Purpose and Data Usage checkboxes as outlined in Section 3.
   - Set the Privacy Policy URL (e.g. `https://ramupod.com/privacy`).

6. **Submit for Review**:
   - Click **Submit for Review**.
   - Review typically takes 24 to 72 hours.
   - Once approved, your extension link will be live:
     `https://chromewebstore.google.com/detail/ramupod-companion/<your-extension-id>`
