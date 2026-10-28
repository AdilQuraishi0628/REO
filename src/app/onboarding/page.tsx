import { redirect } from "next/navigation";
import OnboardingWizard from "@/components/onboarding-wizard";
import { getSignedInUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/admin/login");
  return <OnboardingWizard email={user.email ?? ""} />;
}
