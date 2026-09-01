// The corpus timeline (src/pages/index.astro) draws every mark from the
// content collections at build time — no specimen, year or lecture title is
// typed into the component by hand. These checks verify that promise against
// the built output: every specimen actually gets a mark, and the caption's
// three computed numbers and the marked line's label actually match the data
// they claim to summarise, rather than trusting the component read them right.
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
const specimenNodes = api.nodes.filter((node) => node.type === "specimens");
const lectureNodes = api.nodes.filter((node) => node.type === "lectures");

const homeHtml = readFileSync(resolve("dist/index.html"), "utf8");
const figureMatch = homeHtml.match(/<figure class="corpus-timeline">[\s\S]*?<\/figure>/);
const figureHtml = figureMatch?.[0] ?? "";

describe("corpus timeline", () => {
  it("renders the timeline figure on the home page", () => {
    expect(figureMatch, 'no <figure class="corpus-timeline"> found on the built home page').not.toBeNull();
  });

  it("marks every specimen from the API in the timeline", () => {
    for (const node of specimenNodes) {
      expect(figureHtml, `${node.id} has no mark in the timeline`).toContain(`data-specimen-id="${node.id}"`);
    }
  });

  it("gives the caption a specimen count that matches the API", () => {
    const match = figureHtml.match(/(\d+)\s+specimens/);
    expect(match, "caption does not state a specimen count").not.toBeNull();
    expect(Number(match?.[1])).toBe(specimenNodes.length);
  });

  it("gives the caption a latest year that matches the latest sourceDate in the API", () => {
    const years = specimenNodes.map((node) => Number(String(node.meta?.sourceDate).slice(0, 4)));
    const latestYear = Math.max(...years);
    const match = figureHtml.match(/\d{4}(?:–|-)(\d{4})\./);
    expect(match, "caption does not state a year range ending in the corpus's latest year").not.toBeNull();
    expect(Number(match?.[1])).toBe(latestYear);
  });

  it("labels the marked line with a lecture title present in the API", () => {
    const labelMatch = figureHtml.match(
      /<text[^>]*class="timeline-marked-label"[^>]*>([\s\S]*?)<\/text>/,
    );
    expect(labelMatch, "no element with class \"timeline-marked-label\" found in the timeline").not.toBeNull();
    const labelText = decodeEntities((labelMatch?.[1] ?? "").replace(/<[^>]+>/g, "")).trim();
    const lectureTitles = lectureNodes.map((node) => node.title);
    expect(
      lectureTitles.some((title) => labelText.includes(title)),
      `label "${labelText}" does not include any lecture title from the API`,
    ).toBe(true);
  });
});
