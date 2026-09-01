// Checks that a page's prose does not contradict a claim the harness already
// guarantees by other means. bench-operations.test.ts asserts (via the API)
// that every bench declares a distinct operation; this file checks that the
// Benches index page does not tell the reader the opposite in its own words.
// The two files check the same fact from two different directions — the data
// and the prose describing it — and neither is redundant with the other.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

function extractText(html: string): string {
  const withoutOpaque = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  return decodeEntities(withoutOpaque.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}

const sessionsIndexHtml = readFileSync(resolve("dist/sessions/index.html"), "utf8");
const sessionsIndexText = extractText(sessionsIndexHtml);

describe("page claims", () => {
  it("does not tell the reader every bench is the same operation", () => {
    expect(sessionsIndexText).not.toMatch(/the same operation/i);
  });
});
