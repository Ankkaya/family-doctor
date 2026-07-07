ALTER TABLE "consultation_session"
  ADD COLUMN IF NOT EXISTS "summary" JSONB,
  ADD COLUMN IF NOT EXISTS "summary_updated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS "consultation_session_status_idx" ON "consultation_session"("status");
