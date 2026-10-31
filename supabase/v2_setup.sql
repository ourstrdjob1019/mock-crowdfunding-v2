-- =========================================================================
-- [리뉴얼 V2 전용] 기존 V1 데이터를 100% 보존하면서 동일한 유료 Supabase 내에
-- V2 전용 테이블(v2_*)과 스토리지 버킷(v2-*)만 별도로 생성하는 안전한 SQL입니다.
-- Supabase 대시보드 > SQL Editor > New query 에 붙여넣고 [Run] 버튼을 누르세요.
-- =========================================================================

-- 1. V2 테이블 초기화 (기존 V1의 events, projects, users, investments는 절대 건드리지 않음!)
DROP TABLE IF EXISTS public.v2_investments CASCADE;
DROP TABLE IF EXISTS public.v2_projects CASCADE;
DROP TABLE IF EXISTS public.v2_users CASCADE;
DROP TABLE IF EXISTS public.v2_roster CASCADE;
DROP TABLE IF EXISTS public.v2_teams CASCADE;
DROP TABLE IF EXISTS public.v2_events CASCADE;

-- 2. V2 전용 테이블 생성
CREATE TABLE public.v2_events (
  id TEXT PRIMARY KEY DEFAULT 'evt-2026-v2-01',
  name TEXT NOT NULL DEFAULT '2026 서원대학교 SPARK 창업챌린지(모의 크라우드펀딩 대회)',
  institution TEXT NOT NULL DEFAULT '서원대학교',
  session TEXT NOT NULL DEFAULT '2026 SPARK 창업챌린지',
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  base_credit INTEGER NOT NULL DEFAULT 10000,
  min_investment INTEGER NOT NULL DEFAULT 2000,
  max_investment INTEGER NOT NULL DEFAULT 5000,
  current_stage TEXT NOT NULL DEFAULT 'FUNDING_OPEN',
  is_ranking_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.v2_teams (
  id TEXT PRIMARY KEY DEFAULT 'team-01',
  event_id TEXT DEFAULT 'evt-2026-v2-01',
  team_number INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.v2_roster (
  id TEXT PRIMARY KEY DEFAULT 'roster-01',
  event_id TEXT REFERENCES public.v2_events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  team_id TEXT,
  team_name TEXT,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  institution TEXT DEFAULT '',
  department TEXT DEFAULT '',
  student_number TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.v2_users (
  id TEXT PRIMARY KEY,
  event_id TEXT DEFAULT 'evt-2026-v2-01',
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT 'password123',
  name TEXT NOT NULL,
  institution TEXT DEFAULT '서원대학교',
  department TEXT DEFAULT '자유 참가',
  student_number TEXT DEFAULT '',
  team_id TEXT,
  team_name TEXT,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  privacy_agreed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.v2_projects (
  id TEXT PRIMARY KEY,
  event_id TEXT DEFAULT 'evt-2026-v2-01',
  team_id TEXT,
  team_name TEXT NOT NULL,
  team_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT NOT NULL,
  landing_format TEXT NOT NULL DEFAULT 'IMAGE',
  landing_url TEXT NOT NULL DEFAULT '',
  landing_images JSONB DEFAULT '[]'::jsonb,
  author_id TEXT,
  author_name TEXT,
  author_email TEXT,
  last_modifier_name TEXT,
  last_modified_at TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  total_credits INTEGER NOT NULL DEFAULT 0,
  investor_count INTEGER NOT NULL DEFAULT 0,
  team_member_ids JSONB DEFAULT '[]'::jsonb,
  team_member_details JSONB DEFAULT '[]'::jsonb,
  media_items JSONB DEFAULT '[]'::jsonb,
  category TEXT DEFAULT 'AI/SaaS',
  target_credits INTEGER DEFAULT 20000,
  pitch_highlights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.v2_investments (
  id TEXT PRIMARY KEY,
  event_id TEXT DEFAULT 'evt-2026-v2-01',
  investor_id TEXT NOT NULL,
  investor_name TEXT NOT NULL,
  project_id TEXT NOT NULL,
  team_id TEXT,
  amount INTEGER NOT NULL DEFAULT 2000,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI'),
  CONSTRAINT unique_v2_investor_project UNIQUE (investor_id, project_id)
);

-- 3. V2 테이블 RLS 권한 허용
ALTER TABLE public.v2_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access V2 Events" ON public.v2_events;
CREATE POLICY "Public Full Access V2 Events" ON public.v2_events FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.v2_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access V2 Teams" ON public.v2_teams;
CREATE POLICY "Public Full Access V2 Teams" ON public.v2_teams FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.v2_roster ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access V2 Roster" ON public.v2_roster;
CREATE POLICY "Public Full Access V2 Roster" ON public.v2_roster FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.v2_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access V2 Users" ON public.v2_users;
CREATE POLICY "Public Full Access V2 Users" ON public.v2_users FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.v2_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access V2 Projects" ON public.v2_projects;
CREATE POLICY "Public Full Access V2 Projects" ON public.v2_projects FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.v2_investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access V2 Investments" ON public.v2_investments;
CREATE POLICY "Public Full Access V2 Investments" ON public.v2_investments FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. V2 전용 Storage 버킷 생성 및 권한 허용
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('v2-project-thumbnails', 'v2-project-thumbnails', true, 20971520, NULL)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 20971520, allowed_mime_types = NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('v2-landing-files', 'v2-landing-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800, allowed_mime_types = NULL;

DROP POLICY IF EXISTS "Public V2 Storage Read" ON storage.objects;
CREATE POLICY "Public V2 Storage Read" ON storage.objects
  FOR SELECT TO public USING (bucket_id IN ('v2-project-thumbnails', 'v2-landing-files'));

DROP POLICY IF EXISTS "Public V2 Storage Insert" ON storage.objects;
CREATE POLICY "Public V2 Storage Insert" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id IN ('v2-project-thumbnails', 'v2-landing-files'));

DROP POLICY IF EXISTS "Public V2 Storage Update" ON storage.objects;
CREATE POLICY "Public V2 Storage Update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id IN ('v2-project-thumbnails', 'v2-landing-files'));

DROP POLICY IF EXISTS "Public V2 Storage Delete" ON storage.objects;
CREATE POLICY "Public V2 Storage Delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id IN ('v2-project-thumbnails', 'v2-landing-files'));

-- 5. V2 기본 행사 및 총괄 관리자 계정 초기 등록
INSERT INTO public.v2_events (id, name, institution, session, event_date, base_credit, min_investment, max_investment, current_stage, is_ranking_public)
VALUES (
  'evt-2026-v2-01',
  '2026 서원대학교 SPARK 창업챌린지(모의 크라우드펀딩 대회)',
  '서원대학교',
  '2026 SPARK 창업챌린지',
  CURRENT_DATE,
  10000,
  2000,
  5000,
  'FUNDING_OPEN',
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.v2_users (id, event_id, email, password, name, institution, department, student_number, team_id, team_name, role, privacy_agreed)
VALUES (
  'user-admin-1',
  'evt-2026-v2-01',
  'admin@gmail.com',
  'password123',
  '총괄 관리자',
  '서원대학교',
  '창업지원단',
  'ADMIN-00',
  NULL,
  NULL,
  'ADMIN',
  true
)
ON CONFLICT (email) DO NOTHING;

