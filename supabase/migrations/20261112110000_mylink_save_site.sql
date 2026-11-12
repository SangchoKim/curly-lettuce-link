-- 낙관적 잠금 저장 + 첫 시드 동시 생성 경쟁 처리. 반환 {ok, doc}
create or replace function public.mylink_save_site(p_doc jsonb, p_base_rev integer)
returns jsonb language plpgsql set search_path = '' as $$
declare
  cur public.mylink_site;
  new_rev integer;
  saved jsonb;
  ts jsonb := to_jsonb(to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
begin
  select * into cur from public.mylink_site where id = 1 for update;
  if not found then
    if p_base_rev <> 0 then
      return jsonb_build_object('ok', false, 'doc', null);
    end if;
    saved := jsonb_set(jsonb_set(p_doc, '{rev}', to_jsonb(1)), '{updatedAt}', ts);
    insert into public.mylink_site (id, doc, rev, updated_at) values (1, saved, 1, now())
      on conflict (id) do nothing;
    if found then
      return jsonb_build_object('ok', true, 'doc', saved);
    end if;
    select * into cur from public.mylink_site where id = 1;
    return jsonb_build_object('ok', false, 'doc', cur.doc);
  end if;
  if cur.rev <> p_base_rev then
    return jsonb_build_object('ok', false, 'doc', cur.doc);
  end if;
  new_rev := cur.rev + 1;
  saved := jsonb_set(jsonb_set(p_doc, '{rev}', to_jsonb(new_rev)), '{updatedAt}', ts);
  update public.mylink_site set doc = saved, rev = new_rev, updated_at = now() where id = 1;
  return jsonb_build_object('ok', true, 'doc', saved);
end;
$$;

revoke execute on function public.mylink_save_site(jsonb, integer) from public, anon, authenticated;
grant execute on function public.mylink_save_site(jsonb, integer) to service_role;
