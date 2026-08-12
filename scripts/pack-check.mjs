#!/usr/bin/env node
/**
 * Local publish readiness check:
 * - build TS + native (current platform)
 * - create npm platform dirs
 * - stamp optionalDependencies (without publishing)
 * - pnpm pack both packages
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, cwd = root) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run("pnpm", ["build"]);
run("pnpm", ["exec", "napi", "create-npm-dir", "-t", "."], join(root, "bindings/node"));
run("node", ["scripts/stamp-optional-deps.mjs"]);

const packs = join(root, "packs");
rmSync(packs, { recursive: true, force: true });
mkdirSync(packs, { recursive: true });

run("pnpm", ["pack", "--pack-destination", packs], join(root, "bindings/node"));
run("pnpm", ["pack", "--pack-destination", packs], join(root, "packages/ai"));

const runtimePkg = JSON.parse(readFileSync(join(root, "bindings/node", "package.json"), "utf8"));
const opts = Object.keys(runtimePkg.optionalDependencies ?? {});
if (opts.length < 8) {
  console.error(`Expected >=8 optionalDependencies, got ${opts.length}:`, opts);
  process.exit(1);
}

console.log("\nPacks:");
for (const f of readdirSync(packs)) console.log(`  ${f}`);
console.log("\noptionalDependencies:");
for (const k of opts.sort()) console.log(`  ${k}`);
console.log("\nOK — local pack check passed (current platform only).");
