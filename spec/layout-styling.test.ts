import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIST = resolve("dist");
// The site navigation is what makes a page a content page: every page built
// through BaseLayout renders <nav class="at-nav">, and nothing else does.
// Deck pages (astromotion) render their own chrome instead and are correctly
// out of scope for a rule that only makes sense on top of the site nav.
const NAV_MARKER = /<nav\s+class="at-nav"/;
const LAYOUT_SELECTOR = /\.at-nav\s*\+\s*\.at-main\b/;

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

/** Hrefs are root-relative under whatever base path the site deploys at
 *  (see scripts/pages-base.ts). Strip leading segments until one resolves
 *  to a real file under dist/, rather than assuming a fixed base. */
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

const pagesWithNav = findHtmlFiles(DIST)
  .filter((file) => NAV_MARKER.test(readFileSync(file, "utf8")))
  .map((file) => ({ path: file, html: readFileSync(file, "utf8") }));

/** Extracts the body of every at-rule block matching `atRule`, handling one
 *  level of nested braces (a declaration inside the block is fine; the
 *  concern is the block's own closing brace being mistaken for a nested
 *  rule's). The theme ships its own @media print block in base.css, and this
 *  site's layout.css adds a second one, both reaching the same page — a
 *  first-match-only extractor would silently only ever see the theme's. */
function extractAtRuleBlocks(css: string, atRule: RegExp): string[] {
  const flags = atRule.flags.includes("g") ? atRule.flags : `${atRule.flags}g`;
  const re = new RegExp(atRule.source, flags);
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(css))) {
    const braceStart = css.indexOf("{", match.index);
    if (braceStart === -1) break;
    let depth = 0;
    for (let i = braceStart; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") {
        depth--;
        if (depth === 0) {
          blocks.push(css.slice(braceStart + 1, i));
          re.lastIndex = i + 1;
          break;
        }
      }
    }
  }
  return blocks;
}

const PRINT_RULE = /@media\s+print\b/;
const REDUCED_MOTION_RULE = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/;

describe("layout styling", () => {
  it("finds at least one built page carrying the site navigation", () => {
    expect(pagesWithNav.length).toBeGreaterThan(0);
  });

  it("delivers the .at-nav + .at-main layout rule to every page that carries the site navigation", () => {
    for (const page of pagesWithNav) {
      const css = cssLoadedBy(page.html, page.path);
      expect(
        LAYOUT_SELECTOR.test(css),
        `${page.path} carries the site navigation but none of its loaded CSS matches .at-nav + .at-main`,
      ).toBe(true);
    }
  });

  // astro-theme-university's base.css already ships a @media print block
  // that hides .at-nav, .at-sidebar and .at-footer (see its own comment:
  // "consumers no longer need to re-hide chrome … they keep only their own
  // print extras") — so a block merely mentioning .at-nav is true today,
  // before this site adds anything. This checks the extras this site is
  // responsible for instead: the search trigger, the week strip and the
  // Related list, none of which the theme's block touches.
  //
  // Turns red by: layout.css's own @media print block missing, or missing
  // .at-search-trigger, .week-strip or .related-content from its selector
  // list — any one of those three chrome pieces would then still print.
  it("delivers a @media print block that hides the search button, week strip and Related list, to every page", () => {
    for (const page of pagesWithNav) {
      const css = cssLoadedBy(page.html, page.path);
      const blocks = extractAtRuleBlocks(css, PRINT_RULE).join("\n");
      expect(blocks.length, `${page.path}'s loaded CSS has no @media print block`).toBeGreaterThan(0);
      for (const selector of [".at-search-trigger", ".week-strip", ".related-content"]) {
        expect(blocks, `${page.path}'s @media print rules do not mention ${selector}`).toContain(selector);
      }
    }
  });

  // Turns red by: the print block leaving body text and background at their
  // on-screen (themed, non-black-on-white) colors, instead of overriding
  // them with the theme's --at-black / --at-white tokens.
  it("sets body text to black on white in print, on every page", () => {
    for (const page of pagesWithNav) {
      const css = cssLoadedBy(page.html, page.path);
      const blocks = extractAtRuleBlocks(css, PRINT_RULE).join("\n");
      expect(blocks, `${page.path}'s @media print rules do not set body to black-on-white`).toMatch(
        /\bbody\s*\{[^}]*color:\s*var\(--at-black\)[^}]*\}/,
      );
      expect(blocks, `${page.path}'s @media print rules do not set body to black-on-white`).toMatch(
        /\bbody\s*\{[^}]*background(?:-color)?:\s*var\(--at-white\)[^}]*\}/,
      );
    }
  });

  // Turns red by: no rule printing an external link's href in main, or one
  // that also fires on an internal (base-relative) link.
  it("prints an external link's href after it, inside main, on every page", () => {
    for (const page of pagesWithNav) {
      const css = cssLoadedBy(page.html, page.path);
      const blocks = extractAtRuleBlocks(css, PRINT_RULE).join("\n");
      expect(
        blocks,
        `${page.path}'s @media print rules have no main a[href^="http"]::after rule printing attr(href)`,
      ).toMatch(/\bmain\s+a\[href\^=["']http["']\]::after\s*\{[^}]*content:\s*[^};]*attr\(href\)/);
    }
  });
});
