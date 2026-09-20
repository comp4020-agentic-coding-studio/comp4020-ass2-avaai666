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
const assessments = api.nodes.filter((node) => node.type === "assessments");

describe("assessment weights", () => {
  it("has at least one assessment", () => {
    expect(assessments.length).toBeGreaterThan(0);
  });

  it("sums every assessment's weight to exactly 100", () => {
    const total = assessments.reduce((sum, node) => sum + Number(node.meta?.weight ?? 0), 0);
    expect(total, `assessment weights sum to ${total}, not 100`).toBe(100);
  });
});

// The claim under test below: the weight bar on the assessments index is not
// decoration drawn independently of the weight field — it is that field,
// rendered as a fill width, row by row, and the four rows' widths are the
// same four numbers the block above already proves sum to 100.
const html = readFileSync(resolve("dist/assessments/index.html"), "utf8");

function ddBlocks(source: string): string[] {
  return [...source.matchAll(/<dd>[\s\S]*?<\/dd>/g)].map((m) => m[0]);
}

function blockForTitle(title: string): string {
  const matches = ddBlocks(html).filter((dd) => dd.includes(title));
  expect(matches.length, `expected exactly one <dd> containing "${title}", found ${matches.length}`).toBe(1);
  return matches[0];
}

function weightBarOf(block: string): string | undefined {
  const match = block.match(/<div\s+class="weight-bar"[^>]*>[\s\S]*?<\/div>/);
  return match?.[0];
}

function fillWidthOf(weightBar: string): number | undefined {
  const match = weightBar.match(/style="width:\s*([\d.]+)%"/);
  return match ? Number(match[1]) : undefined;
}

describe("assessment weight bars (assessments index)", () => {
  it("renders exactly one .weight-bar per assessment", () => {
    // Turns red by: omitting the weight-bar from AssessmentsGrid.astro, or
    // rendering it more than once per row.
    const barCount = [...html.matchAll(/<div\s+class="weight-bar"[^>]*>/g)].length;
    expect(barCount).toBe(assessments.length);
  });

  it("gives each weight-bar an inner fill width equal to that assessment's own weight", () => {
    // Turns red by: setting a bar's width from the wrong assessment (e.g.
    // reading by array index instead of by row), or hard-coding a width.
    for (const node of assessments) {
      const block = blockForTitle(node.title);
      const bar = weightBarOf(block);
      expect(bar, `${node.id}'s row has no weight-bar`).toBeDefined();
      const width = fillWidthOf(bar!);
      expect(width, `${node.id}'s weight-bar has no inner fill width`).toBeDefined();
      expect(width).toBe(Number(node.meta?.weight));
    }
  });

  it("sums every weight-bar's fill width to 100", () => {
    // Turns red by: a weight-bar rendering a width that does not match its
    // own assessment's weight, which — since the weights themselves are
    // required to sum to 100 — would throw this sum off too.
    const bars = [...html.matchAll(/<div\s+class="weight-bar"[^>]*>[\s\S]*?<\/div>/g)].map((m) => m[0]);
    const total = bars.reduce((sum, bar) => sum + (fillWidthOf(bar) ?? 0), 0);
    expect(total).toBe(100);
  });
});
