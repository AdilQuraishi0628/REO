import AuthForm from "@/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const initialNotice =
    error === "reset"
      ? "That reset link expired or could not be verified. Request a fresh link to continue."
      : error === "verification"
        ? "We couldn't verify that email link. Request another verification email or try signing in."
        : "";
  return <AuthForm initialNotice={initialNotice} mode="login" />;
}
