"use client";
import { useState } from "react";
import { Flag, Plus } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { ActionButton } from "@/components/ui/action-button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Session, Marker } from "../lib/model";
import { type CandidateRules } from "../lib/correlation";
import styles from "../styles.module.css";
export type TimelineProps = {
  session: Session;
  activeMarker: string;
  onMarker: (id: string) => void;
  before: number;
  after: number;
  onWindow: (before: number, after: number) => void;
  rules: CandidateRules;
  onRules: (rules: CandidateRules) => void;
  onAdd: (description: string, offset: number) => void;
  onAttach: (ids: string[]) => void;
};
export function Timeline({
  session,
  activeMarker,
  onMarker,
  before,
  after,
  onWindow,
  rules,
  onRules,
  onAdd,
  onAttach,
}: TimelineProps) {
  const [description, setDescription] = useState("");
  const [offset, setOffset] = useState("0");
  const current = session.markers.find((m) => m.id === activeMarker);
  return (
    <section className={styles.panel} aria-label="Event timeline">
      <div className={styles.blockHeading}>
        <h2>
          <Flag size={16} /> Event timeline
        </h2>
        <span className={styles.badge}>Candidates to review · Not root cause</span>
      </div>
      <div className={styles.timelineControls}>
        <div>
          <label>Bug marker</label>
          <SearchableSelect
            ariaLabel="Bug marker"
            value={activeMarker}
            onChange={onMarker}
            options={[
              { value: "", label: "All session requests" },
              ...session.markers.map((m) => ({
                value: m.id,
                label: `${m.at.slice(11, 23)} · ${m.description}`,
                group: m.source,
              })),
            ]}
          />
        </div>
        <label>
          Seconds before
          <input
            type="number"
            min={0}
            max={900}
            value={before}
            onChange={(e) =>
              onWindow(Math.max(0, Math.min(900, Number(e.target.value))), after)
            }
          />
        </label>
        <label>
          Seconds after
          <input
            type="number"
            min={0}
            max={900}
            value={after}
            onChange={(e) =>
              onWindow(before, Math.max(0, Math.min(900, Number(e.target.value))))
            }
          />
        </label>
        <label>
          Slow threshold (ms)
          <input
            type="number"
            min={1}
            max={600000}
            value={rules.slowMs}
            onChange={(e) =>
              onRules({
                ...rules,
                slowMs: Math.max(1, Math.min(600000, Number(e.target.value))),
              })
            }
          />
        </label>
      </div>
      {current && (
        <div className={styles.markerSummary}>
          <time>{current.at}</time>
          <span>{current.description}</span>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={session.report.markerIds.includes(current.id)}
              onChange={(e) =>
                onAttach(
                  e.target.checked
                    ? [...session.report.markerIds, current.id]
                    : session.report.markerIds.filter((id) => id !== current.id)
                )
              }
            />
            Include marker in report
          </label>
        </div>
      )}
      <Accordion
        variant="inline"
        title="Business error rule (opt-in, HTTP 200 JSON only)"
      >
        <div className={styles.timelineControls}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={rules.businessEnabled}
              onChange={(e) => onRules({ ...rules, businessEnabled: e.target.checked })}
            />
            Enable equality rule
          </label>
          <label>
            JSON field path
            <input
              value={rules.businessPath}
              onChange={(e) => onRules({ ...rules, businessPath: e.target.value })}
              placeholder="success"
              maxLength={100}
            />
          </label>
          <label>
            Equals JSON literal
            <input
              value={rules.businessValue}
              onChange={(e) => onRules({ ...rules, businessValue: e.target.value })}
              placeholder="false"
              maxLength={100}
            />
          </label>
        </div>
        <p className={styles.hint}>
          Exact equality only. Example: success = false, or error.code =
          "PAYMENT_DECLINED". No arbitrary expressions execute. An invalid path/value
          produces no candidate.
        </p>
      </Accordion>
      <Accordion variant="inline" title="Add a manual event marker">
        <div className={styles.timelineControls}>
          <label>
            Event description
            <input
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            Seconds from session start
            <input
              type="number"
              value={offset}
              min={0}
              max={Math.max(
                0,
                (Date.parse(session.endedAt ?? session.startedAt) -
                  Date.parse(session.startedAt)) /
                  1000
              )}
              onChange={(e) => setOffset(e.target.value)}
            />
          </label>
          <ActionButton
            onClick={() => {
              onAdd(description, Number(offset));
              setDescription("");
            }}
            disabled={!description.trim()}
          >
            <Plus size={14} />
            Add marker
          </ActionButton>
        </div>
        <p className={styles.hint}>
          Manually placed at a time within this session; it is not a captured UI action.
        </p>
      </Accordion>
      <p className={styles.hint}>
        The window uses request start timestamps. Time proximity is context, not
        causality. A 4xx response may be expected; HTTP 200 may still carry a business
        error. Mark relevant requests explicitly.
      </p>
    </section>
  );
}
export function MarkerLabel({ marker }: { marker: Marker }) {
  return (
    <span>
      {marker.description} · {marker.at}
    </span>
  );
}
