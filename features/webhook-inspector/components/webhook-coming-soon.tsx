"use client";

import styles from "../styles.module.css";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Radio,
  RotateCcw,
  ShieldCheck,
  Webhook,
} from "lucide-react";

const samples = [
  {
    method: "POST",
    event: "order.created",
    time: "12:04:32",
    body: {
      event: "order.created",
      data: { id: "order_example", total: 2490, currency: "USD" },
    },
  },
  {
    method: "POST",
    event: "payment.received",
    time: "12:04:28",
    body: {
      event: "payment.received",
      data: { id: "payment_example", status: "completed" },
    },
  },
  {
    method: "PUT",
    event: "customer.updated",
    time: "12:03:51",
    body: {
      event: "customer.updated",
      data: { id: "customer_example", preferences: { email: false } },
    },
  },
];
const capabilities = [
  {
    icon: Radio,
    title: "Catch the unexpected.",
    text: "Temporary endpoints to collect incoming requests while you develop.",
  },
  {
    icon: Code2,
    title: "See the whole story.",
    text: "A focused view of headers, payloads, and the details that matter.",
  },
  {
    icon: RotateCcw,
    title: "Try it once more.",
    text: "Controlled replay to your endpoint, with a clear view of the response.",
  },
];
export function WebhookComingSoon() {
  const [selected, setSelected] = useState(0);
  const sample = samples[selected];
  return (
    <div className={`webhook-page page-width ${styles.scope}`}>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">All tools</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span aria-current="page">Webhook Inspector</span>
      </nav>
      <section className="webhook-intro" aria-labelledby="webhook-title">
        <div className="webhook-intro-copy">
          <span className="webhook-status">
            <span /> IN THE WORKS
          </span>
          <h1 id="webhook-title">
            Every request.
            <br />
            <span>A little clearer.</span>
          </h1>
          <p>
            A calmer workspace for debugging webhooks. Capture the request, understand the
            payload, and retrace what happened.
          </p>
          <div className="webhook-intro-actions">
            <Link href="/tools/curl-to-code" className="button primary">
              Try cURL to Code <ArrowUpRight size={17} />
            </Link>
            <a href="#workspace-preview" className="text-button">
              Explore the preview <ArrowRight size={16} />
            </a>
          </div>
          <div className="webhook-honesty">
            <ShieldCheck size={17} />
            <span>
              Coming soon. This preview uses sample data only.
              <br />
              No endpoints are active and no requests are collected.
            </span>
          </div>
        </div>
        <div className="webhook-orbit" aria-hidden="true">
          <div className="webhook-orbit-ring" />
          <div className="webhook-orbit-ring inner" />
          <span className="orbit-label incoming">REQUEST IN</span>
          <span className="orbit-label outgoing">CLARITY OUT</span>
          <div className="webhook-orbit-core">
            <Webhook size={64} strokeWidth={1.25} />
          </div>
          <span className="orbit-dot first" />
          <span className="orbit-dot second" />
        </div>
      </section>
      <section
        className="webhook-demo"
        id="workspace-preview"
        aria-labelledby="preview-title"
      >
        <div className="webhook-demo-heading">
          <div>
            <span className="webhook-eyebrow">A LOOK INSIDE</span>
            <h2 id="preview-title">Less guesswork. More context.</h2>
          </div>
          <span className="webhook-sample-badge">Interactive sample</span>
        </div>
        <div className="webhook-console">
          <div className="webhook-console-bar">
            <span>
              <Webhook size={17} /> Webhook Inspector
            </span>
            <span className="webhook-console-state">PREVIEW · OFFLINE</span>
          </div>
          <div className="webhook-console-endpoint">
            <span>EXAMPLE ENDPOINT</span>
            <code>https://hooks.example.com/capture/demo</code>
            <span>Not active</span>
          </div>
          <div className="webhook-console-body">
            <div className="webhook-request-list">
              <div className="webhook-list-label">
                SAMPLE REQUESTS <span>03</span>
              </div>
              {samples.map((request, index) => (
                <button
                  key={request.event}
                  type="button"
                  className={
                    selected === index ? "webhook-request selected" : "webhook-request"
                  }
                  onClick={() => setSelected(index)}
                  aria-pressed={selected === index}
                  aria-controls="sample-payload"
                >
                  <span className="webhook-method">{request.method}</span>
                  <span>
                    <strong>{request.event}</strong>
                    <small>{request.time} · Sample event</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
              <p className="webhook-list-hint">
                Select an event to inspect its sample payload.
              </p>
            </div>
            <div
              className="webhook-payload"
              id="sample-payload"
              role="region"
              aria-label={`Sample payload: ${sample.event}`}
              aria-live="polite"
            >
              <div className="webhook-payload-heading">
                <span>
                  Payload <small>application/json</small>
                </span>
                <span>
                  <Check size={13} /> Sample data
                </span>
              </div>
              <pre>
                <code>{JSON.stringify(sample.body, null, 2)}</code>
              </pre>
              <div className="webhook-replay-note">
                <RotateCcw size={15} />
                <span>Replay will be available when the tool launches.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="webhook-capabilities" aria-label="Planned capabilities">
        {capabilities.map(({ icon: Icon, title, text }, index) => (
          <article key={title}>
            <div>
              <Icon size={22} strokeWidth={1.5} />
              <span>0{index + 1} / PLANNED</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <div className="webhook-return">
        <p>Something useful while you wait.</p>
        <Link href="/#tools" className="text-button">
          <ArrowLeft size={16} /> Explore available tools
        </Link>
      </div>
    </div>
  );
}
