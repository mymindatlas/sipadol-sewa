-- Reused by later migrations on other tables; not profiles-specific.
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_touch_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_updated_at();
