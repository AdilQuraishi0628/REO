import AuthForm from "@/components/auth-form";
import AuthShell from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <AuthForm mode="forgot-password" />
    </AuthShell>
  );
}
