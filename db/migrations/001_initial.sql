BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE data_domain AS ENUM ('academic','professional','personal','system');
CREATE TYPE task_status AS ENUM ('not_started','in_progress','waiting','blocked','completed');
CREATE TYPE task_priority AS ENUM ('low','medium','high','critical');
CREATE TYPE mastery_state AS ENUM ('new','exposed','learning','developing','proficient','mastered','decaying');
CREATE TYPE source_status AS ENUM ('processing','ready','failed');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'scholar',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  preferred_name text NOT NULL,
  academic_level text,
  field text,
  mentor text,
  timezone text NOT NULL DEFAULT 'Africa/Accra',
  planning_utilization numeric(4,3) NOT NULL DEFAULT .700 CHECK (planning_utilization BETWEEN 0 AND 1),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code text, title text NOT NULL, description text, is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,title)
);
CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL, position integer NOT NULL DEFAULT 0, UNIQUE(course_id,title)
);
CREATE TABLE lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL, lecturer text, occurred_at timestamptz, position integer NOT NULL DEFAULT 0
);
CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lecture_id uuid REFERENCES lectures(id) ON DELETE SET NULL,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE, title text NOT NULL
);
CREATE TABLE concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE, title text NOT NULL,
  description text, importance smallint NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  UNIQUE(module_id,title)
);

CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain data_domain NOT NULL DEFAULT 'academic', title text NOT NULL, source_type text NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL, module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  lecture_id uuid REFERENCES lectures(id) ON DELETE SET NULL, topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  author_or_lecturer text, source_date timestamptz, tags text[] NOT NULL DEFAULT '{}',
  storage_key text, mime_type text, byte_size bigint, raw_text text,
  status source_status NOT NULL DEFAULT 'processing', processing_error text,
  is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL, content text NOT NULL, page_number integer, section_title text,
  transcript_start_seconds numeric, transcript_end_seconds numeric, token_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, embedding vector(1536),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  UNIQUE(source_id,chunk_index)
);
CREATE INDEX source_chunks_keyword_idx ON source_chunks USING gin(search_vector);
CREATE INDEX source_chunks_embedding_idx ON source_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX sources_user_course_idx ON sources(user_id,course_id,created_at DESC);
CREATE INDEX sources_tags_idx ON sources USING gin(tags);

CREATE TABLE revision_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL, course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, duration_minutes integer
);
CREATE TABLE revision_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  source_chunk_id uuid REFERENCES source_chunks(id) ON DELETE SET NULL, prompt text NOT NULL,
  expected_answer text, difficulty text NOT NULL DEFAULT 'medium', created_by text NOT NULL DEFAULT 'manual',
  provenance_label text NOT NULL DEFAULT 'source_grounded', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE revision_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid REFERENCES revision_sessions(id) ON DELETE SET NULL,
  question_id uuid NOT NULL REFERENCES revision_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, user_answer text,
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 5), result_notes text,
  attempted_at timestamptz NOT NULL DEFAULT now(), next_review_at timestamptz NOT NULL
);
CREATE INDEX revision_attempts_user_due_idx ON revision_attempts(user_id,next_review_at);
CREATE TABLE mastery_records (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  state mastery_state NOT NULL DEFAULT 'new', rolling_score numeric(3,2) NOT NULL DEFAULT 0,
  attempt_count integer NOT NULL DEFAULT 0, trend text NOT NULL DEFAULT 'flat',
  last_reviewed_at timestamptz, next_review_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,concept_id)
);

CREATE TABLE academic_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL, title text NOT NULL, task_type text NOT NULL,
  deadline timestamptz NOT NULL, priority task_priority NOT NULL DEFAULT 'medium', estimated_minutes integer NOT NULL DEFAULT 30,
  actual_minutes integer NOT NULL DEFAULT 0, status task_status NOT NULL DEFAULT 'not_started', progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  notes text, is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE academic_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL, target_date date, status task_status NOT NULL DEFAULT 'not_started', notes text
);
CREATE TABLE work_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL, description text, status task_status NOT NULL DEFAULT 'not_started', is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE work_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES work_projects(id) ON DELETE CASCADE,
  title text NOT NULL, deadline timestamptz, status task_status NOT NULL DEFAULT 'not_started'
);
CREATE TABLE work_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES work_projects(id) ON DELETE SET NULL, deliverable_id uuid REFERENCES work_deliverables(id) ON DELETE SET NULL,
  title text NOT NULL, deadline timestamptz NOT NULL, priority task_priority NOT NULL DEFAULT 'medium',
  estimated_minutes integer NOT NULL DEFAULT 30, actual_minutes integer NOT NULL DEFAULT 0,
  status task_status NOT NULL DEFAULT 'not_started', progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb, notes text, is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academic_tasks_deadline_idx ON academic_tasks(user_id,status,deadline);
CREATE INDEX work_tasks_deadline_idx ON work_tasks(user_id,status,deadline);

CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain data_domain NOT NULL, title text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  event_type text NOT NULL, external_provider text, external_id text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (ends_at > starts_at)
);
CREATE TABLE availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_type text NOT NULL, day_of_week smallint CHECK (day_of_week BETWEEN 0 AND 6), starts_at time,
  ends_at time, specific_date date, productive boolean NOT NULL DEFAULT false, utilization_override numeric(4,3)
);
CREATE TABLE watchdog_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain data_domain NOT NULL, entity_type text NOT NULL, entity_id uuid NOT NULL, risk_state text NOT NULL,
  explanation text NOT NULL, remaining_minutes integer, available_minutes integer, deficit_minutes integer,
  acknowledged_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL, title text NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE aic_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL, user_prompt text NOT NULL, response_text text, provenance_label text,
  model_provider text, model_name text, result_status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE evidence_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), interaction_id uuid NOT NULL REFERENCES aic_interactions(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE, source_chunk_id uuid REFERENCES source_chunks(id) ON DELETE SET NULL,
  citation_order integer NOT NULL, quoted_text text
);
CREATE TABLE podcast_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL, style text NOT NULL, source_ids uuid[] NOT NULL DEFAULT '{}',
  script_segments jsonb NOT NULL DEFAULT '[]'::jsonb, estimated_minutes integer NOT NULL,
  audio_storage_key text, voice_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  provenance_label text NOT NULL DEFAULT 'source_grounded', status text NOT NULL DEFAULT 'script_ready',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  operation text NOT NULL, entity_type text, entity_id uuid, result_status text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_user_time_idx ON audit_logs(user_id,occurred_at DESC);

COMMIT;
