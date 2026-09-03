// The same reasoning as spec/timeline-visibility.test.ts: "the hiding rule
// is present somewhere in the CSS" is not the same claim as "the hiding rule
// wins the cascade." The table and the phone nav swap which one is visible
// at a breakpoint, and the only way to check that exactly one of them is
// visible at a given width is to resolve the cascade the way a browser
// does, not just grep for a selector.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIST = resolve("dist");

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

interface CssRule {
  selectors: string[];
  declarations: Record<string, string>;
  media: string | null;
  order: number;
}

/** Splits CSS into rules, tracking (at most) one level of @media nesting. */
function parseRules(css: string): CssRule[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];
  const mediaStack: string[] = [];
  let order = 0;
  let buf = "";
  let i = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (ch === "{") {
      const header = buf.trim();
      buf = "";
      if (header.startsWith("@media")) {
        mediaStack.push(header);
        i++;
        continue;
      }
      let depth = 1;
      let j = i + 1;
      while (j < clean.length && depth > 0) {
        if (clean[j] === "{") depth++;
        else if (clean[j] === "}") depth--;
        j++;
      }
      const body = clean.slice(i + 1, j - 1);
      const declarations: Record<string, string> = {};
      for (const decl of body.split(";")) {
        const colon = decl.indexOf(":");
        if (colon === -1) continue;
        declarations[decl.slice(0, colon).trim()] = decl.slice(colon + 1).trim();
      }
      rules.push({
        selectors: header.split(",").map((s) => s.trim()),
        declarations,
        media: mediaStack[mediaStack.length - 1] ?? null,
        order: order++,
      });
      i = j;
      continue;
    }
    if (ch === "}") {
      if (mediaStack.length > 0) mediaStack.pop();
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  return rules;
}

interface Compound {
  type: string | null;
  classes: string[];
}

function parseCompound(part: string): Compound {
  const type = part.match(/^[a-zA-Z][\w-]*/)?.[0] ?? null;
  const classes = [...part.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
  return { type, classes };
}

function compoundMatches(compound: Compound, el: { tag: string; classes: Set<string> }): boolean {
  if (compound.type && compound.type !== el.tag) return false;
  return compound.classes.every((c) => el.classes.has(c));
}

/** Matches a selector against one target element — table.semester and
 *  nav.semester-nav are both top-level, so no ancestor combinator is
 *  needed here (unlike timeline-visibility.test.ts's descendant case). */
function selectorMatches(selector: string, el: { tag: string; classes: Set<string> }): boolean {
  const parts = selector.trim().split(/\s+/);
  const last = parseCompound(parts[parts.length - 1]!);
  return compoundMatches(last, el);
}

function specificity(selector: string): number {
  const ids = (selector.match(/#[\w-]+/g) ?? []).length;
  const classesAttrsPseudos =
    (selector.match(/\.[\w-]+/g) ?? []).length +
    (selector.match(/\[[^\]]*\]/g) ?? []).length +
    (selector.match(/:(?!:)[\w-]+(\([^)]*\))?/g) ?? []).length;
  const stripped = selector
    .replace(/#[\w-]+/g, "")
    .replace(/\.[\w-]+/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/:(?!:)[\w-]+(\([^)]*\))?/g, "")
    .replace(/::[\w-]+/g, "");
  const types = (stripped.match(/[a-zA-Z][\w-]*/g) ?? []).length;
  return ids * 1_000_000 + classesAttrsPseudos * 1_000 + types;
}

/** Resolves the cascade for one CSS property on one element at one viewport
 *  width — same algorithm as timeline-visibility.test.ts. Only `max-width`
 *  media conditions are evaluated, since that is the only kind semester.css
 *  uses. */
function resolvedValue(
  rules: CssRule[],
  property: string,
  el: { tag: string; classes: Set<string> },
  widthPx: number,
): string | undefined {
  let winner: { value: string; specificity: number; order: number } | undefined;
  for (const rule of rules) {
    if (!(property in rule.declarations)) continue;
    if (rule.media) {
      const match =
        rule.media.match(/max-width:\s*([\d.]+)rem/) ?? rule.media.match(/width\s*<=\s*([\d.]+)rem/);
      if (!match) continue;
      const maxWidthPx = Number.parseFloat(match[1]!) * 16;
      if (widthPx > maxWidthPx) continue;
    }
    const matchingSelectors = rule.selectors.filter((s) => selectorMatches(s, el));
    if (matchingSelectors.length === 0) continue;
    const spec = Math.max(...matchingSelectors.map(specificity));
    if (
      !winner ||
      spec > winner.specificity ||
      (spec === winner.specificity && rule.order > winner.order)
    ) {
      winner = { value: rule.declarations[property]!, specificity: spec, order: rule.order };
    }
  }
  return winner?.value;
}

const homeHtml = readFileSync(resolve("dist/index.html"), "utf8");
const css = cssLoadedBy(homeHtml, "dist/index.html");
const rules = parseRules(css);
const tableEl = { tag: "table", classes: new Set(["semester"]) };
const navEl = { tag: "nav", classes: new Set(["semester-nav"]) };

// The two viewports actually measured in the browser.
const NARROW = 390;
const WIDE = 1920;

describe("semester table / phone nav visibility", () => {
  it("shows only the table above the 40rem breakpoint", () => {
    expect(resolvedValue(rules, "display", tableEl, WIDE)).not.toBe("none");
    expect(resolvedValue(rules, "display", navEl, WIDE)).toBe("none");
  });

  it("shows only the phone nav at or below the 40rem breakpoint", () => {
    expect(resolvedValue(rules, "display", tableEl, NARROW)).toBe("none");
    expect(resolvedValue(rules, "display", navEl, NARROW)).not.toBe("none");
  });
});
