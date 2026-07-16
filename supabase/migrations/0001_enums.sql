-- Fixed-list statuses, never free text (AGENTS.md: "Statuses are Postgres
-- enums, never free text -- one typo silently breaks the dashboard").

create type public.user_role as enum ('resident', 'ward_secretary', 'admin');

create type public.complaint_status as enum (
  'received',
  'in_progress',
  'action_required',
  'resolved',
  'closed'
);

create type public.form_status as enum (
  'submitted',
  'in_review',
  'action_required',
  'ready',
  'completed',
  'rejected'
);
