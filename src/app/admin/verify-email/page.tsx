import type { Metadata } from "next";
import AuthForm from "@/components/auth-form";
import AuthShell from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Verify Email | TableTap Raipur",
  description: "Verify your email address or request a fresh verification link for your TableTap account.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <AuthForm mode="resend-verification" />
    </AuthShell>
  );
}
