import { creator } from "@/config/creator";

export interface LegalDocument {
  title: string;
  path: string;
  description: string;
  summary: string;
  updated: string;
  sections: { id: string; title: string; paragraphs: string[] }[];
}
export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  path: "/privacy",
  description:
    "How Ramupod processes tool inputs, stores Notes in your browser, and handles hosting data and privacy requests.",
  summary:
    "Most tools process inputs in your browser. Here is what stays on your device, how IP inspection uses network services, and how to stay in control.",
  updated: "2026-10-31",
  sections: [
    {
      id: "operator",
      title: "Who runs Ramupod",
      paragraphs: [
        `Ramupod is operated by ${creator.fullName}. For privacy questions or requests, contact ${creator.email}. This policy covers the features currently available on this website.`,
      ],
    },
    {
      id: "inputs",
      title: "Local tool processing",
      paragraphs: [
        "Local utilities process pasted text, uploaded files, tokens, and generated mock data in your browser. These local tools do not send inputs to a Ramupod API or store them in a server database. Uploading a file into a tool reads it on your device; copying and downloading results happen only when you choose those actions. IP inspection uses the network services described below.",
        "Most tool inputs exist only while the page is open. Notes is the exception described below. Browser history, extensions, clipboard managers, downloads, and device backups may retain data independently of this application. Avoid entering passwords, private keys, API credentials, or other sensitive information.",
      ],
    },
    {
      id: "ip-inspection",
      title: "IP and system inspection",
      paragraphs: [
        "What Is My IP & System Inspector requests your IP and available connection metadata from our Cloudflare edge endpoint. Custom IP lookup sends the IP you enter through that endpoint to ipapi.co. The endpoint does not store inspection results in an application database and returns no-store cache headers. Hosting and provider services may process request logs under their own policies.",
        "Device and browser details are inspected locally and are not uploaded by this tool. Running the optional WebRTC check contacts Google's public STUN service, which can observe your network IP. The check does not request camera or microphone access. Inspection results remain in page memory until you leave or choose to copy them.",
      ],
    },
    {
      id: "qa-capture",
      title: "QA bug capture and local evidence",
      paragraphs: [
        "The QA Bug Capture & Handoff viewer reads capture JSON, HAR files, report drafts, and optional screenshots locally in page memory. It does not upload this evidence, fetch URLs found inside it, send it to AI, or replay captured requests. Clearing the session or closing the page removes its in-memory data. Exported files and copied evidence remain under your control.",
        "The optional Ramupod QA Chrome extension captures HTTP request evidence only after you explicitly start a session. Quick mode uses Chrome debugging permission, active-tab access and scripting for floating controls and viewport screenshots. Chrome requires debugging permission at install/update; recording attaches only to the tab selected on Start and stops on Stop, Finish, detach or a limit. The alternative DevTools panel requires DevTools to remain open. The extension applies default redaction before writing bounded recovery snapshots to chrome.storage.local and before exporting. Use its Clear session or delete-recovery controls to remove those snapshots; browser profile backups may retain data independently. Other active panels can save new snapshots until stopped or cleared separately. The extension does not use cloud sync or an application backend.",
        "Request evidence can contain credentials and personal information. Automatic redaction is not perfect. Review text and each screenshot before sharing; text redaction does not alter image pixels. The browser's own DevTools may retain raw network data independently of the extension. Finish opens the explicitly configured Ramupod viewer and transfers a redacted package locally through the extension, bound to that recipient tab and a short-lived handoff token. Supported viewer origins are localhost:3000 and dotools.com. The token contains no payload; no evidence is uploaded to an application server, issue tracker or AI service.",
      ],
    },
    {
      id: "storage",
      title: "Notes and browser preferences",
      paragraphs: [
        "Notes uses localStorage in the current browser to save note titles, text, formatting, timestamps, IDs, and pinned status. Notes are not encrypted by this tool, backed up by Ramupod, or synced across devices. They remain until you delete them or clear site data; browser settings or private browsing may remove them sooner.",
        "The application also stores your light or dark theme preference in localStorage. You can remove this data through your browser’s site-data settings. Export Notes before clearing site data if you want to keep a backup. JSON imports are read locally; exported files are saved to the location you choose.",
      ],
    },
    {
      id: "hosting",
      title: "Website delivery and technical data",
      paragraphs: [
        "The website is hosted through Cloudflare. Visiting the site sends ordinary web-request information to the hosting provider, such as your IP address, requested URL, browser information, and request time. Cloudflare may process technical data for delivery, reliability, and security under its privacy policy and the applicable service configuration. This is separate from processing the text you enter into tools.",
        "Technical-data retention and processing locations depend on Cloudflare’s services and policies; we do not promise a fixed retention period or a single processing country. The application does not include advertising trackers or third-party analytics scripts, and does not sell your tool inputs.",
      ],
    },
    {
      id: "external",
      title: "External content and contact",
      paragraphs: [
        "Markdown previews can load images from URLs included in the document. Those requests go to the image host, which can receive request metadata such as your IP address. Opening an external link takes you to a service with its own privacy practices. Fonts and the application’s bundled assets are served with the website.",
        "If you email the operator or submit an issue on GitHub, the information you choose to send is handled by those services and used to respond or resolve the issue. Do not include secrets or private tool inputs in support requests. Support correspondence is retained only as needed to handle the request and meet applicable obligations; you may ask for its deletion.",
      ],
    },
    {
      id: "webhooks",
      title: "Webhook Inspector is a preview",
      paragraphs: [
        "Webhook Inspector currently displays bundled examples only. It does not create receiving endpoints, collect real webhook requests, store request history, or replay requests. If a backend-powered version launches, its data handling and retention will be explained before it accepts real requests. The browser-processing badge applies to the available local tools.",
      ],
    },
    {
      id: "choices",
      title: "Your choices and privacy requests",
      paragraphs: [
        "You can stop using a tool, delete Notes, export a backup, and clear browser site data at any time. Ramupod cannot retrieve or delete Notes remotely because they are stored in your browser.",
        `Depending on the law that applies to you, you may have rights to access, correct, delete, restrict, or object to the processing of personal information, and to complain to your local data-protection authority. Contact ${creator.email} to make a request concerning information held by the operator. We may need enough information to verify and respond to your request.`,
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      paragraphs: [
        "We will update this page and its revision date when our practices change. Material changes to how a feature handles personal information will be explained before the new processing begins, with consent requested where required.",
      ],
    },
  ],
};
export const termsOfUse: LegalDocument = {
  title: "Terms of Use",
  path: "/terms",
  description:
    "Terms for using Ramupod, including responsible use, generated results, browser-stored Notes, service availability, and contact details.",
  summary:
    "Free tools for everyday work. These terms explain responsible use, your content, and the practical limits of the service.",
  updated: "2026-10-25",
  sections: [
    {
      id: "service",
      title: "Using the service",
      paragraphs: [
        `Ramupod is operated by ${creator.fullName}. These terms apply when you use the website and its available utilities. Use the service only if you can agree to these terms under the law that applies to you. If you do not agree, stop using the service.`,
        "The available tools are free to use without an account. A planned feature or preview is not a promise of delivery or an operational service. Webhook Inspector currently uses examples and cannot receive or replay real requests.",
      ],
    },
    {
      id: "content",
      title: "Your content and results",
      paragraphs: [
        "You retain your rights in the content you enter and the results derived from it. Enter only content you are entitled to use. These terms do not transfer ownership of your notes, code, or other inputs to Ramupod.",
        "Check results before relying on them. Generated types describe sample data rather than validating future data; JWT decoding does not verify a token’s signature; formatting or conversion can be affected by data and runtime limitations. The tools are not a substitute for professional advice or independent verification in high-stakes decisions.",
      ],
    },
    {
      id: "responsible-use",
      title: "Responsible use",
      paragraphs: [
        "Do not use the website to break the law, infringe another person’s rights, distribute malicious content, disrupt the service, evade security controls, or access systems without authorization. Do not place credentials or sensitive information in public support requests.",
        "Any future webhook receiving or replay service will require authorization for the relevant systems and may have additional limits and terms. No such backend service is provided by the current preview.",
      ],
    },
    {
      id: "notes",
      title: "Keep your own backups",
      paragraphs: [
        "Notes is browser storage, not a cloud backup or a synced account. Browser storage may fail, reach its quota, or be cleared. You are responsible for exporting copies of information you want to retain and checking that a save has succeeded. We cannot recover notes that exist only on your device.",
      ],
    },
    {
      id: "availability",
      title: "Availability and changes",
      paragraphs: [
        "We aim to keep the tools useful, but do not guarantee uninterrupted availability, error-free results, compatibility with every device, or continued availability of every feature. The service is provided as available and, to the extent permitted by applicable law, without warranties of accuracy or fitness for a particular purpose.",
        "Features may change or be discontinued. Where practicable, significant changes affecting stored data will be explained in advance. Maintain backups independently of this website.",
      ],
    },
    {
      id: "liability",
      title: "Limits and your legal rights",
      paragraphs: [
        "To the extent permitted by applicable law, the operator is not liable for losses caused by relying on unverified outputs, losing browser-stored data, service interruptions, or third-party services. Nothing in these terms excludes liability or limits consumer or other rights that cannot lawfully be excluded or limited.",
      ],
    },
    {
      id: "privacy",
      title: "Privacy and other services",
      paragraphs: [
        "The Privacy Policy explains local processing, browser storage, website hosting, and support contact. External websites and services are governed by their own terms and privacy practices. Linking to them does not mean we control or guarantee their service.",
      ],
    },
    {
      id: "updates",
      title: "Updates and contact",
      paragraphs: [
        `We will post updated terms here with a new revision date. Material changes will be highlighted on the website where practicable. For questions about these terms, contact ${creator.email}.`,
      ],
    },
  ],
};
