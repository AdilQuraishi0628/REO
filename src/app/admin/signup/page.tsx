import type { Metadata } from "next";
import AuthForm from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create Restaurant Workspace | TableTap Raipur",
  description: "Set up smart table QR ordering, digital menus, and loyalty for your venue in Raipur.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
