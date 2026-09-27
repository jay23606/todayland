-- Todayland — Supabase backend (run once against the project the app points at)
--
-- Todayland shares the SAME Supabase project as mayfly/appmegle/etc, so every object here
-- is td_-prefixed to avoid collisions. Two tables:
--
--   td_days      one row per calendar day: the headline that was drawn for it, frozen the
--                first time anyone asks, so the world is identical for every visitor that
--                day even if the news feed moves on. The world itself is never stored --
--                it is derived from (day, headline) by buildWorld(), so every client
--                computes the same terrain and objects from this one small row.
--   td_visits    a running total of "found" events per day, for a simple community counter
--                ("1,204 people found the tilcayo today") with no per-person tracking.
--
-- Apply via the Supabase SQL editor (or `supabase db push`). Safe to re-run.

create table if not exists public.td_days (
  day         text primary key,               -- 'YYYY-MM-DD', UTC
  headline    text not null,
  is_real     boolean not null default true,  -- false when the news feed was unreachable and a fallback was frozen
  created_at  timestamptz not null default now()
);

create table if not exists public.td_visits (
  day         text primary key references public.td_days(day) on delete cascade,
  finds       bigint not null default 0,
  visitors    bigint not null default 0,
  updated_at  timestamptz not null default now()
);

-- Atomically freezes today's headline the first time it is asked for, or returns the one
-- already frozen. This is the race-free "insert if absent, else read" a plain
-- select-then-insert cannot guarantee under concurrent first visitors.
create or replace function public.td_freeze_day(p_day text, p_headline text, p_is_real boolean)
returns table(headline text, is_real boolean) as $$
begin
  insert into public.td_days(day, headline, is_real) values (p_day, p_headline, p_is_real)
  on conflict (day) do nothing;
  insert into public.td_visits(day) values (p_day) on conflict (day) do nothing;
  return query select d.headline, d.is_real from public.td_days d where d.day = p_day;
end;
$$ language plpgsql security definer;

create or replace function public.td_record_visit(p_day text)
returns void as $$
begin
  update public.td_visits set visitors = visitors + 1, updated_at = now() where day = p_day;
end;
$$ language plpgsql security definer;

create or replace function public.td_record_find(p_day text, p_count int default 1)
returns bigint as $$
declare v bigint;
begin
  update public.td_visits set finds = finds + p_count, updated_at = now() where day = p_day
  returning finds into v;
  return v;
end;
$$ language plpgsql security definer;

alter table public.td_days enable row level security;
alter table public.td_visits enable row level security;

drop policy if exists td_days_read on public.td_days;
create policy td_days_read on public.td_days for select using (true);
drop policy if exists td_visits_read on public.td_visits;
create policy td_visits_read on public.td_visits for select using (true);
-- Writes only happen through the security-definer functions above, so no insert/update
-- policy is needed (or wanted) for anon on either table directly.
