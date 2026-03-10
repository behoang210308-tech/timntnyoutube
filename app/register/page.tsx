import { redirect } from 'next/navigation';

interface RegisterPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

const pickValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const returnTo = pickValue(searchParams?.returnTo);
  if (!returnTo) {
    redirect('/');
  }
  redirect(`/auth?tab=register&returnTo=${encodeURIComponent(returnTo)}`);
}
