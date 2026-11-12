-- mylink 초기 스키마 (원격 프로젝트 etqojsefmpcgithozwly 에 적용됨)
create table public.mylink_site (
  id smallint primary key default 1 check (id = 1),
  doc jsonb not null,
  rev integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.mylink_daily_stats (
  date date primary key,
  views integer not null default 0,
  clicks jsonb not null default '{}'::jsonb,
  referrers jsonb not null default '{}'::jsonb
);

-- RLS on, 정책 없음 → 서버(secret key)만 접근
alter table public.mylink_site enable row level security;
alter table public.mylink_daily_stats enable row level security;

create or replace function public.mylink_record_view(p_date date, p_ref text)
returns void language sql set search_path = '' as $$
  insert into public.mylink_daily_stats as s (date, views, referrers)
  values (p_date, 1, jsonb_build_object(p_ref, 1))
  on conflict (date) do update
    set views = s.views + 1,
        referrers = s.referrers || jsonb_build_object(p_ref, coalesce((s.referrers ->> p_ref)::int, 0) + 1);
$$;

create or replace function public.mylink_record_click(p_date date, p_block text)
returns void language sql set search_path = '' as $$
  insert into public.mylink_daily_stats as s (date, clicks)
  values (p_date, jsonb_build_object(p_block, 1))
  on conflict (date) do update
    set clicks = s.clicks || jsonb_build_object(p_block, coalesce((s.clicks ->> p_block)::int, 0) + 1);
$$;

revoke execute on function public.mylink_record_view(date, text) from public, anon, authenticated;
revoke execute on function public.mylink_record_click(date, text) from public, anon, authenticated;
grant execute on function public.mylink_record_view(date, text) to service_role;
grant execute on function public.mylink_record_click(date, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mylink-media', 'mylink-media', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
