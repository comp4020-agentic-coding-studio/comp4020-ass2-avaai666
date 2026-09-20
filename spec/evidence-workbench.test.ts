// The claim under test: the home page's "select a specimen, inspect the
// system behind it" interaction is not decorative — it is the same three
// specimen records the old passive register showed, now exposed as a real
// tab/panel pair per specimen, and every panel's content is the specimen's
// own data. page-claims.test.ts already guards the home page's specimen
// count and badge-per-heading invariant (>=3 specimen-record-heading,
// one verification-badge--* per heading, substring "specimen-register"
// present); this file does not repeat that check, only adds the tab/panel
// contract on top of it.
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

const FEATURED_SLUGS = ["swansea-out-of-office", "gan-the-merged-character", "intoxicado"];

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;
const specimenNodes = api.nodes.filter((node) => node.type === "specimens");

const featured = FEATURED_SLUGS.map((slug) => {
  const node = specimenNodes.find((n) => n.id === `specimens/${slug}`);
  if (!node) throw new Error(`specimens/${slug} is missing from dist/api/index.json`);
  return { slug, node };
});

// Read straight off disk, with no JS runtime involved — this is exactly the
// document a browser with JavaScript disabled would show, which is the
// "without JavaScript all three records remain readable" claim.
const homeHtml = readFileSync(resolve("dist/index.html"), "utf8");

interface Tab {
  raw: string;
  id: string;
  ariaControls: string;
}

interface Panel {
  raw: string;
  id: string;
  ariaLabelledby: string;
}

function tabs(html: string): Tab[] {
  return [...html.matchAll(/<button\b[^>]*\brole="tab"[^>]*>[\s\S]*?<\/button>/g)].map((m) => {
    const raw = m[0];
    return {
      raw,
      id: raw.match(/\bid="([^"]+)"/)?.[1] ?? "",
      ariaControls: raw.match(/\baria-controls="([^"]+)"/)?.[1] ?? "",
    };
  });
}

// Scoped, uniqueness-checked lookup — the id-substring match below is only
// safe when exactly one element's id contains the slug; if a second element
// ever collided (e.g. a duplicated specimen, or one slug that is a substring
// of another), silently taking the first match would report on the wrong
// element without ever failing.
function findByIdContaining<T extends { id: string }>(items: T[], slug: string, what: string): T {
  const matches = items.filter((item) => item.id.includes(slug));
  expect(matches.length, `expected exactly one ${what} for ${slug}, found ${matches.length}`).toBe(1);
  return matches[0];
}

// Panels are rendered as <article>, and nothing inside a panel is itself an
// <article>, so a lazy match up to the next </article> cannot close early on
// a nested element the way it could for a generic <div>.
function panels(html: string): Panel[] {
  return [...html.matchAll(/<article\b[^>]*\bclass="[^"]*evidence-case[^"]*"[^>]*>[\s\S]*?<\/article>/g)].map(
    (m) => {
      const raw = m[0];
      return {
        raw,
        id: raw.match(/\bid="([^"]+)"/)?.[1] ?? "",
        ariaLabelledby: raw.match(/\baria-labelledby="([^"]+)"/)?.[1] ?? "",
      };
    },
  );
}

describe("evidence workbench (home page)", () => {
  it("has exactly one tab and one panel per featured specimen, none extra", () => {
    // Turns red by: rendering a fourth tab/panel, dropping one of the three,
    // or rendering a specimen more than once.
    expect(tabs(homeHtml).length).toBe(FEATURED_SLUGS.length);
    expect(panels(homeHtml).length).toBe(FEATURED_SLUGS.length);
  });

  it("ties each tab to its own panel by id, in both directions", () => {
    // Turns red by: a tab's aria-controls pointing at the wrong panel id, or
    // a panel's aria-labelledby pointing at the wrong tab id — the two ends
    // of the same relationship disagreeing with each other.
    const allTabs = tabs(homeHtml);
    const allPanels = panels(homeHtml);
    for (const tab of allTabs) {
      expect(tab.id, `a tab is missing an id: ${tab.raw}`).not.toBe("");
      expect(tab.ariaControls, `tab ${tab.id} has no aria-controls`).not.toBe("");
      const panel = allPanels.find((p) => p.id === tab.ariaControls);
      expect(panel, `tab ${tab.id}'s aria-controls (${tab.ariaControls}) matches no panel id`).toBeDefined();
      expect(
        panel!.ariaLabelledby,
        `panel ${panel!.id} is not labelled by tab ${tab.id}`,
      ).toBe(tab.id);
    }
  });

  it("gives every real featured specimen exactly one tab/panel pair", () => {
    // Turns red by: a tab or panel id that does not name a real specimen
    // slug, or naming the same specimen twice.
    const allTabs = tabs(homeHtml);
    for (const { slug } of featured) {
      const matches = allTabs.filter((tab) => tab.id.includes(slug) || tab.ariaControls.includes(slug));
      expect(matches.length, `expected exactly one tab for ${slug}, found ${matches.length}`).toBe(1);
    }
  });

  it("keeps every tab a real, enabled, keyboard-reachable button", () => {
    // Turns red by: rendering a tab as a non-interactive span, or disabling
    // it, or removing it from the tab order.
    for (const tab of tabs(homeHtml)) {
      expect(tab.raw).not.toMatch(/\bdisabled\b/);
      expect(tab.raw).not.toMatch(/\btabindex="-1"/);
    }
  });

  it("gives each specimen's panel its own printed line, verification level and mechanism, verbatim", () => {
    // Turns red by: leaving a field out of a panel, truncating it, or
    // substituting a different specimen's data into the wrong panel.
    const allPanels = panels(homeHtml);
    for (const { slug, node } of featured) {
      const panel = findByIdContaining(allPanels, slug, "panel");
      const { raw } = panel;
      expect(raw, `${slug}'s panel is missing its printed text`).toContain(String(node.meta!.printed));
      expect(raw, `${slug}'s panel is missing its mechanism text`).toContain(String(node.meta!.mechanism));
      const verification = String(node.meta!.verification);
      expect(raw, `${slug}'s panel does not show verification level "${verification}"`).toContain(verification);
      expect(
        raw,
        `${slug}'s panel is missing a verification-badge--${verification} element`,
      ).toContain(`verification-badge--${verification}`);
    }
  });

  it("links each panel to that specimen's own detail page", () => {
    // Turns red by: linking every panel to the same specimen, or to a
    // specimen index instead of the specimen's own page.
    const allPanels = panels(homeHtml);
    for (const { slug } of featured) {
      const panel = findByIdContaining(allPanels, slug, "panel");
      expect(panel.raw).toMatch(new RegExp(`href="[^"]*/specimens/${slug}/"`));
    }
  });

  it("renders all three panels with no hidden attribute, before any script runs", () => {
    // Turns red by: server-rendering `hidden` on the two non-first panels,
    // which is exactly what a naive tabs implementation would do — and
    // exactly what would make the page unreadable with JavaScript off. This
    // assertion reads the file straight off disk, so it is already the
    // no-JavaScript case, not a simulation of it.
    for (const panel of panels(homeHtml)) {
      expect(panel.raw, `panel ${panel.id} is hidden in the static HTML`).not.toMatch(/\bhidden\b/);
    }
  });
});
