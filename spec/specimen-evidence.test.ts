import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface ApiNode {
  id: string;
  type: string;
  meta?: Record<string, unknown>;
}

interface CourseApi {
  nodes: ApiNode[];
}

interface NodeApi {
  body: string;
}

const VERIFICATION_LEVELS = ["primary", "secondary", "apocryphal"];

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;
const specimens = api.nodes.filter((node) => node.type === "specimens");

const readBody = (id: string): string => {
  const slug = id.split("/")[1];
  const node = JSON.parse(
    readFileSync(resolve(`dist/api/specimens/${slug}.json`), "utf8"),
  ) as NodeApi;
  return node.body;
};

const readPage = (id: string): string => {
  const slug = id.split("/")[1];
  return readFileSync(resolve(`dist/specimens/${slug}/index.html`), "utf8");
};

const sourceRow = (id: string): string => {
  const match = readPage(id).match(/<dt>Source<\/dt>\s*<dd>([\s\S]*?)<\/dd>/);
  if (!match) throw new Error(`${id} has no Source row`);
  return match[1];
};

describe("specimen evidence", () => {
  it("has at least one specimen", () => {
    expect(specimens.length).toBeGreaterThan(0);
  });

  it("cites where and when every specimen was recorded", () => {
    for (const node of specimens) {
      const source = node.meta?.source;
      const sourceDate = node.meta?.sourceDate;
      expect(typeof source === "string" && source.trim().length > 0, `${node.id} has no source`).toBe(
        true,
      );
      expect(
        typeof sourceDate === "string" && sourceDate.trim().length > 0,
        `${node.id} has no sourceDate`,
      ).toBe(true);
    }
  });

  it("declares a verification level for every specimen", () => {
    for (const node of specimens) {
      expect(
        VERIFICATION_LEVELS,
        `${node.id} has verification "${node.meta?.verification}"`,
      ).toContain(node.meta?.verification);
    }
  });

  it("discloses apocryphal specimens as apocryphal in the page body", () => {
    for (const node of specimens.filter((n) => n.meta?.verification === "apocryphal")) {
      const body = readBody(node.id).toLowerCase();
      expect(body, `${node.id} is marked apocryphal but never says so in its body`).toContain(
        "apocryphal",
      );
    }
  });

  it("links the Source row to sourceUrl where one is recorded, and links nowhere else", () => {
    for (const node of specimens) {
      const row = sourceRow(node.id);
      const sourceUrl = node.meta?.sourceUrl;
      if (typeof sourceUrl === "string" && sourceUrl.length > 0) {
        expect(row, `${node.id} has a sourceUrl but its Source row links nowhere`).toContain(
          `<a href="${sourceUrl}"`,
        );
      } else {
        expect(row, `${node.id} has no sourceUrl but its Source row carries a link`).not.toContain(
          "<a",
        );
      }
    }
  });
});
