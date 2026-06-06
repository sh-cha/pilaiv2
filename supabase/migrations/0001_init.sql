-- pilaiv2 초기 스키마 — 키-값 저장(kv_store) + 강사 프로필(profiles).
-- 설계 의도(storage.ts): 도메인 로직은 KV 계약만 의존 → Supabase 전환 = kv 구현만 교체.
-- 그래서 1차 백엔드는 사용자별 JSON blob 저장(members/sessions/insights 키). RLS로 사용자 격리.
-- (정규화된 members/sessions 테이블로의 이행은 docs/SUPABASE.md "다음 단계" 참고.)

-- ── 강사 프로필 (로그인 사용자 1:1) ──────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── 키-값 저장 (앱의 KV 계약을 그대로 클라우드로) ────────────────
-- key 예: pilaiv2.members.v1 / pilaiv2.sessions.v1 / pilaiv2.insights.v1
create table if not exists public.kv_store (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.kv_store enable row level security;

drop policy if exists "kv_select_own" on public.kv_store;
create policy "kv_select_own" on public.kv_store
  for select using (user_id = auth.uid());

drop policy if exists "kv_insert_own" on public.kv_store;
create policy "kv_insert_own" on public.kv_store
  for insert with check (user_id = auth.uid());

drop policy if exists "kv_update_own" on public.kv_store;
create policy "kv_update_own" on public.kv_store
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "kv_delete_own" on public.kv_store;
create policy "kv_delete_own" on public.kv_store
  for delete using (user_id = auth.uid());

-- 신규 auth.users → profiles 자동 생성 (이름은 메타데이터에서, 없으면 null)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
