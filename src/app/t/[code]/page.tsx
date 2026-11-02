import type { Metadata } from "next";
import TableGuestExperience from "@/components/table-guest-experience";
import QrStatePage from "@/components/qr-state-page";
import { resolveTableGuestData } from "@/lib/restaurant-data";
import { generateTableToken } from "@/lib/table-token";

type TableGuestPageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ token?: string }>;
};

export async function generateMetadata({ params }: TableGuestPageProps): Promise<Metadata> {
  const { code } = await params;
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(code)) return { title: "TableTap Menu" };

  const result = await resolveTableGuestData(code);
  if (result.status === "active") {
    const { restaurant, tableLabel } = result.data;
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
  if (result.status === "unpublished") {
    return {
      title: `${result.restaurant.name} · Menu Coming Soon | TableTap`,
      description: "This menu isn't live yet.",
    };
  }
  return { title: "TableTap · QR Code Not Active" };
}

export default async function TableGuestPage({ params, searchParams }: TableGuestPageProps) {
  const { code } = await params;
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(code)) {
    return <QrStatePage title="This QR code isn't active" status="unknown" code={code} />;
  }

  const result = await resolveTableGuestData(code);

  if (result.status === "unpublished") {
    return (
      <QrStatePage
        title="This menu isn't live yet"
        status="unpublished"
        restaurant={result.restaurant}
        tableLabel={result.tableLabel}
        code={code}
      />
    );
  }

  if (result.status === "unknown") {
    return <QrStatePage title="This QR code isn't active" status="unknown" code={code} />;
  }

  const sp = searchParams ? await searchParams : {};
  const tableToken = sp.token || result.tableToken || generateTableToken(code);

  return <TableGuestExperience {...result.data} tableToken={tableToken} />;
}
