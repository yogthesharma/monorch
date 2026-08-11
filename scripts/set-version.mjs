#!/usr/bin/env node
/**
 * Stamp the same semver across workspace publishable packages + Cargo workspace.
 * Usage: node scripts/set-version.mjs 0.1.1
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: node scripts/set-version.mjs <semver>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function stampJson(rel) {
  const path = join(root, rel);
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.version = version;
  if (pkg.dependencies?.["@monorch/runtime"]?.startsWith("workspace:")) {
    // keep workspace protocol for monorepo; pnpm publish rewrites it
  } else if (pkg.dependencies?.["@monorch/runtime"]) {
    pkg.dependencies["@monorch/runtime"] = version;
  }
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`updated ${rel} -> ${version}`);
}

function stampCargoToml() {
  const path = join(root, "Cargo.toml");
  let text = readFileSync(path, "utf8");
  text = text.replace(
    /(\[workspace\.package\][\s\S]*?^version\s*=\s*")[^"]+(")/m,
    `$1${version}$2`,
  );
  writeFileSync(path, text);
  console.log(`updated Cargo.toml workspace.package.version -> ${version}`);
}

stampJson("packages/ai/package.json");
stampJson("bindings/node/package.json");
stampCargoToml();
