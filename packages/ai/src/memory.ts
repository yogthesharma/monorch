import type { AiMessage, JsonValue } from "./types.js";

/** Long-lived key/value memory (BYO Redis/Postgres later). */
export type MemoryStore = {
  get(namespace: string[], key: string): Promise<JsonValue | null> | JsonValue | null;
  put(
    namespace: string[],
    key: string,
    value: JsonValue,
  ): Promise<void> | void;
  delete?(namespace: string[], key: string): Promise<void> | void;
  list?(namespace: string[]): Promise<string[]> | string[];
};

/** Conversation thread memory (distinct from graph checkpoints). */
export type ThreadMemory = {
  get(threadId: string): Promise<AiMessage[]> | AiMessage[];
  append(threadId: string, messages: AiMessage[]): Promise<void> | void;
  clear?(threadId: string): Promise<void> | void;
};

function nsKey(namespace: string[], key: string): string {
  return `${namespace.join("/")}\0${key}`;
}

/** Process-local MemoryStore. */
export function inMemoryStore(): MemoryStore {
  const map = new Map<string, JsonValue>();
  return {
    get(namespace, key) {
      return map.get(nsKey(namespace, key)) ?? null;
    },
    put(namespace, key, value) {
      map.set(nsKey(namespace, key), value);
    },
    delete(namespace, key) {
      map.delete(nsKey(namespace, key));
    },
    list(namespace) {
      const prefix = `${namespace.join("/")}\0`;
      const keys: string[] = [];
      for (const k of map.keys()) {
        if (k.startsWith(prefix)) keys.push(k.slice(prefix.length));
      }
      return keys;
    },
  };
}

/** Process-local thread message store. */
export function inMemoryThreads(): ThreadMemory {
  const threads = new Map<string, AiMessage[]>();
  return {
    get(threadId) {
      return [...(threads.get(threadId) ?? [])];
    },
    append(threadId, messages) {
      const cur = threads.get(threadId) ?? [];
      cur.push(...messages);
      threads.set(threadId, cur);
    },
    clear(threadId) {
      threads.delete(threadId);
    },
  };
}
