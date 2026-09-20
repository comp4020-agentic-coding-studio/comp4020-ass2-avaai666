// Claim under test: the printed line lives in one place, `printed`, and
// every rendering of it — the specimen's own blockquote, the Specimens
// index, the home page's three featured records — reads that same field
// rather than a copy typed a second time. Everything here reads the built
// API and built HTML; nothing re-derives a fact the build already owns.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface ApiNode {
  id: string;
  type: string;
  title: string;
  meta?: Record<string, unknown>;
}

interface CourseApi {
  nodes: ApiNode[];
}

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;
const specimenNodes = api.nodes.filter((n) => n.type === "specimens");

function specimenHtml(nodeId: string): string {
  const slug = nodeId.slice("specimens/".length);
  return readFileSync(resolve("dist/specimens", slug, "index.html"), "utf8");
}

// The build renders &nbsp; as an actual U+00A0, not the entity, so both
// forms are folded into a plain space alongside ordinary whitespace before
// two texts are compared.
function normalizeText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[\s ]+/g, " ")
    .trim();
}

function blockquotesIn(html: string): string[] {
  return [...html.matchAll(/<blockquote\s+data-specimen[^>]*>[\s\S]*?<\/blockquote>/g)].map((m) =>
    normalizeText(m[0]),
  );
}

describe("printed field: present on every specimen", () => {
  it("is a non-empty string in the API for every specimen", () => {
    // Turns red by: dropping `printed` from content.config.ts's specimens
    // schema, or leaving it blank on any one specimen file.
    for (const node of specimenNodes) {
      expect(typeof node.meta?.printed, `${node.id} has no printed field`).toBe("string");
      expect((node.meta?.printed as string).trim().length, `${node.id}'s printed is blank`).toBeGreaterThan(0);
    }
  });
});

describe("printed field: matches the specimen's own blockquote", () => {
  // Not every specimen has an artefact on the page — the Chevrolet Nova
  // entry is the story that there was no artefact, so its page carries no
  // <blockquote data-specimen>. This checks only the specimens that do.
  it("equals the built page's blockquote text (the second one, for the vodka page's two)", () => {
    // Turns red by: editing the blockquote's wording without updating
    // `printed` to match (or the reverse), so the two texts diverge.
    for (const node of specimenNodes) {
      const quotes = blockquotesIn(specimenHtml(node.id));
      if (quotes.length === 0) continue;
      const printedQuote = quotes[quotes.length - 1];
      expect(printedQuote, `${node.id}'s printed does not match its blockquote`).toBe(
        (node.meta?.printed as string).trim(),
      );
    }
  });

  it("finds at least one specimen with no blockquote, so the skip above is exercised", () => {
    const withNone = specimenNodes.filter((node) => blockquotesIn(specimenHtml(node.id)).length === 0);
    expect(withNone.length).toBeGreaterThan(0);
  });
});

function printedCellsIn(html: string): string[] {
  return [...html.matchAll(/<p\s+class="specimen-printed"[^>]*>([\s\S]*?)<\/p>/g)].map((m) =>
    normalizeText(m[1]),
  );
}

describe("printed field: the Specimens index", () => {
  it("shows exactly one .specimen-printed per specimen, each matching that specimen's printed field", () => {
    // Turns red by: rendering the title or the languages line as the first
    // element instead of .specimen-printed, or reading it from the body
    // text instead of the printed field.
    const html = readFileSync(resolve("dist/specimens/index.html"), "utf8");
    const cells = printedCellsIn(html);
    expect(cells.length).toBe(specimenNodes.length);

    for (const node of specimenNodes) {
      // This, plus the length check above, proves a bijection between
      // specimenNodes and cells only because every specimen's printed field
      // is assumed pairwise distinct from every other's. Nothing enforces
      // that. If two specimens ever shared a printed field, .toContain would
      // pass for both against the same rendered cell, and a genuinely
      // missing or duplicated cell would go uncaught even though the count
      // still matched.
      expect(
        cells,
        `${node.id}'s printed line is missing from the Specimens index`,
      ).toContain((node.meta?.printed as string).trim());
    }
  });
});

describe("printed field: the home page's three featured records", () => {
  it("shows a .specimen-printed for each featured specimen, matching its printed field", () => {
    // Turns red by: reordering the featured specimens without moving
    // .specimen-printed along with the rest of the record, or leaving the
    // printed line off the home page register entirely.
    const html = readFileSync(resolve("dist/index.html"), "utf8");
    const cells = printedCellsIn(html);
    const featured = ["swansea-out-of-office", "gan-the-merged-character", "intoxicado"];
    expect(cells.length).toBe(featured.length);

    for (const id of featured) {
      const node = specimenNodes.find((n) => n.id === `specimens/${id}`)!;
      // This, plus the length check above, proves a bijection between
      // featured and cells only because the three featured specimens'
      // printed fields are assumed pairwise distinct from one another.
      // Nothing enforces that. If two of them ever shared a printed field,
      // .toContain would pass for both against the same rendered cell, and a
      // genuinely missing or duplicated cell would go uncaught even though
      // the count still matched.
      expect(cells, `${id}'s printed line is missing from the home page`).toContain(
        (node.meta?.printed as string).trim(),
      );
    }
  });
});
