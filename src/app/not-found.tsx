import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <main
      className="system-state-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        background: "var(--tt-cream, #f7f1e9)",
        color: "var(--tt-ink, #2a1a1d)",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "var(--tt-burgundy-soft, rgba(114, 47, 55, 0.08))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          color: "var(--tt-burgundy, #722f37)",
        }}
      >
        <Icon name="monogram-t" size={28} />
      </div>
      <span
        className="eyebrow"
        style={{
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--tt-burgundy, #722f37)",
          fontWeight: 700,
          marginBottom: "8px",
        }}
      >
        404 · Table Not Found
      </span>
      <h1
        style={{
          fontFamily: "var(--tt-font-serif, serif)",
          fontSize: "clamp(26px, 4vw, 36px)",
          fontWeight: 700,
          lineHeight: 1.2,
          margin: "0 0 12px",
        }}
      >
        This table isn&apos;t here.
      </h1>
      <p
        style={{
          maxWidth: "400px",
          margin: "0 0 24px",
          color: "var(--tt-ink-muted, #666)",
          fontSize: "15px",
          lineHeight: 1.5,
        }}
      >
        The page may have moved, the QR code may have expired, or the link may be out of date.
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          className="button button-dark"
          href="/"
          style={{
            padding: "12px 24px",
            background: "var(--tt-burgundy, #722f37)",
            color: "var(--tt-cream, #f7f1e9)",
            borderRadius: "999px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          Back to TableTap Home
        </Link>
        <Link
          href="/t/demo-juniper-t1"
          style={{
            padding: "12px 24px",
            border: "1px solid var(--tt-border, #e5dacf)",
            color: "var(--tt-ink, #2a1a1d)",
            borderRadius: "999px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "14px",
            background: "#fff",
          }}
        >
          Try Demo Menu
        </Link>
      </div>
    </main>
  );
}
