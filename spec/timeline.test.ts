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

  // SVG text does not wrap: a label built from the lecture title plus the
  // year ran off the edge of the graphic at every measured width, because it
  // was longer than the drawing itself. The marked line's own label is now
  // the year alone; the lecture title moved to the figcaption, which is HTML
  // and wraps. This replaces the old "labels the marked line with a lecture
  // title present in the API" check, which asserted the design this fixes.
  it("marks the 2016 line in the SVG with the year alone, not the lecture title", () => {
    const labelMatch = figureHtml.match(
      /<text[^>]*class="timeline-marked-label"[^>]*>([\s\S]*?)<\/text>/,
    );
    expect(labelMatch, "no element with class \"timeline-marked-label\" found in the timeline").not.toBeNull();
    const labelText = decodeEntities((labelMatch?.[1] ?? "").replace(/<[^>]+>/g, "")).trim();
    expect(labelText).toBe("2016");
  });

  // 1960 and 2010 are axis ticks; 2016 is the marked line's own note. Six
  // years apart on a 1960-2016 axis, their labels collide on any shared
  // baseline at every width measured. The fix is structural, not spacing:
  // the marked-line label sits on the opposite side of the axis from the
  // tick labels, so the two kinds of label can never land on the same y.
  it("keeps the marked-line label off the axis tick labels' baseline", () => {
    const horizontalMatch = figureHtml.match(
      /<svg[^>]*corpus-timeline-svg--horizontal[^>]*>[\s\S]*?<\/svg>/,
    );
    expect(horizontalMatch, "no horizontal timeline SVG found in the figure").not.toBeNull();
    const horizontalSvg = horizontalMatch?.[0] ?? "";
    const markedY = horizontalSvg.match(/<text[^>]*class="timeline-marked-label"[^>]*\by="([^"]*)"/)?.[1];
    const tickYs = [
      ...horizontalSvg.matchAll(/<text[^>]*class="timeline-axis-label"[^>]*\by="([^"]*)"/g),
    ].map((m) => m[1]);
    expect(markedY, "no y attribute found on the marked-line label").toBeDefined();
    expect(tickYs.length, "no axis tick labels found").toBeGreaterThan(0);
    for (const tickY of tickYs) {
      expect(markedY, `marked-line label shares y="${tickY}" with an axis tick label`).not.toBe(tickY);
    }
  });

  // The old version of this check asked whether the caption contained ANY
  // lecture title, which week one's title satisfies just as well as week
  // five's — the exact bug this replaces. "The lecture the marked year
  // belongs to" is not a name we get to assert by fiat in the test either;
  // it has to come from data. The one piece of data that currently ties a
  // year to a lecture, independent of the `slides` field the component
  // misuses, is that week five's own body is the only lecture body that
  // mentions the marked year at all.
  it("puts the title of the lecture whose body argues about the marked year in the caption, not just any lecture", () => {
    const captionMatch = figureHtml.match(/<figcaption>[\s\S]*?<\/figcaption>/);
    expect(captionMatch, "no <figcaption> found in the timeline figure").not.toBeNull();
    const captionText = decodeEntities((captionMatch?.[0] ?? "").replace(/<[^>]+>/g, " "));

    const markedYearMatch = captionText.match(/marked line is (\d{4})/);
    expect(markedYearMatch, "caption does not state which year is marked").not.toBeNull();
    const markedYear = markedYearMatch![1];

    const lectureBodies = lectureNodes.map((node) => {
      const slug = node.id.replace(/^lectures\//, "");
      const file = JSON.parse(
        readFileSync(resolve(`dist/api/lectures/${slug}.json`), "utf8"),
      ) as { body: string };
      return { id: node.id, title: node.title, body: file.body };
    });
    const yearPattern = new RegExp(`\\b${markedYear}\\b`);
    const lecturesAboutThatYear = lectureBodies.filter((lecture) => yearPattern.test(lecture.body));
    expect(
      lecturesAboutThatYear.length,
      `expected exactly one lecture body to mention ${markedYear}, found: ` +
        (lecturesAboutThatYear.map((l) => l.id).join(", ") || "none"),
    ).toBe(1);

    const theLecture = lecturesAboutThatYear[0];
    expect(
      captionText,
      `figcaption should name "${theLecture.title}" (${theLecture.id}, the lecture whose body argues about ${markedYear}), not some other lecture`,
    ).toContain(theLecture.title);
  });

  // The drawing carries labels only; long prose belongs in the caption,
  // which wraps. Four-character years fit; a lecture title or a "year ·
  // title" label does not, which is exactly the bug the two checks above
  // replace.
  it("keeps every <text> label inside the timeline SVG to 12 characters or fewer", () => {
    const labels = [...figureHtml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) =>
      decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim(),
    );
    for (const label of labels) {
      expect(
        label.length,
        `SVG text "${label}" is ${label.length} characters, over the 12-character drawing limit`,
      ).toBeLessThanOrEqual(12);
    }
  });
});
