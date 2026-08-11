/**
 * Minimal in-memory SqlQueryable for smoke tests (not a SQL engine).
 * Understands the statements issued by @monorch/ai/postgres adapters.
 */
import type { SqlQueryable } from "@monorch/ai/postgres";

type CpRow = {
  thread_id: string;
  checkpoint_id: string;
  blob: unknown;
  created_at: string;
};
type MsgRow = { thread_id: string; seq: number; message: unknown };
type KvRow = { namespace: string; key: string; value: unknown };

export function createMemorySql(): SqlQueryable {
  const checkpoints: CpRow[] = [];
  const messages: MsgRow[] = [];
  const kv: KvRow[] = [];
  let msgSeq = 0;

  return {
    async query(text, values = []) {
      const sql = text.replace(/\s+/g, " ").trim().toLowerCase();

      if (sql.startsWith("create table") || sql.startsWith("create index")) {
        return { rows: [] };
      }

      if (sql.includes("insert into monorch_checkpoints")) {
        const [thread_id, checkpoint_id, blob, created_at] = values as [
          string,
          string,
          string,
          string,
        ];
        checkpoints.push({
          thread_id,
          checkpoint_id,
          blob: JSON.parse(blob),
          created_at,
        });
        return { rows: [] };
      }

      if (sql.includes("from monorch_checkpoints") && sql.includes("limit 1")) {
        const threadId = String(values[0]);
        const rows = checkpoints
          .filter((r) => r.thread_id === threadId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const top = rows[0];
        return { rows: top ? [{ blob: top.blob }] : [] };
      }

      if (sql.includes("from monorch_checkpoints") && sql.includes("order by created_at asc")) {
        const threadId = String(values[0]);
        const rows = checkpoints
          .filter((r) => r.thread_id === threadId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((r) => ({
            thread_id: r.thread_id,
            checkpoint_id: r.checkpoint_id,
            blob: r.blob,
            created_at: r.created_at,
          }));
        return { rows };
      }

      if (sql.includes("insert into monorch_thread_messages")) {
        const [thread_id, message] = values as [string, string];
        msgSeq += 1;
        messages.push({
          thread_id,
          seq: msgSeq,
          message: JSON.parse(message),
        });
        return { rows: [] };
      }

      if (sql.includes("from monorch_thread_messages") && sql.includes("order by seq")) {
        const threadId = String(values[0]);
        const rows = messages
          .filter((r) => r.thread_id === threadId)
          .sort((a, b) => a.seq - b.seq)
          .map((r) => ({ message: r.message }));
        return { rows };
      }

      if (sql.includes("delete from monorch_thread_messages")) {
        const threadId = String(values[0]);
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i]!.thread_id === threadId) messages.splice(i, 1);
        }
        return { rows: [] };
      }

      if (sql.includes("insert into monorch_kv")) {
        const [namespace, key, value] = values as [string, string, string];
        const parsed = JSON.parse(value);
        const existing = kv.find((r) => r.namespace === namespace && r.key === key);
        if (existing) existing.value = parsed;
        else kv.push({ namespace, key, value: parsed });
        return { rows: [] };
      }

      if (sql.includes("from monorch_kv") && sql.includes("and key")) {
        const [namespace, key] = values as [string, string];
        const row = kv.find((r) => r.namespace === namespace && r.key === key);
        return { rows: row ? [{ value: row.value }] : [] };
      }

      if (sql.includes("delete from monorch_kv")) {
        const [namespace, key] = values as [string, string];
        const idx = kv.findIndex((r) => r.namespace === namespace && r.key === key);
        if (idx >= 0) kv.splice(idx, 1);
        return { rows: [] };
      }

      if (sql.includes("from monorch_kv") && sql.includes("order by key")) {
        const namespace = String(values[0]);
        const rows = kv
          .filter((r) => r.namespace === namespace)
          .sort((a, b) => a.key.localeCompare(b.key))
          .map((r) => ({ key: r.key }));
        return { rows };
      }

      throw new Error(`memorySql: unsupported query: ${text.slice(0, 120)}`);
    },
  };
}
