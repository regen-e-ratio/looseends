// Applies pending SQL migrations from ./drizzle. Runs automatically before `next build`,
// so every Vercel deploy brings the database schema up to date.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  if (process.env.VERCEL) {
    console.error("✖ DATABASE_URL is not set. Connect a Neon database in Vercel → Storage, then redeploy.");
    process.exit(1);
  }
  console.warn("⚠ DATABASE_URL not set — skipping migrations.");
  process.exit(0);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("✔ Database migrations applied");
} finally {
  await sql.end();
}
