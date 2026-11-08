# Chrome Web Store submission for Ramupod

Upload the ZIP at `public/ramupod-companion.zip` in the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole). The current manifest version is `0.5.3`. For an existing listing, use its Package tab and confirm the new version is higher than the previously uploaded version.

## Store listing

- Name: Ramupod
- Language: English
- Website: https://ramupod.com
- Support URL: https://ramupod.com/tools/screen-recorder
- Privacy Policy URL: https://ramupod.com/privacy

**Summary**

> Capture browser evidence with local tab recordings, annotated screenshots, and QA network reports.

**Description**

> Capture and review evidence from a browser tab to document a workflow or reproduce a bug.
>
> Record the active tab with optional microphone narration and a webcam overlay. Use the floating controls to pause, annotate, or zoom while recording. Review and download the video in the Ramupod viewer.
>
> For bug reports, capture network requests from the selected tab during a test session. Take annotated screenshots and review captured evidence before exporting it. Ramupod applies default redaction to supported request data. Check each report and screenshot before sharing.
>
> Ramupod processes evidence on your device. You choose which files to export and share.

## Privacy practices

**Single purpose**

> Capture and review evidence from a selected browser tab to document workflows and reproduce bugs.

| Permission             | Justification                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`            | Accesses the tab the user selects through the extension to show controls and capture evidence for the current session.                                                                                               |
| `scripting`            | Injects the recorder dock, drawing tools, camera overlay, and screenshot controls after the user starts the relevant action.                                                                                         |
| `debugger`             | Attaches to the selected tab when the user starts a quick QA session to capture request URLs, methods, statuses, timings, headers, and eligible bodies.                                                              |
| `tabCapture`           | Captures video and audio from the selected tab when the user starts a recording.                                                                                                                                     |
| `offscreen`            | Runs the recording and media encoding outside the popup so a recording continues when the popup closes.                                                                                                              |
| `storage`              | Saves extension preferences and bounded QA recovery data on the device so users can resume or clear a session.                                                                                                       |
| Content-script matches | Allow the extension to hand completed recordings and QA evidence to the matching Ramupod viewer tab locally. The matching paths are limited to the Screen Recorder and QA Bug Report tools on the supported origins. |

Disclose the data the extension handles locally. This includes web history or browsing activity (request URLs and timings) and website content (recorded tabs, screenshots, and eligible network bodies). Optional audio and camera footage, and any sensitive data that may appear in the capture, should be reflected in the dashboard disclosures as applicable. Verify the dashboard categories and certifications against the current implementation and published privacy policy. See the [Chrome Web Store user data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## Test instructions

1. Open a regular HTTPS tab. From the Ramupod toolbar popup, select Screen Recorder and choose **Record this Tab**. Microphone and camera are optional.
2. Finish the recording and verify that the Ramupod viewer can play and download it.
3. Reopen the popup and select QA Bug Report. Start testing, trigger a normal network request on the tab, then finish and inspect the captured evidence. No test account is required.

## Submission checklist

1. Rebuild with `npm run build:companion` and upload `public/ramupod-companion.zip`.
2. Fill in Store Listing, Privacy practices, Distribution, and Test instructions.
3. Supply the 128 × 128 icon included in the ZIP and at least one actual extension screenshot at 1280 × 800 or 640 × 400. Capture a sample workflow with synthetic data. See the [Chrome Web Store image requirements](https://developer.chrome.com/docs/webstore/images).
4. Confirm that the live privacy policy covers the recorder and QA capture, then submit for review. The confirmation dialog lets you choose when the approved listing goes live. See the [Chrome Web Store publishing guide](https://developer.chrome.com/docs/webstore/publish).
