import "dotenv/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./schema.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

export async function runMigrations() {
	await migrate(db, { migrationsFolder });
}
