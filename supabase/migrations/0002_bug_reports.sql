-- 버그·의견 리포트 — 앱 설정의 "버그 신고 · 의견 보내기"가 insert.
-- 사용자는 쓰기만 가능(RLS insert-only). 조회는 개발자가 대시보드/service role로.
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null, -- 버그 / 제안 / 기타
  message text not null,
  context jsonb, -- 앱 버전·플랫폼·OS 버전·직전 화면 등 자동 수집
  created_at timestamptz not null default now()
);

alter table public.bug_reports enable row level security;

drop policy if exists "bug_reports_insert_own" on public.bug_reports;
create policy "bug_reports_insert_own" on public.bug_reports
  for insert with check (user_id = auth.uid());
