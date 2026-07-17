# Sipadol Sewa
Bilingual (Nepali/English) civic web app for Ward No. 8, Suryabinayak Municipality, Nepal. Residents read notices, apply for five ward services, file complaints, and register for civic programmes. Anyone — no account — can see every complaint's status and the ward's resolution rate.

**`docs/PRD.md` is the authoritative spec.** Every rule below has reasoning recorded there. If something here conflicts with the PRD, the PRD wins — tell me, don't guess. Read the cited § before working in that area.

The third purpose above constrains the other two: this system must be able to produce evidence against the ward. Rules that look excessive exist for that reason.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS) · Cloudinary · Resend · Cloudflare Turnstile · Leaflet + OpenStreetMap

## Commands

```bash
npm run dev
npm run build      # must pass before any task is "done"
npm run lint

npx supabase migration new <name>
npx supabase db push
npx supabase db reset                                    # local only, destroys data
npx supabase gen types typescript --linked > src/lib/types/database.ts
```

## Map

| Path | Contains |
|---|---|
| `docs/PRD.md` | The spec. 40 sections. Cited throughout this file. |
| `src/app/(main)/` | Public + resident pages. Site header/footer. |
| `src/app/(auth)/` | Login, signup, reset. Minimal layout. |
| `src/app/auth/confirm/route.ts` | Emailed-link token exchange. **Route handler, not a page.** |
| `src/app/admin/` | Staff pages. `layout.tsx` is the role gate. |
| `src/app/api/media/` | `sign-upload` and `sign-view`. Two different jobs. |
| `src/lib/` | Shared code. Supabase clients, Zod schemas, constants, date/i18n helpers. |
| `supabase/migrations/` | Numbered SQL. Never renumber. Never edit an applied migration — add a new one. |

Server Actions live in `actions.ts` beside the page that calls them.

## Rules

### Enforcement lives in the database

- Every restriction needs an RLS policy. Hiding a button is UX, never enforcement. §3
- RLS role checks call `current_role()`. **Never** read role from the JWT inside a policy — a demoted staff member would keep access for up to an hour. §3.1
- Read role from the JWT for UI and redirects only. That's what it's for.
- `profiles` policies must be created *after* `current_role()` exists, or Postgres recurses infinitely. This is why migrations 0002/0003/0004 are split — don't merge them. §9.1

### Complaints — the accountability guarantees

- **Never** write a `DELETE` policy on `complaints`, `complaint_status_events`, or `form_status_events`. For any role, including Admin. Admin *withdraws*: sets `withdrawn_at`, `withdrawn_by`, and a required `withdrawal_reason`. Decision 10
- **Never** grant `anon` SELECT on `complaints`. The public reads the `complaints_public` view and nothing else. §9.3
- `complaints_public` is `security_invoker = off`. Supabase's linter will flag this. **Expected — leave it.** Invoker mode returns zero rows to the public; "fixing" it by granting anon access to the base table exposes submitter identity and photos. §9.3
- `/dashboard` counts from `complaints`, **not** from the view. Unpublished complaints still count. That is the mechanism that stops staff review from becoming suppression. Decision 9
- Complaints default to `is_published = false`. Staff publish after review. Decision 9

### Clients write only what residents write

- Complaint insert: `category_id`, `description`, `location_text`, `photo_public_id`. Nothing else.
- `status`, `ticket_id`, `token`, `user_id`, `is_published`, all timestamps: **database-set**. Enforce with column-level grants, not trust. §9.2
- Statuses are Postgres enums, never free text — one typo silently breaks the dashboard.
- Reference numbers come from sequences. Never `max(id)+1` — it issues duplicates under concurrency.
- Programme registration insert must verify the programme is *open*, not just that the row is the user's own. §22

### Media

- **Every upload is signed.** Never create an unsigned Cloudinary preset — the preset name is visible in the client bundle. Signing (who may write) and delivery type (who may read) are independent. Decision 7
- `sign-upload` takes a **purpose** enum. The server maps purpose → folder, formats, size, delivery type. **Never sign client-supplied config.** Public purposes require a staff role. §10.3
- `sign-view` takes a **submission id**, never a file id. Read the row under RLS, sign the `public_id` stored on that row, 404 if RLS returns nothing. Accepting a file id is an IDOR. §10.3
- Form documents and complaint photos: private delivery. Gallery, representatives, banners, notice attachments: public delivery, served through a transformation (strips EXIF GPS, protects quota). §10.3
- `CLOUDINARY_API_SECRET` never leaves `src/lib/cloudinary.ts`.

### Bilingual and dates

- Language lives in a **cookie** (`lang`, default `ne`). Never localStorage — the server can't read it, so every page would arrive wrong then visibly switch. §4
- Content tables store `_ne` + `_en` column pairs. Staff author both. No runtime translation, ever. §4
- Render Bikram Sambat when `lang=ne`, Gregorian when `lang=en`. Always `Asia/Kathmandu` (UTC+05:45 — the 45 minutes flips the *day* for evening timestamps). §4.2
- Use the Devanagari-capable font from `layout.tsx`. Default fonts render Nepali as empty boxes. §4.1

### Gotchas that will cost you an afternoon

- Turnstile tokens are single-use. **Reset the widget in every error path** or the retry fails with a captcha error instead of a password error. §12
- Surface Supabase's "Email not confirmed" as itself. Genericising it locks real residents out with no explanation. §12
- Leaflet touches `window` at import. Use `dynamic(..., { ssr: false })` or the build hard-fails. §19
- Call `revalidatePath()` after every admin mutation that changes public content, or staff publish a notice and see the old list. §10.4
- Supabase middleware must return the response object it mutated, or session refresh silently no-ops.
- Enable PDF delivery in Cloudinary settings — it's off by default on new accounts and form uploads are mostly PDFs. Decision 14

## Workflow

- Build in **PRD §38 phase order**. Don't start a phase until the previous one's gate passes.
- Phase 0's gate: a resident who has never seen the site can sign up, confirm, sign in, and reset their password unaided **on their own phone**. Not on my laptop.
- **Ask me before**: adding a dependency, adding a table, changing an RLS policy, or deviating from the PRD.
- **Ask me for real credentials** when you need them. Never invent placeholder keys and carry on.
- Verify with `npm run build` and `npm run lint` before calling anything done.
- The five ward services are not yet named (PRD §39). Use the placeholder ids in `src/lib/schemas/services/` and ask before inventing fields.

## Conventions

Build mobile-first: design at 375px first, then layer md: / lg:. 
Most residents will use this on a phone, not a laptop.

### Primary key types
Public content tables (notices, gallery, directory, representatives, 
programs, services) use bigint — readable URLs, nothing to protect.

Private-data tables (complaints, forms, program_registrations, and their 
*_status_events) use uuid default gen_random_uuid(). Residents never see 
these IDs — they see ticket_id/token — so there's no UX cost, and a 
guessed ID isn't enough on its own. RLS is still the enforcement; this 
is a second lock, not a replacement.
