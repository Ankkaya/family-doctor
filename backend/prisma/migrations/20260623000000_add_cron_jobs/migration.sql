CREATE TABLE IF NOT EXISTS "cron_job" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "household_id" TEXT NOT NULL,
  "member_id" TEXT,
  "type" TEXT NOT NULL,
  "task_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'enabled',
  "cron_expression" TEXT,
  "every_seconds" INTEGER,
  "run_at" TIMESTAMP(3),
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "source" TEXT NOT NULL DEFAULT 'user_agent',
  "idempotency_key" TEXT,
  "next_run_at" TIMESTAMP(3),
  "last_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "cron_job_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cron_job_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cron_job_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cron_job_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "household_member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cron_job_type_check" CHECK ("type" IN ('cron', 'every', 'at')),
  CONSTRAINT "cron_job_task_type_check" CHECK ("task_type" IN ('medicine', 'temperature', 'cabinet')),
  CONSTRAINT "cron_job_status_check" CHECK ("status" IN ('enabled', 'disabled', 'expired')),
  CONSTRAINT "cron_job_source_check" CHECK ("source" IN ('user_agent', 'system'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "cron_job_idempotency_key_key" ON "cron_job"("idempotency_key");
CREATE INDEX IF NOT EXISTS "cron_job_household_id_status_idx" ON "cron_job"("household_id", "status");
CREATE INDEX IF NOT EXISTS "cron_job_user_id_idx" ON "cron_job"("user_id");
CREATE INDEX IF NOT EXISTS "cron_job_task_type_idx" ON "cron_job"("task_type");
CREATE INDEX IF NOT EXISTS "cron_job_next_run_at_idx" ON "cron_job"("next_run_at");
CREATE INDEX IF NOT EXISTS "cron_job_deleted_at_idx" ON "cron_job"("deleted_at");

CREATE TABLE IF NOT EXISTS "cron_job_execution" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "result" JSONB,
  "error_message" TEXT,
  "dedupe_key" TEXT,
  CONSTRAINT "cron_job_execution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cron_job_execution_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "cron_job"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cron_job_execution_status_check" CHECK ("status" IN ('success', 'failed', 'skipped'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "cron_job_execution_dedupe_key_key" ON "cron_job_execution"("dedupe_key");
CREATE INDEX IF NOT EXISTS "cron_job_execution_job_id_started_at_idx" ON "cron_job_execution"("job_id", "started_at");
CREATE INDEX IF NOT EXISTS "cron_job_execution_status_idx" ON "cron_job_execution"("status");
