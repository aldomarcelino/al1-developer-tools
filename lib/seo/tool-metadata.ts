export const toolSeo = {
  "qa-bug-report": {
    title: "QA Bug Capture & Handoff - Local Request Evidence & Reports",
    description:
      "Capture HTTP evidence and annotated screenshots with the Chrome extension, review results locally, redact secrets, and export reports with POSIX cURL.",
    note: "Quick capture uses the desktop Chrome extension toolbar and Chrome debugging permission. Keep DevTools closed in quick mode; the alternative DevTools panel requires DevTools open. Start recording before reproducing the bug; prior requests are not recovered. Import the local capture JSON or HAR into this viewer. Missing, oversized, binary, and streaming bodies are explicitly marked. The web viewer does not access other tabs, fetch imported URLs, replay requests, upload evidence, or infer root cause. Review automatic redaction and screenshots before exporting; it is not a guarantee that all sensitive data is removed. Environment and build version are manual inputs. Reports may require fresh credentials and matching application state to reproduce.",
  },
  "svg-optimizer": {
    title: "SVG Optimizer, Viewer & JSX Converter",
    description:
      "Optimize SVG files in your browser with SVGO. Compare previews, adjust precision, and export optimized SVG, React JSX/TSX, Vue, or Data URIs without uploads.",
    note: "Upload one SVG up to 512 KB, paste raw code, or load the sample. Choose cleanup options, precision from 1 to 5, responsive dimensions, and optional monochrome currentColor. SVG processing uses a local browser worker with a five-second deadline, 10,000-element and 64-level limits. Both previews and exports remove scripts, event handlers, animation, embedded or external resources, and unsupported CSS; original preview therefore uses a passive representation. Responsive conversion needs a viewBox or numeric/px dimensions. Titles and descriptions are preserved. Export SVG, modern React JSX/TSX, a literal Vue template, or UTF-8/Base64 Data URIs. React props spread onto the root SVG; use unique IDs when rendering repeated icons with gradients or masks. Review low-precision path changes and monochrome conversion visually. All input stays on your device.",
  },
  "ip-inspector": {
    title: "What Is My IP & System Inspector - IP, Device & WebRTC",
    description:
      "Inspect your public IP, approximate network location, ASN, browser and device details. Look up another IP or run an optional WebRTC candidate check.",
    note: "Your IP and connection metadata come from Cloudflare's edge, when available. Custom public IP lookups are sent to ipapi.co through our endpoint and are subject to its free service limits. Locations describe network exit points and are approximate. Device details stay in your browser. The optional WebRTC check contacts Google's STUN service without camera or microphone access; a different IP is not proof of a VPN leak, and no exposed candidates does not guarantee VPN safety. Copy All as JSON includes your visitor information, custom lookup, device, and WebRTC results. Local development cannot supply live Cloudflare metadata.",
  },
  "fake-data-generator": {
    title: "Fake Data & Mock Generator - JSON, CSV, SQL & TypeScript",
    description:
      "Create localized mock data with a visual schema builder, templates, null probabilities, and exports to JSON, CSV, SQL INSERT, and TypeScript. Runs in your browser.",
    note: "Choose a template or define up to 40 fields, set null probabilities and a locale, then generate 1–1,000 rows. After the first generation, edits regenerate the preview; output format changes retain the same data. Faker locales load on demand with English fallbacks for missing definitions. SQL uses standard quoted identifiers; review your database dialect before executing. CSV nulls become empty cells and optional formula protection prefixes risky strings. Names, contact details, financial identifiers, and passwords are synthetic test data, not verified identities or secure credentials. No schema or generated records are uploaded.",
  },
  "unit-converter": {
    title: "Unit Converter - Length, Weight, Temperature, Area & Data",
    description:
      "Convert common units of length, weight, temperature, area, and decimal or binary data sizes locally in your browser. Swap units and copy precise results.",
    note: "Choose a category, enter a number, and select source and destination units. Results update automatically; swap exchanges the units while retaining your input. Length supports negative displacements. Weight, area, and data size must be non-negative; temperatures cannot fall below absolute zero. KB, MB, GB, and TB use powers of 1,000; KiB, MiB, GiB, and TiB use powers of 1,024. Results display up to 15 significant digits; copying retains JavaScript floating-point precision. Out-of-range values are rejected. All processing stays in your browser.",
  },
  "cron-builder": {
    title: "Cron Builder & Explainer - Five-Field Cron & Timezones",
    description:
      "Build and explain standard five-field cron expressions and preview the next 10 executions in an IANA timezone. Local browser processing with DST handling.",
    note: "Use Builder or enter a numeric five-field expression: minute, hour, day of month, month, day of week. Supports *, lists, ascending ranges, and / steps; no seconds, aliases, Quartz, or extensions. Sunday is 0 or 7. When both day fields differ from *, either can match (OR); otherwise the restricted field must match. Month always applies. Unrepresentable expressions stay unchanged when switching modes. Preview uses cron-parser 5.10.2 and IANA timezone data: skipped DST hours move forward and repeated hours run once. Other schedulers may differ. Search is limited to 50 years and 3 seconds in a browser worker; sparse schedules may return fewer than 10 dates. This tool only previews schedules and never executes jobs or sends your input to a server.",
  },
  "json-yaml-converter": {
    title: "JSON to YAML & YAML to JSON Converter",
    description:
      "Convert JSON and YAML locally in your browser. Validate documents, open UTF-8 files, and copy or download the result without uploading data.",
    note: "Choose JSON → YAML or YAML → JSON, paste text or open a UTF-8 file up to 512 KB, then convert. Output is limited to 2 MB and data to 60 levels and 50,000 values. YAML 1.2 core types are supported; custom tags, non-string mapping keys, circular aliases, non-finite numbers, and integers beyond safe JSON precision are rejected. Merge keys are not expanded. Quote large integer IDs as strings. Converting to JSON removes YAML comments, anchor names, and original formatting. Files and content are processed on your device.",
  },
  "image-to-pdf": {
    title: "Image to PDF - Convert JPG & PNG to PDF",
    description:
      "Convert JPG and PNG images into one PDF in your browser. Reorder pages, choose A4, Letter or image-sized pages, and set orientation and margins locally.",
    note: "Add up to 20 JPG or PNG images, with a maximum of 10 MB each and 50 MB combined. Images are limited to 16 megapixels and 12,000 px per side, with 64 megapixels combined; prepared images and PDF output are limited to 75 MB. Use arrow buttons to order pages, then choose A4, US Letter, or image-sized pages at 96 pixels per inch, orientation, and margins. One image fits on each page without cropping or stretching. Auto orientation follows each image; image-sized pages ignore the orientation setting. Images are re-encoded locally to apply orientation and remove metadata. JPG may change slightly; PNG remains lossless and transparency appears over white. The PDF is downloaded locally without uploads.",
  },
  "date-calculator": {
    title: "Date Calculator - Date Difference & Business Days",
    description:
      "Calculate the difference between dates, add or subtract calendar days, and count Monday–Friday business days. Date-only calculations run locally in your browser.",
    note: "Compare two dates or add/subtract a whole number of calendar days. Business days are Monday–Friday without public-holiday exclusions. By default, count dates after the earlier date through the later date; Include both dates also counts the earlier date. Reverse ranges return negative counts. Equal dates return zero unless both endpoints are included. Date-only calculations avoid timezone and daylight-saving shifts. Dates must be between years 0001 and 9999, with day offsets limited to −100,000 through 100,000. Use today follows your device’s local calendar date.",
  },

  "pdf-merge-split": {
    title: "PDF Merge & Split - Reorder and Extract Pages",
    description:
      "Merge PDF files, select and reorder pages, extract a new PDF, or split pages into a ZIP. Process static PDFs locally in your browser without uploads.",
    note: "Add static, unsigned PDFs, then select and reorder their pages. Export one PDF in the displayed order, or split up to 100 selected pages into a ZIP. Up to 10 files, 25 MB per file, 50 MB combined, and 300 total pages are supported. ZIP output is limited to 100 MB. Encrypted PDFs, interactive forms, and digitally signed files are rejected. Copies preserve page content but may omit bookmarks and other document-level features. Open the result and verify it before sharing; no files are uploaded.",
  },
  "color-tools": {
    title: "Color Tools - HEX, RGB, HSL & Contrast Checker",
    description:
      "Convert opaque HEX, RGB, and HSL colors, use a color picker, and check WCAG 2 AA and AAA text contrast thresholds directly in your browser.",
    note: "Enter 3- or 6-digit HEX, RGB, or HSL to inspect and copy color formats. Alpha transparency and named CSS colors are not supported. Compare text and background colors using WCAG 2 contrast thresholds: 4.5:1 for normal AA text, 7:1 for normal AAA text, 3:1 for large AA text, and 4.5:1 for large AAA text. Large text is at least 24 px regular or about 19 px bold. Rounded display values do not affect pass/fail. This checks a color pair, not overall page accessibility.",
  },
  "timezone-planner": {
    title: "Timezone Planner - Compare Cities & Meeting Times",
    description:
      "Compare a local date and time across cities, check UTC offsets and date changes, and find shared weekday work slots. Plan meetings locally in your browser.",
    note: "Choose a reference city, date, and local time, then compare up to eight cities. Zone rules include daylight saving transitions. Skipped or repeated reference times are rejected so you can choose an unambiguous time. The overlap finder searches the next seven days for a 30-minute slot within 09:00–17:00, Monday–Friday, in every selected city. It does not account for public holidays or individual calendars. Zone availability and rules depend on your browser's timezone data.",
  },
  "csv-json-converter": {
    title: "CSV to JSON & JSON to CSV Converter",
    description:
      "Convert CSV, TSV, and JSON in your browser. Handle quoted fields, choose a delimiter, open a local text file, and copy or download the result without uploads.",
    note: "Choose a direction and CSV delimiter, then paste data or open a UTF-8 file up to 2 MB. CSV needs unique, nonempty column names in its first record; quoted delimiters and line breaks are supported. Values stay strings to preserve IDs and dates. JSON input must be an array of objects; nested values become JSON text in cells and missing values or null become empty cells. JSON uses JavaScript number precision, so keep large integer IDs as strings. Optional spreadsheet formula protection prefixes formula-like text with an apostrophe. Conversion supports up to 10,000 rows and 200 columns, entirely on your device.",
  },
  "hash-generator": {
    title: "Hash & Checksum Generator - SHA-256, SHA-384 & SHA-512",
    description:
      "Generate SHA-256, SHA-384, and SHA-512 hashes from text or files, then compare checksums. All processing stays in your browser without uploading files.",
    note: "Choose text or a file and select a SHA algorithm. Text is encoded as UTF-8, including whitespace and line breaks. Any file type up to 50 MB is supported. Compare the result against a trusted checksum to check integrity. Hashing is one-way and does not encrypt input; these fast hashes are not password-storage algorithms. Files are read locally and are never uploaded.",
  },
  "percentage-calculator": {
    title: "Percentage Calculator - Discounts & Percentage Change",
    description:
      "Calculate a percentage of a number, find what percentage one value is of another, compare percentage changes, and calculate discounts in your browser.",
    note: "Choose a calculation and enter two numbers. Percentage change uses (new − original) ÷ original × 100 and requires a positive original value. Discounts range from 0 to 100%. Results display up to 12 significant digits; copying retains JavaScript number precision. All calculations run locally in your browser.",
  },
  "qr-code-generator": {
    title: "QR Code Generator - Links, Text & Wi-Fi",
    description:
      "Generate QR codes for URLs, text, and Wi-Fi locally in your browser. Preview your code and download a PNG or SVG without an account.",
    note: "Choose text or URL, or enter your Wi-Fi network details. Generate a QR code and download PNG or SVG. A four-module white margin keeps codes readable. Wi-Fi codes contain your network password, so share them only with intended guests. Test the downloaded code with a scanner before printing.",
  },
  "text-cleaner": {
    title: "Text Cleaner & Case Converter Online",
    description:
      "Remove duplicate lines, trim whitespace, sort lines, and convert uppercase, lowercase, camelCase, snake_case, or kebab-case locally in your browser.",
    note: "Paste text, choose cleanup options and a case style, then copy or download the result. Cleanup runs before case conversion. Duplicate removal is case-sensitive. Word-based styles split camelCase, acronyms, whitespace, and punctuation. Your original input stays available for editing.",
  },
  "image-compressor": {
    title: "Image Compressor & Converter - JPG, PNG & WebP",
    description:
      "Compress, resize, and convert JPG, PNG, and WebP images in your browser. Compare file sizes and download your result without uploading images to a server.",
    note: "Add up to 20 images (30 MB and 60 megapixels each, 150 MB total) by browsing, dropping, or pasting. Format, quality, and resize settings apply to every image automatically. Select a row to compare its original and result, download individually, or download ready images together as a ZIP. Percentage resizing preserves each image’s aspect ratio. Custom bounds preserve aspect ratio when locked; unlocking uses exact dimensions. PNG ignores the quality slider; resizing may reduce its size. JPEG uses a white background for transparency. Output may be larger than the original. Animated inputs export a single still frame. Images are processed locally and are not uploaded.",
  },
  "character-counter": {
    title: "Character Counter - Word Count & Text Length",
    description:
      "Count characters, words, lines, and UTF-8 bytes online. Check text length with and without whitespace, Unicode code points, and UTF-16 units in your browser.",
    note: "Paste or type text to see counts update instantly. Characters are counted as visible Unicode grapheme clusters, so a combined emoji or accented letter counts as one. Whitespace includes spaces, tabs, and line breaks. Word boundaries use English Unicode segmentation, which also recognizes many non-Latin scripts. UTF-8 bytes and UTF-16 code units help software engineers inspect payload sizes and JavaScript string length. Use it as a learning tool to compare how text is represented. All processing happens in your browser.",
  },
  notes: {
    title: "Notes - Rich Text & Meeting Notes",
    description:
      "Write meeting notes and ideas with headings, checklists, bold, italic, and code. Save in your browser and import or export JSON backups without an account.",
    note: "Format meeting notes and ideas with headings, lists, checklists, quotes, and code. Pin important notes and search by title or content. Changes save to this browser after a short pause. Export JSON backups regularly: notes do not sync, and clearing site data removes them. Avoid passwords, API keys, and sensitive credentials.",
  },
  "json-formatter": {
    title: "JSON Formatter & Validator Online",
    description:
      "Format, validate, and minify JSON online. Choose indentation, upload a JSON file, and copy or download the result. Processing stays in your browser.",
    note: "Paste JSON or upload a file, choose indentation, then select Format or Minify. Native JavaScript number precision applies; encode large integer IDs as strings.",
  },
  "markdown-editor": {
    title: "Markdown Editor & Live Preview",
    description:
      "Write and preview GitHub-flavored Markdown online with tables, task lists, code blocks, and export options. Edit locally in your browser without an account.",
    note: "Write Markdown in the editor and check the rendered preview. Use headings, fenced code blocks, tables, and task lists, then export your work.",
  },
  "diff-viewer": {
    title: "Text & JSON Diff Viewer Online",
    description:
      "Compare text and JSON online in side-by-side or unified views. Find additions and deletions with whitespace and case options. Comparison runs in your browser.",
    note: "Paste the original and changed text into the two editors. Choose your comparison settings and inspect additions and deletions in the result.",
  },
  "jwt-decoder": {
    title: "JWT Decoder - Inspect Headers & Claims",
    description:
      "Decode JWT headers and payloads online, inspect claims, and check expiration timestamps locally. Decoding does not verify signatures or establish token trust.",
    note: "Paste a JSON Web Token to read its header and payload. A readable token is not a verified token: signature validation must happen in your authentication system.",
  },
  "base64-url": {
    title: "Base64 & URL Encoder / Decoder",
    description:
      "Encode and decode Base64, Base64URL, URL percent-encoding, and hexadecimal text online with UTF-8 support. Conversion runs locally in your browser.",
    note: "Choose the encoding and direction, then enter your text. Base64 is an encoding format, not encryption, and does not protect confidential information.",
  },
  "regex-tester": {
    title: "Regex Tester & Replacement Preview",
    description:
      "Test JavaScript regular expressions online. Inspect matches and capture groups, change flags, and preview replacements. No account or server upload needed.",
    note: "Enter a JavaScript regular expression and test text, then inspect matches and capture groups. Keep patterns and inputs small when exploring expensive expressions.",
  },
  "timestamp-converter": {
    title: "Unix Timestamp & Date Converter",
    description:
      "Convert Unix timestamps to readable dates and dates to epoch time. Inspect UTC, local time, and ISO 8601 representations directly in your browser.",
    note: "Enter an epoch timestamp or date to compare its representations. Check the timestamp unit and time zone before using the result in an application.",
  },
  "uuid-generator": {
    title: "Random Keygen, Password & UUID Generator",
    description:
      "Generate passwords, API secrets, HMAC keys, and UUIDs using browser cryptography. Create and copy random values locally without sending them to a server.",
    note: "Select the key format and settings, then generate a value. Keep generated secrets private and store production credentials in your own secret manager.",
  },
  "json-to-typescript": {
    title: "JSON to TypeScript Interface Generator",
    description:
      "Convert JSON examples into TypeScript interfaces or type aliases online. Configure optional and readonly fields. Generate types locally in your browser.",
    note: "Paste a representative JSON example and choose your type settings. Generated types describe the sample; review optional fields and validate runtime data separately.",
  },
  "sql-formatter": {
    title: "SQL Formatter & Minifier Online",
    description:
      "Format and minify SQL queries with indentation and keyword casing options. Improve query readability in your browser without connecting to a database.",
    note: "Paste a query and select formatting options. This tool formats text; it does not execute queries or guarantee that SQL is valid for your database.",
  },
  "curl-to-code": {
    title: "cURL to Code Converter",
    description:
      "Convert cURL commands to JavaScript Fetch, Axios, TypeScript, Python, Go, or PHP request code online. Code is generated locally; requests are not executed.",
    note: "Paste a cURL command and choose a target language. Review generated code and unsupported options before running it; the converter never executes the request.",
  },
} as const;
export type ToolSlug = keyof typeof toolSeo;
