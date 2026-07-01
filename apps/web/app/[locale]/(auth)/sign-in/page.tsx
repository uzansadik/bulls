import { LoginForm } from "@/features/auth/components/login-form";

interface SignInPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  return <LoginForm redirectTo={params.redirect} />;
}
