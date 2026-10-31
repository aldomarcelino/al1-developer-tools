import type { RegexMatch } from "../lib/regex";
export function RegexMatchList({ matches }: { matches: RegexMatch[] }) {
  return (
    <div className="regex-matches-grid">
      {matches.map((match, idx) => (
        <div key={idx} className="regex-card-item">
          <div className="regex-card-top">
            <span style={{ fontWeight: 700, color: "var(--text)" }}>
              Match #{idx + 1}
            </span>
            <span>
              Index {match.index}..{match.index + match.length} ({match.length} chars)
            </span>
          </div>

          <div>
            <span className="regex-card-match-val">{match.text}</span>
          </div>

          {match.groups.length > 0 && (
            <div className="regex-groups-flow">
              {match.groups.map((grp, gIdx) => (
                <div key={gIdx} className="regex-group-row">
                  <span className="regex-group-tag">
                    {grp.name ? `${grp.name}:` : `Group $${grp.index}:`}
                  </span>
                  <span className="regex-group-content">{grp.value || "(empty)"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
