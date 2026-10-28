import { notFound } from "next/navigation";
import GuestExperience from "@/components/guest-experience";
import { getGuestPageData } from "@/lib/restaurant-data";

type GuestPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string | string[] }>;
};

export default async function RestaurantPage({ params, searchParams }: GuestPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const data = await getGuestPageData(slug);

  if (!data) {
    notFound();
  }

  const rawTableLabel = Array.isArray(query.table) ? query.table[0] : query.table;
  const tableLabel = rawTableLabel?.trim().slice(0, 80) || null;
  return <GuestExperience {...data} tableLabel={tableLabel} />;
}
