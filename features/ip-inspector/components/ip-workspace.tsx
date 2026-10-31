"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  RefreshCw,
  ShieldCheck,
  Monitor,
  MapPin,
  Network,
} from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { useNotice } from "@/hooks/use-notice";
import { useSnackbar } from "@/hooks/use-snackbar";
import { Snackbar } from "@/components/ui/snackbar";
import { normalizeIp, isPrivateIp, type IpInfo } from "../lib/ip";
import { inspectDevice, type DeviceInfo } from "../lib/device";
import { inspectWebRtc, type RtcResult } from "../lib/webrtc";
import styles from "../styles.module.css";

function Facts({ items }: { items: [string, unknown][] }) {
  return (
    <dl className={styles.facts}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {value === null || value === undefined || value === ""
              ? "Unavailable"
              : typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function IpWorkspace() {
  const [visitor, setVisitor] = useState<IpInfo | null>(null);
  const [lookup, setLookup] = useState<IpInfo | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [rtc, setRtc] = useState<RtcResult | null>(null);
  const [rtcLoading, setRtcLoading] = useState(false);
  const [rtcError, setRtcError] = useState("");
  const [copied, showCopied] = useNotice("", 2000);
  const lookupController = useRef<AbortController | null>(null);
  const rtcController = useRef<AbortController | null>(null);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setDevice(inspectDevice());
      try {
        const response = await fetch("/api/ip-info", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Could not load your IP information. Try refreshing.");
        const data = (await response.json()) as IpInfo;
        if (!controller.signal.aborted) setVisitor(data);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Could not load IP information."
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refresh]);
  useEffect(
    () => () => {
      lookupController.current?.abort();
      rtcController.current?.abort();
    },
    []
  );

  async function customLookup() {
    lookupController.current?.abort();
    const controller = new AbortController();
    lookupController.current = controller;
    setLookup(null);
    setLookupError("");
    setLookupLoading(false);
    const ip = normalizeIp(query);
    if (!ip) {
      setLookupError("Enter a valid IPv4 or IPv6 address.");
      return;
    }
    setLookupLoading(true);
    try {
      const response = await fetch(`/api/ip-info?ip=${encodeURIComponent(ip)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await response.json()) as IpInfo & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "IP lookup failed.");
      if (!controller.signal.aborted) setLookup(data as IpInfo);
    } catch (cause) {
      if (!controller.signal.aborted)
        setLookupError(
          cause instanceof Error ? cause.message : "Lookup failed. Please try again."
        );
    } finally {
      if (!controller.signal.aborted) setLookupLoading(false);
    }
  }
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      showCopied(label);
      showSnackbar(
        label === "IP"
          ? "IP address copied to clipboard."
          : "Inspection JSON copied to clipboard."
      );
    } catch {
      showSnackbar(
        "Clipboard unavailable. Select the text and copy it manually.",
        "error"
      );
    }
  }
  async function runRtc() {
    rtcController.current?.abort();
    const controller = new AbortController();
    rtcController.current = controller;
    setRtcLoading(true);
    setRtcError("");
    setRtc(null);
    try {
      const result = await inspectWebRtc(controller.signal);
      if (!controller.signal.aborted) setRtc(result);
    } catch {
      if (!controller.signal.aborted)
        setRtcError("WebRTC inspection failed or was blocked by your browser.");
    } finally {
      if (!controller.signal.aborted) setRtcLoading(false);
    }
  }
  const info = lookup ?? visitor;
  const localAddress = Boolean(visitor?.ip && isPrivateIp(visitor.ip));
  const differentPublic = rtc?.addresses.filter(
    (entry) =>
      entry.kind === "public" && visitor?.ip && entry.address !== normalizeIp(visitor.ip)
  );
  return (
    <div className={`workspace-page page-width ${styles.scope}`}>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
      <ToolHeader
        title="What Is My IP & System Inspector"
        icon={<Network size={24} />}
        privacyBadge={false}
      />
      <section className={styles.hero} aria-busy={loading}>
        <div className={styles.heroHeading}>
          <div className={styles.heroTitle}>
            <span className={styles.connectionIcon}>
              <Network size={18} />
            </span>
            <div>
              <span className={styles.eyebrow}>CONNECTION OVERVIEW</span>
              <h2>Your IP address</h2>
            </div>
          </div>
          <span className={styles.environment}>
            <span aria-hidden="true" />
            {loading
              ? "Checking connection"
              : localAddress
                ? "Local / development"
                : visitor?.ip
                  ? "Public connection"
                  : "Unavailable"}
          </span>
        </div>
        <div className={styles.addressRow}>
          {loading ? (
            <div className={styles.skeleton} aria-label="Loading IP address" />
          ) : (
            <p className={styles.ip}>{visitor?.ip ?? "Unavailable locally"}</p>
          )}
          <div className={styles.actions}>
            <ActionButton
              variant="primary"
              success={copied === "IP"}
              disabled={!visitor?.ip || loading}
              onClick={() => visitor?.ip && void copy(visitor.ip, "IP")}
            >
              {copied === "IP" ? <Check size={15} /> : <Copy size={15} />}
              {copied === "IP" ? "Copied!" : "Copy IP"}
            </ActionButton>
            <ActionButton
              variant="ghost"
              iconOnly
              title="Refresh IP information"
              disabled={loading}
              onClick={() => setRefresh((value) => value + 1)}
            >
              <RefreshCw size={15} />
            </ActionButton>
          </div>
        </div>
        <div className={styles.heroFooter}>
          <p className={styles.connectionNote}>
            <Monitor size={15} aria-hidden="true" />
            <span>
              {localAddress && visitor?.source !== "cloudflare"
                ? "You’re viewing a local connection. Public IP and location details are available when hosted on Cloudflare."
                : (visitor?.notice ??
                  "Your connection at a glance, with device details inspected in this browser.")}
            </span>
          </p>
          <ActionButton
            variant="ghost"
            size="sm"
            success={copied === "JSON"}
            disabled={loading || !device}
            onClick={() =>
              void copy(
                JSON.stringify(
                  {
                    visitor,
                    customLookup: lookup,
                    device,
                    webRtc: rtc,
                    webRtcError: rtcError || null,
                  },
                  null,
                  2
                ),
                "JSON"
              )
            }
          >
            {copied === "JSON" ? <Check size={15} /> : <Copy size={15} />}
            Copy All as JSON
          </ActionButton>
        </div>
      </section>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <form
        className={styles.lookup}
        onSubmit={(event) => {
          event.preventDefault();
          void customLookup();
        }}
      >
        <label htmlFor="ip-query">Custom IP lookup</label>
        <input
          id="ip-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="8.8.8.8 or 2606:4700:4700::1111"
          autoComplete="off"
          spellCheck={false}
        />
        <ActionButton variant="primary" type="submit" disabled={lookupLoading}>
          {lookupLoading ? "Looking up…" : "Look up IP"}
        </ActionButton>
        {lookup && (
          <ActionButton
            variant="ghost"
            onClick={() => {
              setLookup(null);
              setLookupError("");
            }}
          >
            Show my connection
          </ActionButton>
        )}
        <p className={styles.muted}>
          Custom IPs are sent to ipapi.co through our endpoint. Its free service has usage
          limits. Device and WebRTC results always describe your browser.
        </p>
      </form>
      {lookupError && (
        <p className={styles.error} role="alert">
          {lookupError}
        </p>
      )}
      {(loading || lookupLoading) && (
        <div className={styles.loading} role="status">
          Loading network information…
          <div className={styles.skeleton} />
        </div>
      )}
      <p className={styles.muted}>
        {lookup
          ? `Showing custom IP: ${lookup.ip} · source: ipapi.co`
          : `Showing your connection · source: ${visitor?.source ?? "loading"}`}
      </p>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>
            <Network size={18} /> Network info
          </h2>
          <Facts
            items={[
              ["IP address", info?.ip],
              ["ASN", info?.asn],
              ["ISP / organization", info?.asOrganization],
              ["HTTP protocol", info?.httpProtocol],
              ["TLS version", info?.tlsVersion],
            ]}
          />
          {lookup && (
            <p className={styles.muted}>
              HTTP and TLS cannot be inferred for another IP address.
            </p>
          )}
        </section>
        <section className={styles.card}>
          <h2>
            <MapPin size={18} /> Geolocation
          </h2>
          <Facts
            items={[
              ["Country", info?.country],
              ["City", info?.city],
              ["Region", info?.region],
              ["Postal code", info?.postalCode],
              ["Latitude", info?.latitude],
              ["Longitude", info?.longitude],
              ["Timezone", info?.timezone],
            ]}
          />
          <p className={styles.muted}>
            Approximate network location, not GPS or a street address.
          </p>
        </section>
        <section className={styles.card}>
          <h2>
            <Monitor size={18} /> Device & browser
          </h2>
          <Facts
            items={[
              ["Browser (estimated)", device?.browser],
              ["Operating system (estimated)", device?.operatingSystem],
              ["Screen resolution", device?.screenResolution],
              ["Color depth", device && `${device.colorDepth} bit`],
              ["Pixel ratio", device?.pixelRatio],
              ["CPU logical cores", device?.cpuCores],
              [
                "Estimated RAM",
                device?.estimatedRamGB ? `${device.estimatedRamGB} GB` : null,
              ],
              ["Connection type", device?.connectionType],
              ["Effective connection", device?.effectiveConnection],
              [
                "Estimated downlink",
                device?.downlinkMbps != null ? `${device.downlinkMbps} Mbps` : null,
              ],
              ["Language", device?.language],
              ["Cookies enabled", device?.cookiesEnabled],
              ["Do Not Track", device?.doNotTrack],
            ]}
          />
          <details className={styles.details}>
            <summary>Full User-Agent</summary>
            <p>{device?.userAgent ?? "Loading…"}</p>
          </details>
          <p className={styles.muted}>
            Browser-reported values may be reduced or unavailable for privacy. No
            fingerprint is stored or uploaded.
          </p>
        </section>
        <section className={styles.card}>
          <h2>
            <ShieldCheck size={18} /> Security & WebRTC
          </h2>
          <Facts
            items={[
              ["Secure context", device?.secureContext],
              ["WebRTC check", rtcLoading ? "Checking…" : (rtc?.status ?? "Not run")],
            ]}
          />
          <p className={styles.muted}>
            Run a connection-only test using Google’s public STUN server. This shares your
            network IP with that server and does not request camera or microphone access.
          </p>
          <ActionButton
            variant="secondary"
            disabled={rtcLoading}
            onClick={() => void runRtc()}
          >
            {rtcLoading ? "Inspecting…" : "Run WebRTC check"}
          </ActionButton>
          {rtcError && (
            <p className={styles.error} role="alert">
              {rtcError}
            </p>
          )}
          {rtc && (
            <div role="status">
              {rtc.addresses.length > 0 ? (
                <ul className={styles.candidates}>
                  {rtc.addresses.map((entry) => (
                    <li key={entry.address}>
                      <code>{entry.address}</code>
                      <span>
                        {entry.kind} · {entry.candidateType}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>
                  {rtc.status === "unsupported"
                    ? "WebRTC is unsupported in this browser."
                    : "No IP candidates exposed. Browser protections or network restrictions may hide them."}
                </p>
              )}
              {rtc.status === "timed-out" && (
                <p className={styles.muted}>
                  The check timed out. Results may be incomplete.
                </p>
              )}
              {Boolean(differentPublic?.length) && (
                <p className={styles.warning}>
                  A different public IP was observed. This may be an alternate network
                  route or VPN bypass; IPv4/IPv6 differences can also explain it.
                </p>
              )}
            </div>
          )}
          <p className={styles.muted}>
            Local IPs and mDNS names do not prove a VPN leak. This test cannot confirm VPN
            safety or discover an IP your browser does not expose.
          </p>
        </section>
      </div>
    </div>
  );
}
