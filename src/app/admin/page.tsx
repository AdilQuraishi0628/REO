import { redirect } from "next/navigation";
import Link from "next/link";
import AdminDashboard from "@/components/admin-dashboard";
import { getAdminContext } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const context = await getAdminContext();
  if (!context) {
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
        <p>Ask an administrator to connect your account to a restaurant.</p>
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
