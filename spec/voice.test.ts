import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md rule 7's banned-everywhere list. The two structural bans in that
// rule — "it's not just X, it's Y" and "any sentence whose only content is
// that the subject is interesting" — aren't literal phrases and aren't
// checked here; they need a reader, not a regex. Extend this list as rule 7
// grows.
export const BANNED_PHRASES = [
  "delve",
  "tapestry",
  "landscape",
  "journey",
  "realm",
  "dive into",
  "unlock",
  "in today's",
  "explore the fascinating",
];

function findHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findHtmlFiles(full));
    } else if (entry.endsWith(".html")) {
      results.push(full);
    }
  }
  return results;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#39|amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ENTITIES[name]);
}

// Rendered body text, with <script>/<style> and anything inside <code> or
// <pre> removed first — a quoted specimen may legitimately use a banned word.
function visibleText(html: string): string {
  const withoutOpaque = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, " ");
  return decodeEntities(withoutOpaque.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}

function escapeRegExp(phrase: string): string {
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const htmlFiles = findHtmlFiles(resolve("dist"));

describe("voice", () => {
  it("builds at least one page to check", () => {
    expect(htmlFiles.length).toBeGreaterThan(0);
  });

  it.each(htmlFiles)("keeps %s free of banned phrases", (file) => {
    const text = visibleText(readFileSync(file, "utf8"));
    const hits = BANNED_PHRASES.filter((phrase) =>
      new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i").test(text),
    );
    expect(hits, `${file} uses banned phrase(s): ${hits.join(", ")}`).toEqual([]);
  });
});
