import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OnboardingWizard from "@/components/onboarding-wizard";
import { getSignedInUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Setup Your Restaurant · TableTap Raipur",
  description: "Create your restaurant digital menu, configure tables, generate QR codes, and start taking orders.",
};

export default async function OnboardingPage() {
  const user = await getSignedInUser();
  if (!user && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect("/admin/login");
  }
  return <OnboardingWizard email={user?.email ?? "owner@tabletap.in"} />;
}
