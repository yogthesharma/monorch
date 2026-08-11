#!/usr/bin/env node
/**
 * Stamp @monorch/runtime optionalDependencies from napi platform dirs.
 * Mirrors what `napi prepublish` writes, without publishing.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const nodeDir = join(dirname(fileURLToPath(import.meta.url)), "..", "bindings", "node");
const pkgPath = join(nodeDir, "package.json");
const npmDir = join(nodeDir, "npm");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const version = pkg.version;
const scopeName = pkg.name; // @monorch/runtime

if (!existsSync(npmDir)) {
  console.error("Missing bindings/node/npm — run: pnpm exec napi create-npm-dir -t .");
  process.exit(1);
}

const optionalDependencies = {};
for (const name of readdirSync(npmDir)) {
  const platformPkg = join(npmDir, name, "package.json");
  if (!existsSync(platformPkg)) continue;
  optionalDependencies[`${scopeName}-${name}`] = version;
}

if (!Object.keys(optionalDependencies).length) {
  console.error("No platform packages found under bindings/node/npm");
  process.exit(1);
}

pkg.optionalDependencies = optionalDependencies;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("Stamped optionalDependencies:");
for (const [k, v] of Object.entries(optionalDependencies)) console.log(`  ${k}@${v}`);
