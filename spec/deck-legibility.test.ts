import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** A deck is a projection surface, not a page: it is read at four metres and
 *  it cannot scroll. Everything here is a legibility floor the build cannot
 *  see — the stylesheet in src/decks/theme.css can only size a slide it can
 *  identify, and it can only identify one that carries a class. */

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

/** The seven slide kinds src/decks/theme.css lays out. A slide outside this
 *  set falls back to deck.css's `align-content: start` at 28px, which is the
 *  top-left-corner failure this file exists to stop. */
const SLIDE_CLASSES = [
  "impact",
  "statement",
  "specimen",
  "list",
  "figure",
  "quote",
  "bench",
] as const;

const MAX_WORDS_PER_SLIDE = 45;
const MAX_LIST_ITEMS = 4;

/** Two length ceilings, derived from the 390x844 phone rather than from
 *  taste. There the 1280x720 canvas scales by 0.3047 and paints at 390x219,
 *  and because every slide kind centres its content, content that outgrows
 *  its box spills off both ends of it: the canvas bounds it, not the padding.
 *  src/decks/theme.css carries the derivation; the number it leaves is a
 *  659.2px band, once the running footer has taken the bottom 60.8px.
 *
 *  90 characters: a list item sets at 3.3rem (52.8px) into a 1074px column,
 *  which at about 0.5em a character is 40 characters a line, so 90 is three
 *  lines — 237.6px. Two of those under a heading is 602.2px, inside the band.
 *  This is a guard and not a proof: it stops one item becoming the thing that
 *  overflows, and says nothing about four of them together, which is what
 *  MAX_LIST_ITEMS is for.
 *
 *  180 characters: a statement's sole paragraph sets at 4.55rem (72.8px) at
 *  line-height 1.25, so 91px a line and about 32 characters a line. 180 is
 *  six lines, 546px of the band. The slide leaves the stage at eight. */
const MAX_LIST_ITEM_CHARS = 90;
const MAX_STATEMENT_PARAGRAPH_CHARS = 180;

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;
const lecturesWithDecks = api.nodes.filter(
  (node) => node.type === "lectures" && typeof node.meta?.slides === "string",
);
const sessions = api.nodes.filter((node) => node.type === "sessions");
const specimens = api.nodes.filter((node) => node.type === "specimens");

/** Two strings are the same printed line when they differ only in the spaces
 *  between their words. A deck sets `出口 &nbsp; EXPORT` because the sign has a
 *  gap on it; the specimen record writes one ordinary space. Same artefact. */
function normalise(text: string): string {
  return text.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

/** The words a person in the room can actually read. Speaker notes compile to
 *  a display:none aside, a slide's own <style> block is CSS, the theme's
 *  heading anchor is a hidden "#", and an SVG <title> is alt text for a screen
 *  reader — none of them are on the wall. SVG <text> is, so it stays and it
 *  counts. */
function visibleText(html: string): string {
  const stripped = html
    .replace(/<aside\b[^>]*\bnotes\b[^>]*>[\s\S]*?<\/aside>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, " ")
    .replace(/<a\b[^>]*\bat-heading-anchor\b[^>]*>[\s\S]*?<\/a>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  return normalise(stripped);
}

function wordCount(text: string): number {
  return text === "" ? 0 : text.split(" ").length;
}

interface Slide {
  index: number;
  attrs: string;
  inner: string;
  classes: string[];
}

interface Deck {
  name: string;
  lecture: ApiNode;
  html: string;
  title: string;
  slides: Slide[];
}

const decks: Deck[] = lecturesWithDecks.map((lecture) => {
  const name = String(lecture.meta?.slides).match(/^\/decks\/([a-z0-9-]+)\/$/)![1]!;
  const html = readFileSync(resolve("dist/decks", name, "index.html"), "utf8");
  const slides = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)].map(
    (match, index) => {
      const cls = match[1]!.match(/\bclass="([^"]*)"/)?.[1] ?? "";
      return {
        index: index + 1,
        attrs: match[1]!,
        inner: match[2]!,
        classes: cls.split(/\s+/).filter(Boolean),
      };
    },
  );
  return {
    name,
    lecture,
    html,
    title: html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "",
    slides,
  };
});

// The specimen this deck's own lecture is about — the scope a title-less
// specimen slide (chukou-export, the-vodka-and-the-meat) falls back to below,
// since neither names itself in specimen-line the way every other one does.
function relatedSpecimensOf(deck: Deck): ApiNode[] {
  return (deck.lecture.related ?? [])
    .filter((ref) => ref.startsWith("specimens/"))
    .map((ref) => specimens.find((node) => node.id === ref))
    .filter((node): node is ApiNode => Boolean(node));
}

// A specimen slide's own name for itself: specimen-line's text with the
// verification badge stripped out. Empty for the two slides that carry no
// name at all (chukou-export, the-vodka-and-the-meat).
function specimenLineTitle(inner: string): string {
  const match = inner.match(/<p\s+class="specimen-line">([\s\S]*?)<\/p>/);
  if (!match) return "";
  return visibleText(match[1]!.replace(/<span\b[^>]*\bverification-badge\b[^>]*>[\s\S]*?<\/span>/g, ""));
}

describe("deck legibility", () => {
  // Guards every loop below: with no decks in dist/ each `for` runs zero
  // times and this file would pass while saying nothing.
  it("finds a built deck for every lecture that declares slides", () => {
    expect(lecturesWithDecks.length, "no lecture declares a slides path").toBeGreaterThan(0);
    expect(decks.length).toBe(lecturesWithDecks.length);
  });

  // Turns red by: deleting slides from a deck until it holds seven.
  it("gives every deck at least eight slides", () => {
    for (const deck of decks) {
      expect(
        deck.slides.length,
        `${deck.name} has ${deck.slides.length} sections, expected at least 8`,
      ).toBeGreaterThanOrEqual(8);
    }
  });

  // Turns red by: removing one slide's `{/* _class: … */}` directive, or
  // giving a slide two of the seven at once (`_class: impact statement`).
  it("marks every slide with exactly one of the seven slide classes", () => {
    for (const deck of decks) {
      for (const slide of deck.slides) {
        const kinds = slide.classes.filter((cls) =>
          (SLIDE_CLASSES as readonly string[]).includes(cls),
        );
        expect(
          kinds,
          `${deck.name} slide ${slide.index} carries ${JSON.stringify(slide.classes)}, expected exactly one of ${SLIDE_CLASSES.join(", ")}`,
        ).toHaveLength(1);
      }
    }
  });

  // Turns red by: pasting a paragraph onto a slide until it passes 45 words.
  it("keeps every slide under 45 words of visible text", () => {
    for (const deck of decks) {
      for (const slide of deck.slides) {
        const words = wordCount(visibleText(slide.inner));
        expect(
          words,
          `${deck.name} slide ${slide.index} shows ${words} words, over the ${MAX_WORDS_PER_SLIDE}-word ceiling`,
        ).toBeLessThanOrEqual(MAX_WORDS_PER_SLIDE);
      }
    }
  });

  // Turns red by: adding a fifth bullet to any list slide.
  it("keeps every list to four items or fewer", () => {
    for (const deck of decks) {
      for (const slide of deck.slides) {
        for (const list of slide.inner.matchAll(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
          const items = (list[2]!.match(/<li\b/g) ?? []).length;
          expect(
            items,
            `${deck.name} slide ${slide.index} has a <${list[1]}> of ${items} items, over ${MAX_LIST_ITEMS}`,
          ).toBeLessThanOrEqual(MAX_LIST_ITEMS);
        }
      }
    }
  });

  // Turns red by: renaming a lecture in src/content/lectures/ without
  // renaming its deck's frontmatter `title:` to match.
  it("titles every deck page for the lecture it belongs to", () => {
    for (const deck of decks) {
      expect(
        deck.title,
        `${deck.name}'s <title> "${deck.title}" does not contain ${deck.lecture.id}'s title`,
      ).toContain(String(deck.lecture.title));
    }
  });

  // A deck that does not end at the bench ends nowhere: the lecture exists to
  // send the room to Wednesday. Turns red by: dropping `_class: bench` from a
  // deck's last slide, or leaving the bench title on it stale after a rename
  // in src/content/sessions/.
  it("ends every deck on the bench slide, naming that week's bench", () => {
    for (const deck of decks) {
      const week = Number(deck.lecture.meta?.week);
      const session = sessions.find((node) => Number(node.meta?.week) === week);
      expect(session, `no bench in week ${week} for ${deck.lecture.id}`).toBeDefined();
      const last = deck.slides.at(-1)!;
      expect(
        last.classes,
        `${deck.name}'s last slide is ${JSON.stringify(last.classes)}, not bench`,
      ).toContain("bench");
      expect(
        visibleText(last.inner),
        `${deck.name}'s bench slide does not name week ${week}'s bench, "${session!.title}"`,
      ).toContain(normalise(String(session!.title)));
    }
  });

  // Without this, the assertion below is vacuous: no .specimen slides means
  // nothing to check and a green run that proves nothing.
  it("puts at least one specimen slide in the decks", () => {
    const count = decks.reduce(
      (total, deck) => total + deck.slides.filter((s) => s.classes.includes("specimen")).length,
      0,
    );
    expect(count, "no deck slide carries the specimen class").toBeGreaterThan(0);
  });

  // A specimen slide quotes an artefact, so the line on the wall has to be the
  // line in the record — not a retyping of it, and not just any specimen's
  // line. Scoped to the specimen the slide names in specimen-line, or — for
  // the two slides that name none — to the specimens its own lecture cites.
  // Turns red by: changing a word inside a `.printed` element or its
  // specimen's `printed:` frontmatter without changing the other, or by a
  // slide printing a line that belongs to some other, unrelated specimen.
  it("prints, on every specimen slide, a line that equals the specimen it names", () => {
    for (const deck of decks) {
      const related = relatedSpecimensOf(deck);
      for (const slide of deck.slides.filter((s) => s.classes.includes("specimen"))) {
        const lines = [
          ...slide.inner.matchAll(/<(\w+)\b[^>]*\bclass="[^"]*\bprinted\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/g),
        ].map((match) => visibleText(match[2]!));
        expect(
          lines.length,
          `${deck.name} slide ${slide.index} is a specimen slide with no .printed element`,
        ).toBeGreaterThan(0);

        const title = specimenLineTitle(slide.inner);
        let candidates: ApiNode[];
        if (title) {
          candidates = specimens.filter((node) => normalise(node.title) === title);
          expect(
            candidates.length,
            `${deck.name} slide ${slide.index} names "${title}", which matches ${candidates.length} specimens, expected exactly 1`,
          ).toBe(1);
        } else {
          candidates = related;
          expect(
            candidates.length,
            `${deck.name} slide ${slide.index} names no specimen, and ${deck.lecture.id} cites none to fall back on`,
          ).toBeGreaterThan(0);
        }

        for (const line of lines) {
          const matches = candidates.filter((node) => normalise(String(node.meta?.printed ?? "")) === line);
          expect(
            matches.length,
            `${deck.name} slide ${slide.index} prints "${line}", which matches ${matches.length} of the specimen(s) it could be quoting (${candidates.map((c) => c.id).join(", ")})`,
          ).toBe(1);
        }
      }
    }
  });

  // The footer is a CSS custom property, not markup: theme.css prints
  // `--deck-footer` through `section::after`, and each deck declares its own
  // value in a one-line <style> on its first slide. A deck that declares
  // nothing prints an empty footer, and without this the build says so
  // nowhere.
  // Turns red by: deleting the <style> line from any deck's first slide;
  // changing a week number or a word of the lecture title on one side of the
  // string without changing the other; or renaming a lecture in
  // src/content/lectures/ and leaving the footer naming the old title.
  it("declares a footer naming the course, the week and the lecture, on every deck", () => {
    for (const deck of decks) {
      const week = Number(deck.lecture.meta?.week);
      const expected = `SLOP8217 · Week ${week} · ${deck.lecture.title}`;
      const declared = deck.html.match(/--deck-footer:\s*"([^"]*)"/)?.[1];
      expect(declared, `${deck.name} declares no --deck-footer`).toBeDefined();
      expect(
        declared,
        `${deck.name} declares the footer "${declared}", expected "${expected}"`,
      ).toBe(expected);
    }
  });

  // Turns red by: extending any outline item past 90 characters. Week 11's
  // third seam line — "I am not in the office at the moment. Send any work to
  // be translated. — week 7" — is the longest in the repo at 78, so it needs
  // 13 more characters to trip this.
  it("keeps every list item to 90 characters or fewer", () => {
    let seen = 0;
    for (const deck of decks) {
      for (const slide of deck.slides) {
        for (const item of slide.inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)) {
          const text = visibleText(item[1]!);
          seen += 1;
          expect(
            text.length,
            `${deck.name} slide ${slide.index} has a ${text.length}-character item, over ${MAX_LIST_ITEM_CHARS}: "${text}"`,
          ).toBeLessThanOrEqual(MAX_LIST_ITEM_CHARS);
        }
      }
    }
    expect(seen, "no deck slide carries a list item").toBeGreaterThan(0);
  });

  // Turns red by: adding a clause to week 11's opening statement — "For ten
  // weeks the argument has been that an error is evidence, and that reading it
  // backwards gets you to a machine you were never given access to." — which
  // is the longest at 146 characters and needs 35 more to trip this.
  it("keeps every statement paragraph to 180 characters or fewer", () => {
    let seen = 0;
    for (const deck of decks) {
      for (const slide of deck.slides.filter((s) => s.classes.includes("statement"))) {
        for (const para of slide.inner.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
          const text = visibleText(para[1]!);
          seen += 1;
          expect(
            text.length,
            `${deck.name} slide ${slide.index} has a ${text.length}-character paragraph, over ${MAX_STATEMENT_PARAGRAPH_CHARS}: "${text}"`,
          ).toBeLessThanOrEqual(MAX_STATEMENT_PARAGRAPH_CHARS);
        }
      }
    }
    expect(seen, "no deck slide carries a statement paragraph").toBeGreaterThan(0);
  });
});
