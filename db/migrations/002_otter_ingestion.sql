BEGIN;

CREATE TYPE otter_ingestion_status AS ENUM ('received','awaiting_transcript','awaiting_match','ready','failed');

CREATE TABLE otter_ingestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_recording_id text NOT NULL,
  title text NOT NULL,
  occurred_at timestamptz NOT NULL,
  transcript text,
  summary text,
  speaker_names text[] NOT NULL DEFAULT '{}',
  course_hint text,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  lecture_id uuid REFERENCES lectures(id) ON DELETE SET NULL,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  status otter_ingestion_status NOT NULL DEFAULT 'received',
  available_at timestamptz NOT NULL DEFAULT now(),
  recommended_at timestamptz NOT NULL,
  early_started_at timestamptz,
  matched_at timestamptz,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, external_recording_id)
);

CREATE INDEX otter_ingestions_user_status_idx ON otter_ingestions(user_id,status,created_at DESC);
CREATE INDEX otter_ingestions_recommended_idx ON otter_ingestions(user_id,recommended_at);
CREATE UNIQUE INDEX calendar_otter_lesson_unique_idx ON calendar_events(user_id,external_provider,external_id,event_type) WHERE external_provider='otter';

COMMIT;
