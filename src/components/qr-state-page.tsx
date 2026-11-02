import Link from "next/link";
import { Icon } from "@/components/icons";

export type QrStateProps = {
  title: string;
  status: "unpublished" | "unknown";
  restaurant?: {
    name: string;
    slug?: string;
    contactPhone?: string | null;
    address?: string | null;
    heroImage?: string | null;
  } | null;
  tableLabel?: string | null;
  code?: string;
};

export default function QrStatePage({
  title,
  status,
  restaurant,
  tableLabel,
}: QrStateProps) {
  const isUnpublished = status === "unpublished";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAF6F0 0%, #F5EFEB 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#FFFFFF",
          borderRadius: "20px",
          boxShadow: "0 12px 36px rgba(114, 47, 55, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
          border: "1px solid #E8DCC6",
          padding: "36px 28px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* Brand / Status Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "999px",
            background: isUnpublished ? "#FFF4E5" : "#FDECEC",
            color: isUnpublished ? "#B76E00" : "#C62828",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: isUnpublished ? "#FF9800" : "#E53935",
              display: "inline-block",
            }}
          />
          {isUnpublished ? "Menu In Progress" : "QR Not Active"}
        </div>

        {/* Icon circle */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: isUnpublished ? "#FAF1E6" : "#FBF0F0",
            border: `2px solid ${isUnpublished ? "#F2DFC2" : "#F6C8C8"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isUnpublished ? "#722F37" : "#C62828",
          }}
        >
          <Icon name={isUnpublished ? "table" : "alert"} size={32} />
        </div>

        {/* Title & Body */}
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#3C322C",
              margin: "0 0 8px 0",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h1>

          {isUnpublished ? (
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "#6D5E57",
                margin: 0,
              }}
            >
              {restaurant?.name ? (
                <>
                  <strong style={{ color: "#3C322C" }}>{restaurant.name}</strong> has not published their live digital menu yet.
                </>
              ) : (
                "This venue has not published their live digital menu yet."
              )}{" "}
              Please place your order directly with your server.
            </p>
          ) : (
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "#6D5E57",
                margin: 0,
              }}
            >
              This table QR code is inactive or expired. Please ask your server for assistance or scan the updated table QR stand.
            </p>
          )}
        </div>

        {/* Table info / Restaurant Details Card */}
        {(tableLabel || restaurant?.address || restaurant?.contactPhone) && (
          <div
            style={{
              width: "100%",
              background: "#FAF7F2",
              border: "1px solid #EADBCE",
              borderRadius: "14px",
              padding: "16px",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13px",
              color: "#4A3E38",
            }}
          >
            {tableLabel && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#7A685D", fontWeight: 600 }}>Assigned Table</span>
                <span style={{ fontWeight: 700, color: "#722F37" }}>{tableLabel}</span>
              </div>
            )}
            {restaurant?.contactPhone && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#7A685D", fontWeight: 600 }}>Venue Phone</span>
                <a
                  href={`tel:${restaurant.contactPhone}`}
                  style={{ fontWeight: 700, color: "#722F37", textDecoration: "underline" }}
                >
                  {restaurant.contactPhone}
                </a>
              </div>
            )}
            {restaurant?.address && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ color: "#7A685D", fontWeight: 600 }}>Address</span>
                <span style={{ color: "#4A3E38", fontSize: "12px", lineHeight: 1.4 }}>
                  {restaurant.address}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
          {restaurant?.contactPhone && (
            <a
              href={`tel:${restaurant.contactPhone}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "12px 18px",
                borderRadius: "12px",
                background: "#722F37",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(114, 47, 55, 0.2)",
              }}
            >
              <Icon name="phone" size={16} />
              <span>Call Venue ({restaurant.contactPhone})</span>
            </a>
          )}

          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "12px 18px",
              borderRadius: "12px",
              background: "#F5EFEB",
              border: "1px solid #D9CBB8",
              color: "#4A3E38",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to TableTap Home
          </Link>

          <span style={{ fontSize: "12px", color: "#8E7D73", marginTop: "4px" }}>
            Questions? Contact{" "}
            <a href="mailto:support@tabletap.in" style={{ color: "#722F37", textDecoration: "underline" }}>
              support@tabletap.in
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
