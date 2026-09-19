import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// This file protects one narrow contract: the three CSS rules that make the
// home page's <main> a real full-width single-column grid instead of the
// theme's narrow content column. It does not, and cannot, check that the
// page looks right — it has no layout engine, only the built CSS text. See
// CLAUDE.md rule 16: visual quality is confirmed by a human looking at the
// rendered page, not by this file.
//
// Root cause (measured in a real browser, not assumed): the theme's
// base.css sets `body > * { grid-column: content; }`, so HomeHero — slotted
// into BaseLayout's hero slot and therefore a direct child of <body>, not of
// <main> — lands in the theme's ~864px content column instead of spanning
// the full body grid. Separately, the theme's components.css sets
// `.at-main > * { grid-column: content; }`, so every `.home-band` section
// inherits that same narrow placement even after `.at-main.home-page`
// switches the grid to a single column, producing the shifted-right,
// wrong-width band the user measured (x=465px, width=1440px at a
// 1905px-wide document). `.at-main`'s own `padding-block: var(--at-spacing-xl)`
// also survives onto `.at-main.home-page` unless overridden, adding an
// unwanted gap between the hero and the first band.
const DIST = resolve("dist");
const HOME_PAGE = resolve(DIST, "index.html");

function readHtml(path: string): string {
  expect(existsSync(path), `${path} does not exist — run the build first`).toBe(true);
  return readFileSync(path, "utf8");
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

describe("home layout grid", () => {
  const html = readHtml(HOME_PAGE);
  const css = cssLoadedBy(html, HOME_PAGE);

  // Turns red by: removing `grid-column: full` from .home-hero, or moving it
  // to a selector other than exactly `.home-hero`.
  it("places .home-hero on the full body grid, not the theme's narrow content column", () => {
    expect(
      css,
      "no .home-hero rule sets grid-column: full — the hero stays trapped in body > * { grid-column: content }",
    ).toMatch(/\.home-hero\s*\{[^}]*grid-column:\s*full\b[^}]*\}/);
  });

  // Turns red by: deleting the `.at-main.home-page > .home-band` rule, or
  // changing its grid-column value away from `1 / -1`.
  it("places every direct .home-band child of the home main in the real single column, not the theme's content line", () => {
    expect(
      css,
      "no rule places .at-main.home-page > .home-band at grid-column: 1 / -1 — bands still inherit .at-main > * { grid-column: content }",
    ).toMatch(/\.at-main\.home-page\s*>\s*\.home-band\s*\{[^}]*grid-column:\s*1\s*\/\s*-1\b[^}]*\}/);
  });

  // Turns red by: removing `padding-block: 0` from .at-main.home-page, which
  // leaves the theme's inherited `.at-main { padding-block: var(--at-spacing-xl) }`
  // in force and reopens the gap between the hero and the first band.
  it("removes the theme's inherited vertical main padding from the home page", () => {
    expect(
      css,
      "no .at-main.home-page rule sets padding-block: 0 — the theme's .at-main { padding-block: var(--at-spacing-xl) } still applies",
    ).toMatch(/\.at-main\.home-page\s*\{[^}]*padding-block:\s*0\b[^}]*\}/);
  });
});
