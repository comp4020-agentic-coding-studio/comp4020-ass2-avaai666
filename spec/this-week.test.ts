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
  related?: string[];
  meta?: Record<string, unknown>;
}

interface CourseApi {
  nodes: ApiNode[];
}

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;
const sessionNodes = api.nodes.filter((n) => n.type === "sessions");
const lectureNodes = api.nodes.filter((n) => n.type === "lectures");
const specimenNodes = api.nodes.filter((n) => n.type === "specimens");
const lectureWeeks = new Set(lectureNodes.map((n) => Number(n.meta?.week)));

function specimenRefs(node: ApiNode | undefined): string[] {
  return (node?.related ?? []).filter((ref) => ref.startsWith("specimens/"));
}

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

function printedLinesIn(block: string): string[] {
  return [...block.matchAll(/<p\b[^>]*\bclass="[^"]*\bspecimen-printed\b[^"]*"[^>]*>([\s\S]*?)<\/p>/g)].map(
    (m) =>
      m[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
  );
}

describe("this-week block: the printed line for each specimen", () => {
  it("shows one .specimen-printed per distinct specimen referenced by the week's lecture and session, each matching that specimen's printed field", () => {
    // Turns red by: rendering only the specimen's title and badge in the
    // Specimens row, with no printed line above it, or reading the printed
    // text from anywhere but that specimen's own `printed` field.
    for (const type of ["sessions", "lectures"] as const) {
      for (const node of api.nodes.filter((n) => n.type === type)) {
        const week = Number(node.meta?.week);
        const lecture = lectureNodes.find((n) => Number(n.meta?.week) === week);
        const session = sessionNodes.find((n) => Number(n.meta?.week) === week);
        const refs = [...new Set([...specimenRefs(lecture), ...specimenRefs(session)])];

        const [block] = thisWeekBlocks(pageHtml(type, node.id));
        expect(block, `${node.id} has no this-week block`).toBeDefined();
        const printedLines = printedLinesIn(block!);

        expect(
          printedLines.length,
          `${node.id}'s this-week block shows ${printedLines.length} printed line(s), expected ${refs.length}`,
        ).toBe(refs.length);

        for (const ref of refs) {
          const specimen = specimenNodes.find((n) => n.id === ref)!;
          const printed = String(specimen.meta?.printed).trim();
          // This, plus the length check above, proves a bijection between
          // refs and printedLines only because every specimen's printed
          // field is assumed pairwise distinct from every other's. Nothing
          // enforces that. If two of this week's specimens ever shared a
          // printed field, .toContain would pass for both refs against the
          // same rendered line, and a genuinely missing or duplicated line
          // would go uncaught even though the count still matched.
          expect(
            printedLines,
            `${node.id}'s this-week block is missing the printed line for ${ref}`,
          ).toContain(printed);
        }
      }
    }
  });
});

function deckLinkAnchors(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /\bclass="deck-link"/.test(tag));
}

describe("this-week block: the deck link", () => {
  it("appears exactly once, and only, on a lecture page whose lecture declares slides, and links to that lecture's own deck", () => {
    // This replaces a narrower assertion that checked a count ("exactly one
    // deck link on the site, and it is week-05's") which was true only
    // because week-05 happened to be the sole lecture with slides so far.
    // That test would have stayed green even if the deck link pointed at
    // the wrong week, as long as no other lecture had slides. The intent
    // was always "a lecture with slides links to its own deck, and a
    // lecture without slides links to none" — this asserts that directly,
    // generalised from the API, and is strictly stronger: it also checks
    // that each link targets its own week's deck, not just that a link
    // exists somewhere.
    // Turns red by: rendering the Slides row unconditionally instead of
    // only when that week's lecture declares `slides`; by rendering it
    // more than once; or by pointing it at any deck other than the one
    // this lecture's own `slides` field names.
    for (const node of lectureNodes) {
      const html = pageHtml("lectures", node.id);
      const anchors = deckLinkAnchors(html);
      const slides = node.meta?.slides;

      if (typeof slides === "string") {
        expect(anchors.length, `${node.id} should link its own deck exactly once`).toBe(1);
        expect(anchors[0], `${node.id}'s deck link does not point at ${slides}`).toMatch(
          new RegExp(`href="[^"]*${slides.replace(/\//g, "\\/")}"`),
        );
      } else {
        expect(anchors.length, `${node.id} has no slides but links to a deck`).toBe(0);
      }
    }
  });
});

function lectureRows(html: string): string[] {
  return [...html.matchAll(/<li class="lecture-record">([\s\S]*?)<\/li>/g)].map((m) => m[1]!);
}

function indexRowFor(rows: string[], slug: string): string {
  const row = rows.find((r) => new RegExp(`href="[^"]*/lectures/${slug}/"`).test(r));
  if (!row) throw new Error(`no row in the lectures index links /lectures/${slug}/`);
  return row;
}

describe("this-week block: the lectures index", () => {
  it("links each lecture's own deck exactly once from that lecture's own row, and no deck from a lecture with none", () => {
    // This replaces an aggregate count ("as many deck-link anchors as
    // lectures with slides"), which passed as long as the totals matched —
    // two lectures could have swapped decks, or one row could double a link
    // that another was missing, and the count alone would not have noticed.
    // This instead locates each lecture's own <li> by its own page href and
    // checks the deck-link inside that specific row.
    // Turns red by: swapping two lectures' slides paths in the index
    // component — verified: with every lecture in the current data
    // declaring slides, dropping the `lecture.data.slides &&` gate has
    // nothing to bite on and stays green, so that edit is not claimed here.
    const html = readFileSync(resolve("dist/lectures/index.html"), "utf8");
    const rows = lectureRows(html);

    for (const node of lectureNodes) {
      const slug = node.id.split("/")[1]!;
      const row = indexRowFor(rows, slug);
      const anchors = deckLinkAnchors(row);
      const slides = node.meta?.slides;

      if (typeof slides === "string") {
        expect(anchors.length, `${node.id}'s row in the index should link its own deck exactly once`).toBe(
          1,
        );
        expect(anchors[0], `${node.id}'s index row does not link ${slides}`).toMatch(
          new RegExp(`href="[^"]*${slides.replace(/\//g, "\\/")}"`),
        );
      } else {
        expect(anchors.length, `${node.id} has no slides but its index row links a deck`).toBe(0);
      }
    }
  });
});
