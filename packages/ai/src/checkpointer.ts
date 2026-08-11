import type { JsonValue } from "./types.js";

export type CheckpointTuple = {
  threadId: string;
  checkpointId: string;
  blob: JsonValue;
  createdAt: string;
};

/** BYO persistence for graph runs. */
export type Checkpointer = {
  put(threadId: string, blob: JsonValue): Promise<CheckpointTuple> | CheckpointTuple;
  get(threadId: string): Promise<JsonValue | null> | JsonValue | null;
  list?(threadId: string): Promise<CheckpointTuple[]> | CheckpointTuple[];
};

/** In-memory checkpointer (tests + single-process apps). */
export function memorySaver(): Checkpointer {
  const threads = new Map<string, CheckpointTuple[]>();
  let seq = 0;
  return {
    put(threadId, blob) {
      seq += 1;
      const tuple: CheckpointTuple = {
        threadId,
        checkpointId: `cp-${seq}`,
        blob,
        createdAt: new Date().toISOString(),
      };
      const list = threads.get(threadId) ?? [];
      list.push(tuple);
      threads.set(threadId, list);
      return tuple;
    },
    get(threadId) {
      const list = threads.get(threadId);
      if (!list?.length) return null;
      return list[list.length - 1]!.blob;
    },
    list(threadId) {
      return [...(threads.get(threadId) ?? [])];
    },
  };
}
