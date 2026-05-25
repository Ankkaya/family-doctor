import Database from "@tauri-apps/plugin-sql";
import { isTauri } from "@/shared/lib/platform";

let databasePromise: Promise<Database> | null = null;

export async function getDatabase() {
  if (!isTauri()) {
    throw new Error("SQLite is only available inside Tauri runtime");
  }

  if (!databasePromise) {
    databasePromise = Database.load("sqlite:family-doctor.db");
  }

  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  return db;
}

