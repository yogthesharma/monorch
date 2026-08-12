import { createRequire } from "node:module";
import { fromNativeError } from "./errors.js";

const require = createRequire(import.meta.url);

export type RuntimeEngine = {
  parse(schema: unknown, value: unknown): { ok: boolean; value?: unknown; errors?: unknown };
  toJsonSchema(schema: unknown): unknown;
  toolRegister(spec: unknown): void;
  toolRegisterWith(spec: unknown, replace: boolean): void;
  toolList(): unknown;
  toolPrepare(
    name: string,
    caller: unknown,
    args: unknown,
  ): { ok: boolean; value?: unknown; error?: unknown };
  agentStart(config: unknown, user: string): unknown;
  agentContinue(config: unknown, messages: unknown): unknown;
  agentDecide(runId: string, decision: unknown): unknown;
  agentToolResults(runId: string, results: unknown): unknown;
  agentGet(runId: string): unknown | null;
  graphRegister(def: unknown): void;
  graphRegisterWith(def: unknown, replace: boolean): void;
  graphUnregister(name: string): boolean;
  graphStart(name: string, state: unknown): unknown;
  graphAdvance(runId: string): unknown;
  graphCompleteNode(
    runId: string,
    nodeId: string,
    output?: string | null,
    statePatch?: unknown | null,
  ): unknown;
  graphFailNode(runId: string, error: string): unknown;
  graphResumeInterrupt(runId: string): unknown;
  graphCompleteInterrupt(runId: string, decision: string): unknown;
  graphRoute(runId: string, to: string): unknown;
  graphGet(runId: string): unknown | null;
  graphCheckpointExport(runId: string): unknown;
  graphCheckpointRestore(blob: unknown): unknown;
  graphDrop(runId: string): boolean;
  agentDrop(runId: string): boolean;
  workflowRegister(def: unknown): void;
  workflowStart(name: string): unknown;
  workflowAdvance(runId: string): unknown;
  workflowCompleteStep(runId: string, key?: string | null, value?: string | null): unknown;
  workflowFailStep(runId: string, error: string): unknown;
  workflowResumeHuman(runId: string): unknown;
};

type EngineCtor = new () => RuntimeEngine;

const binding = require("@monorch/runtime") as { Engine: EngineCtor };

export const NativeEngine: EngineCtor = binding.Engine;

let shared: RuntimeEngine | null = null;

function wrapEngine(raw: RuntimeEngine): RuntimeEngine {
  return new Proxy(raw, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        try {
          return value.apply(target, args);
        } catch (err) {
          throw fromNativeError(err);
        }
      };
    },
  });
}

/** Process-wide runtime engine (Rust). Native throws are remapped to AiError. */
export function getRuntime(): RuntimeEngine {
  if (!shared) shared = wrapEngine(new NativeEngine());
  return shared;
}
