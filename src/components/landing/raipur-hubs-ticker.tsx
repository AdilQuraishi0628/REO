import React from "react";
import { Icon } from "@/components/icons";

const RAIPUR_HUBS = [
  "Civil Lines",
  "Shankar Nagar",
  "Telibandha (Marine Drive)",
  "VIP Road",
  "Devendra Nagar",
  "Pandri",
  "Samta Colony",
];

export function RaipurHubsTicker() {
  return (
    <div className="tt-hubs-ticker">
      <div className="tt-hubs-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Icon name="pin" size={14} style={{ color: "var(--tt-brass)" }} />
          <span className="tt-hubs-label">Dining neighborhoods in Raipur:</span>
        </div>
        <div className="tt-hubs-list">
          {RAIPUR_HUBS.map((hub) => (
            <span className="tt-hub-pill" key={hub}>
              {hub}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
