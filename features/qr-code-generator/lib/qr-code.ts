export function wifiPayload(
  ssid: string,
  password: string,
  security: "WPA" | "WEP" | "nopass",
  hidden: boolean
): string {
  const escape = (value: string) => value.replace(/[\\;,:\"]/g, "\\$&");
  return `WIFI:T:${security};S:${escape(ssid)};${security === "nopass" ? "" : `P:${escape(password)};`}H:${hidden};;`;
}

export interface VCardOptions {
  firstName?: string;
  lastName?: string;
  organization?: string;
  title?: string;
  phoneCell?: string;
  phoneWork?: string;
  email?: string;
  url?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  note?: string;
}

export function vCardPayload(card: VCardOptions): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

  const first = card.firstName?.trim() || "";
  const last = card.lastName?.trim() || "";
  const fullName = [first, last].filter(Boolean).join(" ") || "Contact";

  lines.push(`N:${last};${first};;;`);
  lines.push(`FN:${fullName}`);

  if (card.organization?.trim()) lines.push(`ORG:${card.organization.trim()}`);
  if (card.title?.trim()) lines.push(`TITLE:${card.title.trim()}`);
  if (card.phoneCell?.trim()) lines.push(`TEL;TYPE=CELL:${card.phoneCell.trim()}`);
  if (card.phoneWork?.trim()) lines.push(`TEL;TYPE=WORK:${card.phoneWork.trim()}`);
  if (card.email?.trim()) lines.push(`EMAIL;TYPE=INTERNET:${card.email.trim()}`);
  if (card.url?.trim()) {
    const rawUrl = card.url.trim();
    lines.push(`URL:${rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`}`);
  }

  const hasAddress =
    card.street || card.city || card.state || card.postalCode || card.country;
  if (hasAddress) {
    const street = (card.street || "").trim();
    const city = (card.city || "").trim();
    const state = (card.state || "").trim();
    const postal = (card.postalCode || "").trim();
    const country = (card.country || "").trim();
    lines.push(`ADR;TYPE=WORK:;;${street};${city};${state};${postal};${country}`);
  }

  if (card.note?.trim()) lines.push(`NOTE:${card.note.trim()}`);
  lines.push("END:VCARD");

  return lines.join("\n");
}

export function emailPayload(email: string, subject = "", body = ""): string {
  const cleanEmail = email.trim();
  if (!cleanEmail) return "";
  const params = new URLSearchParams();
  if (subject.trim()) params.set("subject", subject.trim());
  if (body.trim()) params.set("body", body.trim());
  const qs = params.toString();
  return `mailto:${cleanEmail}${qs ? `?${qs}` : ""}`;
}

export function phonePayload(phone: string): string {
  const cleaned = phone.replace(/[\s()-]/g, "").trim();
  return cleaned ? `tel:${cleaned}` : "";
}

export function smsPayload(phone: string, body = ""): string {
  const cleaned = phone.replace(/[\s()-]/g, "").trim();
  if (!cleaned) return "";
  return `SMSTO:${cleaned}:${body.trim()}`;
}

export function whatsappPayload(phone: string, message = ""): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (!cleaned) return "";
  const qs = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${cleaned}${qs}`;
}

export interface EventOptions {
  title: string;
  location?: string;
  description?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
}

export function formatIcsDate(dateStr?: string, allDay = false): string {
  if (!dateStr) return "";
  const clean = dateStr.replace(/[-:]/g, "");
  if (allDay) {
    return clean.slice(0, 8);
  }
  if (clean.length === 8) {
    return `${clean}T000000`;
  }
  if (clean.length === 13) {
    return `${clean}00`;
  }
  return clean;
}

export function eventPayload(ev: EventOptions): string {
  const title = ev.title.trim();
  if (!title) return "";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:${title}`,
  ];
  if (ev.location?.trim()) lines.push(`LOCATION:${ev.location.trim()}`);
  if (ev.description?.trim()) lines.push(`DESCRIPTION:${ev.description.trim()}`);
  if (ev.start) {
    const formatted = formatIcsDate(ev.start, ev.allDay);
    lines.push(ev.allDay ? `DTSTART;VALUE=DATE:${formatted}` : `DTSTART:${formatted}`);
  }
  if (ev.end) {
    const formatted = formatIcsDate(ev.end, ev.allDay);
    lines.push(ev.allDay ? `DTEND;VALUE=DATE:${formatted}` : `DTEND:${formatted}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\n");
}

export function geoPayload(latitude: string | number, longitude: string | number): string {
  const lat = String(latitude).trim();
  const lng = String(longitude).trim();
  if (!lat || !lng) return "";
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function cryptoPayload(
  coin: "BTC" | "ETH" | "SOL",
  address: string,
  amount?: string
): string {
  const addr = address.trim();
  if (!addr) return "";
  const amt = amount?.trim();
  if (coin === "BTC") {
    return `bitcoin:${addr}${amt ? `?amount=${amt}` : ""}`;
  }
  if (coin === "ETH") {
    return `ethereum:${addr}${amt ? `?value=${amt}` : ""}`;
  }
  if (coin === "SOL") {
    return `solana:${addr}${amt ? `?amount=${amt}` : ""}`;
  }
  return addr;
}

/**
 * Converts a base64 Data URI to a standard Blob without using network fetch().
 * This completely avoids Content Security Policy (connect-src) violations and
 * prevents user-activation loss before copying to the clipboard.
 */
export function dataUriToBlob(dataUri: string): Blob {
  const commaIdx = dataUri.indexOf(",");
  if (commaIdx === -1) {
    throw new Error("Invalid Data URI: missing comma separator");
  }
  const header = dataUri.slice(0, commaIdx);
  const base64Data = dataUri.slice(commaIdx + 1);
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

