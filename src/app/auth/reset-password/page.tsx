import AuthForm from "@/components/auth-form";
import AuthShell from "@/components/auth-shell";

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <AuthForm mode="reset-password" />
    </AuthShell>
  );
}
