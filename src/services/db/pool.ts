import pg from "pg";
import { env } from "../../config/env.ts";

const { Pool } = pg;

/**
 * `pg` ships CommonJS-only exports; under `type: module` with no build step,
 * `import { Pool } from "pg"` resolves to `undefined` at runtime instead of
 * failing at compile time, so the default import is required here.
 */
export const pool = new Pool({
    connectionString: env.databaseUrl,
    max: 5,
});
