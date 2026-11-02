import type { Metadata } from "next";
import Link from "next/link";
import KitchenDisplay from "@/components/kitchen-display";

export const metadata: Metadata = {
  title: "Live Kitchen KDS Demo · TableTap Raipur",
  description: "Interactive public demo of the TableTap Kitchen Display System for café chefs and staff in Raipur.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function DemoKitchenPage() {
  const demoList = [
    { id: "00000000-0000-4000-8000-000000000001", name: "Juniper & Rye (Civil Lines, Raipur)" },
    { id: "00000000-0000-4000-8000-000000000002", name: "Chai & Chutney Bistro (Shankar Nagar, Raipur)" },
    { id: "00000000-0000-4000-8000-000000000003", name: "The Royal Feast (VIP Road, Raipur)" },
  ];

  return (
    <div className="demo-kitchen-container">
      <div
        style={{
          background: "#2A1A1D",
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
          borderBottom: "1px solid #722F37",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <span>🍳 Live Kitchen KDS Demo · Live order tickets with simulated timer</span>
        <Link
          href="/admin/signup"
          style={{
            background: "#722F37",
            color: "#FFFFFF",
            padding: "3px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Deploy in Your Kitchen →
        </Link>
      </div>
      <KitchenDisplay
        initialRestaurantId={demoList[0].id}
        restaurants={demoList}
        isStaffSession={false}
      />
    </div>
  );
}
