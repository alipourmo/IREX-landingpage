import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { getAdminAuthCapabilities, getVerifiedAdminFromRequest } from '@/lib/admin-auth';
import { getLiveSiteDocument } from '@/lib/content-store';
import initialContent from '@/lib/landing-content.json';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IREX Content Studio',
  description: 'Manage IREX website content, typography, and early adopter application records.',
};

export default async function AdminPage() {
  const [admin, capabilities, live] = await Promise.all([
    getVerifiedAdminFromRequest(),
    Promise.resolve(getAdminAuthCapabilities()),
    getLiveSiteDocument(),
  ]);

  return (
    <AdminDashboard
      initialContent={initialContent}
      initialLiveDocument={live.source === 'default' ? undefined : live}
      initialUser={admin ? { email: admin.email, id: admin.userId, mode: admin.mode } : null}
      authCapabilities={capabilities}
      liveConfig={{
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }}
    />
  );
}
