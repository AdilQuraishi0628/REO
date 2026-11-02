import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TableGuestExperience from "@/components/table-guest-experience";
import { getTableGuestPageData } from "@/lib/restaurant-data";

import { generateTableToken } from "@/lib/table-token";

type TableGuestPageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ token?: string }>;
};

export async function generateMetadata({ params }: TableGuestPageProps): Promise<Metadata> {
  const { code } = await params;
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(code)) return { title: "TableTap Menu" };

  const data = await getTableGuestPageData(code);
  if (!data) return { title: "TableTap Menu" };
  const { restaurant, tableLabel } = data;

  return {
    title: `${restaurant.name} · ${tableLabel || "Table Menu"} | TableTap`,
    description:
      restaurant.tagline ||
      restaurant.description ||
      `Digital table ordering, live menu, and instant service at ${restaurant.name}, Raipur.`,
    openGraph: {
      title: `${restaurant.name} · Table Menu`,
      description: restaurant.description,
      images: restaurant.heroImage ? [{ url: restaurant.heroImage }] : undefined,
    },
  };
}

export default async function TableGuestPage({ params, searchParams }: TableGuestPageProps) {
  const { code } = await params;
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(code)) notFound();

  const data = await getTableGuestPageData(code);
  if (!data) notFound();

  const sp = searchParams ? await searchParams : {};
  const tableToken = sp.token || generateTableToken(code);

  return <TableGuestExperience {...data} tableToken={tableToken} />;
}
