// The claim under test: a lecture, a bench, an assessment, a specimen and the
// policies page are all the same kind of object — a course record — and share
// one header treatment instead of each inventing its own. This does not
// repeat page-claims.test.ts's exactly-one-h1 or heading-before-description
// checks, which already run against every page carrying the site navigation
// (these five pages included); it only adds what is specific to the shared
// header: a marker element, the type-specific metadata line, and the
// stylesheet that styles it.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIST = resolve("dist");

interface RecordPage {
  name: string;
  path: string;
  metadataSubstrings: string[];
}

const RECORD_PAGES: RecordPage[] = [
  {
    name: "lecture (week 5)",
    path: "lectures/week-05/index.html",
    metadataSubstrings: ["LECTURE", "WEEK 5"],
  },
  {
    name: "bench (05-starve-it)",
    path: "sessions/05-starve-it/index.html",
    metadataSubstrings: ["BENCH", "WEEK 5"],
  },
  {
    name: "assessment (the reconstruction)",
    path: "assessments/the-reconstruction/index.html",
    metadataSubstrings: ["ASSESSMENT", "%", "DUE"],
  },
  {
    name: "specimen (swansea-out-of-office)",
    path: "specimens/swansea-out-of-office/index.html",
    metadataSubstrings: ["SPECIMEN"],
  },
  {
    name: "policies",
    path: "policies/index.html",
    metadataSubstrings: ["POLICIES"],
  },
];

const RECORD_HEADER = /<header\b[^>]*\bclass="[^"]*record-header[^"]*"[^>]*>/;

function readPage(relPath: string): string {
  const full = resolve(DIST, relPath);
  if (!existsSync(full)) throw new Error(`${relPath} was not found under dist/ — did the build run?`);
  return readFileSync(full, "utf8");
}

function inlineStyles(html: string): string[] {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
}

function linkedStylesheetHrefs(html: string): string[] {
  const hrefs: string[] = [];
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = tag[0];
    if (!/rel\s*=\s*["']stylesheet["']/i.test(attrs)) continue;
    const href = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
    if (href) hrefs.push(href[1]);
  }
  return hrefs;
}

function resolveUnderDist(href: string): string | null {
  const path = href.split(/[?#]/)[0]!;
  const segments = path.split("/").filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    const candidate = resolve(DIST, ...segments.slice(i));
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function cssLoadedBy(html: string, pagePath: string): string {
  const chunks = [...inlineStyles(html)];
  for (const href of linkedStylesheetHrefs(html)) {
    const file = resolveUnderDist(href);
    expect(file, `${pagePath} links stylesheet ${href}, which does not resolve to a file under dist/`).not.toBeNull();
    chunks.push(readFileSync(file!, "utf8"));
  }
  return chunks.join("\n");
}

describe("course record layout", () => {
  it("gives every record page a record-header element", () => {
    // Turns red by: any of these five pages rendering its title through the
    // theme's own ContentLayout heading/lead instead of a shared header.
    for (const page of RECORD_PAGES) {
      const html = readPage(page.path);
      expect(RECORD_HEADER.test(html), `${page.name} (${page.path}) has no <header class="record-header">`).toBe(
        true,
      );
    }
  });

  it("states each record page's own type-specific metadata inside its header", () => {
    // Turns red by: dropping the kicker, the week, the weight, the due date
    // or the verification level from the header's rendered text.
    for (const page of RECORD_PAGES) {
      const html = readPage(page.path);
      const match = html.match(RECORD_HEADER);
      expect(match, `${page.name} (${page.path}) has no record-header to read metadata from`).not.toBeNull();
      const headerStart = match!.index!;
      const headerEnd = html.indexOf("</header>", headerStart);
      const header = html.slice(headerStart, headerEnd === -1 ? undefined : headerEnd);
      for (const substring of page.metadataSubstrings) {
        expect(header, `${page.name} (${page.path})'s record-header is missing "${substring}"`).toContain(
          substring,
        );
      }
    }
  });

  it("loads record.css on every record page", () => {
    // Turns red by: a record page's layout importing layout.css but not
    // record.css, the way HomeLayout's home.css is separate from layout.css.
    const RECORD_STYLE_MARKER = /\.record-header\b/;
    for (const page of RECORD_PAGES) {
      const html = readPage(page.path);
      const css = cssLoadedBy(html, page.path);
      expect(
        RECORD_STYLE_MARKER.test(css),
        `${page.name} (${page.path}) carries a record-header but none of its loaded CSS matches .record-header`,
      ).toBe(true);
    }
  });
});
