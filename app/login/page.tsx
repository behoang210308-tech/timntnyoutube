import { redirect } from 'next/navigation';

interface LoginPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

const pickValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function LoginPage({ searchParams }: LoginPageProps) {
  const returnTo = pickValue(searchParams?.returnTo);
  if (!returnTo) {
    redirect('/');
  }
  redirect(`/auth?tab=login&returnTo=${encodeURIComponent(returnTo)}`);
}
