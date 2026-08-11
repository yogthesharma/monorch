/*!
 * Postgres adapters for Checkpointer / ThreadMemory / MemoryStore.
 * Pass any `pg`-compatible client (`Pool`, `Client`, or custom).
 *
 * @example
 * ```ts
 * import pg from "pg";
 * import { ensureMonorchSchema, postgresCheckpointer, postgresThreads } from "@monorch/ai/postgres";
 *
 * const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
 * await ensureMonorchSchema(pool);
 * const checkpointer = postgresCheckpointer(pool);
 * const threads = postgresThreads(pool);
 * ```
 */

import { randomUUID } from "node:crypto";
import type { Checkpointer, CheckpointTuple } from "./checkpointer.js";
import type { MemoryStore, ThreadMemory } from "./memory.js";
import type { AiMessage, JsonValue } from "./types.js";

/** Minimal query surface — satisfied by `pg.Pool` / `pg.Client`. */
export type SqlQueryable = {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
};

export type PostgresAdapterOptions = {
  /** Defaults: monorch_checkpoints / monorch_thread_messages / monorch_kv */
  checkpointsTable?: string;
  threadsTable?: string;
  kvTable?: string;
};

function ident(name: string, fallback: string): string {
  const n = name || fallback;
  if (!/^[a-z_][a-z0-9_]*$/i.test(n)) {
    throw new Error(`invalid postgres table name: ${name}`);
  }
  return n;
}

/** Create tables if missing (safe to call on boot). */
export async function ensureMonorchSchema(
  db: SqlQueryable,
  opts: PostgresAdapterOptions = {},
): Promise<void> {
  const cp = ident(opts.checkpointsTable ?? "monorch_checkpoints", "monorch_checkpoints");
  const th = ident(opts.threadsTable ?? "monorch_thread_messages", "monorch_thread_messages");
  const kv = ident(opts.kvTable ?? "monorch_kv", "monorch_kv");

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${cp} (
      thread_id TEXT NOT NULL,
      checkpoint_id TEXT NOT NULL,
      blob JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (thread_id, checkpoint_id)
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS ${cp}_thread_created_idx
      ON ${cp} (thread_id, created_at DESC)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${th} (
      thread_id TEXT NOT NULL,
      seq BIGSERIAL,
      message JSONB NOT NULL,
      PRIMARY KEY (thread_id, seq)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${kv} (
      namespace TEXT NOT NULL,
      key TEXT NOT NULL,
      value JSONB NOT NULL,
      PRIMARY KEY (namespace, key)
    )
  `);
}

/** Durable graph checkpointer (latest get + full list history). */
export function postgresCheckpointer(
  db: SqlQueryable,
  opts: PostgresAdapterOptions = {},
): Checkpointer {
  const table = ident(opts.checkpointsTable ?? "monorch_checkpoints", "monorch_checkpoints");

  return {
    async put(threadId, blob) {
      const checkpointId = randomUUID();
      const createdAt = new Date().toISOString();
      await db.query(
        `INSERT INTO ${table} (thread_id, checkpoint_id, blob, created_at)
         VALUES ($1, $2, $3::jsonb, $4::timestamptz)`,
        [threadId, checkpointId, JSON.stringify(blob), createdAt],
      );
      const tuple: CheckpointTuple = { threadId, checkpointId, blob, createdAt };
      return tuple;
    },
    async get(threadId) {
      const res = await db.query(
        `SELECT blob FROM ${table}
         WHERE thread_id = $1
         ORDER BY created_at DESC, checkpoint_id DESC
         LIMIT 1`,
        [threadId],
      );
      const row = res.rows[0];
      if (!row) return null;
      return asJson(row["blob"]);
    },
    async list(threadId) {
      const res = await db.query(
        `SELECT thread_id, checkpoint_id, blob, created_at
         FROM ${table}
         WHERE thread_id = $1
         ORDER BY created_at ASC, checkpoint_id ASC`,
        [threadId],
      );
      return res.rows.map((row) => ({
        threadId: String(row["thread_id"]),
        checkpointId: String(row["checkpoint_id"]),
        blob: asJson(row["blob"]) as JsonValue,
        createdAt: toIso(row["created_at"]),
      }));
    },
  };
}

/** Durable agent thread message store. */
export function postgresThreads(
  db: SqlQueryable,
  opts: PostgresAdapterOptions = {},
): ThreadMemory {
  const table = ident(opts.threadsTable ?? "monorch_thread_messages", "monorch_thread_messages");

  return {
    async get(threadId) {
      const res = await db.query(
        `SELECT message FROM ${table}
         WHERE thread_id = $1
         ORDER BY seq ASC`,
        [threadId],
      );
      return res.rows.map((row) => asJson(row["message"]) as AiMessage);
    },
    async append(threadId, messages) {
      for (const message of messages) {
        await db.query(
          `INSERT INTO ${table} (thread_id, message) VALUES ($1, $2::jsonb)`,
          [threadId, JSON.stringify(message)],
        );
      }
    },
    async clear(threadId) {
      await db.query(`DELETE FROM ${table} WHERE thread_id = $1`, [threadId]);
    },
  };
}

/** Durable namespaced key/value MemoryStore. */
export function postgresStore(
  db: SqlQueryable,
  opts: PostgresAdapterOptions = {},
): MemoryStore {
  const table = ident(opts.kvTable ?? "monorch_kv", "monorch_kv");

  return {
    async get(namespace, key) {
      const res = await db.query(
        `SELECT value FROM ${table} WHERE namespace = $1 AND key = $2`,
        [ns(namespace), key],
      );
      const row = res.rows[0];
      if (!row) return null;
      return asJson(row["value"]);
    },
    async put(namespace, key, value) {
      await db.query(
        `INSERT INTO ${table} (namespace, key, value)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (namespace, key)
         DO UPDATE SET value = EXCLUDED.value`,
        [ns(namespace), key, JSON.stringify(value)],
      );
    },
    async delete(namespace, key) {
      await db.query(`DELETE FROM ${table} WHERE namespace = $1 AND key = $2`, [
        ns(namespace),
        key,
      ]);
    },
    async list(namespace) {
      const res = await db.query(`SELECT key FROM ${table} WHERE namespace = $1 ORDER BY key ASC`, [
        ns(namespace),
      ]);
      return res.rows.map((row) => String(row["key"]));
    },
  };
}

function ns(namespace: string[]): string {
  return namespace.join("/");
}

function asJson(value: unknown): JsonValue | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as JsonValue;
    } catch {
      return value;
    }
  }
  return value as JsonValue;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}
