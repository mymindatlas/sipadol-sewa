# Sipadol Sewa

## Product Requirements Document & System Logic Map

**Ward No. 8, Suryabinayak Municipality, Bhaktapur**
*Prepared as the authoritative pre-development reference. This document supersedes all earlier drafts.*

---

## How to Read This Document

**Part I (Sections 1–7)** describes what the system is, who may do what, and why each significant decision was made. It is written to be read by ward officials without technical background, and it is the part to bring to a ward meeting.

**Part II (Sections 8–10)** specifies the data model, the security model, and the shared infrastructure that governs every page. It is written for whoever builds and later maintains the system.

**Part III (Sections 11–34)** breaks down every page and endpoint in the system, using an identical five-part structure throughout: route and visibility, user experience, frontend behaviour, backend behaviour, and security constraints.

**Part IV (Sections 35–37)** covers operations, the build sequence, and the items still requiring a decision from the ward.

Decisions taken once and applied in many places are stated once, in Section 6, and referenced rather than re-argued on each page.

---

# PART I — FOUNDATIONS

## 1. Purpose and Scope

Sipadol Sewa is a bilingual public web service for Ward No. 8 of Suryabinayak Municipality. It exists to do three things:

1. **Move routine ward business online.** Residents currently visit the ward office in person for service applications and to learn what the ward is doing. Notices, service applications, and civic programme registration move to a channel available at any hour from a phone.

2. **Give residents a visible, tracked channel for grievances.** A complaint submitted to the ward should have an identifier, a status the resident can check themselves, and a record that survives staff turnover.

3. **Make ward performance publicly legible.** A public complaint tracker and an accountability dashboard let any resident — without an account — see what is being reported and what is being resolved.

The third purpose constrains the first two. Several decisions in this document that would otherwise be finely balanced are settled by asking: *does this preserve the ward's ability to be held to account by the people it serves?* Where that principle conflicts with convenience, this document chooses accountability, and says so explicitly at each point.

### 1.1 In Scope

Public notice board · photo gallery · ward map and business directory · representative profiles · civic programme announcements and registration · five fixed ward service application forms · complaint submission and personal tracking · public complaint tracker · public accountability dashboard · resident accounts with email verification and password recovery · a complete staff administration area · a restricted user-management area for the Ward Chairman.

### 1.2 Explicitly Out of Scope for This Build

Online payment · SMS notification · document issuance or digital signature · integration with municipal or federal registries · a mobile application · resident-to-resident features of any kind · multi-ward support.

### 1.3 Expected Scale

A single ward. Expected data volume is in the low hundreds of rows per table in the first year. Expected concurrent users are in the tens, not thousands. Several decisions in this document are correct **because** of this scale and would be wrong at municipal or national scale; each is marked with the condition under which it should be revisited.

---

## 2. Roles and Permissions

Four roles, from least to most privileged.

| Role | Who | How Assigned |
|---|---|---|
| **Guest** | Any visitor, not signed in | Default state |
| **Resident** | Any person with a verified account | Automatically, and only ever automatically, at signup |
| **Ward Secretary** | Ward office staff | Only by an Admin, through the User Management page |
| **Admin** | The Ward Chairman | Only by an existing Admin, through the User Management page |

### 2.1 What Each Role May Do

**Guest** may read all public content: the homepage, notices, the gallery, the directory, representatives, programme listings, blank service forms, the public complaint tracker, the accountability dashboard, and the static pages. A Guest may not submit anything.

**Resident** may do everything a Guest may do, plus: submit service applications, submit complaints, register for civic programmes, and view **their own** submissions and their own attached documents. A Resident may not see any other resident's submission, under any circumstance.

**Ward Secretary** may do everything a Resident may do, plus manage all public content (notices, gallery, directory, representatives, programmes), view **every** resident's service applications and complaints ward-wide, advance their status, publish or unpublish a complaint on the public tracker, and edit the heading text on service forms.

**Admin** may do everything a Ward Secretary may do, plus two things withheld from the Ward Secretary:
- **Withdraw a complaint** from the public record (see Section 2.2 — this is not deletion).
- **Manage user accounts**: assign roles and deactivate accounts.

### 2.2 The Two Carve-Outs, Stated Precisely

The distinction between Ward Secretary and Admin is deliberately narrow, and both halves of it deserve stating plainly because both are politically consequential.

**Withdrawal, not deletion.** No role in this system — including Admin — can permanently erase a complaint. The database will not permit it. What an Admin can do is mark a complaint as *withdrawn*, which removes its text from the public tracker while the record itself, its full history, the identity of the person who withdrew it, and the stated reason for withdrawal all remain permanently in the administrative record. The count of withdrawn complaints is itself published on the public dashboard.

This is a deliberate change from the earlier design, which allowed the Admin to delete complaint rows outright. The reasoning is stated in Section 6, Decision 10, and it is the single recommendation in this document that most directly concerns the Ward Chairman's own authority. It is made in the Chairman's interest as much as the ward's: a complaints register that its subject can silently erase has no evidentiary value to anyone, including a chairman who wants to demonstrate that a complaint was handled properly.

**User management.** Role assignment is the only mechanism by which anyone in this system gains power over anyone else's data. It is therefore held by one person and enforced at two independent layers.

### 2.3 Deactivation

An account may be deactivated by an Admin. A deactivated account cannot sign in, cannot submit anything, and its existing submissions remain intact and visible to staff. Deactivation is reversible. Deactivation is not deletion; no resident account or submission is ever destroyed by this system.

---

## 3. The Enforcement Model

This is the most important technical concept in the document, and it is stated once here rather than repeated on every page.

**Access control is enforced by the database, not by the website.**

Three layers exist, and only the third is authoritative:

**Layer 1 — Middleware.** Runs before any page loads. Checks one thing only: does a valid, active session exist? If a visitor without a session requests a protected page, they are sent to the login page. Middleware deliberately does **not** check role.

**Layer 2 — Page and layout checks.** The administration area checks the visitor's role and redirects those who lack it. The navigation menu hides links a visitor cannot use.

**Layer 3 — Row Level Security policies in the database.** Every read and every write against every table is evaluated by a policy attached to that table inside PostgreSQL. These policies do not know or care what the website displayed, what buttons were hidden, or what the middleware decided.

**Layers 1 and 2 are conveniences.** They make the site pleasant and fast. They can be bypassed by anyone technically inclined, because the keys the website uses are visible to anyone who inspects it in a browser. **Layer 3 cannot be bypassed**, because it runs inside the database, beneath everything else.

The practical consequence, which governs the entire build: **hiding a button is never a security measure.** Every restriction described anywhere in this document must have a corresponding database policy, or it does not exist. Where this document says "the delete control is not shown to a Ward Secretary," it always also says which policy makes the attempt fail.

### 3.1 How the System Knows a Visitor's Role

The visitor's role is recorded in the `profiles` table. It is read in two different ways for two different purposes, and the distinction matters:

- **For display and redirects** — deciding whether to show the "Admin" link in the header, or whether to redirect someone away from an admin page — the role is read from the visitor's sign-in token, where it is placed automatically at the moment the token is issued. This is instant and requires no database query, which keeps every page fast.

- **For actual enforcement** — every Row Level Security policy — the role is read **live from the `profiles` table**, never from the token.

The reason for the split is a specific and important weakness of tokens: a sign-in token is valid for one hour and its contents do not change during that hour. If an Admin demotes a Ward Secretary, that person's token still says "Ward Secretary" until it next refreshes. If enforcement trusted the token, a demoted staff member would retain staff powers for up to an hour after being removed. Because enforcement reads the database live, **a role change takes effect on the very next action.** The demoted person may briefly still see an admin menu link; clicking it will achieve nothing.

---

## 4. Bilingual Model

Every table storing text shown to residents holds **two parallel fields** — one Nepali, one English — rather than one field translated at runtime. There is no machine translation anywhere in this system. Ward staff author both.

A language toggle in the site header switches between them. **The chosen language is stored in a browser cookie, not in browser storage**, for a specific reason: pages are assembled on the server before being sent to the visitor, and the server can read a cookie but cannot read browser storage. Storing the choice in browser storage would mean every page arrives in the wrong language and then visibly switches — on every page, on every visit.

**The default language is Nepali.** A first-time visitor with no cookie sees Nepali.

Resident-authored text — a complaint description, a programme registration note — is stored in a single field, in whichever language the resident wrote it. It is not translated and not duplicated.

### 4.1 Typeface

Most default web fonts do not include Devanagari characters. Left unspecified, Nepali text renders as empty boxes on some devices and an inconsistent fallback font on others — a defect that is invisible to a developer testing in English and immediately obvious to every resident. The site therefore specifies a typeface with full Devanagari coverage (for example, Noto Sans Devanagari or Mukta) for both languages, so the two scripts sit together consistently rather than looking like two different websites stitched into one.

### 4.2 Dates

All timestamps are stored in the database in a timezone-aware format and rendered in **Nepal Standard Time (UTC+05:45)**. The 45-minute offset is not cosmetic: naive handling shows the wrong *day* for anything recorded between 18:15 and midnight local time.

**When the site is displaying Nepali, dates are rendered in Bikram Sambat.** When displaying English, dates are rendered in the Gregorian calendar. This applies everywhere a date appears: notices, programme dates, complaint timestamps, application dates. A Nepali-language civic site showing only Gregorian dates would be a localisation failure, not a minor omission.

---

## 5. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Application framework | Next.js (App Router) | Server-rendered; forms submit via Server Actions |
| Database & authentication | Supabase (PostgreSQL) | Row Level Security is the enforcement layer |
| Media storage & delivery | Cloudinary | Two delivery modes — see Section 6, Decision 7 |
| Transactional email | Resend, via custom SMTP in Supabase | Required — see Section 6, Decision 2 |
| Bot protection | Cloudflare Turnstile | On authentication forms only — see Decision 8 |
| Maps | Leaflet with OpenStreetMap tiles | Free; revisit if traffic grows materially |

---

## 6. Decisions and Rationale

Every decision below is applied throughout the document and is not re-argued on the pages it affects. Where a decision was reconsidered during technical review, the current position is stated as the only position; the reasoning explains why.

---

**Decision 1 — Complaint anonymity is described accurately, and the promise is narrow.**

The system tells residents: *"Your name will not appear on the public tracker."* It does not promise anonymity.

This is precise because it is true. The submitting resident's own account shows their complaints. Ward staff see who filed every complaint — they must, in order to follow up. Only the public tracker withholds identity. A promise of full anonymity would be a false one, and a civic system that misleads residents about who can see their grievance fails at the first hurdle.

---

**Decision 2 — Authentication email is sent through Resend, not Supabase's built-in sender.**

Supabase's default email sender is capped at **two messages per hour across the entire project** and delivers only to pre-authorised team addresses. Without a change, signup confirmation and password reset would silently fail for every real resident from day one.

Resend's free tier (3,000 per month, 100 per day) is comfortably sufficient for a single ward. Two operational requirements follow and are easy to miss:

- Resend requires a **verified sending domain** with DNS records. If the ward's domain is administered through a government registrar, **this request should be started immediately** — it is frequently the longest-lead item in the entire project.
- After configuring custom SMTP, Supabase's **own** authentication rate limit still applies at its default and must be raised separately. Configuring SMTP alone does not lift it.

---

**Decision 3 — Five fixed, purpose-built service forms; only their heading text is editable by staff.**

The ward has five known, stable services. Each genuinely needs different fields; a single universal form would be too rigid. A fully dynamic form-builder was assessed as high-risk and high-effort for a first project, and would have delivered flexibility the ward does not need for services that change every few years at most.

The chosen middle path: each service has its own form with its own fields, fixed in code. What staff can edit without a developer is the **bilingual heading and instructions** at the top of each form, held in a shared configuration table.

---

**Decision 4 — Application field values are stored in a single flexible column, not separate tables per service.**

Decision 3 settles how forms *behave*; this settles where the submitted data *lives*, which the earlier drafts left open.

All five services write to **one `forms` table**, with the applicant's answers held in a single flexible `payload` column. The shape of that payload is validated against a schema **defined in code, one per service**, before anything is written.

This preserves Decision 3 exactly — fields remain fixed and developer-defined, not admin-configurable — while keeping "My Requests" and the staff-facing applications table as single, simple queries across all five services. The considered alternatives were five separate tables (which turns every combined view into a five-way merge and multiplies the security policies by five) and one table with every possible column (thirty-plus mostly-empty columns, and a database migration every time a service changes).

---

**Decision 5 — Password recovery is in scope, using Supabase's built-in flow.**

Previously deferred, then reinstated at the project owner's request. The underlying mechanism is well-established and low-risk; building it is configuration, not construction. Residents who cannot recover an account will simply stop using the system.

---

**Decision 6 — Representatives are a full module with a homepage preview.**

Ward officials' photographs, roles, biographies, and contact details, with written consent obtained from each. Civic value is direct: residents should be able to find out who represents them and how to reach them. The build mirrors the Gallery pattern — public content, staff-managed — so the risk is low.

---

**Decision 7 — All uploads are signed. Delivery type — public or private — is a separate decision made by the server.**

Two things are commonly confused, and the earlier drafts confused them:

- **Signing an upload** controls *who is permitted to put a file into the ward's account.*
- **Delivery type** controls *who is permitted to look at a file once it is there.*

These are independent. A signed upload can produce a perfectly public image. The earlier reasoning — "gallery photos are public, so the upload need not be signed" — does not follow, and left an unauthenticated door into the ward's media account: the credentials for an unsigned upload are visible in the website's own code, and anyone who extracts them can upload files into the ward's account from outside the application until its monthly quota is exhausted.

The position adopted here:

- **Every upload is signed**, without exception. Gallery and representative photographs are uploaded by staff, who are by definition signed in — there was never a reason to leave that path open.
- **The server decides delivery type**, based on what is being uploaded, never on what the browser asks for:

| Content | Delivery | Why |
|---|---|---|
| Gallery photos, representative photos, programme banners, notice attachments | **Public** | Intended for public view; consent obtained where people are pictured |
| Service application documents, complaint photographs | **Private** | May contain personally identifying material |

Private files are viewable only through a temporary link generated at the moment of viewing, issued only to the file's owner or to ward staff.

This decision also retires an earlier one that added format, size, and folder restrictions to the unsigned upload path. Those were sound mitigations for a problem that no longer exists.

**One further point, specific and easily missed:** gallery photographs taken on phones contain GPS coordinates in their metadata. Public gallery images must be served through a resizing transformation rather than as the original file — the transformation strips metadata as a side effect, and also protects the media quota, which a full-resolution photo gallery will otherwise exhaust quickly.

---

**Decision 8 — Bot protection is applied at the account gate, not at every form.**

Cloudflare Turnstile protects **signup, login, and password reset**. It is free and unlimited.

It is **not** applied to complaint submission or programme registration, and the reasoning is worth understanding because it appears to be a weakening but is not. A check performed by the website can only ever protect the website. Anyone signed in holds a valid token and can send data straight to the database, skipping the website and any check it performs, because the database's public address and access key are necessarily present in the site's own code. A bot-check on those forms would therefore stop nobody who was determined and inconvenience everybody who was not.

What actually protects those forms is that **they require a verified account**, and creating an account requires passing Turnstile *and* confirming an email address. The gate is at the door, where it works.

Additionally, and this genuinely cannot be bypassed: **a limit inside the database itself** rejects more than a set number of complaints or registrations per account per hour. That rule lives below the website, so it applies to every path into the data.

---

**Decision 9 — Complaints are reviewed before their text appears on the public tracker; the count is published immediately regardless.**

This is the most consequential decision in the document, and it contains a genuine tension that must be understood rather than glossed over.

**The problem with publishing immediately.** As previously designed, any signed-in resident's free text appeared publicly, verbatim, on a ward-branded government website, the instant it was submitted, with no review. Three predictable consequences:

- *Defamation.* "The shop at [location] sells adulterated milk" — named, unverified, ward-published. The ward carries the reputational and legal exposure for words it never saw.
- *Self-identification.* Decision 1's careful withholding of the submitter's name is undone the moment a resident writes "I, [name] of [tole], have complained three times about…" — and residents will, because that is how a complaint letter is written here.
- *Other people's information.* Neighbours' names and addresses in a boundary dispute.

**The problem with reviewing first.** If ward staff must approve a complaint before the public sees it, ward staff can simply decline to approve the inconvenient ones. A tracker its subject can quietly filter is worth nothing. This objection is correct and cannot be waved away.

**The resolution.** The two are separated:

1. **The complaint's text** appears on the public tracker only after staff review it for personal information. Residents are told this plainly at submission and on the tracker page itself.
2. **The complaint's existence and status count on the public dashboard immediately, from the moment of submission, whether or not it has been published.**

The second point is what makes the first safe. Because the counters draw on every complaint that has not been formally withdrawn, **declining to publish a complaint's text does not remove it from the ward's public numbers.** Suppression is visible in aggregate even when the words are not. Staff can prevent a resident's phone number appearing on the internet; staff cannot make a complaint disappear from the ward's resolution rate.

3. **Withdrawal is separately counted and published.** The dashboard shows how many complaints have been withdrawn from public view. If that number begins to climb, residents can see it climbing.

The earlier tradeoff — full text detail, never photographs — is retained for published complaints, on the same reasoning as before: vague public entries would defeat the tracker's purpose, while photographs carry a materially higher risk of identifying a specific person or property.

---

**Decision 10 — No complaint is ever deleted. Withdrawal is recorded, attributed, reasoned, and counted.**

The earlier design gave the Admin — the Ward Chairman — an unrestricted delete on complaint records, and gave the Ward Secretary an edit-but-not-delete restriction enforced by splitting those two permissions apart in the database. The *mechanism* was correct. The *policy* was not.

The person holding unrestricted delete authority over the complaints register was the person most likely to be the subject of complaints, and whose performance the dashboard exists to measure. A hard delete left no row, no trace, and silently reduced the denominator of the ward's own resolution statistics.

The position adopted here:

- **The `DELETE` permission on complaints is revoked from every role, including Admin.** This is enforced in the database, not by hiding a button.
- The Admin instead **withdraws** a complaint: the record is marked withdrawn, with the withdrawing user's identity, the timestamp, and a **required written reason** stored permanently.
- A withdrawn complaint disappears from the public tracker. It remains in full in the administrative record, forever.
- The **number of withdrawn complaints is published on the public dashboard.**

The two-tier distinction the ward asked for is fully preserved — a Ward Secretary can publish, unpublish and advance status but cannot withdraw; only the Chairman can withdraw. It is simply implemented as a recorded action rather than an erasure.

---

**Decision 11 — Every status change is recorded permanently.**

Previously, a complaint or application stored only its *current* status. That means the system could not answer the questions an accountability dashboard exists to answer: how long does resolution take, is it getting faster, which categories stall, and who marked this resolved.

Every status change now writes a permanent entry recording what it changed from, what it changed to, who changed it, when, and an optional note. These entries can never be edited or deleted by anyone.

This is what converts the dashboard from a set of counters into an accountability instrument. It is also what lets the ward answer, with evidence, the question a chairman will eventually be asked in public: *"how long does this office actually take?"*

---

**Decision 12 — Staff can tell residents things.**

The earlier design had no way for the ward to communicate with a resident about their own submission. There was no "rejected" status, no "we need more information" status, no note field, and no notification of any kind. A resident whose citizenship copy was illegible would learn this only by repeatedly checking a page — or, in practice, by receiving a phone call, which is exactly the in-person friction the system exists to remove.

Three additions:

- **Statuses that reflect reality.** Applications: Submitted → In Review → Action Required → Ready → Completed, with Rejected available at any point. Complaints: Received → In Progress → Action Required → Resolved, with Closed available for those that cannot proceed.
- **A staff note** on each submission, written by staff and visible to the resident who submitted it. Not visible on the public tracker.
- **An email on status change**, sent through Resend, which is already in the stack for authentication. Nearly free, and it is the difference between a resident checking once and a resident checking twenty times.

---

**Decision 13 — Civic programmes use one shared registration form.**

A programme's *content* varies — a youth training, a health camp, a clean-up. The act of *registering interest* does not: name, phone, an optional note. One shared form therefore suffices, and no dynamic form engine is needed. This is what distinguishes the Programmes module from the Forms Hub, where the fields genuinely differ per service.

Whether registration is open is decided by **a single staff-controlled toggle**, which the system automatically treats as closed once the registration deadline passes. Earlier drafts had the programme list deriving open/closed status from dates while the admin page offered an independent toggle — two sources of truth that would eventually disagree, showing residents one answer on the list page and another on the detail page.

A resident may register for a given programme **once**. This is enforced in the database, because a headcount that can be inflated by pressing a button twenty times is not a headcount.

---

**Decision 14 — Uploads go from the browser straight to Cloudinary, not through the ward's own server.**

Applications must accept documents up to 10 MB. The hosting platform imposes a request size ceiling well below that, so a file routed through the application server would simply be rejected. The browser therefore requests permission from the server, then uploads directly to Cloudinary.

Two constraints follow that are worth recording:

- **10 MB is exactly the media account's free-tier ceiling, not comfortably under it.** The application enforces an 8 MB limit in the browser with a clear message, leaving headroom.
- **PDF delivery is disabled by default on new Cloudinary accounts.** Form attachments will overwhelmingly be PDFs. The upload will succeed and the download will fail until this is switched on. It takes thirty seconds if you know and half a day if you don't.

Accepted file types are **PDF and JPEG/PNG only**. Office documents are declined at the browser, which removes an entire category of handling problem.

---

**Decision 15 — Pagination and a paid map tile provider are deferred, with stated triggers.**

Notices, applications, complaints, and the directory fetch all rows. At a few hundred rows this is imperceptible, and adding pagination later is a query change, not a rebuild. **Revisit when any single list exceeds roughly 500 rows.**

OpenStreetMap's free tiles are acceptable at single-ward traffic. Their usage policy only bites under sustained heavy load. **Revisit if the directory page becomes materially popular.**

---

**Decision 16 — The ward's complaint register requires a backup strategy before launch.**

This system will hold the authoritative record of civic grievances in Ward 8. The free database tier includes **no automated backups** and **pauses a project after roughly a week of inactivity**.

Neither is acceptable for a public record. Before launch, the ward must either fund the paid tier (which includes daily backups) or commit to a scheduled export with a stated acceptable data-loss window. This is a budget decision, not a technical one, and it is listed in Section 37.

---

## 7. What This System Deliberately Does Not Do

Stated so that expectations are set in the room rather than discovered later:

- It does not issue documents. A resident applies here and collects at the ward office.
- It does not take payment.
- It does not send SMS. Email only.
- It does not verify that a submitted document is genuine.
- It does not guarantee anonymity (Decision 1).
- It does not publish complaint text without staff review (Decision 9), nor allow that review to hide a complaint from the ward's public numbers.
- It does not permit anyone, at any level, to erase a complaint (Decision 10).

---

# PART II — SYSTEM ARCHITECTURE

## 8. Data Model

Fifteen tables, one view, two counters. Every table has `created_at`; tables that can be edited also have `updated_at`, refreshed automatically by the database rather than by the application.

### 8.1 Accounts

**`profiles`** — one row per registered account, created automatically at signup.

| Field | Notes |
|---|---|
| `id` | Matches the authentication account |
| `email` | Copied at signup, so staff pages can identify accounts |
| `full_name`, `phone` | Collected at signup |
| `role` | One of Resident, Ward Secretary, Admin. Defaults to Resident |
| `is_active` | Defaults to true. False blocks sign-in and all writes |

The `email`, `full_name` and `phone` fields address a gap in earlier drafts: without them, the User Management page could list accounts only by an unreadable identifier, staff could not tell who filed a complaint, and residents had to retype their name and phone into every programme registration. Collecting them once at signup removes duplicate entry across two modules and makes every staff-facing page usable.

### 8.2 Public Content

**`notice_categories`** — `name_ne`, `name_en`, `display_order`. Earlier drafts offered a category filter on the notice board without defining where categories came from.

**`notices`** — `title_ne`, `title_en`, `body_ne`, `body_en`, `category_id`, `attachment_file`, `is_published`, `published_at`, `created_by`. The `is_published` field is likewise a gap being closed: earlier drafts described a list of "published notices" with no publication state anywhere in the system.

**`gallery_albums`** — `year`, `slug`, `title_ne`, `title_en`, `cover_photo`, `display_order`.

The `slug` is a plain-English identifier used in the web address, stored explicitly rather than generated from the album's title. Generating it from a Nepali title would produce either an unreadable encoded address or an empty one.

**`gallery_photos`** — `album_id`, `photo_file`, `caption_ne`, `caption_en`, `display_order`.

**`directory_entries`** — `name_ne`, `name_en`, `category`, `description_ne`, `description_en`, `phone`, `address_ne`, `address_en`, `latitude`, `longitude`.

**`representatives`** — `full_name_ne`, `full_name_en`, `role_ne`, `role_en`, `bio_ne`, `bio_en`, `phone`, `email`, `photo_file`, `display_order`, `is_active`.

### 8.3 Civic Programmes

**`programs`** — `title_ne`, `title_en`, `description_ne`, `description_en`, `banner_file`, `start_date`, `end_date`, `registration_open`, `registration_deadline`, `created_by`.

Whether registration is accepted is a single derived value: `registration_open` is true **and** the deadline has not passed. It is defined once, in the database, so the list page and the detail page cannot disagree (Decision 13).

**`program_registrations`** — `program_id`, `user_id`, `full_name`, `phone`, `note`. **A resident may appear once per programme**, enforced by the database.

### 8.4 Service Applications

**`services`** — five fixed rows. `id` (a fixed text key), `heading_ne`, `heading_en`, `description_ne`, `description_en`, `is_active`, `display_order`. Holds only the editable presentation text. It does **not** define the form's fields (Decision 3).

**`forms`** — `service_id`, `user_id`, `payload`, `document_file`, `token`, `status`, `staff_note`.

`payload` holds the applicant's answers in a flexible structure whose shape is fixed per service in code (Decision 4). `token` is the reference number shown to the applicant, generated by a database counter.

**`form_status_events`** — `form_id`, `from_status`, `to_status`, `changed_by`, `changed_at`, `note`. Append-only. No role can edit or delete an entry (Decision 11).

### 8.5 Complaints

**`complaint_categories`** — `name_ne`, `name_en`, `display_order`, `is_active`. The same pattern as `notice_categories` (Section 8.2), reused rather than invented. This closes a gap in the earlier draft, which asked the ward to hand over "the fixed list of complaint categories" as a one-time decision baked permanently into code. With its own table, the list is instead something the Ward Secretary can add to from the admin screen — a new kind of complaint the ward starts receiving does not require a developer.

**`complaints`**

| Field | Notes |
|---|---|
| `ticket_id` | Reference number, generated by a database counter. See the format note below |
| `user_id` | The submitter. Never exposed publicly |
| `category_id`, `description`, `location_text` | Category selected from `complaint_categories`; description and location resident-authored, single language, as written |
| `photo_file` | Optional. Private delivery. **Never** exposed publicly |
| `status` | Received / In Progress / Action Required / Resolved / Closed |
| `staff_note` | Visible to the submitter, not to the public |
| `is_published` | Defaults to **false**. Staff publish after review (Decision 9) |
| `withdrawn_at`, `withdrawn_by`, `withdrawal_reason` | Set only by an Admin. Reason is required |

**Reference number format.** Both `complaints.ticket_id` and `forms.token` follow the same readable pattern rather than an opaque number or a raw database identifier: `{TYPE}-{YEAR}-{sequence}` — for example `COMP-2026-00047` for a complaint, or `REC-2026-00012` for a recommendation-letter application. The year is informational only; the underlying sequence is a single counter per type that never resets, so a number is never reissued. This costs nothing beyond a formatting rule at the point of generation, and it is the difference between a resident being told "your reference is COMP-2026-00047" and being told a string of digits that means nothing to them or to the staff member they read it to over the phone.

**`complaint_status_events`** — as above, append-only.

**`complaints_public`** — a **view**, not a table, and the *only* way the public reads complaint data. It selects `ticket_id`, the category's bilingual name (joined in from `complaint_categories`, not the raw `category_id`), `description`, `location_text`, `status`, and `created_at` — and nothing else. The submitter's identity, the photograph, and the staff note are absent from the view's definition entirely. They are not hidden; they are structurally not present.

This is a change from an earlier design that relied on the complaints table's security policy alone, and the reason is important: **security policies in PostgreSQL operate on rows, not columns.** A policy that permits reading a row does not hide particular fields on that row. A view excludes them regardless of any policy.

The view shows only complaints that are published and not withdrawn.

### 8.6 Dashboard

No table. The seven counters shown on the public Accountability Dashboard (Section 29) are fixed in code, not staff-configurable.

This was a deliberate simplification, not just an effort saving. A staff-facing switch to hide a counter would sit right next to **complaints withdrawn from public view** — the one number that exists specifically to keep the Admin's withdrawal power (Decision 10) honest. A visibility toggle on that particular counter would be a small, softer version of the exact problem Decision 9 and Decision 10 close off elsewhere: a way to quietly make an inconvenient number disappear, with no record that it happened. Removing the toggle removes the temptation along with the table. Reordering or relabelling a counter later remains a small code change for a developer — it is simply not self-service for staff.

---

## 9. Security Model

### 9.1 The Recurring Pattern

Almost every rule in this system takes the form "may staff do this?" A rule of that shape must look up the acting user's role. If that lookup is written naively, the database enters an infinite loop the first time a rule on the `profiles` table asks the `profiles` table what someone's role is.

The system therefore uses **one dedicated function** that reads the current user's role, runs with elevated rights so that it is not itself subject to the rules it informs, and is available to every policy in the system. Every role check in every policy calls this one function. It is written once, correctly, and used everywhere.

This function — not the sign-in token — is what every enforcement rule reads, for the reason given in Section 3.1.

### 9.2 Column-Level Restrictions

Row-level rules answer *which rows*. They do not answer *which fields*. Without a further restriction, a resident submitting a complaint through a legitimate form could send additional fields alongside it — and a rule that only checks "is this your own complaint?" would accept them.

The specific exposure this closes: a resident could submit a complaint **already marked Resolved**, which would then appear as resolved on the public tracker and inflate the ward's resolved count on its own accountability dashboard. In a system whose stated purpose is accountability, that is a fabrication vector, and it is closed at the database rather than by trusting the form.

Accordingly:

- Residents may write **only** the fields a resident is meant to write. On a complaint: category, description, location, photograph. Nothing else.
- `status`, `ticket_id`, `token`, `user_id`, `is_published` and every timestamp are **set by the database itself**, not accepted from the browser.
- Reference numbers come from a **database counter**. Any scheme that reads the highest existing number and adds one will eventually issue the same number to two people submitting at the same moment.
- `status` is a **fixed list of allowed values**, not free text. Were it free text, a single typo would silently break the dashboard's counting.

### 9.3 The Public Complaint View — Configuration

The view must be configured so that it reads the underlying table **under its owner's rights**, not the visitor's. This is a deliberate and specific choice, and getting it wrong fails in one of two ways:

- Configured to read under the visitor's rights, the view returns **nothing at all** to the public, because the public has no permission on the complaints table. The tracker appears empty.
- "Fixing" that by granting the public permission on the complaints table means anyone can query that table directly and read every field, including submitter identity and photographs. **The view becomes decorative.**

Therefore: the view reads under its owner's rights, **and the public is granted no permission whatsoever on the complaints table itself.** The view is the only public door.

Supabase's automated database checker will flag this configuration as unusual. **It is a deliberate, documented exception.** It is recorded here so that a future maintainer does not "correct" it and silently empty the ward's public tracker.

### 9.4 Policy Summary

| Table | Guest | Resident | Ward Secretary | Admin |
|---|---|---|---|---|
| `profiles` | — | Read/edit own name & phone | Read own | Read all; set role & active status |
| `notices` (published) | Read | Read | Read all, write, delete | Same |
| `notice_categories` | Read | Read | Write | Same |
| `gallery_*` | Read | Read | Write, delete | Same |
| `directory_entries` | Read | Read | Write, delete | Same |
| `representatives` | Read | Read | Write, delete | Same |
| `programs` | Read | Read | Write, delete | Same |
| `program_registrations` | — | Create own (if open); read own | Read all | Read all |
| `services` | Read | Read | Edit heading text only | Same |
| `forms` | — | Create own; read own | Read all; set status & note | Same |
| `form_status_events` | — | Read own form's history | Read all | Read all |
| `complaint_categories` | Read | Read | Write | Same |
| `complaints` | **None** | Create own; read own | Read all; set status, note, publish | Same, **plus withdraw** |
| `complaint_status_events` | — | Read own | Read all | Read all |
| `complaints_public` (view) | **Read** | Read | Read | Read |

**No table permits `DELETE` on `complaints`, `form_status_events` or `complaint_status_events`, for any role. The Accountability Dashboard's counters are computed from existing tables at read time and are not, themselves, a table any role can write to.**

---

## 10. Shared Infrastructure

Not pages, but governing every page.

### 10.1 Session Handling

Middleware runs before every page, refreshes an expiring session, and redirects an unauthenticated visitor away from protected paths. It does not look up role (Section 3.1).

**The protected paths are `/forms/my-requests`, `/complaints/my-complaints`, `/complaints/new`, `/account`, and everything under `/admin`.** Earlier drafts listed `/my-requests` and `/my-complaints`, which are not the addresses those pages actually have — a mismatch that would have left the redirect quietly doing nothing. (The pages would still have shown no data, because the database rules would have refused it — an illustration of why Section 3 puts enforcement where it does.)

Middleware also rejects a session belonging to a deactivated account.

### 10.2 Email Link Handling

A route at **`/auth/confirm`** receives every link the system emails — signup confirmation and password reset alike — validates the single-use token it carries, establishes a session, and forwards the visitor onward: to the password-change page for a reset, to the login page for a confirmation.

This route is not optional and is not a detail. Emailed authentication links do not land on ordinary pages; they land here and are exchanged. Without it, signup confirmation and password reset do not function at all. The email templates must also be adjusted to point here rather than at their default addresses.

### 10.3 Media Handling

Two endpoints, doing two different jobs that earlier drafts merged into one.

**Upload authorisation — `/api/media/sign-upload`.** The browser asks for permission before uploading. The request states a **purpose** — gallery photo, representative photo, programme banner, notice attachment, application document, complaint photograph — and nothing else of consequence. The server:

1. Confirms an active session.
2. Confirms the purpose is one this role may use. **Public-facing purposes require staff.** A resident cannot request permission to upload a gallery photo.
3. Maps the purpose, **server-side**, to a fixed configuration: destination folder, permitted formats, size limit, and **delivery type — public or private**.
4. Signs *that* configuration.

The critical rule: **the browser cannot influence delivery type, folder, or filename.** If it could — as it could under an implementation that simply signs whatever it is sent — a resident could request that their complaint photograph be stored as a *public* file, and every private-delivery guarantee in this document would evaporate.

The endpoint is rate-limited per account.

**Viewing authorisation — `/api/media/sign-view`.** Private files are viewed through a temporary link generated at the moment of viewing. The request names **a submission**, not a file. The server:

1. Reads that submission through the normal database rules, as the requesting user.
2. If the rules return nothing — because it is not theirs and they are not staff — responds with "not found."
3. Otherwise generates a short-lived link for **the file recorded on that row**.

The critical rule: **the browser never names a file, and the server never signs a file the browser named.** Under a design where any signed-in user may request a link for any file identifier, a resident who obtained or guessed another resident's file identifier would receive a valid link to their citizenship document. Naming the *submission* rather than the *file* means the existing ownership rules do all the work, with no special cases and nothing to get wrong twice.

**Orphaned files.** The browser uploads before the record is saved. If a resident abandons the form, the file remains with nothing referencing it. At ward volume this is slow quota erosion rather than a crisis; a monthly reconciliation removes unreferenced files.

### 10.4 Content Freshness

Public pages are assembled ahead of time and cached for speed. **Every staff action that changes public content must therefore explicitly refresh the affected pages** — publishing a notice refreshes the notice board and the homepage; announcing a programme refreshes the programme list and the homepage.

Without this, a Ward Secretary publishes a notice, visits the site, and sees the old list. It is a small piece of code in each admin action and a confusing afternoon if omitted.

Pages that depend on who is signed in — My Requests, My Complaints, everything under `/admin` — are assembled fresh on every request automatically and need no such handling.

### 10.5 Link Previews

Section 16 gives residents a WhatsApp share action on every notice. Without a further step, that shared link opens in WhatsApp as bare text — no title, no image, no context — because the app has nothing to build a preview card from.

Every public page therefore carries **Open Graph tags**: a title, a short description, and an image, generated from the page's own content where one exists (a notice's title and an excerpt of its body) and falling back to the ward's own logo and a standard description elsewhere. This is metadata in the page's own header, not a separate system — near-zero effort once decided, and the entire difference between a shared notice looking like an official ward communication and looking like a suspicious bare link, which matters for a government service residents are being asked to trust.

### 10.6 Search Engine Visibility

The site generates a **sitemap** listing every public page and a **robots file** permitting search engines to index all of it. Combined with Section 10.5, this is what allows a resident who has never heard of Sipadol Sewa to find a specific notice, or the ward office's number, by searching rather than by already knowing the site exists — which matters more for a ward's first public website than for its tenth. Both are generated automatically from the same content already in the database; neither is a separate maintenance burden.

### 10.7 Data Export

Every staff list page — Notices, Applications, Complaints, Programme Registrations — carries an **export to spreadsheet** action, producing a CSV file from whatever is currently on screen. No new endpoint is required: since these pages already load their full row set into the browser (Decision 15), turning that same data into a downloadable file is a client-side operation with no additional server work.

This exists because a ward office deals in paper as well as pixels — a printed registrant list for a programme, a spreadsheet of this month's complaints for a municipal meeting — and without it, staff would resort to copying data out by hand.

---

# PART III — PAGES AND ENDPOINTS

*Each entry follows the same five-part structure. Rules established in Parts I and II are not repeated.*

---

## 11. Homepage — `/`

**1. Route & Visibility.** Public.

**2. Experience.** Ward branding and welcome. A "Your Resident Services" block with shortcuts to the Notice Board, the Forms Hub, and Submit a Complaint. A "Latest Notices" list. A "Current Programmes" feed, so an active campaign is visible without navigating. A "Meet Your Representatives" preview showing a few cards — photo, role, name — linking to the full page; biographies are not shown here, to keep the page scannable. An emergency contacts block: ward office, police, ambulance, fire. A signed-in visitor sees their name and account type in the header.

**3. Frontend.** Navigation links only. No forms.

**4. Backend.** Three reads: the five most recent published notices; current and upcoming programmes; representatives marked active, in display order, limited to a few.

**5. Security.** All three reads are public. The header's account indicator reads the role from the session token (Section 3.1) — no database query, on a page that must be fast for anonymous visitors.

---

## 12. Login — `/login`

**1. Route & Visibility.** Public. A signed-in visitor is redirected to the homepage.

**2. Experience.** Email, password, a bot-protection widget, submit. Links to signup and password reset. A failed attempt shows an inline message without reloading.

**3. Frontend.** The form submits to the server. The bot-protection widget requires a small amount of interactive code around it — the earlier claim that this page holds no client-side behaviour beyond field values no longer holds, and does not need to.

**Specific requirement:** the bot-protection token is **single-use**. After a failed attempt it is spent. If the widget is not reset before the resident tries again, their second attempt fails with a *bot-protection* error rather than a password error — an incomprehensible message, and the resident is stuck. **The widget must be reset in the error path.** This is the kind of defect that survives testing by developers, who type their password correctly.

**4. Backend.** The server signs the resident in.

Failures are translated into one generic message, so that the page does not reveal whether an email address is registered — **with one deliberate exception.** "Email not confirmed" is shown as itself, with a "resend confirmation email" action. Hiding that message behind a generic one locks a real resident out permanently with no way to understand why, which is a worse outcome than the small disclosure it prevents.

**5. Security.** No role constraint. No profile record is created or changed here.

---

## 13. Signup — `/signup`

**1. Route & Visibility.** Public.

**2. Experience.** Full name, phone, email, password, bot protection. On success, a message directing the resident to confirm by email before signing in.

**3. Frontend.** Submits to the server. The bot-protection reset requirement of Section 12 applies identically.

**4. Backend.** The server creates the account. The database then automatically creates the matching profile row, copying the name, phone and email, and **setting the role to Resident**.

The confirmation email points at `/auth/confirm` (Section 10.2).

**5. Security.** **There is no field, parameter, or hidden input anywhere in this flow through which a new account could request or receive any role other than Resident.** This closes the most direct route to elevated access in the entire system, and it is the reason role assignment exists only on one page held by one person.

The profile creation step is a hard dependency: if it fails, account creation is undone and the resident sees an unhelpful database error. Its failure path is a required test.

---

## 14. Password Reset — `/reset-password` and `/reset-password/update`

**1. Route & Visibility.** The request page is public. The change page requires a valid, single-use token from an emailed link.

**2. Experience.** The resident enters their email and submits. A confirmation directs them to their inbox — **shown identically whether or not the address is registered**, so the page cannot be used to discover who has an account. The emailed link leads to a page where they set a new password, after which they are returned to login.

**3. Frontend.** Both steps submit to the server.

**4. Backend.** The request step sends a time-limited, single-use link. The link lands at `/auth/confirm` (Section 10.2), which validates the token, establishes a session, and forwards to the change page.

**5. Security.** The security of this flow rests on the token: single-use, time-limited, and impossible to reach the change page without.

**One consequence worth noting:** the reset link establishes a real session. A resident who requests a reset, clicks the link, then abandons the flow is now signed in. This is normal, and accepted.

---

## 15. Notice Board — `/notices`

**1. Route & Visibility.** Public.

**2. Experience.** Published notices, newest first: title, category, date. A category filter. Selecting one opens its detail page.

**3. Frontend.** The filter works on the already-loaded list. No modals.

**4. Backend.** One read of published notices with their categories, newest first.

**5. Security.** Public read, restricted to published rows. Unpublished drafts are invisible to Guests and Residents alike — not hidden by the page, but excluded by the rule.

---

## 16. Notice Detail — `/notices/[id]`

**1. Route & Visibility.** Public.

**2. Experience.** Full bilingual title and body, the date, an optional attachment download, and a WhatsApp share action.

**3. Frontend.** The share button builds a pre-filled message containing the title and this page's address. The attachment renders as a direct download.

**4. Backend.** One read of the notice. Attachments use public delivery — notice attachments are, by definition, public documents.

**5. Security.** Public read, published rows only. No writes occur here for any role.

---

## 17. Gallery Index — `/gallery`

**1. Route & Visibility.** Public.

**2. Experience.** Albums grouped by year, each with a cover photo, bilingual title, and photo count.

**3. Frontend.** Navigation only.

**4. Backend.** One read of albums with a count of their photos.

**5. Security.** Public read.

> *This page did not exist in earlier drafts, which defined album pages with no way to reach them.*

---

## 18. Gallery Album — `/gallery/[year]/[slug]`

**1. Route & Visibility.** Public.

**2. Experience.** A grid of photographs with optional captions, opening full-screen on selection.

**3. Frontend.** Images below the fold load as the visitor scrolls. The full-screen view is a browser-side overlay.

**4. Backend.** One read of the album's photographs, in display order.

**5. Security.** Public read. Photographs are served **through a resizing transformation, not as originals** — which both strips embedded location data from photos taken on phones and protects the media quota (Decision 7).

---

## 19. Ward Map & Directory — `/directory`

**1. Route & Visibility.** Public.

**2. Experience.** A map of ward businesses and emergency-relevant locations, alongside a searchable list of the same entries. **A category filter** — Health, Education, Government, Business, Emergency, Other — narrows the list to one kind of place. Selecting either a pin or a list entry shows full contact details. Phone numbers are tap-to-call.

Directory categories are a **short, fixed list defined in code**, the same treatment as the five services (Decision 3), rather than a staff-managed table like `notice_categories` or `complaint_categories`. Ward businesses do not generate new categories often enough to justify staff-editable management, and a small fixed list keeps the map's legend and the filter simple.

**3. Frontend.** The map draws pins using Leaflet over OpenStreetMap tiles. Search and the category filter both work against the already-loaded list.

**Implementation note:** the map component must be loaded in the browser only. Loaded on the server it will fail the build outright — a hard error, but a trivial one once known.

**4. Backend.** One read of all directory entries with their coordinates.

**5. Security.** Public read.

---

## 20. Representatives — `/representatives`

**1. Route & Visibility.** Public.

**2. Experience.** A grid of profiles — Ward Chairperson, Ward Members, Ward Secretary — each with an official photograph, role, a short bilingual biography, phone, and email. Phone numbers are tap-to-call.

**3. Frontend.** Read-only. No forms.

**4. Backend.** One read of active representatives in display order, so senior roles appear first regardless of the order they were entered.

**5. Security.** Public read. Photographs use public delivery: these are public officials in their official capacity, with written consent obtained (Decision 6).

---

## 21. Civic Programmes — `/programs`

**1. Route & Visibility.** Public.

**2. Experience.** Announced programmes and campaigns — a youth programme, a training, a clean-up — each with title, short description, dates, and registration status: **Open**, **Upcoming**, or **Closed**. A separate **Recently Completed** section below the active list shows programmes whose end date has passed, giving the page a visible track record rather than only a to-do list.

**3. Frontend.** Read-only list.

**4. Backend.** One read, ordered by start date, split into active/upcoming and completed by comparing `end_date` to today — no new field required, since the date already exists. **Registration status is read from the single definition held in the database (Decision 13)** — not recomputed here, so this page cannot disagree with the detail page.

**5. Security.** Public read.

---

## 22. Programme Detail & Registration — `/programs/[id]`

**1. Route & Visibility.** Public to read; registration requires a Resident account.

**2. Experience.** Full bilingual title, description, dates, optional banner. A signed-in resident sees a Register action; a Guest sees the same content and a prompt to sign in. **A resident already registered sees confirmation of that, not a second form.** If registration is closed, the action is absent and the reason is stated.

The form is deliberately simple and identical for every programme: name and phone, **pre-filled from the resident's profile**, plus an optional note.

**3. Frontend.** A straightforward submission. No file upload, making this the lightest submission flow in the system.

**4. Backend.** One read for the content. On submission, one registration row is written, linking the resident to the programme.

**5. Security.** Reading is unrestricted. Registration requires a Resident account, and the database rule verifies **two** things, not one:

- the record belongs to the person creating it, **and**
- **the programme is actually open to registration.**

The second check is what earlier drafts omitted. Without it, the closed state is a piece of user interface — and anyone able to send data directly to the database can register for any programme, at any time, including one that ended last year.

A resident may register **once** per programme, enforced by the database (Decision 13).

---

## 23. Forms Hub — `/forms`

**1. Route & Visibility.** Public.

**2. Experience.** The five ward services as cards, each with its bilingual heading and description, linking to its form. A signed-in resident also sees a link to My Requests.

**3. Frontend.** Navigation only.

**4. Backend.** One read of the five active services, in display order.

**5. Security.** Public read.

> *The homepage in earlier drafts linked to a "Forms Hub" that had no address.*

---

## 24. Service Application — `/forms/[service]`

**1. Route & Visibility.** Public to read; submission requires a Resident account. Limited to the **five fixed service identifiers**; anything else is not found.

**2. Experience.** Each service has its own form with exactly the fields it requires. **Those fields are fixed and are not editable by staff** (Decision 3). What staff can edit is the bilingual heading and instructions at the top (Section 25).

One document upload accepts the applicant's supporting file: PDF or image, up to 8 MB (Decision 14). On success, a **token number** is shown for the applicant's own reference.

**3. Frontend.** The upload follows Section 10.3: the browser asks the server for permission stating the purpose, then uploads directly to Cloudinary. The form then submits the answers and the resulting file reference to the server.

**4. Backend.** The server validates the answers against **that service's schema, defined in code**, then writes one row: the service, the applicant, the answers, the file reference, and a status of Submitted. The **token and status are set by the database**, not accepted from the browser (Section 9.2).

**5. Security.** Reading a blank form is unrestricted. Submission requires a Resident account and the rule verifies the record belongs to its creator. The document uses **private delivery** — application attachments routinely contain identity documents.

The service configuration table is publicly readable, so headings render for everyone, but editable only by staff.

---

## 25. My Requests — `/forms/my-requests`

**1. Route & Visibility.** Any signed-in account.

**2. Experience.** The signed-in resident's own applications across all five services: token, service, status, submitted date, and **the staff note if one has been written** (Decision 12). Selecting one shows the answers submitted, the status history, and a link to view the uploaded document.

**3. Frontend.** The document link calls `/api/media/sign-view` with **the application's identifier** (Section 10.3), which returns a short-lived link.

**4. Backend.** One read of applications belonging to the current session, plus their status history.

**5. Security.** Middleware confirms a session. The database rule restricts every account — **regardless of role** — to their own applications. A Ward Secretary sees no more here than a resident does; staff visibility lives on its own page.

---

## 26. Submit a Complaint — `/complaints/new`

**1. Route & Visibility.** Any signed-in account.

**2. Experience.** Category, a free-text description, an approximate location or tole name, and an optional photograph.

Two notices are shown, plainly, before submission:

> **Your name will not appear on the public tracker.** Ward staff and your own account will always be able to see who filed this complaint.

> **Your complaint will appear on the public tracker after ward staff review it for personal information.** Its status is counted on the public dashboard from the moment you submit, whether or not the text is published.

The first is the accurate statement of what is guaranteed (Decision 1). The second sets an expectation the resident would otherwise form incorrectly, and states the safeguard that makes review acceptable (Decision 9).

On success, a **Ticket Identifier** is shown.

**3. Frontend.** The same upload pattern as applications. Skipped entirely if no photograph is attached.

**4. Backend.** One row is written: category, description, location, the submitter, the photograph reference if present. **Ticket, status, publication state and timestamps are set by the database.**

**5. Security.** Requires a Resident account; the rule verifies the record belongs to its creator. The resident may write **only** category, description, location, and photograph — nothing else, enforced at field level (Section 9.2). The photograph uses **private delivery**.

A **database-level limit** rejects more than a set number of complaints per account per hour (Decision 8).

---

## 27. My Complaints — `/complaints/my-complaints`

**1. Route & Visibility.** Any signed-in account.

**2. Experience.** The signed-in resident's own complaints: ticket, category, status, submitted date, **days since submission**, whether it is published on the public tracker, and **the staff note if one has been written**. Selecting one shows the full text, the photograph if attached, and the status history with dates.

**3. Frontend.** Photograph viewing follows the same pattern as My Requests: name the complaint, receive a temporary link.

**4. Backend.** One read of complaints belonging to the current session, plus their status history.

**5. Security.** Shows the submitter's own complaints only, **regardless of whether that submitter also holds a staff role.** Staff-level visibility lives on the Admin Complaints page, and the two are deliberately separate pages so that neither can quietly become the other.

---

## 28. Public Complaint Tracker — `/complaints/tracker`

**1. Route & Visibility.** Public.

**2. Experience.** Published complaints ward-wide, without the submitter's name, showing full category, description, and approximate location, alongside current status. A filter by category and status, plus a **search-by-ticket box** so that anyone quoted a reference number — by a neighbour, in a meeting, in a news report — can look up that specific complaint without creating an account.

**Photographs are never shown here, under any circumstance.** This is a constraint, not an omission: complaint photographs are stored privately precisely to prevent unauthenticated public exposure, and photographs carry a materially higher risk of identifying a specific person or property than text does.

Full text detail **is** shown, deliberately: vague public entries would defeat the tracker's purpose entirely.

The page states plainly that complaints appear after review, and links to the dashboard where the total count — reviewed or not — is published.

**3. Frontend.** Read-only. **No code path on this page ever requests a photograph link**, because doing so for an anonymous audience would defeat private delivery entirely.

**4. Backend.** One read of `complaints_public` (Section 8.5) — the view that structurally excludes the submitter, the photograph, and the staff note, and that shows only published, non-withdrawn rows.

**5. Security.** No account required. **The public has no permission on the complaints table at all** (Section 9.3). The view is the only public door, and the fields it withholds are not present in it to withhold.

---

## 29. Accountability Dashboard — `/dashboard`

**1. Route & Visibility.** Public.

**2. Experience.** Summary statistics as bar and pie charts:

- Complaints received, by status
- Complaints resolved, as a proportion
- **Average days from receipt to resolution** — made possible by the status history (Decision 11)
- Complaints by category
- Active programmes
- Applications processed, by service
- **Complaints withdrawn from public view**

Each counter is independent, so a new one can be added later without disturbing the rest. **All seven are always shown, in this fixed order — none can be individually hidden by staff** (Section 8.6). This is deliberate: the counter tracking withdrawn complaints is the one most worth protecting from being switched off.

**3. Frontend.** Charts render from data loaded once. No drill-down in this build.

**4. Backend.** A series of independent counts. **Complaint counts include every complaint that has not been withdrawn, whether or not its text is published** (Decision 9) — this is the mechanism that prevents review from becoming suppression, and it is the reason these counters do not read from the public tracker's view.

Counts are aggregate only. No individual complaint, and no field of one, is ever returned to this page.

**5. Security.** No account required. Only totals cross the boundary; no identifying information is reachable through this page by any means.

---

## 30. Static Pages — `/about`, `/faq`, `/privacy`

**1. Route & Visibility.** Public.

**2. Experience.** Bilingual static text: the project's origin and purpose; frequently asked questions; and a privacy page setting out what the system stores, who can see it, how long it is kept, and how a resident may request correction.

**The privacy page must accurately reflect this document.** It states that complaints are visible to ward staff, that only published complaints appear publicly and only without the submitter's name, that photographs are never published, that no complaint is ever deleted, and that uploaded documents are stored privately.

**3. Frontend.** None.

**4. Backend.** None. Content is written into the pages.

**5. Security.** No data access occurs.

---

## 31. Admin Landing — `/admin`

**1. Route & Visibility.** Ward Secretary and Admin.

**2. Experience.** Links into each administrative module: Notices, Gallery, Directory, Representatives, Programmes, Applications, Complaints, and — **for Admin only** — Users. There is no Dashboard link here: the Accountability Dashboard (Section 29) is a public page with nothing to configure, per the decision recorded in Section 8.6. A summary of items needing attention: new complaints awaiting review, applications awaiting action.

The Users link is **hidden entirely** from a Ward Secretary, not shown disabled.

**3. Frontend.** No data changes here.

**4. Backend.** Counts for the attention summary.

**5. Security.** The layout check described in Section 3 runs here. Any account whose role is neither Ward Secretary nor Admin is redirected before this page renders. **This is a convenience.** Every module below independently enforces its own rules in the database.

---

## 32. Admin — Content Modules

*Notices, Gallery, Directory, Representatives and Programmes share a structure and are described together, with their differences noted. All are **Ward Secretary and Admin, without distinction**.*

### 32.1 Notices — `/admin/notices`

Create, edit, delete, publish and unpublish. The editor requires both Nepali and English, with a copy-from-Nepali convenience. Category selection. An optional attachment upload (public delivery, per Section 10.3 — earlier drafts described notice attachments without ever specifying how they were uploaded).

Writes record the acting user and refresh the timestamp. **Every change refreshes the notice board and the homepage** (Section 10.4).

Categories are managed in a small interface on the same page.

### 32.2 Gallery — `/admin/gallery`

Albums by year. Photos are uploaded **one at a time** rather than as a multi-file batch with per-file progress bars and automatic retry. Captions per photo, display order per album.

This is a genuine trade, not a free one: staff adding fifty photos after a ward event will click "upload" fifty times instead of selecting a folder once. It costs staff time in the specific case of a large batch; it costs nothing in reliability, security, or data integrity, and if a single upload fails the person doing it simply tries that one photo again. **It is also reversible without restructuring** — the underlying signed-upload endpoint (Section 10.3) does not change; multi-select and retry can be added back later as a pure frontend improvement if a large event ever makes one-at-a-time genuinely painful.

**Uploads are signed, like every other upload** (Decision 7). Each successful upload writes one photo row.

### 32.3 Directory — `/admin/directory`

Create, edit, delete. Location is set by **typing latitude and longitude directly** — copied from Google Maps, where any address can be right-clicked to get coordinates — rather than by clicking a point on an embedded editable map inside the admin page.

This removes an entire piece of interactive map-in-write-mode code from the build (the public Directory page in Section 19 still shows a normal read-only map; only the *admin entry method* changes). The trade is a small one: a staff member must open Google Maps in another tab to find a coordinate, rather than clicking directly on a map already in front of them. Two text fields are also easier to get exactly right than a click on a small embedded map, where a slightly imprecise tap can place a business's pin a street away from where it belongs.

### 32.4 Representatives — `/admin/representatives`

Create, edit, delete. Photo upload (public delivery), role, bilingual biography, contact details, display order, active status.

### 32.5 Programmes — `/admin/programs`

Create, edit, delete: title, description, dates, optional banner, **registration deadline**, and the registration-open toggle (Decision 13).

A separate view lists residents registered for a programme, with name, phone, note and date, exportable to a spreadsheet (Section 10.7) for headcount and planning. No temporary-link handling is needed here — programme registration involves no file.

**Security across all five:** Ward Secretary and Admin hold identical, full privileges. Both may read the full registration list, since staff-wide visibility into who has registered is necessary for planning — unlike the strictly ownership-limited pattern applied to a resident's own applications and complaints.

---

## 33. Admin — Applications — `/admin/forms`

**1. Route & Visibility.** Ward Secretary and Admin.

**2. Experience.** Every resident's applications ward-wide, across all five services, filterable by service and status, searchable by token, exportable to a spreadsheet (Section 10.7). Each shows the applicant's name and phone, the answers submitted, and a link to the document.

Staff advance the status — Submitted, In Review, Action Required, Ready, Completed, Rejected — and **may attach a note to the applicant, which the applicant sees on My Requests** (Decision 12). A status change **sends the applicant an email**.

A separate small interface edits the bilingual heading and description for each of the five services.

**3. Frontend.** Document viewing follows Section 10.3 — the same mechanism as the resident-facing page, with staff access falling out of the existing rules rather than requiring a special case.

**4. Backend.** One read of all applications, unrestricted by ownership. A status change writes the new status **and an entry in the permanent history** (Decision 11). The service configuration is edited independently of applications.

**5. Security.** Ward Secretary and Admin have identical privileges here. Neither can delete an application's history.

---

## 34. Admin — Complaints — `/admin/complaints`

**1. Route & Visibility.** Ward Secretary and Admin, with one action-level distinction.

**2. Experience.** Every complaint ward-wide, filterable by status, category and publication state, searchable by ticket, exportable to a spreadsheet (Section 10.7). Each shows the submitter's name and phone, the full text, the photograph, and the status history.

A complaint **received more than 15 days ago and not yet Resolved or Closed** is visually flagged **Overdue** in the list, so an ageing complaint is visible to staff without anyone having to check dates by hand. The 15-day threshold is fixed in code for now; unlike the Dashboard's counters (Section 8.6), which are deliberately kept out of staff hands, this threshold could reasonably become staff-configurable later if the ward finds it wants that — it carries none of the same accountability risk, since adjusting it changes when a complaint is flagged internally, not whether the public ever sees it.

The category list itself (Health, Roads, Water, and so on) is managed by staff on this page, from the `complaint_categories` table (Section 8.5) — the same small add/edit/reorder interface used for notice categories, so a new kind of complaint the ward starts receiving does not require a developer to add.

Staff may:

- **Advance the status** — Received, In Progress, Action Required, Resolved, Closed.
- **Attach a note to the submitter**, visible on My Complaints, not on the public tracker.
- **Publish or unpublish** the complaint's text on the public tracker (Decision 9). Complaints arrive unpublished; a queue of those awaiting review is shown first.

An Admin, and only an Admin, may additionally:

- **Withdraw** the complaint from the public record. This requires a **written reason** and is recorded permanently with the Admin's identity and the time. **It does not delete anything.**

The withdraw control is absent from the interface for a Ward Secretary — and, far more importantly, **the underlying rule rejects the attempt regardless of what interface made it.**

**3. Frontend.** Photograph viewing follows Section 10.3. Withdrawal requires typing a reason; the button does nothing without one.

**4. Backend.** One read of all complaints, unrestricted by ownership. Status changes write the status and a permanent history entry, and email the submitter. Publication toggles the publication field. Withdrawal writes the withdrawal fields.

**5. Security.** This is the page where the ward's two-tier trust model is actually implemented:

- Ward Secretary and Admin hold **identical** read, status, note and publish privileges.
- **Withdrawal is governed by a separate, narrower rule that checks specifically for the Admin role.** A Ward Secretary's attempt is rejected by the database, not by a hidden button. Splitting the two rules apart is the precise mechanism that makes the distinction real rather than cosmetic.
- **No role holds delete.** The permission does not exist on this table for anyone (Decision 10). A complaint that has been received cannot be unreceived by any person in this system.

---

## 35. Admin — Users — `/admin/users`

**1. Route & Visibility.** **Admin only.** The single most restricted page in the system.

**2. Experience.** All registered accounts with name, email, phone, role, active status, and signup date. Searchable. Each row offers:

- **Role assignment** — a fixed choice between Resident, Ward Secretary and Admin. Never free text.
- **Deactivate / reactivate** — blocks sign-in and all writes. Reversible. Destroys nothing.

An Admin **cannot remove their own Admin role or deactivate their own account.** The system will not let the ward lock itself out of its own administration.

**3. Frontend.** Both controls require confirmation, naming the account and the change.

**4. Backend.** One update against the target account's profile row.

**5. Security.** Withheld from Ward Secretary at **two independent layers**: the admin layout redirects a Ward Secretary who reaches this address, and **the rule on the profile table's role field is itself restricted to Admin.** The second is what matters; the first only makes it pleasant.

This dual restriction exists because **this page is the sole mechanism by which any role can be elevated at all.** Every other privilege in the system flows from a decision made here.

A role change **takes effect on the affected person's very next action**, because enforcement reads the database rather than their sign-in token (Section 3.1).

---

## 36. My Account — `/account`

**1. Route & Visibility.** Any signed-in account.

Section 10.1 lists `/account` among the protected paths; this section is that page. Every account, regardless of role, has one — a Resident, a Ward Secretary and the Admin all use the same page, each seeing only their own record.

**2. Experience.** The signed-in person's own name, phone, email, account role, and the date they joined. Name and phone are editable in place. Email is shown but not editable here, since it is tied to the sign-in account itself. A **"change password"** action, separate from the public reset flow (Section 14), for someone who wants to change their password while already signed in and does not need to prove ownership of their email again to do it.

**3. Frontend.** A simple in-place edit form. The password change is a short separate form on the same page.

**4. Backend.** A read of the current session's own profile row. Saving name or phone writes an update to that same row. Password change invokes the authentication provider's own password-update function, scoped to the existing session.

**5. Security.** The database rule restricts every account to editing **only its own** profile row — never another account's, and never the `role` or `is_active` fields, which remain reachable only through Admin — User Management (Section 35). This page and that one look similar but enforce entirely different rules underneath: this one is "edit yourself," that one is "edit anyone," and the two permissions are independent.

---

# PART IV — DELIVERY

## 37. Operations

### 37.1 Backups — Required Before Launch

The free database tier includes **no automated backups** and **pauses after roughly a week of inactivity**. Neither is acceptable for a ward's complaint register (Decision 16).

**Recommended:** the paid tier, which includes daily backups and no pausing. **Minimum acceptable alternative:** a scheduled export, tested by actually restoring it at least once, with an explicit statement of how much data the ward accepts losing in a failure.

An untested backup is not a backup.

### 37.2 Service Limits

| Service | Free Limit | Assessment |
|---|---|---|
| Resend | 3,000/month, 100/day | Sufficient. Both authentication *and* status emails count against it |
| Cloudflare Turnstile | Unlimited | Sufficient |
| Cloudinary | 25 credits/month | Sufficient **only with transformed delivery** (Decision 7). Monitor monthly |
| Supabase (free) | 500 MB, 50,000 monthly users | Storage is ample. **Backups and pausing are the problem, not capacity** |
| OpenStreetMap | Fair-use policy | Acceptable at ward traffic. Revisit if the directory becomes popular |

### 37.3 Monitoring

At minimum, before launch: error reporting on the live site, a monthly check of the Cloudinary quota, a monthly reconciliation of unreferenced files (Section 10.3), and a monthly review of the number of complaints awaiting review.

**That last one is a governance control, not a technical one.** A growing queue of unreviewed complaints is the failure mode Decision 9 is most exposed to, and it should be visible to the Chairman rather than discovered by a resident.

### 37.4 Handover

This system will outlive its builder's involvement. Required before launch: written credential custody, a documented deployment process, this document kept current, and **at least two people at the ward who know how to reach the developer**.

---

## 38. Build Sequence

The riskiest module — Applications, with signed uploads, private delivery, per-service schemas, generated tokens and a six-stage workflow — is built **last**, not first. Every technique it needs is proven in cheaper form earlier.

**Phase 0 — Foundation.** Profiles and the signup trigger. The role function. Session handling. Email via Resend, including domain verification. `/auth/confirm`. Bot protection. Signup, login and password reset end to end.

*Do not proceed until a resident who has never seen the site can sign up, confirm, sign in and reset their password unaided, on their own phone.* Everything downstream assumes this works, and nothing downstream can compensate if it does not.

**Phase 1 — Public content.** Homepage, Notices, Representatives, static pages, language toggle, Bikram Sambat dates. Ships something real to residents. Exercises bilingual storage, the admin shell, signed uploads and content refresh — with no private data at risk anywhere.

**Phase 2 — The complaints loop.** Submission, My Complaints, the public view, the tracker with review, admin complaints with publish and withdraw, status history, the dashboard. The highest-value module and the one under most scrutiny. Build it while there is still full attention to spend on it.

**Phase 3 — Programmes, Gallery, Directory.** Mostly familiar work over patterns already proven.

**Phase 4 — Applications.** Five forms, flexible payloads, private delivery, the status workflow, admin management.

**The three items originally flagged here as "cut if time runs short" are now resolved as baseline decisions, not deferred ones:** the dashboard configuration page has been removed outright (Section 8.6), and Gallery upload and Directory location entry are already built at their simplest form (Section 32.2, 32.3). None of the three remains a build-time judgement call.

If a genuine time constraint still arrives, the lowest-cost things to defer to a fast follow-up are the additions layered on in this pass rather than anything load-bearing: the CSV export action on admin lists (Section 10.7) and the "Recently Completed" section on the Programmes page (Section 21). Neither is depended on by anything else in the system, and neither touches security, privacy, or the accountability guarantees in Section 6 — which is exactly why they are the right things to cut first if it ever comes to that, and everything in Part I is not.

---

## 39. Decisions Required From the Ward

The document is complete except for the following, which only the ward can answer. None blocks Phase 0.

**Required before Phase 4:**

1. **The five services — names and fields.** The final five, and for each, the exact fields an applicant must complete and the supporting document required. This is the only genuinely open item in the system's design. Placeholders currently stand in for the five most common ward services; every one is a one-line change to replace.

**Required before Phase 2:**

2. **Complaint categories to start with.** A starting list only — Section 8.5 gives the Ward Secretary a page to add, retire, or reorder these after launch without a developer, so this does not need to be final.
3. **The review commitment.** How many working days will the ward take to review a complaint before publishing (Decision 9)? Whatever is chosen will be printed on the tracker page, so it should be a number the office can actually meet.
4. **Who reviews.** Which staff member holds the publication queue as a named responsibility.

**Required before launch:**

5. **Backups.** Fund the paid tier, or approve a scheduled export with a stated acceptable loss window (Decision 16, Section 37.1).
6. **Domain.** Which domain will send the ward's email, and who can create its DNS records. **Start this now** — it is routinely the longest-lead item in the project (Decision 2).
7. **Emergency contacts.** The exact numbers for the homepage.
8. **Representative consent.** Written consent from each representative for publication of their photograph, biography and contact details (Decision 6).
9. **Privacy page content.** Section 30 states what it must accurately say. The ward must confirm it is accurate and acceptable.

**Required before Phase 1:**

10. **Directory entries.** The initial set of ward businesses and locations to list. Categories themselves are already fixed (Section 19) and need no ward decision.
11. **The first Admin account.** Which email address, and who controls it.

---

## 40. Closing Note

Two decisions in this document reduce the authority of the ward's own officials over the ward's own data. Neither was made lightly, and both deserve to be defended in the room rather than buried in a specification.

**No one can delete a complaint** (Decision 10). Not the Ward Secretary, not the Chairman, not the developer. Complaints can be withdrawn from public view, with a reason, permanently attributed — and the count of withdrawals is itself published.

**Declining to publish a complaint does not remove it from the ward's public numbers** (Decision 9). Ward staff can protect a resident's phone number from appearing on the internet. Ward staff cannot make a complaint disappear from the ward's resolution rate.

Both constraints exist for the same reason. A public accountability tracker whose subject can quietly edit it is not an accountability tracker; it is a notice board that occasionally mentions problems. The value of this system to residents — and, in the longer run, its value to the ward officials who will point at its numbers when asked how they have performed — rests entirely on it not being editable in the ward's own favour.

The ward is choosing to build a system that can produce evidence against it. That is what makes the evidence worth anything when it runs the other way.
