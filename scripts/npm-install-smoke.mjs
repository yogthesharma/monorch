#!/usr/bin/env node
/**
 * Install published @monorch/ai from the registry into a temp dir and prove the
 * native runtime loads. Used by CI platform matrix (#14).
 *
 *   node scripts/npm-install-smoke.mjs
 *   VERSION=0.1.4 node scripts/npm-install-smoke.mjs
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgVersion = JSON.parse(readFileSync(join(root, "packages/ai/package.json"), "utf8"))
  .version;
const version = process.env.VERSION || pkgVersion;

const dir = mkdtempSync(join(tmpdir(), "monorch-npm-install-"));
const cleanup = () => {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
};

try {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "monorch-npm-install-smoke",
        private: true,
        type: "module",
        dependencies: { "@monorch/ai": version },
      },
      null,
      2,
    ),
  );

  console.log(`npm-install-smoke: installing @monorch/ai@${version} in ${dir}`);
  execSync("npm install --no-fund --no-audit", {
    cwd: dir,
    stdio: "inherit",
    env: { ...process.env, npm_config_fund: "false" },
  });

  const aiRoot = join(dir, "node_modules", "@monorch", "ai");
  const runtimeRoot = join(dir, "node_modules", "@monorch", "runtime");
  if (aiRoot.includes(`${join("packages", "ai")}`)) {
    throw new Error(`expected registry install, got workspace path: ${aiRoot}`);
  }

  const installed = JSON.parse(readFileSync(join(aiRoot, "package.json"), "utf8")).version;
  if (installed !== version) {
    throw new Error(`expected @monorch/ai@${version}, got ${installed}`);
  }

  const mod = await import(pathToFileURL(join(aiRoot, "dist", "index.js")).href);
  if (typeof mod.agent !== "function" || typeof mod.getRuntime !== "function") {
    throw new Error("published @monorch/ai missing agent/getRuntime exports");
  }
  const runtime = mod.getRuntime();
  if (typeof runtime.toolRegister !== "function") {
    throw new Error("native runtime missing toolRegister — wrong/missing platform binary?");
  }

  console.log("npm-install-smoke OK", {
    version: installed,
    platform: `${process.platform}-${process.arch}`,
    ai: aiRoot,
    runtime: runtimeRoot,
  });
} catch (err) {
  cleanup();
  console.error(err);
  process.exit(1);
}

cleanup();
