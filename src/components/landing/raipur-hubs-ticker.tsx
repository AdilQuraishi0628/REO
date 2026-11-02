import React from "react";
import { Icon } from "@/components/icons";

export function RaipurHubsTicker() {
  return (
    <div className="tt-hubs-ticker" style={{ padding: "18px 24px", background: "var(--tt-cream-dark)", borderTop: "1px solid var(--tt-border)", borderBottom: "1px solid var(--tt-border)" }}>
      <div className="tt-hubs-wrap" style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="pin" size={16} style={{ color: "var(--tt-burgundy)" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--tt-burgundy)" }}>
            Local Hospitality across Raipur
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--tt-ink-muted)", lineHeight: 1.6, flex: "1 1 540px" }}>
          Powering direct table ordering, loyalty rewards, and live kitchen displays for independent cafés and bistros across Civil Lines, Shankar Nagar, VIP Road, Telibandha Marine Drive, and Devendra Nagar.
        </p>
      </div>
    </div>
  );
}
