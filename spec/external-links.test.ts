// CLAUDE.md rule 5: no source goes on a page nobody has opened. That rule is
// unenforceable by reading, because a fabricated URL looks exactly like a
// checked one. spec/fixtures/verified-links.json is the record of which
// external URLs someone actually opened, and the first assertion below says
// the built site links to nothing else from inside <main>. Linking outward is
// therefore two acts, not one: open the page and record it here, then link it.
//
// Scope is <main> on pages carrying the site navigation. Site chrome (the
// footer's licence link, the theme's own links) sits outside <main> and is
// not this site's evidence; deck pages render their own chrome and have no
// site nav, which is the same boundary spec/layout-styling.test.ts draws.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface VerifiedLink {
  url: string;
  title: string;
  checked: string;
}

interface ApiNode {
  id: string;
  type: string;
  meta?: Record<string, unknown>;
}

interface Reading {
  title: string;
  url: string;
  source: string;
}

const DIST = resolve("dist");
const NAV_MARKER = /<nav\s+class="at-nav"/;

const verified = JSON.parse(
  readFileSync(resolve("spec/fixtures/verified-links.json"), "utf8"),
) as VerifiedLink[];
const verifiedUrls = new Set(verified.map((link) => link.url));

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as {
  nodes: ApiNode[];
};
const lectureNodes = api.nodes.filter((node) => node.type === "lectures");

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

/** An attribute value as the browser sees it: the minifier may leave `&amp;`
 *  in an href, and a URL that differs from the fixture only by that escaping
 *  is the same URL. */
function unescapeAttr(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function textOf(html: string): string {
  return unescapeAttr(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function mainOf(html: string): string {
  return [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)].map((m) => m[1]).join("\n");
}

interface Anchor {
  href: string;
  text: string;
}

function externalAnchors(html: string): Anchor[] {
  return [
    ...html.matchAll(/<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ].map((m) => ({ href: unescapeAttr(m[1]), text: textOf(m[2]) }));
}

const sitePages = findHtmlFiles(DIST)
  .map((file) => ({ path: file, html: readFileSync(file, "utf8") }))
  .filter((page) => NAV_MARKER.test(page.html));

function lecturePage(nodeId: string): string {
  const slug = nodeId.slice("lectures".length + 1);
  const file = resolve(DIST, "lectures", slug, "index.html");
  expect(existsSync(file), `${nodeId} has no built page at ${file}`).toBe(true);
  return readFileSync(file, "utf8");
}

function readingsSectionOf(html: string): string | undefined {
  return html.match(/<section class="readings"[^>]*>[\s\S]*?<\/section>/)?.[0];
}

function readingsOf(node: ApiNode): Reading[] | undefined {
  const value = node.meta?.readings;
  return Array.isArray(value) ? (value as Reading[]) : undefined;
}

describe("external links", () => {
  it("finds the built pages and the verified-link fixture", () => {
    expect(sitePages.length).toBeGreaterThan(0);
    expect(verified.length).toBeGreaterThan(0);
  });

  // This is the assertion the fixture exists for.
  //
  // Turns red by: adding any external link to any page's body — a lecture
  // reading, a specimen sourceUrl, an <a href="https://…"> written straight
  // into a markdown body — without first adding that URL to
  // spec/fixtures/verified-links.json. An eighth URL on a page and seven in
  // the fixture is exactly the failure this file is for.
  it("links out only to URLs recorded in spec/fixtures/verified-links.json", () => {
    for (const page of sitePages) {
      for (const anchor of externalAnchors(mainOf(page.html))) {
        expect(
          verifiedUrls.has(anchor.href),
          `${page.path} links to ${anchor.href}, which is not in spec/fixtures/verified-links.json — open it, record its title and the date you checked, then link it`,
        ).toBe(true);
      }
    }
  });

  // The fixture is a record of what this site links to, not a wishlist. An
  // entry nothing links to is either a link that was dropped or one that was
  // never made, and either way the record has stopped describing the site.
  //
  // Turns red by: adding an entry to the fixture without linking it from a
  // page, or removing the last link to a URL the fixture still lists.
  it("uses every URL the fixture records, on at least one page", () => {
    const linked = new Set(
      sitePages.flatMap((page) => externalAnchors(mainOf(page.html)).map((a) => a.href)),
    );
    for (const link of verified) {
      expect(
        linked.has(link.url),
        `spec/fixtures/verified-links.json records ${link.url} but no page links to it`,
      ).toBe(true);
    }
  });

  // Turns red by: dropping <li> entries in the lecture route's readings
  // loop, hard-coding the list, or letting a title or href drift from the
  // frontmatter the API reports.
  it("renders every lecture's readings exactly as its frontmatter states them", () => {
    const withReadings = lectureNodes.filter((node) => readingsOf(node));
    expect(withReadings.length, "no lecture in the API declares readings").toBeGreaterThan(0);
    for (const node of withReadings) {
      const readings = readingsOf(node)!;
      const section = readingsSectionOf(lecturePage(node.id));
      expect(section, `${node.id} declares readings but renders no section.readings`).toBeDefined();
      const items = [...section!.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/g)].map((m) => m[0]);
      expect(
        items.length,
        `${node.id} declares ${readings.length} readings but renders ${items.length} li`,
      ).toBe(readings.length);
      readings.forEach((reading, index) => {
        const anchors = externalAnchors(items[index]);
        expect(
          anchors.length,
          `${node.id} reading ${index + 1} does not render exactly one external anchor`,
        ).toBe(1);
        expect(anchors[0].href, `${node.id} reading ${index + 1} has the wrong href`).toBe(
          reading.url,
        );
        expect(anchors[0].text, `${node.id} reading ${index + 1} has the wrong link text`).toBe(
          reading.title,
        );
        expect(
          textOf(items[index]),
          `${node.id} reading ${index + 1} does not show its source line`,
        ).toContain(reading.source);
      });
    }
  });

  // Turns red by: rendering the Further reading section unconditionally, so
  // a lecture with nothing to cite grows an empty heading and list.
  it("gives no readings section to a lecture that declares none", () => {
    const without = lectureNodes.filter((node) => !readingsOf(node));
    expect(without.length, "every lecture declares readings; nothing exercises this path").toBeGreaterThan(0);
    for (const node of without) {
      expect(
        readingsSectionOf(lecturePage(node.id)),
        `${node.id} declares no readings but renders a section.readings`,
      ).toBeUndefined();
    }
  });
});
