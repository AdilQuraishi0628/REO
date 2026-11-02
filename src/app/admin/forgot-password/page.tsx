import type { Metadata } from "next";
import AuthForm from "@/components/auth-form";
import AuthShell from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Reset Password | TableTap Raipur",
  description: "Request a secure password reset link for your TableTap restaurant owner account.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <AuthForm mode="forgot-password" />
    </AuthShell>
  );
}
