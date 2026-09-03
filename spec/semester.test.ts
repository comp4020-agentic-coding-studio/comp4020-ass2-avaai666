// Two claims under test: the home page's semester table is generated from
// the content collections rather than typed by hand, and every session and
// lecture page carries a week strip that actually reflects its own position
// in the semester. Both read the built API and built HTML — nothing here
// re-derives a fact the build already owns.
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
const assessmentNodes = api.nodes.filter((n) => n.type === "assessments");

const homeHtml = readFileSync(resolve("dist/index.html"), "utf8");
const tableMatches = [...homeHtml.matchAll(/<table class="semester"[^>]*>[\s\S]*?<\/table>/g)];
const tableHtml = tableMatches[0]?.[0] ?? "";

function rowsOf(html: string): string[] {
  return [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map((m) => m[0]);
}

const rows = rowsOf(tableHtml);

function rowForWeek(week: number): string | undefined {
  return rows.find((row) => {
    const match = row.match(/<th\s+scope="row">\s*(\d+)\s*<\/th>/);
    return match !== null && Number(match[1]) === week;
  });
}

describe("semester table (home page)", () => {
  it("renders exactly one table.semester", () => {
    // Turns red by: deleting <Semester /> from src/pages/index.astro, or
    // rendering it more than once.
    expect(tableMatches.length).toBe(1);
  });

  it("gives the table exactly 12 week rows, each with a <th scope=\"row\">", () => {
    // Turns red by: changing the week loop in Semester.astro to run 1-11 or
    // 1-13 instead of 1-12.
    const count = [...tableHtml.matchAll(/<th\s+scope="row">/g)].length;
    expect(count).toBe(12);
  });

  it("puts every session's title in the row of its own week", () => {
    // Turns red by: rendering the bench cell without the session's title,
    // e.g. linking only the date.
    for (const node of sessionNodes) {
      const week = Number(node.meta?.week);
      const row = rowForWeek(week);
      expect(row, `no table row found for week ${week}`).toBeDefined();
      expect(row, `${node.id}'s title is missing from week ${week}'s row`).toContain(node.title);
    }
  });

  it("puts every lecture's title in the row of its own week", () => {
    // Turns red by: looking up the lecture by array index instead of by
    // week, so a title lands in the wrong row.
    for (const node of lectureNodes) {
      const week = Number(node.meta?.week);
      const row = rowForWeek(week);
      expect(row, `no table row found for week ${week}`).toBeDefined();
      expect(row, `${node.id}'s title is missing from week ${week}'s row`).toContain(node.title);
    }
  });

  it("puts every assessment's title in the row of its own week, and nowhere else in the table", () => {
    // Turns red by: rendering the Due column once per assessment across
    // every row instead of only in the row matching that assessment's week.
    for (const node of assessmentNodes) {
      const week = Number(node.meta?.week);
      const row = rowForWeek(week);
      expect(row, `no table row found for week ${week}`).toBeDefined();
      expect(row, `${node.id}'s title is missing from week ${week}'s row`).toContain(node.title);

      const totalCount = tableHtml.split(node.title).length - 1;
      const rowCount = row!.split(node.title).length - 1;
      expect(
        totalCount,
        `${node.id}'s title "${node.title}" appears in a row other than week ${week}'s`,
      ).toBe(rowCount);
    }
  });

  it("inserts one \"Mid-semester break\" row for every >7-day gap between consecutive bench dates", () => {
    // Turns red by: hard-coding the break after week 6 instead of deriving
    // it from the date gap, so a change to the session dates would not move
    // the break.
    const byWeek = [...sessionNodes].sort(
      (a, b) => Number(a.meta?.week) - Number(b.meta?.week),
    );
    let expectedBreaks = 0;
    for (let i = 1; i < byWeek.length; i++) {
      const prev = new Date(String(byWeek[i - 1].meta?.date));
      const curr = new Date(String(byWeek[i].meta?.date));
      const gapDays = (curr.getTime() - prev.getTime()) / 86_400_000;
      if (gapDays > 7) expectedBreaks++;
    }
    const actualBreaks = [...tableHtml.matchAll(/Mid-semester break/g)].length;
    expect(actualBreaks).toBe(expectedBreaks);
  });
});

const navMatches = [...homeHtml.matchAll(/<nav class="semester-nav"[^>]*>[\s\S]*?<\/nav>/g)];
const navHtml = navMatches[0]?.[0] ?? "";

function detailsOf(html: string): string[] {
  return [...html.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/g)].map((m) => m[0]);
}

const navDetails = detailsOf(navHtml);

function summaryTextOf(details: string): string {
  const match = details.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/);
  return (match?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

describe("semester nav (home page, phone)", () => {
  it("renders exactly one nav.semester-nav with exactly twelve details", () => {
    // Turns red by: deleting <SemesterNav /> from src/pages/index.astro, or
    // rendering it more than once, or looping over fewer/more than 12 weeks.
    expect(navMatches.length).toBe(1);
    expect(navDetails.length).toBe(12);
  });

  it("orders each summary W01…W12, each naming its own week's lecture title or \"No lecture\"", () => {
    // Turns red by: rendering the weeks out of order, using an unpadded
    // week number ("W1" instead of "W01"), or looking up the lecture by
    // array index instead of by week so a title lands under the wrong week.
    navDetails.forEach((details, index) => {
      const week = index + 1;
      const label = `W${String(week).padStart(2, "0")}`;
      const summaryText = summaryTextOf(details);
      expect(summaryText.startsWith(label), `detail ${index} does not start with ${label}`).toBe(
        true,
      );

      const lecture = lectureNodes.find((n) => Number(n.meta?.week) === week);
      const expectedTitle = lecture ? lecture.title : "No lecture";
      expect(
        summaryText,
        `week ${week}'s summary is missing "${expectedTitle}"`,
      ).toContain(expectedTitle);
    });
  });

  it("marks Due in the summary of every week with an assessment due, and no other week", () => {
    // Turns red by: rendering the Due mark on every week regardless of
    // whether an assessment falls due that week, or omitting it for a week
    // that does have one due.
    const dueWeeks = new Set(assessmentNodes.map((n) => Number(n.meta?.week)));
    navDetails.forEach((details, index) => {
      const week = index + 1;
      const hasDueMark = /<span class="semester-nav-due">Due<\/span>/.test(details);
      expect(hasDueMark, `week ${week}'s Due mark presence is wrong`).toBe(dueWeeks.has(week));
    });
  });

  it("renders exactly one Deck link per lecture that has slides", () => {
    // Turns red by: rendering the Deck link for every lecture regardless of
    // whether it has slides, or omitting it for a lecture that does.
    const lecturesWithSlides = lectureNodes.filter((n) => Boolean(n.meta?.slides));
    const deckLinkCount = [...navHtml.matchAll(/<a\s+class="deck-link"/g)].length;
    expect(deckLinkCount).toBe(lecturesWithSlides.length);
  });

  it("puts one \"Mid-semester break\" paragraph between W06 and W07, and nowhere else", () => {
    // Turns red by: hard-coding the break's position instead of deriving it
    // from breaksBefore(), so a change to the session dates would not move
    // it, or by rendering it inside a <details> instead of as a plain <p>.
    const breakMatches = [...navHtml.matchAll(/<p class="semester-break">Mid-semester break<\/p>/g)];
    expect(breakMatches.length).toBe(1);

    const breakIndex = navHtml.indexOf(breakMatches[0][0]);
    const week06Index = navHtml.indexOf(navDetails[5]);
    const week07Index = navHtml.indexOf(navDetails[6]);
    expect(breakIndex).toBeGreaterThan(week06Index);
    expect(breakIndex).toBeLessThan(week07Index);
  });
});

function pageHtml(type: "sessions" | "lectures", nodeId: string): string {
  const slug = nodeId.slice(type.length + 1);
  return readFileSync(resolve("dist", type, slug, "index.html"), "utf8");
}

function stripsIn(html: string): string[] {
  return [...html.matchAll(/<nav\s+class="week-strip"[^>]*>[\s\S]*?<\/nav>/g)].map((m) => m[0]);
}

describe.each(["sessions", "lectures"] as const)("week strip: %s", (type) => {
  const nodes = api.nodes.filter((n) => n.type === type);

  it(`has at least one ${type} page to check`, () => {
    expect(nodes.length).toBeGreaterThan(0);
  });

  it("renders exactly one nav.week-strip, with exactly one item marked aria-current=\"page\" naming its own week", () => {
    // Turns red by: rendering the strip twice on a page, or marking a
    // different week's item as aria-current="page" than the page it is on.
    for (const node of nodes) {
      const html = pageHtml(type, node.id);
      const strips = stripsIn(html);
      expect(strips.length, `${node.id} does not render exactly one nav.week-strip`).toBe(1);

      const currentMatches = [
        ...strips[0].matchAll(/<a\b[^>]*\baria-current="page"[^>]*>([\s\S]*?)<\/a>/g),
      ];
      expect(
        currentMatches.length,
        `${node.id}'s week strip does not mark exactly one item aria-current="page"`,
      ).toBe(1);

      const currentText = currentMatches[0][1].replace(/<[^>]+>/g, "").trim();
      expect(Number(currentText), `${node.id}'s current strip item is not its own week number`).toBe(
        Number(node.meta?.week),
      );
    }
  });
});

describe("week strip: lectures with no entry", () => {
  const lectureWeeks = new Set(lectureNodes.map((n) => Number(n.meta?.week)));
  const noLectureWeeks = Array.from({ length: 12 }, (_, i) => i + 1).filter(
    (week) => !lectureWeeks.has(week),
  );

  it("finds at least one week with no lecture to check", () => {
    expect(noLectureWeeks.length).toBeGreaterThan(0);
  });

  it("renders weeks with no lecture as aria-disabled spans, never as links", () => {
    // Turns red by: rendering a week with no lecture as a plain, unlinked
    // number with no aria-disabled marker (or as a link to a non-existent
    // page).
    for (const node of lectureNodes) {
      const html = pageHtml("lectures", node.id);
      const [strip] = stripsIn(html);
      expect(strip, `${node.id} has no week strip to check`).toBeDefined();

      for (const week of noLectureWeeks) {
        const spanMatch = new RegExp(
          `<span\\b[^>]*\\baria-disabled="true"[^>]*>\\s*${week}\\s*</span>`,
        );
        expect(
          spanMatch.test(strip),
          `${node.id}'s week strip has no aria-disabled span for week ${week}`,
        ).toBe(true);

        const linkMatch = new RegExp(`<a\\b[^>]*>\\s*${week}\\s*</a>`);
        expect(
          linkMatch.test(strip),
          `${node.id}'s week strip renders week ${week} (no lecture) as a link`,
        ).toBe(false);
      }
    }
  });
});
