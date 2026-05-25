DO $$ BEGIN
  CREATE TYPE "OtcType" AS ENUM ('OTC', 'RX');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MsgRole" AS ENUM ('USER', 'ASSISTANT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "medicine_catalog" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "otc" "OtcType" NOT NULL,
  "indication" TEXT NOT NULL,
  "contraindication" TEXT,
  "adverse_reaction" TEXT,
  "dosage" TEXT,
  "barcode" TEXT,
  "approval_number" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "medicine_catalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "medicine_catalog_barcode_key" ON "medicine_catalog"("barcode");
CREATE INDEX IF NOT EXISTS "medicine_catalog_name_idx" ON "medicine_catalog"("name");

CREATE TABLE IF NOT EXISTS "consultation_session" (
  "id" TEXT NOT NULL,
  "dev_user_id" TEXT NOT NULL,
  "title" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consultation_session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consultation_session_dev_user_id_created_at_idx"
  ON "consultation_session"("dev_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "consultation_message" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "role" "MsgRole" NOT NULL,
  "content" TEXT NOT NULL,
  "recommends" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consultation_message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consultation_message_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "consultation_session"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "consultation_message_session_id_created_at_idx"
  ON "consultation_message"("session_id", "created_at");

CREATE TABLE IF NOT EXISTS "agent_trace" (
  "id" TEXT NOT NULL,
  "session_id" TEXT,
  "node_name" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "output" JSONB NOT NULL,
  "llm_model" TEXT,
  "token_in" INTEGER,
  "token_out" INTEGER,
  "latency_ms" INTEGER NOT NULL,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_trace_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_trace_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "consultation_session"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_trace_session_id_created_at_idx"
  ON "agent_trace"("session_id", "created_at");
CREATE INDEX IF NOT EXISTS "agent_trace_created_at_idx" ON "agent_trace"("created_at");
