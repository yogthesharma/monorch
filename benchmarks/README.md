# Performance baselines

Timed smoke for:

- **agent_tool_loop_ms** — mock model + one tool call + final text
- **graph_interrupt_resume_ms** — start → interrupt → restore → resume

## Commands

```bash
pnpm build
pnpm bench          # write benchmarks/latest.json (seeds baseline.json if missing)
pnpm bench:check    # compare latest run to baseline.json (used in CI)
```

## Thresholds

| Env | Default | Meaning |
| --- | ------- | ------- |
| `BENCH_ITERS` | `40` | Samples per scenario |
| `BENCH_WARN_MULT` | `2` | Warn if median &gt; baseline × mult |
| `BENCH_FAIL_MULT` | `5` | Fail CI if median &gt; baseline × mult |

Baselines are **relative** guards against large regressions, not absolute SLAs. Update `baseline.json` deliberately after intentional engine changes (and note why in the PR).

## Artifacts

- `baseline.json` — checked in
- `latest.json` — written locally / in CI (gitignored if present as noise; CI uploads via job logs)
