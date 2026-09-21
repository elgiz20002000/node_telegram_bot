import fs from "fs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.ts";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

/** Arbitrary fixed key for the advisory lock — any int8 works, it just has to be consistent. */
const MIGRATION_LOCK_KEY = 4021;

function sha256(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Applies any migrations under ./migrations that haven't run yet.
 *
 * Safe to call from every instance at boot: `pg_advisory_xact_lock` is
 * transaction-scoped (not session-scoped), which matters because a pooled
 * Postgres endpoint (e.g. Neon's PgBouncer-in-transaction-mode) can hand a
 * session-scoped lock's connection to someone else before it's released.
 * Losing instances just find no pending work once they get the lock.
 */
export async function runMigrations(): Promise<void> {
    const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((name) => name.endsWith(".sql"))
        .sort();

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version    text PRIMARY KEY,
                checksum   text NOT NULL,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
        `);

        const { rows: applied } = await client.query<{ version: string; checksum: string }>(
            "SELECT version, checksum FROM schema_migrations",
        );
        const appliedByVersion = new Map(applied.map((row) => [row.version, row.checksum]));

        for (const file of files) {
            const version = file;
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
            const checksum = sha256(sql);
            const existingChecksum = appliedByVersion.get(version);

            if (existingChecksum !== undefined) {
                if (existingChecksum !== checksum) {
                    throw new Error(
                        `Migration ${version} was already applied but its file has changed since. ` +
                            "Never edit an applied migration — add a new one instead.",
                    );
                }
                continue;
            }

            // No parameter array: routes through the simple query protocol, so a
            // migration file with multiple statements runs as one implicit transaction.
            await client.query(sql);
            await client.query("INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)", [
                version,
                checksum,
            ]);
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    } finally {
        client.release();
    }
}
