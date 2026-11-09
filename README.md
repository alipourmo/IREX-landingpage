# IREX Landing Page

Next.js 15 / React 19 landing page for IREX Pty Ltd.

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

## Application form
The `/api/apply` route sends Early Adopter applications through Resend.
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

## Content Studio
Open `/admin` to edit text and its font, size, and color. The appearance
controls use the Instrument Serif and DM Mono families, type scale, and color
palette from IREX Design System v2. Without live sync, edits are local drafts.
Backups include both content and appearance, and up to eight local versions are
kept in the current browser.

### Set up live sync
1. Create a Supabase project and run `supabase/live-content.sql` in its SQL editor.
   This creates the content and editor tables, enables Realtime, and limits
   writes to explicitly authorized accounts through row-level security.
2. Create an editor in Supabase Auth. Add its user UUID to
   `public.irex_content_editors` using the SQL example at the end of the script.
   Disable public sign-ups if they are not needed.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the
   project URL and publishable/anon key in the hosting environment. Do not use
   a service-role or secret key in these variables.
4. Commit and deploy this application, and point the website domain at that
   deployment. Environment changes require a deployment to take effect.
5. Open `/admin`, choose **Connect live**, and sign in as the authorized
   editor. While connected, changes are saved automatically after a short pause.
   Visitors receive updates through Supabase Realtime without a new deployment;
   a periodic refresh also recovers from interrupted connections.

Live data is stored in Supabase, not committed to GitHub. The editor checks a
revision number before each update and stops syncing if another editor has
changed the live document. Reconnect to review the latest version. Editor
sessions remain in memory only; the database policies remain the authority for
write access. For a standalone Vite preview, the equivalent variables are
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
