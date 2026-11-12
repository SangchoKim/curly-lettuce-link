alter table public.mylink_daily_stats
  add column if not exists searches jsonb not null default '{}'::jsonb,
  add column if not exists misses   jsonb not null default '{}'::jsonb;

-- 검색어 집계: hit=true → searches, false → misses. 날짜별 고유 검색어 300개 상한
create or replace function public.mylink_record_search(p_date date, p_q text, p_hit boolean)
returns void language plpgsql set search_path = '' as $$
declare
  cur jsonb;
begin
  insert into public.mylink_daily_stats (date) values (p_date) on conflict (date) do nothing;
  select case when p_hit then s.searches else s.misses end into cur
    from public.mylink_daily_stats s where s.date = p_date for update;
  if not (cur ? p_q) and (select count(*) from jsonb_object_keys(cur)) >= 300 then
    return;
  end if;
  cur := cur || jsonb_build_object(p_q, coalesce((cur ->> p_q)::int, 0) + 1);
  if p_hit then
    update public.mylink_daily_stats set searches = cur where date = p_date;
  else
    update public.mylink_daily_stats set misses = cur where date = p_date;
  end if;
end;
$$;

revoke execute on function public.mylink_record_search(date, text, boolean) from public, anon, authenticated;
grant execute on function public.mylink_record_search(date, text, boolean) to service_role;
