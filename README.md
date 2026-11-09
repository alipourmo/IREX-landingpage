# IREX Landing Page

Next.js 15 / React 19 landing page and Content Studio for IREX Pty Ltd.

## Stack
- Next.js 15.5.x + App Router
- React 19
- TypeScript
- GSAP + ScrollTrigger
- OGL / WebGL
- Three.js
- Turbopack (dev)
- ESLint

## Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Application form & records
The `/api/apply` route validates Turnstile, dispatches Early Adopter applications through Resend, and stores each submission as a record in `public.irex_applications` (or `.data/applications.json` in local development when Supabase is not configured).
Configure:
- `RESEND_API_KEY`
- `APPLICATION_EMAIL=irex.pty.ltd@gmail.com`
- `RESEND_FROM_EMAIL` (use a verified Resend sender for production)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Media
The scroll-scrub narrative video is served as WebM from `public/media`. Static frames remain available for previews and reduced-motion fallbacks.

## Footer
LinkedIn: https://www.linkedin.com/company/irex-pty-ltd/

## Content Studio & Application Records (`/admin`)
Open `/admin` to sign in to the IREX Design System v2 Content Studio. Editors can:
- Edit all 15 landing page sections (copy + Instrument Serif / DM Mono typography, type scale, and brand colors)
- Preview individual sections on desktop/mobile or open a full-page `/?preview=draft` preview
- Manage Early Adopter application submissions (filter, search, update status, record internal notes, export CSV, delete)

### Set up Supabase (Live Sync + Application Records + Auth)
1. Create a Supabase project and run `supabase/live-content.sql` in its SQL editor.
   This creates `irex_content_editors`, `irex_live_content`, and `irex_applications`,
   enables Realtime, and configures row-level security.
2. Create an editor user in Supabase Auth (or run `npm run setup:supabase` with
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`),
   then ensure the user UUID is listed in `public.irex_content_editors`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel / hosting
   environment variables (and optionally `SUPABASE_SERVICE_ROLE_KEY` for server-side updates).
4. Deploy the application so environment variables take effect.

### Optional Server Env Auth Fallback
If Supabase is not configured yet, `/admin` also supports server-verified login using:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH` (generate with `ADMIN_PASSWORD='...' node scripts/hash-password.mjs`)
- `ADMIN_SESSION_SECRET`
