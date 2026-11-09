import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard';
import initialContent from '@/lib/landing-content.json';

export const metadata: Metadata = {
  title: 'IREX Content Studio',
  description: 'Edit the words behind the IREX website.',
};

export default function AdminPage() {
  return <AdminDashboard initialContent={initialContent} liveConfig={{ url: process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }} />;
}