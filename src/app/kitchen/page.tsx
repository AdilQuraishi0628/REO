import type { Metadata } from "next";
import { redirect } from "next/navigation";
import KitchenDisplay from "@/components/kitchen-display";
import { getAdminContext, getStaffSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kitchen Display (KDS) | TableTap Raipur",
  description: "Real-time kitchen order tickets and live table service calls for restaurant staff in Raipur.",
};

type KitchenPageProps = {
  searchParams?: Promise<{ restaurant?: string; notice?: string }>;
};

export default async function KitchenPage({ searchParams }: KitchenPageProps) {
  const params = searchParams ? await searchParams : {};
  const requestedRestaurantId = params.restaurant;

  // 1. Check if logged in as Kitchen Staff
  const staffSession = await getStaffSession();
  if (staffSession) {
    const singleRestaurant = [
      { id: staffSession.restaurantId, name: staffSession.restaurantName },
    ];
    return (
      <KitchenDisplay
        initialRestaurantId={staffSession.restaurantId}
        restaurants={singleRestaurant}
        isStaffSession={true}
      />
    );
  }

  // 2. Check if logged in as Restaurant Owner
  const context = await getAdminContext();
  if (context && context.restaurantIds.length > 0) {
    const { data: restaurants, error } = await context.serviceClient
      .from("restaurants")
      .select("id, name")
      .in("id", context.restaurantIds)
      .order("name");

    if (!error && restaurants && restaurants.length > 0) {
      const activeId =
        requestedRestaurantId && restaurants.some((r) => r.id === requestedRestaurantId)
          ? requestedRestaurantId
          : restaurants[0].id;

      return (
        <KitchenDisplay
          initialRestaurantId={activeId}
          restaurants={restaurants}
          isStaffSession={false}
        />
      );
    }
  }

  // 3. Fallback for unconfigured / demo environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const demoList = [
      { id: "00000000-0000-4000-8000-000000000001", name: "Juniper & Rye (Civil Lines, Raipur)" },
      { id: "00000000-0000-4000-8000-000000000002", name: "Chai & Chutney Bistro (Shankar Nagar, Raipur)" },
      { id: "00000000-0000-4000-8000-000000000003", name: "The Royal Feast (VIP Road, Raipur)" },
    ];
    const initialId =
      requestedRestaurantId && demoList.some((r) => r.id === requestedRestaurantId)
        ? requestedRestaurantId
        : demoList[0].id;

    return (
      <KitchenDisplay
        initialRestaurantId={initialId}
        restaurants={demoList}
        isStaffSession={false}
      />
    );
  }

  // 4. If neither authenticated, redirect to staff login
  redirect("/admin/login?tab=kitchen&error=auth");
}
