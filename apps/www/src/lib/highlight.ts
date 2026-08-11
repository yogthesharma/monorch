import { codeToHtml } from "shiki";

export type HighlightLang =
  | "typescript"
  | "tsx"
  | "javascript"
  | "bash"
  | "shell"
  | "json"
  | "rust"
  | "text";

export async function highlight(
  code: string,
  lang: HighlightLang = "typescript",
): Promise<string> {
  return codeToHtml(code.trim(), {
    lang,
    theme: "everforest-dark",
  });
}
