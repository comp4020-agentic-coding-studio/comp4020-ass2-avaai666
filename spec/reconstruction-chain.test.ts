// The claim under test: every specimen page already states its input,
// mechanism and printed output somewhere on the page. This chain does not
// add a fact — it puts three facts the page already carries into one
// visible structure, and the last assertion below checks that directly by
// requiring the input text to also occur outside the chain.
import { existsSync, readFileSync } from "node:fs";
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

function pageFile(nodeId: string): string {
  const slug = nodeId.slice("specimens".length + 1);
  return resolve("dist/specimens", slug, "index.html");
}

function pageHtml(nodeId: string): string {
  return readFileSync(pageFile(nodeId), "utf8");
}

const DIST = resolve("dist");

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

/** The base `ol.chain` rule only — `ol.chain.chain--primary` has another
 *  selector segment before its brace and is not matched, which is the point:
 *  primary keeps the full-strength accent, and this is about the default the
 *  other two levels inherit. */
function chainBaseRules(css: string): string[] {
  return [...css.matchAll(/\bol\.chain\s*\{[^}]*\}/g)].map((m) => m[0]);
}

function chainsIn(html: string): string[] {
  return [
    ...html.matchAll(/<ol\s+class="chain chain--(?:primary|secondary|apocryphal)"[^>]*>[\s\S]*?<\/ol>/g),
  ].map((m) => m[0]);
}

function liOf(chainHtml: string, itemClass: string): string | undefined {
  const match = chainHtml.match(new RegExp(`<li class="chain-item ${itemClass}"[^>]*>[\\s\\S]*?<\\/li>`));
  return match?.[0];
}

function chainTextOf(li: string): string {
  const match = li.match(/<p class="chain-text[^"]*"[^>]*>([\s\S]*?)<\/p>/);
  return (match?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

describe("reconstruction chain (specimen pages)", () => {
  it("has at least one specimen to check", () => {
    expect(specimenNodes.length).toBeGreaterThan(0);
  });

  it("renders exactly one ol.chain with exactly three li on every specimen page", () => {
    // Turns red by: omitting <ReconstructionChain /> from
    // src/pages/specimens/[slug].astro, rendering it twice, or adding or
    // removing an <li> inside ReconstructionChain.astro.
    for (const node of specimenNodes) {
      const html = pageHtml(node.id);
      const chains = chainsIn(html);
      expect(chains.length, `${node.id} does not have exactly one ol.chain`).toBe(1);
      const liCount = [...chains[0].matchAll(/<li\b/g)].length;
      expect(liCount, `${node.id}'s chain does not have exactly three li`).toBe(3);
    }
  });

  it("carries the specimen's own verification level as a class on the ol", () => {
    // Turns red by: hard-coding chain--primary (or any fixed level)
    // regardless of the specimen's actual verification field.
    for (const node of specimenNodes) {
      const html = pageHtml(node.id);
      const [chain] = chainsIn(html);
      const expectedClass = `chain--${node.meta?.verification}`;
      expect(chain, `${node.id}'s chain is missing class ${expectedClass}`).toContain(expectedClass);
    }
  });

  it("gives the Printed li exactly the specimen's printed text", () => {
    // Turns red by: passing a different field to the Printed li, or
    // trimming, truncating or otherwise altering the printed text.
    for (const node of specimenNodes) {
      const html = pageHtml(node.id);
      const [chain] = chainsIn(html);
      const li = liOf(chain, "chain-printed");
      expect(li, `${node.id}'s chain has no chain-printed li`).toBeDefined();
      expect(chainTextOf(li!)).toBe(String(node.meta?.printed));
    }
  });

  it("gives the Mechanism li text that contains the specimen's mechanism", () => {
    // Turns red by: leaving the Mechanism li's text empty, or rendering a
    // different field in its place.
    for (const node of specimenNodes) {
      const html = pageHtml(node.id);
      const [chain] = chainsIn(html);
      const li = liOf(chain, "chain-mechanism");
      expect(li, `${node.id}'s chain has no chain-mechanism li`).toBeDefined();
      expect(chainTextOf(li!)).toContain(String(node.meta?.mechanism));
    }
  });

  it('gives the Input li the specimen\'s input text, or exactly "Not recorded" when unset', () => {
    // Turns red by: rendering "Not recorded" for a specimen that does have
    // an input value, or rendering the input text for one that does not.
    for (const node of specimenNodes) {
      const html = pageHtml(node.id);
      const [chain] = chainsIn(html);
      const li = liOf(chain, "chain-input");
      expect(li, `${node.id}'s chain has no chain-input li`).toBeDefined();
      const expected = node.meta?.input ? String(node.meta.input) : "Not recorded";
      expect(chainTextOf(li!)).toBe(expected);
    }
  });

  it("never states an input in the chain that the page's own body prose does not already state", () => {
    // Turns red by: setting a specimen's `input` field to a string that
    // does not literally appear elsewhere on its page — proof the chain
    // would be introducing a fact rather than surfacing one already there.
    const withInput = specimenNodes.filter((n) => n.meta?.input);
    expect(withInput.length).toBeGreaterThan(0);
    for (const node of withInput) {
      const html = pageHtml(node.id);
      const [chain] = chainsIn(html);
      const bodyOutsideChain = html.replace(chain, "");
      expect(
        bodyOutsideChain,
        `${node.id}'s input "${node.meta!.input}" does not occur in the page outside the chain`,
      ).toContain(String(node.meta!.input));
    }
  });

  // The connector is the only place verification is read twice on this page,
  // so it has to be legible on both themes. --at-divider is a 12%-alpha
  // hairline in light and dark alike (astro-theme-university
  // styles/tokens.css); --at-border is the 30%/40% accent-alpha token that
  // .verification-badge--apocryphal already draws its dashed line in, so the
  // two marks of the same meaning resolve to the same colour.
  //
  // Turns red by: setting --chain-connector-color back to var(--at-divider)
  // on ol.chain in src/styles/specimen.css.
  it("declares the chain's default connector colour as the border token, never the hairline, on every specimen page", () => {
    for (const node of specimenNodes) {
      const css = cssLoadedBy(pageHtml(node.id), pageFile(node.id));
      const declaring = chainBaseRules(css).filter((rule) =>
        /--chain-connector-color\s*:/.test(rule),
      );
      expect(
        declaring.length,
        `${node.id}: no ol.chain rule in its loaded CSS declares --chain-connector-color`,
      ).toBeGreaterThan(0);
      for (const rule of declaring) {
        expect(
          rule,
          `${node.id}: an ol.chain rule sets --chain-connector-color to something other than var(--at-border)`,
        ).toMatch(/--chain-connector-color\s*:\s*var\(\s*--at-border\s*\)/);
      }
      expect(
        css,
        `${node.id}: its loaded CSS still sets --chain-connector-color to the 12%-alpha var(--at-divider)`,
      ).not.toMatch(/--chain-connector-color\s*:\s*var\(\s*--at-divider\s*\)/);
    }
  });
});
