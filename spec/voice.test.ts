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
  lsquo: "'",
  rsquo: "'",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(#39|amp|lt|gt|quot|apos|nbsp|lsquo|rsquo);/g,
    (_, name) => ENTITIES[name],
  );
}

// The build's markdown renderer turns straight apostrophes into typographic
// ones (U+2018/U+2019) before this test ever sees the HTML — "today's" is
// rendered "today’s". Normalise curly quotes to straight ones so a banned
// phrase written with a plain apostrophe still matches what the build
// actually emits, without needing a second, curly-quoted copy of every entry.
function normaliseQuotes(text: string): string {
  return text.replace(/[‘’]/g, "'");
}

// Rendered body text, with <script>/<style>, anything inside <code> or
// <pre>, and any element carrying a `data-specimen` attribute removed first.
// `data-specimen` is the proposed contract for a quoted mistranslation
// (e.g. `<blockquote data-specimen>`): a real specimen may legitimately
// contain a banned word, and disclosing that belongs on the page for the
// reader, not in a workaround that shrinks this list.
function visibleText(html: string): string {
  const withoutOpaque = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, " ")
    .replace(/<(\w+)\b[^>]*\bdata-specimen\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  return normaliseQuotes(
    decodeEntities(withoutOpaque.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " "),
  );
}

function escapeRegExp(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches a phrase's head word plus any suffix it's carrying — "delve" also
// catches "delves", "delved", "delving"; "tapestry" also catches
// "tapestries" — so an inflected form doesn't need its own list entry.
// Short words (len <= 3, e.g. "in") are left exact: they're function words
// in this list, not the verb/noun that inflects.
function headPattern(word: string): string {
  if (word.length <= 3) return escapeRegExp(word);
  const stem = word.replace(/[ey]$/i, "");
  return `${escapeRegExp(stem)}\\w*`;
}

function phraseRegex(phrase: string): RegExp {
  const [head, ...rest] = phrase.split(/\s+/);
  const pattern = [headPattern(head), ...rest.map(escapeRegExp)].join("\\s+");
  return new RegExp(`\\b${pattern}\\b`, "i");
}

const PHRASE_MATCHERS = BANNED_PHRASES.map((phrase) => ({ phrase, regex: phraseRegex(phrase) }));

const htmlFiles = findHtmlFiles(resolve("dist"));

describe("voice", () => {
  it("builds at least one page to check", () => {
    expect(htmlFiles.length).toBeGreaterThan(0);
  });

  it.each(htmlFiles)("keeps %s free of banned phrases", (file) => {
    const text = visibleText(readFileSync(file, "utf8"));
    const hits = PHRASE_MATCHERS.filter(({ regex }) => regex.test(text)).map(
      ({ phrase }) => phrase,
    );
    expect(hits, `${file} uses banned phrase(s): ${hits.join(", ")}`).toEqual([]);
  });
});
