import type { Metadata } from "next";
import AuthForm from "@/components/auth-form";
import AuthShell from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Sign In · Restaurant Owner & Kitchen Staff | TableTap",
  description: "Sign in to manage your digital restaurant or access the live Kitchen Display System in Raipur.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; tab?: string; notice?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error, tab, notice } = await searchParams;
  let initialNotice = "";

  if (notice === "staff-only") {
    initialNotice = "Admin management is reserved for restaurant owners. Kitchen staff please sign in with your Staff PIN below.";
  } else if (notice === "kitchen-login-required") {
    initialNotice = "Sign in with your Staff PIN or Owner account to access Kitchen KDS.";
  } else if (error === "reset") {
    initialNotice = "That reset link expired or could not be verified. Request a fresh link to continue.";
  } else if (error === "verification") {
    initialNotice = "We couldn't verify that email link. Request another verification email or try signing in.";
  } else if (error === "auth") {
    initialNotice =
      tab === "kitchen"
        ? "Please sign in with your Staff PIN or Owner account to view the Kitchen Display System."
        : "Please sign in to continue to your restaurant dashboard.";
  }

  const initialTab = tab === "kitchen" ? "kitchen" : "owner";

  return (
    <AuthShell>
      <AuthForm
        initialNotice={initialNotice}
        initialTab={initialTab}
        mode="login"
      />
    </AuthShell>
  );
}
