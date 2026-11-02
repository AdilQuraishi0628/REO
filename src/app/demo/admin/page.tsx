import type { Metadata } from "next";
import Link from "next/link";
import AdminDashboard from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "Demo Owner Dashboard · TableTap Raipur",
  description: "Interactive public demo of the TableTap restaurant management dashboard for café owners in Raipur.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function DemoAdminPage() {
  const demoList = [
    { id: "00000000-0000-4000-8000-000000000001", slug: "juniper-and-rye", name: "Juniper & Rye (Civil Lines, Raipur)" },
    { id: "00000000-0000-4000-8000-000000000002", slug: "chai-and-chutney", name: "Chai & Chutney Bistro (Shankar Nagar, Raipur)" },
    { id: "00000000-0000-4000-8000-000000000003", slug: "the-royal-feast", name: "The Royal Feast (VIP Road, Raipur)" },
  ];

  return (
    <div className="demo-dashboard-container">
      <div
        style={{
          background: "#722F37",
          color: "#F7F1E9",
          padding: "10px 16px",
          textAlign: "center",
          fontSize: "13px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <span>🌟 Public Interactive Demo · Read-Only Mode · No login required</span>
        <Link
          href="/admin/signup"
          style={{
            background: "#F7F1E9",
            color: "#722F37",
            padding: "3px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Create Live Account →
        </Link>
      </div>
      <AdminDashboard
        restaurants={demoList}
        userEmail="demo-owner@tabletap.in (Public Preview)"
      />
    </div>
  );
}
