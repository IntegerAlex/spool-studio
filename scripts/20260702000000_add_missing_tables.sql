-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Upload sessions
CREATE TABLE IF NOT EXISTS upload_sessions (
  id uuid PRIMARY KEY,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  r2_key text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Notifications
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('approval', 'revision', 'upload', 'comment', 'assigned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text,
  related_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Upload queue
DO $$ BEGIN
  CREATE TYPE queue_platform AS ENUM ('instagram', 'tiktok', 'youtube');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE queue_status AS ENUM ('pending', 'scheduled', 'uploaded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS upload_queue (
  id uuid PRIMARY KEY,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  scheduled_date timestamptz NOT NULL,
  platform queue_platform NOT NULL,
  status queue_status DEFAULT 'scheduled',
  caption text,
  hashtags jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_queue_scheduled_date ON upload_queue(scheduled_date);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  logo text,
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('admin', 'designer', 'approver');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  role member_role NOT NULL,
  joined_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_workspace_id ON team_members(workspace_id);
