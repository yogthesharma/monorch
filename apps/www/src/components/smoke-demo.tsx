"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const frames: Array<{ label: string; lines: string[] }> = [
  {
    label: "POST /support/stream",
    lines: [
      'data: {"type":"run_start","kind":"agent","name":"math"}',
      'data: {"type":"tool_call","name":"add"}',
      'data: {"type":"tool_result","content":"{\\"sum\\":5}"}',
      'data: {"type":"text","text":"2 + 3 = 5"}',
      'data: {"type":"run_end","status":"completed"}',
    ],
  },
  {
    label: "POST /refund → waitingInterrupt",
    lines: [
      'data: {"type":"run_start","kind":"graph","name":"refund"}',
      'data: {"type":"node_end","nodeId":"lookup"}',
      'data: {"type":"interrupt","nodeId":"approve"}',
      'data: {"type":"run_end","status":"waitingInterrupt"}',
      "// checkpoint saved for thread t1",
    ],
  },
  {
    label: "POST /refund/t1/resume",
    lines: [
      '// restore(t1) → resume("approved")',
      'data: {"type":"node_end","nodeId":"pay"}',
      'data: {"type":"run_end","status":"completed"}',
      '// outputs.pay = "refunded:order:ord_9"',
    ],
  },
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Read-only animated terminal: library smoke, not a Studio. */
export function SmokeDemo({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0);
  const [visible, setVisible] = useState(() =>
    prefersReducedMotion() ? frames[0]!.lines.length : 0,
  );
  const [reduced, setReduced] = useState(false);
  const current = frames[frame]!;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      if (mq.matches) setVisible(frames[frame]!.lines.length);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [frame]);

  useEffect(() => {
    if (reduced) {
      setVisible(current.lines.length);
      return;
    }

    setVisible(0);
    let count = 0;
    const lineTimer = window.setInterval(() => {
      count += 1;
      setVisible(count);
      if (count >= current.lines.length) {
        window.clearInterval(lineTimer);
      }
    }, 420);

    return () => window.clearInterval(lineTimer);
  }, [frame, current.lines.length, reduced]);

  useEffect(() => {
    if (reduced) return;
    if (visible < current.lines.length) return;
    const next = window.setTimeout(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 1600);
    return () => window.clearTimeout(next);
  }, [visible, current.lines.length, reduced]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/70 bg-[#0a1410] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <div className="flex min-w-0 items-center justify-between border-b border-border/50 px-3 py-2.5 sm:px-4">
        <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {current.label}
        </p>
        <div className="ml-3 flex shrink-0 gap-1.5" aria-hidden>
          {frames.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show demo frame ${i + 1}`}
              onClick={() => {
                setFrame(i);
                if (reduced) setVisible(frames[i]!.lines.length);
              }}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                i === frame ? "bg-signal" : "bg-muted-foreground/40 hover:bg-muted-foreground/70",
              )}
            />
          ))}
        </div>
      </div>
      <pre
        className="min-h-[11.5rem] overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-foreground/90 sm:text-[13px]"
        aria-live="polite"
      >
        {current.lines.slice(0, visible).map((line, i) => (
          <div
            key={`${frame}-${i}`}
            className={cn(
              "whitespace-pre-wrap break-all",
              line.startsWith("//") ? "text-muted-foreground" : "text-signal/90",
            )}
          >
            {line}
          </div>
        ))}
        {!reduced ? (
          <span className="inline-block h-4 w-1.5 animate-pulse bg-signal/80 align-middle" />
        ) : null}
      </pre>
    </div>
  );
}
