import "dotenv/config";
import { runMigrations } from "./db/index.js";

await runMigrations();
console.log("Migrations complete");
