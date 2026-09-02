// Claim under test: a session or lecture page shows that week's other half —
// the lecture or the bench, the specimens either argues from, the deck when
// there is one, what falls due — before the body starts, not only in the
// Related list at the foot of the page. Everything here reads the built API
// and built HTML; nothing re-derives a fact the build already owns.
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
const sessionNodes = api.nodes.filter((n) => n.type === "sessions");
const lectureNodes = api.nodes.filter((n) => n.type === "lectures");
const lectureWeeks = new Set(lectureNodes.map((n) => Number(n.meta?.week)));

function pageHtml(type: "sessions" | "lectures", nodeId: string): string {
  const slug = nodeId.slice(type.length + 1);
  return readFileSync(resolve("dist", type, slug, "index.html"), "utf8");
}

function thisWeekBlocks(html: string): string[] {
  return [...html.matchAll(/<dl\s+class="this-week[^"]*"[^>]*>[\s\S]*?<\/dl>/g)].map((m) => m[0]);
}

function rowFor(block: string, label: string): string | undefined {
  return block.match(new RegExp(`<dt>${label}</dt>\\s*<dd>([\\s\\S]*?)</dd>`))?.[1];
}

describe.each(["sessions", "lectures"] as const)("this-week block: %s pages", (type) => {
  const nodes = api.nodes.filter((n) => n.type === type);

  it("renders exactly one dl.this-week", () => {
    // Turns red by: rendering <ThisWeek /> twice on a route, or dropping the
    // component from one of the two routes.
    for (const node of nodes) {
      const html = pageHtml(type, node.id);
      expect(
        thisWeekBlocks(html).length,
        `${node.id} does not render exactly one dl.this-week`,
      ).toBe(1);
    }
  });
});

describe("this-week block: the Lecture row on session pages", () => {
  it("names the lecture whose week matches, or reads \"No lecture\" when the API has none", () => {
    // Turns red by: looking up the lecture by array index instead of by
    // week, so a session page names the wrong lecture, or a week with no
    // lecture still gets a title instead of the literal text "No lecture".
    for (const node of sessionNodes) {
      const week = Number(node.meta?.week);
      const [block] = thisWeekBlocks(pageHtml("sessions", node.id));
      expect(block, `${node.id} has no this-week block`).toBeDefined();
      const row = rowFor(block, "Lecture");
      expect(row, `${node.id}'s this-week block has no Lecture row`).toBeDefined();

      if (lectureWeeks.has(week)) {
        const lecture = lectureNodes.find((n) => Number(n.meta?.week) === week)!;
        expect(row).toContain(lecture.title);
      } else {
        expect(row!.trim()).toBe("No lecture");
      }
    }
  });
});

describe("this-week block: the Bench row on lecture pages", () => {
  it("names the session whose week matches", () => {
    // Turns red by: reading the bench title from the lecture's own related
    // list instead of the sessions collection, so a renamed session title
    // stops matching, or the wrong week's session is looked up.
    for (const node of lectureNodes) {
      const week = Number(node.meta?.week);
      const [block] = thisWeekBlocks(pageHtml("lectures", node.id));
      expect(block, `${node.id} has no this-week block`).toBeDefined();
      const row = rowFor(block, "Bench");
      expect(row, `${node.id}'s this-week block has no Bench row`).toBeDefined();

      const session = sessionNodes.find((n) => Number(n.meta?.week) === week)!;
      expect(row).toContain(session.title);
    }
  });
});

function deckLinkAnchors(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /\bclass="deck-link"/.test(tag));
}

describe("this-week block: the deck link", () => {
  it('appears exactly once on the week-05 lecture page, class="deck-link", linking to /decks/week-05/', () => {
    // Turns red by: leaving the old "Open the slides" paragraph in place
    // alongside the new Slides row, producing a second link on the page.
    const anchors = deckLinkAnchors(pageHtml("lectures", "lectures/week-05"));
    expect(anchors.length).toBe(1);
    expect(anchors[0]).toMatch(/href="[^"]*\/decks\/week-05\/"/);
  });

  it("does not appear, and no /decks/ link of any kind appears, on any other lecture page", () => {
    // Turns red by: rendering the Slides row unconditionally instead of only
    // when that week's lecture declares `slides`.
    for (const node of lectureNodes) {
      if (node.id === "lectures/week-05") continue;
      const html = pageHtml("lectures", node.id);
      expect(html, `${node.id} links to a deck it does not have`).not.toMatch(/href="[^"]*\/decks\//);
    }
  });
});

describe("this-week block: the lectures index", () => {
  it("has exactly as many deck-link anchors as the API has lectures with slides", () => {
    // Turns red by: adding the Deck link unconditionally to every row (or
    // never adding it), instead of gating it on that lecture's `slides`.
    const html = readFileSync(resolve("dist/lectures/index.html"), "utf8");
    const withSlides = lectureNodes.filter((n) => Boolean(n.meta?.slides));
    expect(deckLinkAnchors(html).length).toBe(withSlides.length);
  });
});
