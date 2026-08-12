import Link from "next/link";
import {
  DocCode,
  DocH1,
  DocH2,
  DocLead,
  DocP,
  DocTerm,
  DocTerms,
} from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/recipes/structured-output")!;
export const metadata = docMetadata(page);

export default function StructuredOutputRecipePage() {
  return (
    <>
      <DocH1>Structured output</DocH1>
      <DocLead>
        End-to-end path: Zod schema → IR → model JSON → Rust{" "}
        <code className="font-mono text-sm">parse</code>. Use{" "}
        <code className="font-mono text-sm">model(provider).generateObject</code> when you need a
        typed object, not free text.
      </DocLead>

      <DocH2>Happy path</DocH2>
      <DocCode lang="typescript" filename="structured.ts">{`import { model, mock } from "@monorch/ai";
import { z } from "zod";

const handle = model(
  mock([{ text: JSON.stringify({ city: "Lisbon", tempC: 22 }) }]),
);

const Weather = z.object({
  city: z.string(),
  tempC: z.number(),
});

const weather = await handle.generateObject({
  prompt: "Weather in Lisbon as JSON",
  output: Weather,
});
// weather: { city: "Lisbon", tempC: 22 }`}</DocCode>

      <DocH2>Pipeline</DocH2>
      <DocTerms>
        <DocTerm name="1. Zod">
          You pass a Zod schema as <code className="font-mono text-sm">output</code>. Exotic{" "}
          <code className="font-mono text-sm">refine</code> / <code className="font-mono text-sm">transform</code>{" "}
          / <code className="font-mono text-sm">pipe</code> are not mirrored in IR — keep schemas in
          the common subset (objects, primitives, arrays, enums, optional, union).
        </DocTerm>
        <DocTerm name="2. zodToIr">
          Monorch compiles the schema to IR for the Rust validator (
          <code className="font-mono text-sm">zodToIr</code> is also a public export if you need IR
          for tools).
        </DocTerm>
        <DocTerm name="3. Model text">
          The provider is asked for JSON-only. Empty text →{" "}
          <code className="font-mono text-sm">EMPTY_OUTPUT</code>. Unparseable →{" "}
          <code className="font-mono text-sm">INVALID_JSON</code> (including markdown fences that
          still do not contain valid JSON — never a raw{" "}
          <code className="font-mono text-sm">SyntaxError</code>).
        </DocTerm>
        <DocTerm name="4. Rust parse">
          <code className="font-mono text-sm">getRuntime().parse(ir, json)</code> validates. Failure →{" "}
          <code className="font-mono text-sm">VALIDATION_FAILED</code> with{" "}
          <code className="font-mono text-sm">details.errors</code>.
        </DocTerm>
      </DocTerms>

      <DocH2>Failure cases</DocH2>
      <DocCode lang="typescript" filename="structured-fail.ts">{`import { AiError, model, mock } from "@monorch/ai";
import { z } from "zod";

const Schema = z.object({ n: z.number() });

try {
  await model(mock([{ text: "not-json" }])).generateObject({
    prompt: "x",
    output: Schema,
  });
} catch (e) {
  // e instanceof AiError && e.code === "INVALID_JSON"
}

try {
  await model(mock([{ text: '{"n":"nope"}' }])).generateObject({
    prompt: "x",
    output: Schema,
  });
} catch (e) {
  // e instanceof AiError && e.code === "VALIDATION_FAILED"
}`}</DocCode>

      <DocH2>Gaps vs “full” structured output</DocH2>
      <DocP>
        This path validates <strong>after</strong> generation. It does not bind provider-native
        JSON-schema / tool-choice constrained decoding. For OpenAI-compatible hosts that support
        response formats, you can still pass provider options on raw{" "}
        <code className="font-mono text-sm">generate</code> / <code className="font-mono text-sm">stream</code>{" "}
        and then validate with the same Zod schema yourself —{" "}
        <code className="font-mono text-sm">generateObject</code> is the batteries-included loop
        for mock + OpenAI-compatible text JSON.
      </DocP>
      <DocP>
        Error catalog:{" "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Errors &amp; failure modes
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/recipes/structured-output"
        items={[
          {
            q: "Is this the same as tool input validation?",
            a: "Same IR + Rust parse stack. Tools run prepare before execute; generateObject runs parse after the model returns text.",
          },
          {
            q: "Can I use generateObject with openai()?",
            a: "Yes. Wrap openai(...) with model(provider) first, then call generateObject.",
          },
        ]}
      />
    </>
  );
}
