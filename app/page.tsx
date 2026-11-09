import LandingPage from '@/components/LandingPage';
import LiveContentProvider from '@/components/LiveContentProvider';

export default function Page() {
  return <LiveContentProvider config={{ url: process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }}><LandingPage /></LiveContentProvider>;
}
