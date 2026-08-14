DROP TABLE IF EXISTS "user_medicine_inventory";

DROP INDEX IF EXISTS "consultation_session_dev_user_id_created_at_idx";
ALTER TABLE "consultation_session" DROP COLUMN IF EXISTS "dev_user_id";
