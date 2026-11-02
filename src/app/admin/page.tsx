import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminDashboard from "@/components/admin-dashboard";
import { getAdminContext, getStaffSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restaurant Management Dashboard | TableTap Raipur",
  description: "Configure menus, customize branding colors, generate table QR codes, and manage Raipur restaurant operations.",
};

export default async function AdminPage() {
  const context = await getAdminContext();

  if (!context) {
    // If signed in as staff, redirect to kitchen
    const staffSession = await getStaffSession();
    if (staffSession) {
      redirect("/kitchen?notice=staff-only");
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const demoList = [
        { id: "00000000-0000-4000-8000-000000000001", slug: "juniper-and-rye", name: "Juniper & Rye (Civil Lines, Raipur)" },
        { id: "00000000-0000-4000-8000-000000000002", slug: "chai-and-chutney", name: "Chai & Chutney Bistro (Shankar Nagar, Raipur)" },
        { id: "00000000-0000-4000-8000-000000000003", slug: "the-royal-feast", name: "The Royal Feast (VIP Road, Raipur)" },
        { id: "00000000-0000-4000-8000-000000000099", slug: "brand-new-cafe", name: "Brand New Cafe (Zero Tables Demo)" },
      ];
      return <AdminDashboard restaurants={demoList} userEmail="owner@tabletap.in (Raipur Admin Demo)" />;
    }
    redirect("/admin/login");
  }

  if (!context.restaurantIds.length) {
    redirect("/onboarding");
  }

  const { data, error } = await context.serviceClient
    .from("restaurants")
    .select("id, slug, name")
    .in("id", context.restaurantIds)
    .order("name");
  if (error) {
    throw new Error(`Could not load admin restaurants: ${error.message}`);
  }

  if (!data?.length) {
    return (
      <main className="admin-empty">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">T</span>
          <span className="brand-name">TableTap</span>
        </Link>
        <h1>No restaurant access yet</h1>
        <p>Ask an administrator to connect your account to a restaurant or create a new restaurant workspace.</p>
        <Link className="saas-btn-primary" href="/onboarding?new=true">
          Create Restaurant
        </Link>
      </main>
    );
  }

  return (
    <AdminDashboard
      restaurants={data}
      userEmail={context.user.email ?? ""}
    />
  );
}
