// Checks that a page's prose does not contradict a claim the harness already
// guarantees by other means. bench-operations.test.ts asserts (via the API)
// that every bench declares a distinct operation; this file checks that the
// Benches index page does not tell the reader the opposite in its own words.
// The two files check the same fact from two different directions — the data
// and the prose describing it — and neither is redundant with the other.
import { readFileSync, readdirSync } from "node:fs";
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
const homeHtml = readFileSync(resolve("dist/index.html"), "utf8");

// The site navigation is what makes a page a content page: every page built
// through BaseLayout renders <nav class="at-nav">, and nothing else does
// (see spec/layout-styling.test.ts, which established this marker first).
// Deck pages render their own chrome and are correctly out of scope.
const DIST = resolve("dist");
const NAV_MARKER = /<nav\s+class="at-nav"/;
const H1_TAG = /<h1\b[^>]*>/g;

function findHtmlFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

const pagesWithNav = findHtmlFiles(DIST)
  .filter((file) => NAV_MARKER.test(readFileSync(file, "utf8")))
  .map((file) => ({ path: file, html: readFileSync(file, "utf8") }));

interface ApiNode {
  id: string;
  type: string;
  related?: string[];
}

interface CourseApi {
  nodes: ApiNode[];
}

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;
const specimenIds = new Set(api.nodes.filter((node) => node.type === "specimens").map((node) => node.id));
const referencingNodes = api.nodes.filter((node) => node.type === "sessions" || node.type === "lectures");
const referencedSpecimenIds = new Set(
  referencingNodes.flatMap((node) => (node.related ?? []).filter((ref) => ref.startsWith("specimens/"))),
);

describe("page claims", () => {
  it("does not tell the reader every bench is the same operation", () => {
    expect(sessionsIndexText).not.toMatch(/the same operation/i);
  });

  it("gives every page carrying the site navigation exactly one h1", () => {
    for (const page of pagesWithNav) {
      const count = [...page.html.matchAll(H1_TAG)].length;
      expect(count, `${page.path} has ${count} <h1> element(s), expected exactly 1`).toBe(1);
    }
  });

  // Regression guard, not a fix: the sentence pointing at the Swansea
  // specimen and the specimen record itself are now rendered from the same
  // condition (index.astro), so this is expected to pass as soon as it is
  // added. It exists to catch a future edit that separates them again.
  it("shows the specimen record and a verification badge together on the home page", () => {
    expect(homeHtml).toContain("specimen-record specimen-record--standalone");
    expect(homeHtml).toMatch(/verification-badge verification-badge--(primary|secondary|apocryphal)/);
  });

  // Guard against an orphan: a specimen with no session or lecture citing it,
  // or a citation pointing at a specimen that does not exist. Passes on
  // arrival — every current specimen is used, and every current reference
  // resolves — so this only fails on a future edit that breaks one of those.
  it("has every specimen referenced by at least one session or lecture", () => {
    for (const id of specimenIds) {
      expect(referencedSpecimenIds.has(id), `${id} is not referenced by any session or lecture`).toBe(true);
    }
  });

  it("only cites specimens that exist", () => {
    for (const node of referencingNodes) {
      for (const ref of node.related ?? []) {
        if (!ref.startsWith("specimens/")) continue;
        expect(specimenIds.has(ref), `${node.id} references ${ref}, which does not exist`).toBe(true);
      }
    }
  });
});
