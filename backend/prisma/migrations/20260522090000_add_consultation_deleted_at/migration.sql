ALTER TABLE "consultation_session" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "consultation_session_deleted_at_idx" ON "consultation_session"("deleted_at");
