-- Run once in your own Supabase project's SQL editor. No service-role key is
-- needed by the browser. Every read/write is restricted to the signed-in user.
create table if not exists public.finance_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.finance_snapshots enable row level security;
revoke all on public.finance_snapshots from anon;
grant select, insert, update on public.finance_snapshots to authenticated;
drop policy if exists "Read own finances" on public.finance_snapshots;
create policy "Read own finances" on public.finance_snapshots for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Create own finances" on public.finance_snapshots;
create policy "Create own finances" on public.finance_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own finances" on public.finance_snapshots;
create policy "Update own finances" on public.finance_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.save_phinance_snapshot(p_expected_revision bigint, p_payload jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare result_revision bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_payload is null or (p_payload->>'schemaVersion') is distinct from '2' or jsonb_typeof(p_payload->'data') is distinct from 'object' or octet_length(p_payload::text) > 5000000 then
    raise exception 'Unsupported finance payload' using errcode = '22023';
  end if;
  if p_expected_revision is null then
    insert into public.finance_snapshots(user_id, revision, payload) values(auth.uid(), 1, p_payload) returning revision into result_revision;
  else
    update public.finance_snapshots set payload=p_payload, revision=revision+1, updated_at=now()
      where user_id=auth.uid() and revision=p_expected_revision returning revision into result_revision;
    if not found then raise exception 'A newer cloud copy exists; download it before writing' using errcode = '40001'; end if;
  end if;
  return result_revision;
end;
$$;
revoke all on function public.save_phinance_snapshot(bigint,jsonb) from public, anon;
grant execute on function public.save_phinance_snapshot(bigint,jsonb) to authenticated;
