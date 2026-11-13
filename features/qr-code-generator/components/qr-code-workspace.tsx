/* eslint-disable @next/next/no-img-element -- Local blob/data previews must stay in the browser without server image optimization. */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  QrCode,
  Globe,
  FileText,
  Wifi,
  UserRound,
  MessageCircle,
  Mail,
  Phone,
  Smartphone,
  Calendar,
  MapPin,
  Coins,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  LocateFixed,
  Palette,
  WandSparkles,
  ChevronDown,
  X,
} from "lucide-react";
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
  dataUriToBlob,
  type VCardOptions,
  type EventOptions,
} from "@/features/qr-code-generator/lib/qr-code";
import { downloadBlob } from "@/lib/browser/download";
import { CustomSelect } from "@/components/ui/custom-select";
import { NumberInput } from "@/components/ui/number-input";
import { DatePicker } from "@/components/ui/date-picker";
import { ToolHeader } from "@/components/cummon/tool-header";
import { useSnackbar } from "@/hooks/use-snackbar";
import { Snackbar } from "@/components/ui/snackbar";
import styles from "../styles.module.css";

type ContentType =
  | "url"
  | "text"
  | "wifi"
  | "vcard"
  | "whatsapp"
  | "email"
  | "phone"
  | "sms"
  | "event"
  | "geo"
  | "crypto";

interface QrResult {
  key: string;
  png: string;
  svg: string;
}

interface TypeOption {
  id: ContentType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    id: "url",
    label: "URL Link",
    description: "Open websites, portfolios, or app deeplinks",
    icon: <Globe size={18} />,
  },
  {
    id: "text",
    label: "Plain Text",
    description: "Display notes, serial numbers, or raw messages",
    icon: <FileText size={18} />,
  },
  {
    id: "wifi",
    label: "Wi-Fi Network",
    description: "Connect to Wi-Fi automatically without passwords",
    icon: <Wifi size={18} />,
  },
  {
    id: "vcard",
    label: "Contact vCard",
    description: "Digital business card saved straight to contacts",
    icon: <UserRound size={18} />,
  },
  {
    id: "whatsapp",
    label: "WhatsApp Chat",
    description: "Open chat with a pre-filled starting message",
    icon: <MessageCircle size={18} />,
  },
  {
    id: "email",
    label: "Email (mailto)",
    description: "Draft an email with pre-filled subject and body",
    icon: <Mail size={18} />,
  },
  {
    id: "phone",
    label: "Phone Call",
    description: "Open dialer ready to place a voice phone call",
    icon: <Phone size={18} />,
  },
  {
    id: "sms",
    label: "SMS Message",
    description: "Send pre-formatted SMS to a recipient number",
    icon: <Smartphone size={18} />,
  },
  {
    id: "event",
    label: "Calendar Event",
    description: "Add meetings directly to Google or Apple Calendar",
    icon: <Calendar size={18} />,
  },
  {
    id: "geo",
    label: "Map Location",
    description: "Open Google Maps navigation to exact coordinates",
    icon: <MapPin size={18} />,
  },
  {
    id: "crypto",
    label: "Crypto Wallet",
    description: "Bitcoin, Ethereum, or Solana wallet addresses",
    icon: <Coins size={18} />,
  },
];

const FG_SWATCHES = [
  { label: "Black", color: "#000000" },
  { label: "Teal Forest", color: "#103e3b" },
  { label: "Navy Blue", color: "#1e3a8a" },
  { label: "Crimson", color: "#881337" },
  { label: "Charcoal", color: "#334155" },
];

const BG_SWATCHES = [
  { label: "White", color: "#ffffff" },
  { label: "Transparent", color: "#00000000" },
  { label: "Cream", color: "#faf8f5" },
  { label: "Soft Gray", color: "#f1f5f9" },
];

export function QrCodeWorkspace() {
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  // Active Type & Modal
  const [mode, setMode] = useState<ContentType>("url");
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  // URL state
  const [url, setUrl] = useState("https://ramupod.com");

  // Plain Text state
  const [text, setText] = useState("");

  // Wi-Fi state
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [security, setSecurity] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [hidden, setHidden] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // vCard state
  const [vcard, setVcard] = useState<VCardOptions>({
    firstName: "",
    lastName: "",
    organization: "",
    title: "",
    phoneCell: "",
    phoneWork: "",
    email: "",
    url: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    note: "",
  });

  // WhatsApp state
  const [waPhone, setWaPhone] = useState("");
  const [waMessage, setWaMessage] = useState("");

  // Email state
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState("");

  // SMS state
  const [smsPhone, setSmsPhone] = useState("");
  const [smsBody, setSmsBody] = useState("");

  // Event state
  const [eventData, setEventData] = useState<EventOptions>({
    title: "",
    location: "",
    description: "",
    start: "",
    end: "",
    allDay: false,
  });

  // Geo state
  const [geoLat, setGeoLat] = useState("");
  const [geoLng, setGeoLng] = useState("");
  const [geoLocating, setGeoLocating] = useState(false);

  // Crypto state
  const [cryptoCoin, setCryptoCoin] = useState<"BTC" | "ETH" | "SOL">("BTC");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");

  // Customization styling
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [margin, setMargin] = useState(4);
  const [size, setSize] = useState(512);
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M");

  // Output states
  const [result, setResult] = useState<QrResult | null>(null);
  const [error, setError] = useState("");
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Close modal on Escape key and prevent background scroll
  useEffect(() => {
    if (!isTypeModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTypeModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isTypeModalOpen]);

  // Compute Raw Payload
  const payload = useMemo(() => {
    switch (mode) {
      case "url": {
        const trimmed = url.trim();
        if (!trimmed) return "";
        return trimmed.match(/^[a-zA-Z]+:\/\//) ? trimmed : `https://${trimmed}`;
      }
      case "text":
        return text;
      case "wifi":
        return ssid ? wifiPayload(ssid, wifiPassword, security, hidden) : "";
      case "vcard": {
        const hasAny =
          vcard.firstName ||
          vcard.lastName ||
          vcard.organization ||
          vcard.phoneCell ||
          vcard.email;
        return hasAny ? vCardPayload(vcard) : "";
      }
      case "whatsapp":
        return waPhone ? whatsappPayload(waPhone, waMessage) : "";
      case "email":
        return emailTo ? emailPayload(emailTo, emailSubject, emailBody) : "";
      case "phone":
        return phoneNumber ? phonePayload(phoneNumber) : "";
      case "sms":
        return smsPhone ? smsPayload(smsPhone, smsBody) : "";
      case "event":
        return eventData.title ? eventPayload(eventData) : "";
      case "geo":
        return geoLat && geoLng ? geoPayload(geoLat, geoLng) : "";
      case "crypto":
        return cryptoAddress ? cryptoPayload(cryptoCoin, cryptoAddress, cryptoAmount) : "";
      default:
        return "";
    }
  }, [
    mode,
    url,
    text,
    ssid,
    wifiPassword,
    security,
    hidden,
    vcard,
    waPhone,
    waMessage,
    emailTo,
    emailSubject,
    emailBody,
    phoneNumber,
    smsPhone,
    smsBody,
    eventData,
    geoLat,
    geoLng,
    cryptoCoin,
    cryptoAddress,
    cryptoAmount,
  ]);

  const cacheKey = JSON.stringify([payload, size, level, fgColor, bgColor, margin]);
  const current = result?.key === cacheKey ? result : null;

  // Generate QR Code with debounce
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!payload) {
        setResult(null);
        setError("");
        return;
      }
      try {
        const qr = await import("qrcode");
        const options = {
          width: size,
          margin,
          errorCorrectionLevel: level,
          color: {
            dark: fgColor,
            light: bgColor,
          },
        };
        const [png, svg] = await Promise.all([
          qr.toDataURL(payload, options),
          qr.toString(payload, { ...options, type: "svg" }),
        ]);
        if (active) {
          setResult({ key: cacheKey, png, svg });
          setError("");
        }
      } catch {
        if (active) {
          setResult(null);
          setError(
            "Could not generate QR code. Content is too long for this capacity or error correction level."
          );
        }
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [payload, size, level, fgColor, bgColor, margin, cacheKey]);

  // Actions
  const handleDownloadPng = () => {
    if (!current) return;
    const a = document.createElement("a");
    a.href = current.png;
    a.download = `qrcode-${mode}.png`;
    a.click();
    showSnackbar("QR code PNG downloaded successfully.");
  };

  const handleDownloadSvg = () => {
    if (!current) return;
    downloadBlob(
      new Blob([current.svg], { type: "image/svg+xml" }),
      `qrcode-${mode}.svg`
    );
    showSnackbar("QR code SVG downloaded successfully.");
  };

  const handleCopyImage = async () => {
    if (!current) return;

    if (
      typeof window === "undefined" ||
      !navigator.clipboard ||
      typeof ClipboardItem === "undefined"
    ) {
      showSnackbar(
        "Your browser does not support copying images to clipboard. Please download PNG instead.",
        "error"
      );
      return;
    }

    try {
      const blob = dataUriToBlob(current.png);
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      setCopiedImage(true);
      showSnackbar("QR code image copied to clipboard!");
      setTimeout(() => setCopiedImage(false), 2200);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        showSnackbar(
          "Clipboard access was denied. Please allow clipboard permission or download PNG.",
          "error"
        );
      } else {
        showSnackbar(
          "Failed to copy image to clipboard. Please download PNG instead.",
          "error"
        );
      }
    }
  };

  const handleCopyPayload = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedPayload(true);
      showSnackbar("Raw payload string copied to clipboard!");
      setTimeout(() => setCopiedPayload(false), 2200);
    } catch {
      showSnackbar("Failed to copy text to clipboard.", "error");
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showSnackbar("Geolocation is not supported by your browser.", "error");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude.toFixed(6));
        setGeoLng(pos.coords.longitude.toFixed(6));
        setGeoLocating(false);
        showSnackbar("Location coordinates detected successfully.");
      },
      () => {
        setGeoLocating(false);
        showSnackbar("Location access was denied or unavailable.", "error");
      },
      { timeout: 8000 }
    );
  };

  // Generate sample data for the currently active type via WandSparkles
  const handleGenerateSample = () => {
    switch (mode) {
      case "url":
        setUrl(
          url === "https://ramupod.com"
            ? "https://github.com/developer"
            : "https://ramupod.com"
        );
        showSnackbar("Sample website URL loaded.");
        break;
      case "text":
        setText(
          "Ramupod Developer Tools: 100% private, on-device utilities for developers and designers."
        );
        showSnackbar("Sample text loaded.");
        break;
      case "wifi":
        setSsid("Guest_Network_5G");
        setWifiPassword("WelcomeToRamupod2026!");
        setSecurity("WPA");
        setHidden(false);
        showSnackbar("Sample Wi-Fi credentials loaded.");
        break;
      case "vcard":
        setVcard({
          firstName: "John",
          lastName: "Doe",
          organization: "Ramupod Tech",
          title: "Senior Software Engineer",
          phoneCell: "+1 555 123 4567",
          phoneWork: "+1 555 987 6543",
          email: "john.doe@example.com",
          url: "ramupod.com",
          street: "123 Market Street",
          city: "San Francisco",
          state: "CA",
          postalCode: "94105",
          country: "United States",
          note: "Feel free to reach out via WhatsApp or email.",
        });
        showSnackbar("Sample vCard contact data loaded.");
        break;
      case "whatsapp":
        setWaPhone("15551234567");
        setWaMessage(
          "Hello! I would like to inquire about your product pricing and availability."
        );
        showSnackbar("Sample WhatsApp message loaded.");
        break;
      case "email":
        setEmailTo("hello@ramupod.com");
        setEmailSubject("Inquiry regarding Developer Tools");
        setEmailBody(
          "Hi team,\n\nI love your privacy-first developer tools. Could you share more information about upcoming features?\n\nBest regards,"
        );
        showSnackbar("Sample email draft loaded.");
        break;
      case "phone":
        setPhoneNumber("+1 555 123 4567");
        showSnackbar("Sample phone number loaded.");
        break;
      case "sms":
        setSmsPhone("+1 555 123 4567");
        setSmsBody("JOIN RAMUPOD 2026");
        showSnackbar("Sample SMS loaded.");
        break;
      case "event": {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const startStr = nextWeek.toISOString().slice(0, 10);
        const nextTwoWeeks = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);
        const endStr = nextTwoWeeks.toISOString().slice(0, 10);
        setEventData({
          title: "Ramupod Developer Workshop",
          location: "Convention Center & Online",
          description: "In-depth modern web architecture and developer tools.",
          start: startStr,
          end: endStr,
          allDay: true,
        });
        showSnackbar("Sample calendar event loaded.");
        break;
      }
      case "geo":
        setGeoLat("37.774929");
        setGeoLng("-122.419416");
        showSnackbar("Sample coordinates loaded (San Francisco, CA).");
        break;
      case "crypto":
        setCryptoCoin("BTC");
        setCryptoAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
        setCryptoAmount("0.05");
        showSnackbar("Sample crypto wallet loaded.");
        break;
    }
  };

  const activeTypeItem =
    TYPE_OPTIONS.find((t) => t.id === mode) || TYPE_OPTIONS[0];

  return (
    <div className={`workspace-page page-width utility-tool ${styles.workspace}`}>
      <ToolHeader title="QR Code Generator" icon={<QrCode size={24} />} />

      <div className={styles.layoutGrid}>
        {/* Left Column: Form & Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Form Content per Type */}
          <section className={styles.formCard} aria-label="Content Form">
            {/* Form Header with title on left, and actions (WandSparkles + Type Trigger) on right */}
            <div className={styles.formHeader}>
              <div className={styles.formHeaderTitle}>
                {activeTypeItem.icon}
                <h3>{activeTypeItem.label}</h3>
              </div>

              <div className={styles.formHeaderActions}>
                {/* Generate Sample button (WandSparkles) */}
                <button
                  type="button"
                  className={styles.sampleBtn}
                  onClick={handleGenerateSample}
                  title="Generate sample data"
                  aria-label="Generate sample data"
                >
                  <WandSparkles size={16} />
                </button>

                {/* Content Type Trigger Button */}
                <button
                  type="button"
                  className={styles.typeTriggerBtn}
                  onClick={() => setIsTypeModalOpen(true)}
                  aria-haspopup="dialog"
                  title="Choose QR Code Content Type"
                >
                  <span className={styles.typeTriggerBadge}>
                    {activeTypeItem.icon}
                    <span>{activeTypeItem.label}</span>
                  </span>
                  <ChevronDown size={14} className={styles.typeTriggerChevron} />
                </button>
              </div>
            </div>

            {/* 1. URL */}
            {mode === "url" && (
              <label className="utility-field">
                Website URL
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/portfolio"
                  spellCheck={false}
                  maxLength={2048}
                />
                <span className="utility-hint">
                  When scanned with a camera, the link opens automatically in the browser.
                </span>
              </label>
            )}

            {/* 2. Text */}
            {mode === "text" && (
              <label className="utility-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Text Content</span>
                  <span className={styles.badgeMuted}>
                    {text.length} / 2,500 characters
                  </span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter confidential notes, serial numbers, or any message you want to encode..."
                  maxLength={3000}
                  rows={5}
                />
                <span className="utility-hint">
                  Text is decoded and displayed directly on the device screen without an internet connection.
                </span>
              </label>
            )}

            {/* 3. Wi-Fi */}
            {mode === "wifi" && (
              <>
                <label className="utility-field">
                  Network Name (SSID)
                  <input
                    type="text"
                    value={ssid}
                    onChange={(e) => setSsid(e.target.value)}
                    placeholder="e.g. Office_Guest_5G"
                    maxLength={100}
                    autoComplete="off"
                  />
                </label>
                <div className="utility-columns">
                  <CustomSelect
                    layout="stacked"
                    label="Security Type"
                    value={security}
                    onChange={(val) => setSecurity(val as typeof security)}
                    options={[
                      { value: "WPA", label: "WPA / WPA2 / WPA3 (Standard)" },
                      { value: "WEP", label: "WEP (Legacy)" },
                      { value: "nopass", label: "Open (No Password)" },
                    ]}
                  />
                  {security !== "nopass" && (
                    <label className="utility-field">
                      Wi-Fi Password
                      <div className={styles.inputGroup}>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={wifiPassword}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          placeholder="Network Password"
                          maxLength={128}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className={styles.inputAction}
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>
                  )}
                </div>
                <label className="utility-check">
                  <input
                    type="checkbox"
                    checked={hidden}
                    onChange={(e) => setHidden(e.target.checked)}
                  />
                  Hidden Network (Hidden SSID)
                </label>
                <p className="utility-hint">
                  Guests point their phone camera to instantly connect without typing passwords.
                </p>
              </>
            )}

            {/* 4. vCard (Contacts) */}
            {mode === "vcard" && (
              <>
                <div className="utility-columns">
                  <label className="utility-field">
                    First Name
                    <input
                      type="text"
                      value={vcard.firstName || ""}
                      onChange={(e) =>
                        setVcard({ ...vcard, firstName: e.target.value })
                      }
                      placeholder="John"
                    />
                  </label>
                  <label className="utility-field">
                    Last Name
                    <input
                      type="text"
                      value={vcard.lastName || ""}
                      onChange={(e) =>
                        setVcard({ ...vcard, lastName: e.target.value })
                      }
                      placeholder="Doe"
                    />
                  </label>
                </div>
                <div className="utility-columns">
                  <label className="utility-field">
                    Company / Organization
                    <input
                      type="text"
                      value={vcard.organization || ""}
                      onChange={(e) =>
                        setVcard({ ...vcard, organization: e.target.value })
                      }
                      placeholder="Ramupod Tech"
                    />
                  </label>
                  <label className="utility-field">
                    Job Title
                    <input
                      type="text"
                      value={vcard.title || ""}
                      onChange={(e) =>
                        setVcard({ ...vcard, title: e.target.value })
                      }
                      placeholder="Senior Software Engineer"
                    />
                  </label>
                </div>
                <div className="utility-columns">
                  <label className="utility-field">
                    Mobile Phone
                    <input
                      type="tel"
                      value={vcard.phoneCell || ""}
                      onChange={(e) =>
                        setVcard({ ...vcard, phoneCell: e.target.value })
                      }
                      placeholder="+1 555 123 4567"
                    />
                  </label>
                  <label className="utility-field">
                    Work Email
                    <input
                      type="email"
                      value={vcard.email || ""}
                      onChange={(e) =>
                        setVcard({ ...vcard, email: e.target.value })
                      }
                      placeholder="john.doe@example.com"
                    />
                  </label>
                </div>
                <div className="utility-columns">
                  <label className="utility-field">
                    Website / Portfolio
                    <input
                      type="text"
                      value={vcard.url || ""}
                      onChange={(e) =>
                        setVcard({ ...vcard, url: e.target.value })
                      }
                      placeholder="https://ramupod.com"
                    />
                  </label>
                  <label className="utility-field">
                    City &amp; State
                    <input
                      type="text"
                      value={vcard.city || ""}
                      onChange={(e) =>
                        setVcard({ ...vcard, city: e.target.value })
                      }
                      placeholder="San Francisco, CA"
                    />
                  </label>
                </div>
                <label className="utility-field">
                  Short Note
                  <input
                    type="text"
                    value={vcard.note || ""}
                    onChange={(e) =>
                      setVcard({ ...vcard, note: e.target.value })
                    }
                    placeholder="e.g. Available for consultation via WhatsApp or email"
                  />
                  <span className="utility-hint">
                    iPhone and Android cameras will display an &quot;Add to Contacts&quot; prompt.
                  </span>
                </label>
              </>
            )}

            {/* 5. WhatsApp */}
            {mode === "whatsapp" && (
              <>
                <label className="utility-field">
                  WhatsApp Number (with Country Code)
                  <input
                    type="tel"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="e.g. 15551234567 (digits only, no +, dashes or spaces)"
                  />
                  <span className="utility-hint">
                    International format without leading plus or symbols. Customers do not need to save your contact first.
                  </span>
                </label>
                <label className="utility-field">
                  Pre-filled Message (Optional)
                  <textarea
                    value={waMessage}
                    onChange={(e) => setWaMessage(e.target.value)}
                    placeholder="Hello, I would like to inquire about your services..."
                    rows={3}
                  />
                </label>
              </>
            )}

            {/* 6. Email */}
            {mode === "email" && (
              <>
                <label className="utility-field">
                  Recipient Email Address
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="support@ramupod.com"
                  />
                </label>
                <label className="utility-field">
                  Email Subject (Optional)
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Inquiry about services"
                  />
                </label>
                <label className="utility-field">
                  Message Body Draft (Optional)
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Write an email draft template here..."
                    rows={3}
                  />
                </label>
              </>
            )}

            {/* 7. Phone */}
            {mode === "phone" && (
              <label className="utility-field">
                Phone Number
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +1 555 123 4567"
                />
                <span className="utility-hint">
                  When scanned, smartphones launch the phone dialer ready to place a call.
                </span>
              </label>
            )}

            {/* 8. SMS */}
            {mode === "sms" && (
              <>
                <label className="utility-field">
                  Recipient Phone Number
                  <input
                    type="tel"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    placeholder="+15551234567"
                  />
                </label>
                <label className="utility-field">
                  SMS Text Message
                  <textarea
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    placeholder="JOIN PROMO 2026"
                    rows={3}
                  />
                  <span className="utility-hint">
                    Universal barcode and QR format supported across all mobile platforms.
                  </span>
                </label>
              </>
            )}

            {/* 9. Event / Calendar */}
            {mode === "event" && (
              <>
                <label className="utility-field">
                  Event Title
                  <input
                    type="text"
                    value={eventData.title}
                    onChange={(e) =>
                      setEventData({ ...eventData, title: e.target.value })
                    }
                    placeholder="Ramupod Product Launch"
                  />
                </label>
                <label className="utility-field">
                  Event Location
                  <input
                    type="text"
                    value={eventData.location || ""}
                    onChange={(e) =>
                      setEventData({ ...eventData, location: e.target.value })
                    }
                    placeholder="Convention Center / Google Meet Link"
                  />
                </label>
                <div className="utility-columns">
                  <DatePicker
                    label="Start Date"
                    value={eventData.start || ""}
                    onChange={(val) =>
                      setEventData({ ...eventData, start: val })
                    }
                  />
                  <DatePicker
                    label="End Date"
                    value={eventData.end || ""}
                    onChange={(val) =>
                      setEventData({ ...eventData, end: val })
                    }
                  />
                </div>
                <label className="utility-check">
                  <input
                    type="checkbox"
                    checked={eventData.allDay || false}
                    onChange={(e) =>
                      setEventData({ ...eventData, allDay: e.target.checked })
                    }
                  />
                  All-Day Event
                </label>
                <label className="utility-field">
                  Event Description
                  <textarea
                    value={eventData.description || ""}
                    onChange={(e) =>
                      setEventData({ ...eventData, description: e.target.value })
                    }
                    placeholder="Detailed event information..."
                    rows={2}
                  />
                  <span className="utility-hint">
                    Triggers a direct &quot;Add to Google / Apple Calendar&quot; option on smartphones.
                  </span>
                </label>
              </>
            )}

            {/* 10. Geo (Location) */}
            {mode === "geo" && (
              <>
                <div className="utility-columns">
                  <label className="utility-field">
                    Latitude
                    <input
                      type="text"
                      value={geoLat}
                      onChange={(e) => setGeoLat(e.target.value)}
                      placeholder="37.7749"
                    />
                  </label>
                  <label className="utility-field">
                    Longitude
                    <input
                      type="text"
                      value={geoLng}
                      onChange={(e) => setGeoLng(e.target.value)}
                      placeholder="-122.4194"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className={styles.geoDetectBtn}
                  onClick={handleGetLocation}
                  disabled={geoLocating}
                >
                  <LocateFixed size={13} />
                  {geoLocating ? "Detecting…" : "Use My Current Location"}
                </button>
                <p className="utility-hint">
                  Scanning opens Google Maps or Apple Maps with turn-by-turn navigation to these coordinates.
                </p>
              </>
            )}

            {/* 11. Crypto */}
            {mode === "crypto" && (
              <>
                <div className="utility-columns">
                  <CustomSelect
                    layout="stacked"
                    label="Coin Type"
                    value={cryptoCoin}
                    onChange={(val) => setCryptoCoin(val as typeof cryptoCoin)}
                    options={[
                      { value: "BTC", label: "Bitcoin (BTC)" },
                      { value: "ETH", label: "Ethereum (ETH)" },
                      { value: "SOL", label: "Solana (SOL)" },
                    ]}
                  />
                  <label className="utility-field">
                    Amount (Optional)
                    <NumberInput
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                      placeholder="0.05"
                      step="any"
                    />
                  </label>
                </div>
                <label className="utility-field">
                  Public Wallet Address
                  <input
                    type="text"
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    placeholder="e.g. 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                    spellCheck={false}
                  />
                  <span className="utility-hint">
                    Prevents errors when copying long hexadecimal wallet addresses.
                  </span>
                </label>
              </>
            )}
          </section>

          {/* QR Code Styling & Export Customization */}
          <section className={styles.stylingCard} aria-label="Appearance Customization">
            <div className={styles.stylingHeader}>
              <h4>
                <Palette size={16} />
                QR Colors &amp; Visual Appearance
              </h4>
            </div>

            <div className="utility-columns">
              {/* Foreground Color */}
              <div className="utility-field">
                <span>Dot Color (Foreground)</span>
                <div className={styles.swatchRow}>
                  {FG_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.color}
                      type="button"
                      title={swatch.label}
                      className={`${styles.swatchBtn} ${
                        fgColor.toLowerCase() === swatch.color.toLowerCase()
                          ? styles.swatchActive
                          : ""
                      }`}
                      style={{ backgroundColor: swatch.color }}
                      onClick={() => setFgColor(swatch.color)}
                    />
                  ))}
                  <div className={styles.colorPickerWrap}>
                    <input
                      type="color"
                      aria-label="Custom Foreground Color"
                      className={styles.colorInput}
                      value={fgColor.length === 7 ? fgColor : "#000000"}
                      onChange={(e) => setFgColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Background Color */}
              <div className="utility-field">
                <span>Background Color</span>
                <div className={styles.swatchRow}>
                  {BG_SWATCHES.map((swatch) => {
                    const isTransparent = swatch.color === "#00000000";
                    return (
                      <button
                        key={swatch.color}
                        type="button"
                        title={swatch.label}
                        className={`${styles.swatchBtn} ${
                          bgColor === swatch.color ? styles.swatchActive : ""
                        }`}
                        style={{
                          backgroundColor: isTransparent ? "#ffffff" : swatch.color,
                          backgroundImage: isTransparent
                            ? "linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)"
                            : "none",
                          backgroundSize: "8px 8px",
                        }}
                        onClick={() => setBgColor(swatch.color)}
                      />
                    );
                  })}
                  <div className={styles.colorPickerWrap}>
                    <input
                      type="color"
                      aria-label="Custom Background Color"
                      className={styles.colorInput}
                      value={bgColor.length === 7 ? bgColor : "#ffffff"}
                      onChange={(e) => setBgColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="utility-columns">
              <CustomSelect
                layout="stacked"
                label="Resolution Size"
                value={String(size)}
                onChange={(val) => setSize(Number(val))}
                options={[
                  { value: "256", label: "256 × 256 px (Small)" },
                  { value: "512", label: "512 × 512 px (Standard)" },
                  { value: "1024", label: "1024 × 1024 px (HD)" },
                  { value: "2048", label: "2048 × 2048 px (Print)" },
                ]}
              />

              <CustomSelect
                layout="stacked"
                label="Error Correction"
                value={level}
                onChange={(val) => setLevel(val as typeof level)}
                options={[
                  { value: "L", label: "Low · 7%" },
                  { value: "M", label: "Medium · 15% (Recommended)" },
                  { value: "Q", label: "Quartile · 25%" },
                  { value: "H", label: "High · 30% (Damage-Resistant)" },
                ]}
              />
            </div>

            <CustomSelect
              layout="stacked"
              label="Margin (Quiet Zone)"
              value={String(margin)}
              onChange={(val) => setMargin(Number(val))}
              options={[
                { value: "0", label: "0 (No Margin)" },
                { value: "1", label: "1 Module" },
                { value: "2", label: "2 Modules" },
                { value: "4", label: "4 Modules (Standard)" },
                { value: "6", label: "6 Modules (Wide)" },
              ]}
            />
          </section>
        </div>

        {/* Right Column: Sticky Preview & Actions */}
        <div className={styles.previewCol}>
          <section className={styles.previewCard} aria-label="QR Code Preview">
            <div
              className={`${styles.qrContainer} ${
                bgColor === "#00000000" ? styles.transparentBg : ""
              }`}
            >
              {current ? (
                <img
                  src={current.png}
                  alt="QR Code Preview"
                  className={styles.qrImage}
                />
              ) : (
                <div className={styles.emptyState}>
                  <QrCode size={48} strokeWidth={1.2} />
                  <p>
                    {payload
                      ? error || "Preparing preview…"
                      : "Fill in content on the left to generate your QR code."}
                  </p>
                </div>
              )}
            </div>

            {/* Main Action Buttons */}
            <div className={styles.previewActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={!current}
                onClick={handleDownloadPng}
              >
                <Download size={14} />
                Download PNG
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                disabled={!current}
                onClick={handleDownloadSvg}
              >
                <Download size={14} />
                Download SVG
              </button>
            </div>

            {/* Sub Action Buttons */}
            <div className={styles.previewSubActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                disabled={!current}
                onClick={handleCopyImage}
              >
                {copiedImage ? <Check size={14} /> : <Copy size={14} />}
                {copiedImage ? "Copied!" : "Copy Image"}
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                disabled={!payload}
                onClick={handleCopyPayload}
              >
                {copiedPayload ? <Check size={14} /> : <Copy size={14} />}
                {copiedPayload ? "Text Copied!" : "Copy Text"}
              </button>
            </div>

            <p className="utility-hint">
              100% processed locally in your browser. Never sent to any server.
            </p>
          </section>
        </div>
      </div>

      {/* Content Type Modal Dialog */}
      {isTypeModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTypeModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="type-modal-title"
        >
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <h3 id="type-modal-title">Choose QR Code Content Type</h3>
                <p>Select what kind of information you want to encode into this QR code.</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsTypeModalOpen(false)}
                title="Close modal"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {TYPE_OPTIONS.map((item) => {
                const isSelected = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.modalTypeCard} ${
                      isSelected ? styles.modalTypeCardActive : ""
                    }`}
                    onClick={() => {
                      setMode(item.id);
                      setIsTypeModalOpen(false);
                      showSnackbar(`Switched to ${item.label}.`);
                    }}
                  >
                    <div className={styles.modalTypeIcon}>{item.icon}</div>
                    <div className={styles.modalTypeInfo}>
                      <h4 className={styles.modalTypeLabel}>{item.label}</h4>
                      <p className={styles.modalTypeDesc}>{item.description}</p>
                    </div>
                    {isSelected && (
                      <Check size={18} className={styles.modalTypeCheck} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
