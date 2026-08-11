/**
 * Hero visual: readable control-plane flow on the right.
 * Animated signal path: server → @monorch/ai → Rust engine → outputs.
 */
export function HeroPlane() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid-haze opacity-50" />
      <div className="absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-signal/5 via-transparent to-transparent" />
    </div>
  );
}

/** Meaningful architecture panel for the hero. */
export function HeroDiagram() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
      <div className="rounded-lg border border-border/70 bg-card/40 p-5 backdrop-blur-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            How it sits in your backend
          </p>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-signal">
            <span className="hero-live-dot h-1.5 w-1.5 rounded-full bg-signal" />
            live path
          </span>
        </div>

        <div className="mt-5 space-y-3">
          <Node
            title="Your server"
            detail="Fastify · Hono · Nest"
            tone="muted"
            step={0}
          />
          <Arrow label="route handlers call" step={1} />
          <Node
            title="@monorch/ai"
            detail="agent · tool · graph · stream"
            tone="accent"
            step={2}
          />
          <Arrow label="state + validate in" step={3} />
          <Node
            title="Rust engine"
            detail="schema · permissions · cursors"
            tone="strong"
            step={4}
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
          <Leaf title="Models" detail="OpenAI / LiteLLM" step={5} />
          <Leaf title="Events" detail="AiEvent → SSE" step={6} />
          <Leaf title="Resume" detail="checkpoint / HITL" step={7} />
        </div>
      </div>
    </div>
  );
}

function Node({
  title,
  detail,
  tone,
  step,
}: {
  title: string;
  detail: string;
  tone: "muted" | "accent" | "strong";
  step: number;
}) {
  const toneClass =
    tone === "strong"
      ? "border-signal/40 bg-signal/10"
      : tone === "accent"
        ? "border-border bg-secondary/50"
        : "border-border/70 bg-background/40";

  return (
    <div className={`hero-flow-node rounded-md border px-4 py-3 ${toneClass}`} data-step={step}>
      <p className="font-mono text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function Arrow({ label, step }: { label: string; step: number }) {
  return (
    <div className="hero-flow-arrow flex items-center gap-3 px-1" data-step={step}>
      <div className="relative flex h-7 w-6 items-center justify-center overflow-hidden">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
        <span className="hero-flow-pulse absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-signal shadow-[0_0_10px_hsl(84_72%_52%/0.55)]" />
      </div>
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function Leaf({
  title,
  detail,
  step,
}: {
  title: string;
  detail: string;
  step: number;
}) {
  return (
    <div
      className="hero-flow-leaf rounded-md border border-border/50 bg-background/30 px-2.5 py-2.5 text-center"
      data-step={step}
    >
      <p className="font-mono text-xs font-medium text-foreground/90">{title}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{detail}</p>
    </div>
  );
}
