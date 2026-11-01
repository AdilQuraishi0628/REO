import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TableGuestExperience from "@/components/table-guest-experience";
import { getGuestPageData } from "@/lib/restaurant-data";

type GuestPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string | string[] }>;
};

export async function generateMetadata({ params }: GuestPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getGuestPageData(slug);
  if (!data) return { title: "TableTap Menu" };
  const { restaurant } = data;

  return {
    title: `${restaurant.name} | Dine-in Menu · TableTap`,
    description:
      restaurant.tagline ||
      restaurant.description ||
      `Explore digital menus, artisan dishes, and hospitality at ${restaurant.name}, Raipur.`,
    openGraph: {
      title: `${restaurant.name} · Digital Dining Menu`,
      description: restaurant.description,
      images: restaurant.heroImage ? [{ url: restaurant.heroImage }] : undefined,
    },
  };
}

export default async function RestaurantPage({ params, searchParams }: GuestPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const data = await getGuestPageData(slug);

  if (!data) {
    notFound();
  }

  const rawTableLabel = Array.isArray(query.table) ? query.table[0] : query.table;
  const tableLabel = rawTableLabel?.trim().slice(0, 80) || "Dine-in";
  return <TableGuestExperience {...data} tableLabel={tableLabel} />;
}
