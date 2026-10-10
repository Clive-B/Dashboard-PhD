BEGIN;

CREATE TYPE permission_effect AS ENUM ('allow','deny');
CREATE TYPE jarvis_action_status AS ENUM ('requested','approved','denied','cancelled','expired','executing','succeeded','failed');

CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability text NOT NULL,
  effect permission_effect NOT NULL DEFAULT 'deny',
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > granted_at)
);
CREATE INDEX user_permissions_active_idx ON user_permissions(user_id,capability,granted_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE jarvis_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability text NOT NULL,
  action_type text NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('low','moderate','high','critical')),
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_sha256 text NOT NULL,
  status jarvis_action_status NOT NULL DEFAULT 'requested',
  approval_required boolean NOT NULL DEFAULT true,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_note text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jarvis_action_requests_user_status_idx ON jarvis_action_requests(requested_by,status,created_at DESC);

CREATE TABLE jarvis_action_events (
  id bigserial PRIMARY KEY,
  action_request_id uuid NOT NULL REFERENCES jarvis_action_requests(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jarvis_action_events_request_time_idx ON jarvis_action_events(action_request_id,occurred_at);

-- First Edition is single-owner. Existing installations promote only their
-- earliest account when no owner exists; later accounts retain least privilege.
UPDATE users
SET role='owner', updated_at=now()
WHERE id=(SELECT id FROM users ORDER BY created_at LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM users WHERE role='owner');

COMMIT;
