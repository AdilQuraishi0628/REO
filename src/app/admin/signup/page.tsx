import type { Metadata } from "next";
import AuthForm from "@/components/auth-form";
import AuthShell from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Create Restaurant Workspace | TableTap Raipur",
  description: "Set up smart table QR ordering, digital menus, and loyalty for your venue in Raipur.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function SignupPage() {
  return (
    <AuthShell>
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
