import type { ToolSlug } from "./tool-metadata";

type ToolGuide = {
  steps: readonly [string, string, string];
  example: string;
  result: string;
};

// Visible, server-rendered instructions. Examples describe actual tool workflows.
export const toolGuides = {
  "screen-recorder": {
    steps: [
      "Prepare the app you want to demonstrate in a separate browser tab.",
      "Choose that tab as your capture source, then record and add effects from the studio preview.",
      "Stop recording, review the finished video, and download it before closing the page.",
    ],
    example:
      "Demonstrate a three-step signup flow with a zoom on the final confirmation.",
    result:
      "Navigate in the app tab and place zoom or click effects from the studio. Pointer events in the other app are not captured automatically.",
  },
  "image-compressor": {
    steps: [
      "Add JPG, PNG, or WebP images from your device.",
      "Choose an output format, quality, and optional resize settings.",
      "Compare the preview and encoded size, then download one result or a ZIP.",
    ],
    example:
      "Prepare a large JPG photo for a website by selecting WebP and a smaller width.",
    result:
      "A converted image with its measured output size. Compression savings depend on the source image and settings.",
  },
  "speech-to-text": {
    steps: [
      "Choose a recognition language in a browser that supports speech recognition.",
      "Allow microphone access and start dictation in a quiet environment.",
      "Stop recording, correct recognition errors, and copy or export the transcript.",
    ],
    example: "Dictate a short meeting summary and review names before sharing it.",
    result:
      "An editable transcript. Your browser may send audio to its recognition service; offline support is not guaranteed.",
  },
  "pdf-merge-split": {
    steps: [
      "Add the static PDF files you want to combine or split.",
      "Select pages and arrange them in the required order.",
      "Export a merged PDF or download selected pages as separate PDFs in a ZIP.",
    ],
    example: "Combine pages 1 and 3 of a report with a one-page cover sheet.",
    result:
      "A new PDF containing only the chosen pages, in the displayed order. Review the exported document before sharing it.",
  },
  "json-formatter": {
    steps: [
      "Paste a JSON document or open a local JSON file.",
      "Choose indentation and format the document, or minify it for compact output.",
      "Resolve any parse error, then copy or download the result.",
    ],
    example: '{"name":"Ramupod","tools":["JSON","PDF"]}',
    result:
      "Formatted JSON with readable indentation. Formatting does not validate your application's business rules.",
  },
  "text-to-speech": {
    steps: [
      "Enter the text you want to hear.",
      "Choose an available voice, then adjust its speed and pitch.",
      "Play the text, pause or resume as needed, and listen for wording you want to revise.",
    ],
    example: "Read a draft announcement aloud at a slower speed to check its phrasing.",
    result:
      "Spoken playback using your browser's available voices. Some voices can use a remote speech service.",
  },
  "qa-bug-report": {
    steps: [
      "Start capture with the Ramupod Chrome extension before reproducing a bug.",
      "Open the captured evidence in the viewer and inspect requests and screenshots.",
      "Review redaction, add reproduction details, and export the report.",
    ],
    example:
      "Record a failed form submission and attach its HTTP status and reproduction steps.",
    result:
      "A report based on captured evidence. Missing bodies and redacted values remain explicit; review screenshots separately for secrets.",
  },
  "qr-code-generator": {
    steps: [
      "Choose a URL, text, or Wi-Fi payload.",
      "Enter the content and generate the QR code.",
      "Download PNG or SVG and scan it with a phone before printing.",
    ],
    example: "https://ramupod.com",
    result:
      "A QR code containing the website URL. A static code retains that exact address and does not track scans.",
  },
  "svg-optimizer": {
    steps: [
      "Paste SVG markup or open a local SVG file.",
      "Adjust cleanup and precision settings while comparing the previews.",
      "Export the optimized SVG or choose a code format such as JSX.",
    ],
    example: "Clean up a design-exported icon, then export it as a React component.",
    result:
      "Sanitized SVG or component code. Check fine details after reducing precision, and use unique IDs for repeated gradient icons.",
  },
  "sql-formatter": {
    steps: [
      "Paste the SQL query you want to make readable.",
      "Choose indentation and keyword casing, then format or minify.",
      "Copy the result and review it in your database's own tooling.",
    ],
    example: "select id, name from users where active = true order by name;",
    result:
      "A query laid out for easier reading. No database connection is opened and the query is not executed.",
  },
  "curl-to-code": {
    steps: [
      "Paste a cURL command with its URL and request options.",
      "Select a target language or request library.",
      "Copy the generated code and review headers, credentials, and unsupported options.",
    ],
    example: "curl https://example.com/api/items",
    result:
      "Request code for your selected target. Generation does not contact the endpoint or run the request.",
  },
  "json-to-typescript": {
    steps: [
      "Paste a representative JSON response or object.",
      "Choose interfaces or type aliases and your field options.",
      "Generate the types and review them before adding them to your project.",
    ],
    example: '{"id":1,"name":"Ramupod","active":true}',
    result:
      "A type describing numeric id, string name, and boolean active. A sample cannot reveal every optional field or possible value.",
  },
  "json-yaml-converter": {
    steps: [
      "Choose JSON to YAML or YAML to JSON.",
      "Paste a document or open a UTF-8 file, then convert it.",
      "Review validation messages and copy or download the output.",
    ],
    example: '{"name":"Ramupod","enabled":true}',
    result:
      "YAML with name and enabled fields. Converting YAML back to JSON removes comments and original formatting.",
  },
  "csv-json-converter": {
    steps: [
      "Choose a conversion direction and the CSV delimiter.",
      "Paste CSV with a header row, or JSON containing an array of objects.",
      "Convert the data, inspect the result, and copy or download it.",
    ],
    example: "name,role\nAri,developer",
    result:
      'CSV to JSON produces [{"name":"Ari","role":"developer"}]. CSV values stay strings to preserve identifiers.',
  },
  "fake-data-generator": {
    steps: [
      "Choose a template or define the fields in your mock schema.",
      "Set a row count, locale, and optional null probabilities, then generate.",
      "Inspect the records and export the format your test fixture needs.",
    ],
    example:
      "Create 25 rows with an ID, a full name, and an email field for a table mockup.",
    result:
      "Synthetic records for development or demos. Generated identities and credentials are not real or security-grade values.",
  },
  "diff-viewer": {
    steps: [
      "Paste the original text on one side and the changed version on the other.",
      "Choose text or JSON comparison and adjust whitespace or case options.",
      "Review additions and removals in the side-by-side or unified result.",
    ],
    example:
      "Compare an API response before and after changing a field from draft to published.",
    result:
      "Highlighted differences between the two inputs. Comparison does not merge the documents or decide which version is correct.",
  },
  "regex-tester": {
    steps: [
      "Enter a JavaScript regular expression and select its flags.",
      "Add test text and inspect the matches and capture groups.",
      "Try a replacement and verify it against representative input.",
    ],
    example: "Pattern: \\d+ · Flags: g · Text: Order 12, item 34",
    result:
      "The numeric sequences 12 and 34 match. Syntax and behavior follow JavaScript regular expressions.",
  },
  "image-resizer": {
    steps: [
      "Open a JPG, PNG, or WebP image and choose a crop area.",
      "Set an aspect ratio and output dimensions; lock proportions to avoid stretching.",
      "Generate the result, inspect the preview, and download your chosen format.",
    ],
    example:
      "Create a square profile image with a 1:1 crop and 512 × 512 output dimensions.",
    result:
      "An image at the requested dimensions. Enlarging a small source cannot restore missing detail.",
  },
  "heic-to-jpg": {
    steps: [
      "Add HEIC or HEIF photos from your device.",
      "Choose JPG and its quality setting, or PNG for lossless output encoding.",
      "Convert the photos and download successful results individually or as a ZIP.",
    ],
    example:
      "Convert phone photos to JPG before attaching them to a form that does not accept HEIC.",
    result:
      "Shareable still images. Photo metadata, Live Photo motion, and HDR information are not preserved.",
  },
  "image-to-pdf": {
    steps: [
      "Add JPG or PNG images and arrange them in page order.",
      "Choose a paper size, orientation, and margins.",
      "Generate the PDF and check its pages before downloading or sharing.",
    ],
    example: "Combine three receipt photos into one A4 PDF, one receipt per page.",
    result:
      "A PDF containing the selected images. Image-to-PDF conversion does not recognize text or make scans editable.",
  },
  "pdf-to-image": {
    steps: [
      "Open a PDF and wait for its pages to load.",
      "Choose JPG, PNG, or WebP and a rendering resolution.",
      "Preview the pages and download individual images or a ZIP archive.",
    ],
    example: "Export a PDF presentation as PNG images for slide thumbnails.",
    result:
      "Raster images of the rendered pages. Higher resolutions use more memory and do not add detail absent from the source.",
  },
  "word-to-pdf": {
    steps: [
      "Open a DOCX or supported legacy DOC document.",
      "Review its browser-rendered preview and choose paper size, orientation, and margins.",
      "Generate a PDF and inspect its page breaks and formatting.",
    ],
    example: "Convert a short DOCX letter into an A4 PDF for sharing.",
    result:
      "A PDF based on the browser rendering. Complex Word layouts, fonts, and legacy DOC formatting may differ from Microsoft Word.",
  },
  "pdf-to-word": {
    steps: [
      "Open a PDF containing selectable text.",
      "Choose paragraph flow or original line breaks and an output format.",
      "Convert, download, and review the text and layout in your word processor.",
    ],
    example: "Extract the text of a report into DOCX so you can edit its paragraphs.",
    result:
      "An editable document reconstructed from PDF text. Image-only scans need OCR elsewhere, and complex layouts may require manual correction.",
  },
  "markdown-editor": {
    steps: [
      "Write or paste Markdown into the editor.",
      "Check headings, lists, tables, and code blocks in the live preview.",
      "Review external links and images, then export your work.",
    ],
    example: "# Release notes\n\n- Fixed the export button\n- Added a JSON example",
    result:
      "A preview with a heading and a bullet list. External image URLs may contact their hosts when previewed.",
  },
  notes: {
    steps: [
      "Create a note with a descriptive title.",
      "Write your content with headings, lists, or checklists and wait for the saved indicator.",
      "Export a JSON backup so you can restore your notes later.",
    ],
    example: "Create a meeting note with Decisions and Next steps sections, then pin it.",
    result:
      "A note saved in this browser. It does not sync across devices, and clearing site data removes the local copy.",
  },
  "character-counter": {
    steps: [
      "Paste or type the text you want to measure.",
      "Compare character, word, line, and UTF-8 byte counts.",
      "Edit your text and watch the counts update before copying it.",
    ],
    example: "Hello world",
    result:
      "11 visible characters including the space, and 2 words. Emoji and combining marks can differ from JavaScript string length.",
  },
  "text-cleaner": {
    steps: [
      "Paste text containing inconsistent spacing, repeated lines, or mixed case.",
      "Choose the cleanup operations and a case style.",
      "Inspect the result before copying or downloading it.",
    ],
    example: "Convert Hello World to snake_case.",
    result:
      "hello_world. Cleanup operations run before case conversion, so review their combined effect.",
  },
  "jwt-decoder": {
    steps: [
      "Paste a JWT whose claims you want to inspect.",
      "Review the decoded header, payload, and any expiration information.",
      "Validate signatures and authorization separately in your own authentication system.",
    ],
    example:
      "Inspect whether a test token contains an exp claim and the expected audience.",
    result:
      "Readable token claims. A decoded token can still be forged, expired, or issued for a different application.",
  },
  "uuid-generator": {
    steps: [
      "Choose a UUID, password, or key format.",
      "Adjust the available length or format settings and generate a value.",
      "Copy it securely and store production secrets in a secret manager.",
    ],
    example: "Generate a UUID to use as a synthetic record ID in a test fixture.",
    result:
      "A newly generated random identifier. Generating another value does not retrieve the previous one.",
  },
  "hash-generator": {
    steps: [
      "Choose text input or a local file.",
      "Select SHA-256, SHA-384, or SHA-512 and generate the digest.",
      "Copy the digest or compare it with a checksum from a trusted source.",
    ],
    example: "SHA-256 of the UTF-8 text abc, with no newline.",
    result:
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad. Changing whitespace changes the digest.",
  },
  "base64-url": {
    steps: [
      "Choose Base64, Base64URL, URL encoding, or hexadecimal text.",
      "Select encode or decode and enter the source text.",
      "Inspect and copy the converted value.",
    ],
    example: "Encode Hello as Base64.",
    result: "SGVsbG8=. Encoding is reversible and does not encrypt the text.",
  },
  "cron-builder": {
    steps: [
      "Build or enter a numeric five-field cron expression.",
      "Choose the IANA timezone used for the preview.",
      "Read the explanation and check the next execution times before configuring your scheduler.",
    ],
    example: "0 9 * * 1-5",
    result:
      "09:00 Monday through Friday in the selected timezone. This tool previews dates and never schedules or runs a job.",
  },
  "timestamp-converter": {
    steps: [
      "Choose timestamp-to-date or date-to-timestamp conversion.",
      "Enter the value and confirm whether the timestamp unit is seconds or milliseconds.",
      "Compare UTC, local time, and ISO output before copying a result.",
    ],
    example: "Unix timestamp: 0 seconds",
    result:
      "1970-01-01T00:00:00.000Z in UTC. Its local calendar date and time depend on the timezone.",
  },
  "date-calculator": {
    steps: [
      "Choose a date difference or add/subtract operation.",
      "Enter dates and select calendar or Monday–Friday business days.",
      "Check endpoint inclusion and copy the calculated result.",
    ],
    example:
      "Calendar difference from 2026-01-01 to 2026-01-08, without including both endpoints.",
    result:
      "7 calendar days. Business-day calculations exclude weekends but do not exclude public holidays.",
  },
  "timezone-planner": {
    steps: [
      "Choose a reference city and a local date and time.",
      "Add the cities whose times you want to compare.",
      "Inspect date changes and UTC offsets, or find a shared weekday work slot.",
    ],
    example: "Compare 09:00 in Jakarta with London before arranging a remote meeting.",
    result:
      "Local times for the same instant. London's offset can change with daylight saving, so choose the actual meeting date.",
  },
  "percentage-calculator": {
    steps: [
      "Choose percentage of a number, percentage change, or a discount calculation.",
      "Enter the two values required by that operation.",
      "Review and copy the result, checking which value is the original or base.",
    ],
    example: "What is 15% of 200?",
    result: "30. A 15% discount on 200 instead produces a final price of 170.",
  },
  "unit-converter": {
    steps: [
      "Choose length, weight, temperature, area, or data size.",
      "Enter the value and select its source and destination units.",
      "Read the result, swap units if useful, and copy the value.",
    ],
    example: "Convert 1 kilometer to meters.",
    result:
      "1,000 meters. For data sizes, decimal MB and binary MiB use different conversion factors.",
  },
  "color-tools": {
    steps: [
      "Enter an opaque HEX, RGB, or HSL color.",
      "Inspect its other representations or choose a second color for contrast.",
      "Copy a format and check the contrast result for your intended text size.",
    ],
    example: "Compare #000000 text with a #FFFFFF background.",
    result:
      "A 21:1 contrast ratio. A passing color pair alone does not establish accessibility for an entire page.",
  },
  "ip-inspector": {
    steps: [
      "Open the tool to inspect available public-IP and browser information.",
      "Optionally enter another public IP or explicitly run the WebRTC candidate check.",
      "Review which service supplied each result and copy the information you need.",
    ],
    example: "Compare your public network address before and after changing networks.",
    result:
      "Information about the network exit point, not a precise personal location. Optional IP lookup and WebRTC checks contact external services.",
  },
} as const satisfies Record<ToolSlug, ToolGuide>;
