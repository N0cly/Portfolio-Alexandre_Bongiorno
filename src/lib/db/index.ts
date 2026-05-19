import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.local.example to .env.local and configure your Neon connection string.",
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

type DbType = ReturnType<typeof createDb>;

let _db: DbType | null = null;

export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    if (!_db) _db = createDb();
    return Reflect.get(_db, prop);
  },
});

export { schema };
