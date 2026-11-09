#!/usr/bin/env node
/**
 * Provision an authorized IREX dashboard user in Supabase Auth and register
 * them in `public.irex_content_editors`.
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 *
 * Optional:
 *   npm run setup:supabase
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';

if (!url || !serviceKey || !email || !password) {
  console.error(
    'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  let userId = null;
  let page = 1;

  while (!userId) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => (u.email || '').toLowerCase() === email);
    if (match) {
      userId = match.id;
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (updateError) throw updateError;
      console.log(`Updated existing Supabase Auth user: ${email} (${userId})`);
      break;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created Supabase Auth user: ${email} (${userId})`);
  }

  const { error: editorError } = await supabase
    .from('irex_content_editors')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });

  if (editorError) throw editorError;
  console.log(`Authorized ${email} in public.irex_content_editors.`);
}

main().catch((err) => {
  console.error('Supabase setup failed:', err.message || err);
  process.exit(1);
});
