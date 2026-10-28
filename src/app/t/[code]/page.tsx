import { notFound } from "next/navigation";
import GuestExperience from "@/components/guest-experience";
import { getTableGuestPageData } from "@/lib/restaurant-data";

type TableGuestPageProps = {
  params: Promise<{ code: string }>;
};

export default async function TableGuestPage({ params }: TableGuestPageProps) {
  const { code } = await params;
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(code)) notFound();

  const data = await getTableGuestPageData(code);
  if (!data) notFound();
  return <GuestExperience {...data} />;
}
