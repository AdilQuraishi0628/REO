"use client";

import React from "react";

type GuestPagePreviewProps = {
  restaurantName?: string;
  restaurantCity?: string;
  restaurantAddress?: string;
  itemName?: string;
  price?: string;
  description?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  tableLabel?: string;
};

export default function GuestPagePreview({
  restaurantName,
  restaurantCity,
  restaurantAddress,
  itemName,
  price,
  description,
  wifiSsid,
  wifiPassword,
  tableLabel,
}: GuestPagePreviewProps) {
  const displayName = restaurantName?.trim() || "Your Restaurant";
  const displayLocation = restaurantCity?.trim()
    ? `${restaurantCity.trim()} · Dine-in & Takeaway`
    : restaurantAddress?.trim()
      ? `${restaurantAddress.trim()}`
      : "Raipur · Dine-in & Takeaway";

  const displayItemName = itemName?.trim() || "House Cold Brew";
  const displayPrice = price?.trim() ? `₹${price.trim()}` : "₹180";
  const displayDescription =
    description?.trim() ||
    "Signature blend brewed slow over 18 hours. Served over clear ice.";

  return (
    <div className="auth-guest-preview-wrap" aria-hidden="true">
      <div className="auth-guest-phone">
        <div className="auth-guest-phone-speaker" />
        <span className="auth-guest-badge">Guest mobile view</span>

        <h3 className="auth-guest-title">{displayName}</h3>
        <p className="auth-guest-subtitle">{displayLocation}</p>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
          <div className="auth-guest-pill">
            <span>📍 {tableLabel?.trim() || "Table 1"}</span>
          </div>

          {wifiSsid?.trim() && (
            <div className="auth-guest-pill">
              <span>📶 {wifiSsid.trim()}</span>
              {wifiPassword?.trim() && (
                <span style={{ opacity: 0.7 }}>({wifiPassword.trim()})</span>
              )}
            </div>
          )}
        </div>

        <div className="auth-guest-item-card">
          <div className="auth-guest-item-header">
            <span className="auth-guest-item-name">{displayItemName}</span>
            <span className="auth-guest-item-price">{displayPrice}</span>
          </div>
          <p className="auth-guest-item-desc">{displayDescription}</p>
        </div>

        <div
          style={{
            marginTop: "16px",
            background: "var(--auth-bur)",
            color: "#FFF",
            borderRadius: "10px",
            padding: "8px 12px",
            textAlign: "center",
            fontSize: "0.82rem",
            fontWeight: 500,
            opacity: 0.9,
          }}
        >
          View menu &amp; order
        </div>
      </div>
    </div>
  );
}
