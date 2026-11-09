import LandingPage from '@/components/LandingPage';
import LiveContentProvider from '@/components/LiveContentProvider';
import { getLiveSiteDocument } from '@/lib/content-store';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const live = await getLiveSiteDocument();

  return (
    <LiveContentProvider
      config={{
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }}
      initialDocument={live.document}
    >
      <LandingPage />
    </LiveContentProvider>
  );
}
