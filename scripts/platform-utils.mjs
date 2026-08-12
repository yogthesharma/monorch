#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const npmDir = join(root, "bindings", "node", "npm");

/** Platform package dir names under bindings/node/npm (from napi triples). */
export function listPlatformDirs() {
  if (!existsSync(npmDir)) return [];
  return readdirSync(npmDir).filter((name) =>
    existsSync(join(npmDir, name, "package.json")),
  );
}

export function expectedPlatformCount() {
  return listPlatformDirs().length;
}

/** After `napi artifacts`, every platform dir should contain a .node binary. */
export function verifyPlatformArtifacts() {
  const missing = [];
  for (const name of listPlatformDirs()) {
    const dir = join(npmDir, name);
    const hasNode = readdirSync(dir).some((f) => f.endsWith(".node"));
    if (!hasNode) missing.push(name);
  }
  return missing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] ?? "count";
  if (cmd === "count") {
    console.log(expectedPlatformCount());
    process.exit(0);
  }
  if (cmd === "verify") {
    const missing = verifyPlatformArtifacts();
    if (missing.length) {
      console.error("Missing .node artifacts for platform dirs:", missing.join(", "));
      process.exit(1);
    }
    console.log(`OK — ${expectedPlatformCount()} platform packages have .node artifacts`);
    process.exit(0);
  }
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
