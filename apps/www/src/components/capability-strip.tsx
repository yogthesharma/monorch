import Link from "next/link";
import { cn } from "@/lib/utils";

const items = [
  { href: "/docs/streaming", label: "AiEvent stream", hint: "SSE-ready" },
  { href: "/docs/graphs", label: "Graphs", hint: "branch + interrupt" },
  { href: "/docs/checkpoints", label: "Checkpoints", hint: "resume threads" },
  { href: "/docs/mcp", label: "MCP tools", hint: "BYO transport" },
  { href: "/docs/observability", label: "OTel hooks", hint: "via events" },
  { href: "/docs/memory", label: "Memory", hint: "store + threads" },
];

/** Quiet strip of what ships today. Links into docs. */
export function CapabilityStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-y border-border/60 bg-background/40 backdrop-blur-sm",
        className,
      )}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-4 px-4 py-4 sm:grid-cols-3 sm:gap-x-6 sm:px-6 sm:py-5 lg:grid-cols-6 lg:gap-x-4 lg:px-8">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group min-w-0 rounded-md py-0.5 transition-colors hover:text-signal"
          >
            <span className="block truncate font-mono text-sm text-foreground/90 group-hover:text-signal">
              {item.label}
            </span>
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">
              {item.hint}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
