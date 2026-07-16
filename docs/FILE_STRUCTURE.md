# Sipadol Sewa — File Structure

**Companion to `docs/PRD.md`.** Built fresh from the final PRD. Ignores all earlier drafts.

Assumptions: npm · TypeScript · Tailwind v4 · `src/` + App Router · Vercel. Correct me if any are wrong — they affect the commands, not the shape.

---

## 1. Bootstrap

```bash
npx create-next-app@latest sipadol-sewa \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd sipadol-sewa
git init

npm install @supabase/supabase-js @supabase/ssr zod cloudinary \
  leaflet react-leaflet nepali-date-converter
npm install -D @types/leaflet supabase

npx supabase init
npx supabase link --project-ref <your-project-ref>

mkdir -p docs
# → drop PRD.md and this file into docs/ NOW, before anything else
```

**Use `AGENTS.md` as the single shared rules file**, in the repo root. You're running more than one AI coding tool on this project (Claude Code, and Cursor at least occasionally), and AGENTS.md is the cross-tool convention both can read — Cursor natively, Claude Code via an explicit import. `CLAUDE.md` — also repo root — stays a **single line**: `@AGENTS.md`. Nothing else goes in it, and you never run `/init` on it. This is deliberate, not laziness: a second file that duplicates or paraphrases the rules is exactly how drift happens — one file gets updated, the other doesn't, and an agent silently starts working from the stale one. One file, one place to edit, every tool reads the same thing.

---

## 2. Tree

```
sipadol-sewa/
│
├── AGENTS.md                          # The actual rules. Hand-written.
├── CLAUDE.md                          # One line: @AGENTS.md. Never /init.
├── README.md
├── .env.local                         # Never committed
├── .env.example                       # Committed. Keys only, no values.
├── .gitignore
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── package.json
│
├── docs/
│   ├── PRD.md                         ← Source of truth. Put it here first.
│   └── FILE_STRUCTURE.md              ← This file
│
├── public/
│   ├── logo.svg
│   ├── og-default.png                 # Social preview fallback        §10.5
│   └── favicon.ico
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql                       # 5 services, starter categories
│   └── migrations/                    # ← See §3. Order is load-bearing.
│
└── src/
    │
    ├── middleware.ts                  # Session only, never role.       §10.1
    │                                  # Guards /account, /complaints/new,
    │                                  # /complaints/my-complaints,
    │                                  # /forms/my-requests, /admin/*
    │                                  # Rejects deactivated accounts.
    │
    ├── app/
    │   ├── layout.tsx                 # Devanagari font, <html lang>     §4.1
    │   ├── globals.css
    │   ├── not-found.tsx
    │   ├── error.tsx
    │   ├── sitemap.ts                 # From DB content                 §10.6
    │   ├── robots.ts                                                    §10.6
    │   │
    │   ├── (main)/                    # Public + resident. Site chrome.
    │   │   ├── layout.tsx             # Header + footer + lang toggle
    │   │   ├── page.tsx               # Homepage                          §11
    │   │   │
    │   │   ├── about/page.tsx                                             §30
    │   │   ├── faq/page.tsx                                               §30
    │   │   ├── privacy/page.tsx       # Must match real guarantees        §30
    │   │   │
    │   │   ├── account/
    │   │   │   ├── page.tsx           # Own profile + password change     §36
    │   │   │   └── actions.ts
    │   │   │
    │   │   ├── notices/
    │   │   │   ├── page.tsx           # Published only + category filter  §15
    │   │   │   └── [id]/page.tsx      # Detail + attachment + WhatsApp    §16
    │   │   │
    │   │   ├── gallery/
    │   │   │   ├── page.tsx           # Album index by year               §17
    │   │   │   └── [year]/[slug]/
    │   │   │       └── page.tsx       # Grid + lightbox                   §18
    │   │   │
    │   │   ├── directory/page.tsx     # Map + search + category filter    §19
    │   │   │
    │   │   ├── representatives/
    │   │   │   └── page.tsx           # Officials grid, display_order     §20
    │   │   │
    │   │   ├── programs/
    │   │   │   ├── page.tsx           # List + Recently Completed         §21
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx       # Detail + register                 §22
    │   │   │       └── actions.ts     # Insert checks programme is OPEN
    │   │   │
    │   │   ├── forms/
    │   │   │   ├── page.tsx           # Hub — 5 service cards             §23
    │   │   │   ├── [service]/
    │   │   │   │   ├── page.tsx       # Fields fixed in code              §24
    │   │   │   │   └── actions.ts     # Zod validate → insert payload
    │   │   │   └── my-requests/
    │   │   │       └── page.tsx       # Own rows + note + history         §25
    │   │   │
    │   │   ├── complaints/
    │   │   │   ├── new/
    │   │   │   │   ├── page.tsx       # + the two honesty notices         §26
    │   │   │   │   └── actions.ts
    │   │   │   ├── my-complaints/
    │   │   │   │   └── page.tsx       # + days-open + history             §27
    │   │   │   └── tracker/page.tsx   # Reads the VIEW only. No photos.   §28
    │   │   │
    │   │   └── dashboard/page.tsx     # 7 fixed counters.                 §29
    │   │                              # Reads complaints, NOT the view.
    │   │
    │   ├── (auth)/                    # Centered card, no nav
    │   │   ├── layout.tsx
    │   │   ├── login/
    │   │   │   ├── page.tsx                                               §12
    │   │   │   └── actions.ts
    │   │   ├── signup/
    │   │   │   ├── page.tsx           # name + phone + email + pw         §13
    │   │   │   └── actions.ts
    │   │   └── reset-password/
    │   │       ├── page.tsx           # Request link                      §14
    │   │       ├── actions.ts
    │   │       └── update/
    │   │           ├── page.tsx       # Set new password (token-gated)
    │   │           └── actions.ts
    │   │
    │   ├── auth/
    │   │   └── confirm/route.ts       # Token exchange for BOTH signup    §10.2
    │   │                              # and reset. Route handler, not a
    │   │                              # page. Without it neither works.
    │   │
    │   ├── admin/
    │   │   ├── layout.tsx             # Role gate + redirect (UX layer)   §31
    │   │   ├── page.tsx               # Nav hub + attention counts.       §31
    │   │   │                          # Users link hidden from Secretary.
    │   │   │                          # No Dashboard link — page removed.
    │   │   ├── notices/
    │   │   │   ├── page.tsx           # CRUD + publish + categories      §32.1
    │   │   │   └── actions.ts
    │   │   ├── gallery/
    │   │   │   ├── page.tsx           # Albums + single signed upload    §32.2
    │   │   │   └── actions.ts
    │   │   ├── directory/
    │   │   │   ├── page.tsx           # CRUD. lat/lng typed, not clicked §32.3
    │   │   │   └── actions.ts
    │   │   ├── representatives/
    │   │   │   ├── page.tsx                                             §32.4
    │   │   │   └── actions.ts
    │   │   ├── programs/
    │   │   │   ├── page.tsx                                             §32.5
    │   │   │   ├── actions.ts
    │   │   │   └── [id]/registrations/
    │   │   │       └── page.tsx       # Registrant list + CSV
    │   │   ├── forms/
    │   │   │   ├── page.tsx           # All applications + status + note  §33
    │   │   │   └── actions.ts         # + edit 5 service headings
    │   │   ├── complaints/
    │   │   │   ├── page.tsx           # Status + note + publish +         §34
    │   │   │   │                      # withdraw (Admin) + overdue flag
    │   │   │   │                      # + manage categories
    │   │   │   └── actions.ts
    │   │   └── users/
    │   │       ├── page.tsx           # Admin ONLY. Role + is_active.     §35
    │   │       └── actions.ts         # No self-demote, no self-deactivate
    │   │
    │   └── api/
    │       └── media/
    │           ├── sign-upload/route.ts   # Takes a PURPOSE            §10.3
    │           └── sign-view/route.ts     # Takes a SUBMISSION ID      §10.3
    │
    ├── components/
    │   ├── ui/                        # Primitives: button, input, select,
    │   │                              # badge, dialog, table, textarea
    │   ├── layout/
    │   │   ├── site-header.tsx        # Nav + role indicator (from JWT)
    │   │   ├── site-footer.tsx
    │   │   └── language-toggle.tsx    # Writes the lang cookie             §4
    │   ├── auth/
    │   │   └── turnstile-widget.tsx   # MUST expose reset()               §12
    │   ├── media/
    │   │   ├── signed-upload.tsx      # sign-upload → direct to Cloudinary
    │   │   ├── private-file-link.tsx  # sign-view by submission id
    │   │   └── cloudinary-image.tsx   # Public delivery + transformation
    │   ├── map/
    │   │   ├── ward-map.tsx           # Leaflet — client only
    │   │   └── ward-map-loader.tsx    # dynamic(ssr:false) wrapper        §19
    │   ├── shared/
    │   │   ├── bs-date.tsx            # BS when ne, AD when en           §4.2
    │   │   ├── status-badge.tsx
    │   │   ├── status-history.tsx     # *_status_events           Decision 11
    │   │   ├── export-csv-button.tsx  # Client-side                      §10.7
    │   │   ├── category-filter.tsx
    │   │   └── empty-state.tsx
    │   └── admin/
    │       ├── admin-nav.tsx
    │       ├── bilingual-field.tsx    # NE/EN pair + copy-from-Nepali   §32.1
    │       └── data-table.tsx         # Filter + search + export
    │
    └── lib/
        ├── supabase/
        │   ├── client.ts              # Browser
        │   ├── server.ts              # Server (reads auth cookies)
        │   └── middleware.ts          # Cookie refresh — must return res
        ├── cloudinary.ts              # SERVER ONLY. purpose → preset map.
        │                              # API_SECRET never leaves this file.
        ├── constants.ts               # Statuses, upload purposes,
        │                              # directory categories, OVERDUE_DAYS=15
        ├── dates.ts                   # Asia/Kathmandu + BS conversion    §4.2
        ├── i18n.ts                    # Read cookie, pick _ne / _en         §4
        ├── roles.ts                   # Role from JWT — UI ONLY           §3.1
        ├── metadata.ts                # Open Graph builder               §10.5
        ├── csv.ts                     # Rows → CSV                       §10.7
        ├── types/
        │   └── database.ts            # Generated. Never hand-edit.
        └── schemas/
            ├── index.ts               # service_id → schema map    Decision 4
            └── services/
                ├── service-1.ts       # ⬅ Names TBC — PRD §39 item 1.
                ├── service-2.ts       #    Zod schema per service.
                ├── service-3.ts       #    Fields fixed in code, never
                ├── service-4.ts       #    admin-configurable.
                └── service-5.ts
```

---

## 3. Migrations

Order is not cosmetic. `current_role()` reads `profiles`, so it comes after it — but every policy calls `current_role()`, so it comes before them. Merging 0002–0004 to be tidy reintroduces `infinite recursion detected in policy for relation "profiles"`.

| # | File | Contents | § |
|---|---|---|---|
| 0001 | `enums.sql` | `user_role`, `complaint_status`, `form_status` | 9.2 |
| 0002 | `profiles_table.sql` | Table (`email`, `full_name`, `phone`, `role`, `is_active`) + `handle_new_user()` trigger. RLS **enabled, no policies yet** | 8.1 |
| 0003 | `auth_helpers.sql` | `current_role()` SECURITY DEFINER + custom access token hook | 3.1, 9.1 |
| 0004 | `profiles_policies.sql` | Self read/edit; Admin read-all + set role/is_active | 9.4 |
| 0005 | `shared_triggers.sql` | `touch_updated_at()`, reused by everything below | 8 |
| 0006 | `profiles_select_grant.sql` | ✅ **Applied.** `grant select` + `grant update (full_name, phone)` on `profiles` to `authenticated`. Added during Phase 0 — RLS policies filter *rows*, but Postgres `GRANT` governs whether the operation is permitted at all, and without it residents couldn't read their own row. `role`/`is_active` deliberately excluded: those are writable only through `admin_set_profile_role()` | 9.2 |
| 0007 | `notices.sql` | `notice_categories` + `notices` + `is_published` + RLS | 8.2 |
| 0008 | `gallery.sql` | `gallery_albums` (ASCII `slug`) + `gallery_photos` + RLS | 8.2 |
| 0009 | `directory.sql` | `directory_entries` + lat/lng + RLS | 8.2 |
| 0010 | `representatives.sql` | + `display_order` + `is_active` + RLS | 8.2 |
| 0011 | `programs.sql` | `programs` + derived `registration_open` + `program_registrations` + **unique (program_id, user_id)** + open-check insert policy | 8.3, 22 |
| 0012 | `services.sql` | Table + **seed 5 rows** + RLS (public read, staff update) | 8.4 |
| 0013 | `forms.sql` | `forms` (`payload jsonb`) + `form_status_events` + `form_token_seq` + RLS + **column grants** | 8.4, 9.2 |
| 0014 | `complaints.sql` | `complaint_categories` + `complaints` + `complaint_status_events` + `complaint_ticket_seq` + RLS + column grants + **`REVOKE DELETE`** | 8.5, D10 |
| 0015 | `complaints_public_view.sql` | View, **`security_invoker = off`**, `GRANT SELECT TO anon`. **No anon policy on the base table.** | 9.3 |
| 0016 | `rate_limits.sql` | `BEFORE INSERT` caps on complaints + registrations per account/hour | D8 |
| 0017 | `status_event_triggers.sql` | `AFTER UPDATE` → writes history rows automatically | D11 |

**Migrations 0001–0006 are applied and verified in production.** Everything from 0007 down is planned. Numbers are never reused or renumbered once applied — if the plan below needs to shift again, shift the plan, not the files.

---

## 4. Environment

**`.env.local`** — never committed:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=      ← server only. If it reaches the browser, rotate it.
```

**Not in your repo — these live in the Supabase dashboard:**

| Secret | Where | Why |
|---|---|---|
| Turnstile **secret** key | Auth → Settings → CAPTCHA | Supabase verifies the token, not your code. This is why there's no `lib/turnstile.ts`. |
| Resend SMTP | Auth → SMTP Settings | Supabase sends the mail. **Also raise the auth rate limit here** — configuring SMTP alone doesn't lift Supabase's own default throttle. |

**No `SUPABASE_SERVICE_ROLE_KEY`.** Deactivation uses an `is_active` column, not the Admin API. Nothing here needs the service role, and keeping it out of the codebase entirely is the point.

---

## 5. Conventions

- Routes and files: kebab-case. Components: kebab-case file, PascalCase export.
- DB: snake_case, plural tables, singular enums.
- Bilingual columns: always the `_ne` / `_en` pair.
- Migrations: `NNNN_name.sql`. Never renumber. Never edit an applied one — add a new one.
- Server Actions: `actions.ts` beside the page that calls them.
- Imports: `@/` alias throughout.

---

## 6. Phase → Files

Per PRD §38. Gates matter more than speed.

**Phase 0 — Foundation**
`0001`–`0006` · `middleware.ts` · `lib/supabase/*` · `app/layout.tsx` (font) · `lib/i18n.ts` · `lib/dates.ts` · `(auth)/*` · `auth/confirm/route.ts` · `turnstile-widget.tsx` · Resend domain + SMTP

> **Gate:** someone who has never seen the site signs up, confirms, signs in, and resets their password unaided **on their own phone**. Not on yours.

**Phase 1 — Public content**
`0007` `0008` `0010` · `(main)/layout.tsx` · homepage · notices · representatives · gallery · static pages · `sitemap`/`robots` · `metadata.ts` · `sign-upload` · `admin/layout.tsx` · `admin/page.tsx` · their admin CRUD

*Proves bilingual storage, the admin shell, signed uploads, revalidation — with zero private data at risk.*

**Phase 2 — The complaints loop**
`0014` `0015` `0016` `0017` · complaints/new · my-complaints · tracker · admin/complaints · dashboard · `sign-view` · `private-file-link` · `status-history`

*Highest value, highest scrutiny. Build it while you still have full attention.*

**Phase 3 — Programmes + Directory**
`0009` `0011` · programs · programs/[id] · directory · their admin pages · `ward-map` · `export-csv-button`

**Phase 4 — Applications**
`0012` `0013` · forms hub · forms/[service] · my-requests · admin/forms · `lib/schemas/*`

*Blocked on PRD §39 item 1 — the five services and their fields.*

---

## 7. Deliberately Absent

If any of these appear, something has drifted:

| Not built | Why |
|---|---|
| `app/admin/dashboard/` | Removed. Counters are fixed in code. §8.6 |
| `dashboard_counters` table | Same. |
| `lib/turnstile.ts` | Supabase verifies natively. Decision 8 |
| `api/cloudinary-signature/` | Split into `sign-upload` + `sign-view`. §10.3 |
| Any unsigned Cloudinary preset | Decision 7 |
| `DELETE` policy on `complaints` | Decision 10 |
| `anon` SELECT policy on `complaints` | §9.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | Not needed. §4 above |
| `app/test-connection/` | Use the Phase 0 gate instead. |