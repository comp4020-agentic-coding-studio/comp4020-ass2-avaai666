// The card image is described in exactly one place, src/lib/artwork.ts — see
// that file's own comment for why. This checks the built home page actually
// uses that export, so a second, unimported copy of the description can't
// drift the way socialImageAlt and the old hero alt each drifted once
// already. The hero image itself no longer renders on the home page (see
// CLAUDE.md's Phase 3 opening redesign) — the second describe block below
// checks what replaced it: a case file built from the first featured
// specimen's own collection data, not an illustration.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cardImageAlt } from "../src/lib/artwork";

interface ApiNode {
  id: string;
  type: string;
  title: string;
  meta?: Record<string, unknown>;
}

interface CourseApi {
  nodes: ApiNode[];
}

const homeHtml = readFileSync(resolve("dist/index.html"), "utf8");
const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;

// Same three slugs, same order, as EvidenceWorkbench's own featured set
// (src/pages/index.astro's FEATURED_SPECIMEN_IDS) — there is no other
// emitted signal in dist/ that distinguishes "featured" from "recorded but
// not featured," since that is purely an index.astro authoring choice.
const FEATURED_SLUGS = ["swansea-out-of-office", "gan-the-merged-character", "intoxicado"];

const firstFeatured = api.nodes.find((node) => node.id === `specimens/${FEATURED_SLUGS[0]}`);
if (!firstFeatured) {
  throw new Error(`specimens/${FEATURED_SLUGS[0]} is missing from dist/api/index.json`);
}

function decodeAttr(text: string): string {
  return text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

describe("artwork alt text", () => {
  it("gives the social card exactly the alt text exported from src/lib/artwork.ts", () => {
    const match = homeHtml.match(/<meta property="og:image:alt" content="([^"]*)">/);
    expect(match, "no og:image:alt meta tag found on the built home page").not.toBeNull();
    expect(decodeAttr(match?.[1] ?? "")).toBe(cardImageAlt);
  });
});

describe("home hero case file", () => {
  // Turns red by: reverting to img.at-hero-image, hardcoding a title or
  // verification level that does not match the collection's own data, or
  // dropping the link to the specimen's own page.
  it("replaces the old hero illustration with a case file built from the first featured specimen's own data", () => {
    const match = homeHtml.match(/<aside\b[^>]*\bclass="[^"]*\bhome-case-file\b[^"]*"[^>]*>[\s\S]*?<\/aside>/);
    expect(match, "no aside.home-case-file element found on the built home page").not.toBeNull();
    const raw = match![0];

    expect(raw, "case file does not link to the first featured specimen's own page").toMatch(
      new RegExp(`href="[^"]*/specimens/${FEATURED_SLUGS[0]}/"`),
    );
    expect(raw, "case file is missing its real verification badge").toContain(
      `verification-badge--${firstFeatured.meta!.verification}`,
    );
    expect(raw, "case file is missing the specimen's real title").toContain(firstFeatured.title);
  });
});
