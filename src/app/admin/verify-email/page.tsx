import AuthForm from "@/components/auth-form";
import AuthShell from "@/components/auth-shell";

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <AuthForm mode="resend-verification" />
    </AuthShell>
  );
}
