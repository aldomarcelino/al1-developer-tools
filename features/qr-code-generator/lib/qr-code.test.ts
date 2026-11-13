import test from "node:test";
import assert from "node:assert/strict";
import {
  wifiPayload,
  vCardPayload,
  emailPayload,
  phonePayload,
  smsPayload,
  whatsappPayload,
  eventPayload,
  geoPayload,
  cryptoPayload,
  formatIcsDate,
  dataUriToBlob,
} from "./qr-code.ts";

test("Wi-Fi QR escapes delimiters and omits password for open networks", () => {
  assert.equal(
    wifiPayload('Cafe;A:B,C"D\\E', "pa;ss", "WPA", true),
    'WIFI:T:WPA;S:Cafe\\;A\\:B\\,C\\"D\\\\E;P:pa\\;ss;H:true;;'
  );
  assert.equal(
    wifiPayload("Guest", "ignored", "nopass", false),
    "WIFI:T:nopass;S:Guest;H:false;;"
  );
});

test("vCard formats contacts according to vCard 3.0 standards", () => {
  const card = vCardPayload({
    firstName: "Budi",
    lastName: "Santoso",
    organization: "Ramupod Tech",
    title: "Senior Engineer",
    phoneCell: "+6281234567890",
    phoneWork: "0215551234",
    email: "budi@ramupod.com",
    url: "ramupod.com",
    street: "Jl. Sudirman No. 10",
    city: "Jakarta",
    state: "DKI Jakarta",
    postalCode: "10220",
    country: "Indonesia",
    note: "Kontak pengembang",
  });

  assert.ok(card.includes("BEGIN:VCARD"));
  assert.ok(card.includes("VERSION:3.0"));
  assert.ok(card.includes("N:Santoso;Budi;;;"));
  assert.ok(card.includes("FN:Budi Santoso"));
  assert.ok(card.includes("ORG:Ramupod Tech"));
  assert.ok(card.includes("TITLE:Senior Engineer"));
  assert.ok(card.includes("TEL;TYPE=CELL:+6281234567890"));
  assert.ok(card.includes("EMAIL;TYPE=INTERNET:budi@ramupod.com"));
  assert.ok(card.includes("URL:https://ramupod.com"));
  assert.ok(card.includes("ADR;TYPE=WORK:;;Jl. Sudirman No. 10;Jakarta;DKI Jakarta;10220;Indonesia"));
  assert.ok(card.includes("NOTE:Kontak pengembang"));
  assert.ok(card.includes("END:VCARD"));
});

test("emailPayload creates valid mailto links with optional subject and body", () => {
  assert.equal(
    emailPayload("support@example.com"),
    "mailto:support@example.com"
  );
  assert.equal(
    emailPayload("support@example.com", "Halo & Bantuan", "Tolong dibantu ya"),
    "mailto:support@example.com?subject=Halo+%26+Bantuan&body=Tolong+dibantu+ya"
  );
  assert.equal(emailPayload("   "), "");
});

test("phonePayload cleans formatting and creates tel uri", () => {
  assert.equal(phonePayload("+62 (812) 345-6789"), "tel:+628123456789");
  assert.equal(phonePayload(""), "");
});

test("smsPayload creates SMSTO format", () => {
  assert.equal(
    smsPayload("+62 812-345-6789", "Info promo"),
    "SMSTO:+628123456789:Info promo"
  );
  assert.equal(smsPayload(""), "");
});

test("whatsappPayload extracts numbers and creates wa.me link with encoded text", () => {
  assert.equal(
    whatsappPayload("+62 812-3456-7890", "Halo, saya mau pesan!"),
    "https://wa.me/6281234567890?text=Halo%2C%20saya%20mau%20pesan!"
  );
  assert.equal(
    whatsappPayload("081234567890"),
    "https://wa.me/081234567890"
  );
  assert.equal(whatsappPayload(""), "");
});

test("eventPayload formats VEVENT ics calendar entries", () => {
  const ev = eventPayload({
    title: "Peluncuran Fitur Baru",
    location: "Google Meet",
    description: "Demo live",
    start: "2026-11-15T14:00",
    end: "2026-11-15T15:30",
  });
  assert.ok(ev.includes("BEGIN:VCALENDAR"));
  assert.ok(ev.includes("BEGIN:VEVENT"));
  assert.ok(ev.includes("SUMMARY:Peluncuran Fitur Baru"));
  assert.ok(ev.includes("LOCATION:Google Meet"));
  assert.ok(ev.includes("DTSTART:20261115T140000"));
  assert.ok(ev.includes("DTEND:20261115T153000"));
  assert.ok(ev.includes("END:VEVENT"));
});

test("formatIcsDate handles all-day and timed formats", () => {
  assert.equal(formatIcsDate("2026-11-13", true), "20261113");
  assert.equal(formatIcsDate("2026-11-13T10:30", false), "20261113T103000");
});

test("geoPayload creates google maps search url", () => {
  assert.equal(
    geoPayload("-6.2088", "106.8456"),
    "https://maps.google.com/?q=-6.2088,106.8456"
  );
  assert.equal(geoPayload("", ""), "");
});

test("cryptoPayload creates bitcoin, ethereum and solana URIs", () => {
  assert.equal(
    cryptoPayload("BTC", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "0.05"),
    "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.05"
  );
  assert.equal(
    cryptoPayload("ETH", "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"),
    "ethereum:0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  );
  assert.equal(
    cryptoPayload("SOL", "7eynhpYFp94", "10"),
    "solana:7eynhpYFp94?amount=10"
  );
});

test("dataUriToBlob converts base64 data uri into Blob without network fetch", async () => {
  // 1x1 transparent png
  const sampleDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const blob = dataUriToBlob(sampleDataUri);
  assert.equal(blob.type, "image/png");
  assert.ok(blob.size > 0);
  const buffer = new Uint8Array(await blob.arrayBuffer());
  assert.equal(buffer[0], 0x89);
  assert.equal(buffer[1], 0x50); // P
  assert.equal(buffer[2], 0x4e); // N
  assert.equal(buffer[3], 0x47); // G
});

