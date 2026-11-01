import React from "react";
import { notFound } from "next/navigation";
import { Icon, ICON_REGISTRY, ICON_ALIASES, type RegistryIconName } from "@/components/icons";

// Excluded from production builds
export const dynamic = "force-dynamic";

// Active in use list matching the audit script
const ACTIVE_USED_ICONS = new Set<string>([
  "add",
  "alert",
  "arrow-right",
  "back",
  "bag",
  "bakery",
  "bell",
  "bell-service",
  "bill",
  "bowls",
  "bulb",
  "cakes",
  "chat",
  "check",
  "check-circle",
  "chevron-down",
  "chevron-up",
  "clock",
  "close",
  "coffee",
  "cold",
  "copy",
  "delete",
  "edit",
  "filter",
  "flourish",
  "leaf",
  "light-bites",
  "loyalty",
  "monogram-t",
  "order",
  "plates",
  "remove",
  "search",
  "settings",
  "sparkle",
  "staff",
  "star",
  "table",
  "tag",
  "tea",
  "veg",
  "wifi",
]);

export default function DevIconGalleryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const allIconKeys = Object.keys(ICON_REGISTRY).sort() as RegistryIconName[];
  const aliasEntries = Object.entries(ICON_ALIASES);

  return (
    <div
      style={{
        backgroundColor: "#F7F1E9",
        minHeight: "100vh",
        padding: "40px 24px 80px",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        color: "#6B5E54",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <header style={{ marginBottom: 40, borderBottom: "1px solid #D9CBB8", paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 700,
                color: "#722F37",
                background: "#E8DCC6",
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              Dev Tooling · Internal Only
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 34,
              fontWeight: 600,
              color: "#722F37",
              margin: "0 0 8px",
            }}
          >
            TableTap Fine-Line Icon Registry
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: "#6B5E54", maxWidth: 650 }}>
            Unified 24×24 grid, 1.4px stroke, rounded joints, inheriting <code>currentColor</code>.
            Single source of truth in <code>src/components/icons/registry.tsx</code>.
          </p>

          <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
            <div>
              <strong style={{ fontSize: 20, color: "#722F37", display: "block" }}>
                {allIconKeys.length}
              </strong>
              <span style={{ fontSize: 12, color: "#8C7B70" }}>Total Registered</span>
            </div>
            <div>
              <strong style={{ fontSize: 20, color: "#4A7C59", display: "block" }}>
                {allIconKeys.filter((k) => ACTIVE_USED_ICONS.has(k)).length}
              </strong>
              <span style={{ fontSize: 12, color: "#8C7B70" }}>In Active Use</span>
            </div>
            <div>
              <strong style={{ fontSize: 20, color: "#B7A89A", display: "block" }}>
                {allIconKeys.filter((k) => !ACTIVE_USED_ICONS.has(k)).length}
              </strong>
              <span style={{ fontSize: 12, color: "#8C7B70" }}>Future Preserved</span>
            </div>
            <div>
              <strong style={{ fontSize: 20, color: "#722F37", display: "block" }}>
                {aliasEntries.length}
              </strong>
              <span style={{ fontSize: 12, color: "#8C7B70" }}>Semantic Aliases</span>
            </div>
          </div>
        </header>

        {/* State Preview Demo */}
        <section
          style={{
            background: "#E8DCC6",
            borderRadius: 16,
            padding: "20px 24px",
            border: "1px solid #D9CBB8",
            marginBottom: 36,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#722F37",
              margin: "0 0 16px",
              fontWeight: 700,
            }}
          >
            State &amp; Token Preview Matrix (24px)
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {/* 1. Default */}
            <div
              style={{
                background: "#F7F1E9",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: "1px solid #D9CBB8",
              }}
            >
              <div style={{ color: "#6B5E54" }}>
                <Icon name="coffee" size={24} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "#6B5E54" }}>Default</strong>
                <span style={{ fontSize: 11, color: "#8C7B70" }}>#6B5E54 (Muted)</span>
              </div>
            </div>

            {/* 2. Active on soft Mocha backing */}
            <div
              style={{
                background: "#F7F1E9",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: "1px solid #D9CBB8",
              }}
            >
              <div
                style={{
                  background: "#E8DCC6",
                  color: "#722F37",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="coffee" size={24} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "#722F37" }}>
                  Active State
                </strong>
                <span style={{ fontSize: 11, color: "#8C7B70" }}>#722F37 on #E8DCC6</span>
              </div>
            </div>

            {/* 3. Inactive / Decorative */}
            <div
              style={{
                background: "#F7F1E9",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: "1px solid #D9CBB8",
              }}
            >
              <div style={{ color: "#B7A89A" }}>
                <Icon name="coffee" size={24} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "#B7A89A" }}>
                  Inactive / Soft
                </strong>
                <span style={{ fontSize: 11, color: "#8C7B70" }}>#B7A89A (Cosmic Latte)</span>
              </div>
            </div>

            {/* 4. On Burgundy Button */}
            <div
              style={{
                background: "#722F37",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ color: "#F7F1E9" }}>
                <Icon name="coffee" size={24} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "#F7F1E9" }}>
                  On Primary Button
                </strong>
                <span style={{ fontSize: 11, color: "#E8DCC6" }}>#F7F1E9 on #722F37</span>
              </div>
            </div>
          </div>
        </section>

        {/* Complete Icon Grid */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                color: "#722F37",
                margin: 0,
                fontWeight: 600,
              }}
            >
              All Registered Icons ({allIconKeys.length})
            </h2>
            <span style={{ fontSize: 12, color: "#8C7B70" }}>
              Visual inspection at 24px (1.4px stroke)
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: 12,
            }}
          >
            {allIconKeys.map((iconName) => {
              const isUsed = ACTIVE_USED_ICONS.has(iconName);
              return (
                <div
                  key={iconName}
                  style={{
                    background: "#E8DCC6",
                    borderRadius: 12,
                    padding: "16px 10px 12px",
                    textAlign: "center",
                    border: "1px solid #D9CBB8",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  {/* Status Badge */}
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      fontSize: 8.5,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      padding: "2px 5px",
                      borderRadius: 4,
                      background: isUsed ? "rgba(74, 124, 89, 0.15)" : "rgba(183, 168, 154, 0.25)",
                      color: isUsed ? "#4A7C59" : "#8C7B70",
                    }}
                  >
                    {isUsed ? "USED" : "UNUSED"}
                  </span>

                  <div
                    style={{
                      color: isUsed ? "#722F37" : "#6B5E54",
                      marginBottom: 10,
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 36,
                    }}
                  >
                    <Icon name={iconName} size={24} />
                  </div>

                  <span
                    style={{
                      fontSize: 11.5,
                      fontFamily: "monospace",
                      fontWeight: 600,
                      color: "#722F37",
                      wordBreak: "break-all",
                    }}
                  >
                    {iconName}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Semantic Aliases Table */}
        <section style={{ marginTop: 48 }}>
          <h2
            style={{
              fontSize: 16,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              color: "#722F37",
              margin: "0 0 16px",
              fontWeight: 600,
            }}
          >
            Semantic Aliases ({aliasEntries.length})
          </h2>
          <div
            style={{
              background: "#E8DCC6",
              borderRadius: 14,
              border: "1px solid #D9CBB8",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    background: "rgba(217, 203, 184, 0.5)",
                    borderBottom: "1px solid #D9CBB8",
                    textAlign: "left",
                    color: "#722F37",
                  }}
                >
                  <th style={{ padding: "10px 16px" }}>Semantic Name</th>
                  <th style={{ padding: "10px 16px" }}>Resolved Registry Drawing</th>
                  <th style={{ padding: "10px 16px" }}>Preview (20px)</th>
                </tr>
              </thead>
              <tbody>
                {aliasEntries.map(([alias, target], idx) => (
                  <tr
                    key={alias}
                    style={{
                      borderBottom:
                        idx === aliasEntries.length - 1 ? "none" : "1px solid rgba(217, 203, 184, 0.4)",
                    }}
                  >
                    <td style={{ padding: "8px 16px", fontFamily: "monospace", color: "#722F37" }}>
                      &lt;Icon name=&quot;{alias}&quot; /&gt;
                    </td>
                    <td style={{ padding: "8px 16px", color: "#6B5E54" }}>
                      <code>{target}</code>
                    </td>
                    <td style={{ padding: "8px 16px", color: "#722F37" }}>
                      <Icon name={target} size={20} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
