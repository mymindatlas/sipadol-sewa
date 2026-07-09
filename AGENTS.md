<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# Sipadol Sewa — Project Context

Ward 8 civic dashboard (notices, complaints, forms, gallery, directory).
Community-built, not official municipal IT — see project plan for full spec.

## Stack
Next.js (App Router) + TypeScript + Tailwind. Supabase (Postgres/Auth/RLS).
Cloudinary (uploads). Vercel (Hobby, free). Leaflet + OpenStreetMap (never Google Maps).

## Non-negotiable rules
- All uploads go through ONE reusable upload component → Cloudinary.
  Never store binary files in Supabase — only the returned URL/reference.
- Complaint photos + Form documents use Cloudinary `type: authenticated`
  delivery with server-side signed URLs. Gallery photos stay public delivery.
- Every dynamic field is stored as an NP/EN pair (bilingual), not just
  translated UI strings.
- ALL access control is enforced via Postgres RLS policies — never in
  frontend logic alone. Hiding a button is UX, not security.
- Roles (4): Guest (no login) → Resident (own data only) → Ward Secretary
  (full CRUD on all modules, CANNOT delete Complaints, CANNOT manage users)
  → Admin (full control, incl. user management). Use separate policies
  per action (SELECT/UPDATE/DELETE) where roles diverge — not one FOR ALL.
- CRUD is per-module (Notices/Gallery/Directory/Forms/Complaints), sharing
  a design system — NOT one generic schema-driven content-type builder.

## Conventions
- Mobile-first: build at 375px width first, then add md:/lg: breakpoints.
- Migrations via Supabase CLI, tracked in git — never edit schema in the
  dashboard UI directly.

## Env vars (see .env.local, never commit actual values)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET