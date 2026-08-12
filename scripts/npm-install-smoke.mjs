#!/usr/bin/env node
/**
 * Install published @monorch/ai from the registry into a temp dir and prove the
 * native runtime loads. Used by CI platform matrix (#14).
 *
 *   node scripts/npm-install-smoke.mjs
 *   VERSION=0.1.5 node scripts/npm-install-smoke.mjs
 *
 * Exit 0 with skip notice if the version is not on the registry yet (e.g. release
 * PR that stamped package.json before publish). Set REQUIRE_PUBLISHED=1 to fail
 * instead (release / main gates).
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgVersion = JSON.parse(readFileSync(join(root, "packages/ai/package.json"), "utf8"))
  .version;
const version = process.env.VERSION || pkgVersion;
const requirePublished = process.env.REQUIRE_PUBLISHED === "1";

function registryHas(version) {
  try {
    execSync(`npm view @monorch/ai@${version} version`, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

if (!registryHas(version)) {
  const msg = `@monorch/ai@${version} is not on the npm registry yet`;
  if (requirePublished) {
    console.error(`npm-install-smoke FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`npm-install-smoke SKIP: ${msg}`);
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "monorch-npm-install-"));
const cleanup = () => {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows can hold locks on loaded .node briefly — ignore. */
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
  // Retry briefly — registry CDN can lag right after publish.
  let lastErr;
  for (let i = 1; i <= 6; i++) {
    try {
      execSync("npm install --no-fund --no-audit", {
        cwd: dir,
        stdio: "inherit",
        env: { ...process.env, npm_config_fund: "false" },
      });
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      console.warn(`npm install attempt ${i}/6 failed; retrying in 5s…`);
      await sleep(5000);
    }
  }
  if (lastErr) throw lastErr;

  const aiRoot = join(dir, "node_modules", "@monorch", "ai");
  const runtimeRoot = join(dir, "node_modules", "@monorch", "runtime");
  // Guard against accidental workspace linking (path contains /packages/ai/ as a segment).
  const normalized = aiRoot.replace(/\\/g, "/");
  if (normalized.includes("/packages/ai/") || normalized.endsWith("/packages/ai")) {
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
