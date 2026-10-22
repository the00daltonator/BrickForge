// Creates or updates the local development database (Cloudflare D1 emulated by
// Miniflare in .wrangler/state) by applying the SQL migrations in drizzle/.
// Safe to run more than once: Wrangler records which migrations were applied.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync(".wrangler", { recursive: true });
const config = ".wrangler/db-setup.wrangler.json";
writeFileSync(config, JSON.stringify({
  name: "brickforge-local",
  compatibility_date: "2026-05-15",
  d1_databases: [{
    binding: "DB",
    database_name: "site-creator-d1",
    database_id: "00000000-0000-4000-8000-000000000000",
    migrations_dir: "../drizzle",
  }],
}, null, 2));

const result = spawnSync(process.execPath, [
  "node_modules/wrangler/bin/wrangler.js", "d1", "migrations", "apply", "DB",
  "--local", "--config", config, "--persist-to", ".wrangler/state",
], { stdio: "inherit", env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
process.exit(result.status ?? 1);
