import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

let loaded = false;

export function loadEnv() {
  if (loaded) {
    return;
  }

  const mode = process.env.NODE_ENV || 'development';
  const filenames = [
    `.env.${mode}.local`,
    `.env.local`,
    `.env.${mode}`,
    '.env',
  ];

  const searchDirs = Array.from(
    new Set([process.cwd(), __dirname]),
  );

  for (const dir of searchDirs) {
    for (const filename of filenames) {
      const filePath = path.resolve(dir, filename);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      dotenv.config({ path: filePath, override: false });
    }
  }

  loaded = true;
}

loadEnv();
