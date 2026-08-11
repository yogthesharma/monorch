import { highlight, type HighlightLang } from "@/lib/highlight";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  lang?: HighlightLang;
  filename?: string;
  className?: string;
};

/** Server-side Shiki highlighter for homepage + docs. */
export async function CodeBlock({
  code,
  lang = "typescript",
  filename,
  className,
}: CodeBlockProps) {
  const trimmed = code.trim();
  const html = await highlight(trimmed, lang);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border/80 bg-[#1e2326]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-[#151a1c] px-3 py-2">
        <span className="font-mono text-sm text-muted-foreground">
          {filename ?? lang}
        </span>
        <div className="flex items-center gap-1">
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60 sm:inline">
            {lang}
          </span>
          <CopyButton text={trimmed} />
        </div>
      </div>
      <div
        className="code-block overflow-x-auto px-1 py-1 text-[0.95rem] leading-relaxed [&_pre]:m-0 [&_pre]:p-5 [&_code]:font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
