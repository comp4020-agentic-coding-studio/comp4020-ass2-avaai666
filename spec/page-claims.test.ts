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

// The frontmatter/prop `description` renders, when present, as the built
// page's lead paragraph — <p class="lead">{description}</p> — in both
// ContentLayout.astro (theme) and MdxPageLayout.astro (theme, reached via
// our PageLayout.astro). Found by grepping the built HTML for the element
// wrapping each page's description text.
const DESCRIPTION_TAG = /<[a-z][a-z0-9]*\s+class="lead"[^>]*>/;

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
  meta?: Record<string, unknown>;
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

const homeText = extractText(homeHtml);
const specimenNodes = api.nodes.filter((node) => node.type === "specimens");

// Capitalized number words, independent of any source-side helper — this
// file checks the page's own claim against the collection, not against
// whatever word-list the implementation happens to use.
const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
function numberWord(n: number): string {
  if (n < 0 || n >= NUMBER_WORDS.length) {
    throw new Error(`numberWord: ${n} is outside the range this test's word list covers`);
  }
  return NUMBER_WORDS[n];
}

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

  // Turns red by: any page whose description-as-lead paragraph is emitted
  // before its own <h1> — currently every bare .mdx page that has both a
  // frontmatter description and a body heading, since MdxPageLayout.astro
  // (astro-theme-university, not ours) renders the lead before <slot />.
  it("shows the page heading before its description, on every page that has both", () => {
    for (const page of pagesWithNav) {
      const leadIndex = page.html.search(DESCRIPTION_TAG);
      if (leadIndex === -1) continue;
      const h1Index = page.html.search(H1_TAG);
      expect(
        h1Index !== -1 && h1Index < leadIndex,
        `${page.path}: <h1> is at ${h1Index}, .lead is at ${leadIndex} — the description precedes the heading`,
      ).toBe(true);
    }
  });

  // Guard: every specimen record on the home page carries its verification
  // badge, and there are at least three of them. Fails if a record ever
  // renders without a badge, and fails if the block shrinks below three.
  it("shows every home page specimen record with its verification badge", () => {
    // Anchored to class="…" rather than the bare class name: Astro inlines
    // this page's scoped CSS into the same document, so the bare name also
    // appears once as a selector, which counted as a fourth heading.
    const headings = homeHtml.match(/class="[^"]*specimen-record-heading[^"]*"/g) ?? [];
    const badges = homeHtml.match(/class="[^"]*verification-badge--(?:primary|secondary|apocryphal)[^"]*"/g) ?? [];
    expect(homeHtml).toContain("specimen-register");
    expect(headings.length).toBeGreaterThanOrEqual(3);
    expect(badges.length).toBe(headings.length);
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

  // The policies page's apocryphal-provenance claim, moved to the home page
  // with every numeral computed from the specimens collection rather than
  // typed by hand. Turns red by: changing a specimen's verification level
  // without updating the prose (impossible, since the prose is computed), or
  // by the sentence going stale/hardcoded so it no longer matches a changed
  // collection.
  it("states the specimen count and verification breakdown, computed from the collection", () => {
    const counts = { primary: 0, secondary: 0, apocryphal: 0 };
    for (const node of specimenNodes) {
      const level = node.meta?.verification as keyof typeof counts;
      expect(level in counts, `${node.id} has an unrecognised verification level: ${String(level)}`).toBe(true);
      counts[level] += 1;
    }
    const total = specimenNodes.length;
    expect(
      counts.primary + counts.secondary + counts.apocryphal,
      "verification counts do not sum to the total specimen count",
    ).toBe(total);

    const sentence =
      `${numberWord(total)} specimens are on record here. ` +
      `${numberWord(counts.primary)} has a photograph of the artefact itself. ` +
      `${numberWord(counts.secondary)} were reported and reproduced without one. ` +
      `${numberWord(counts.apocryphal)} are probably not true at all, and establishing ` +
      `that is the work rather than a failure of it.`;

    expect(homeText, "home page does not state the computed provenance breakdown sentence").toContain(sentence);
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
