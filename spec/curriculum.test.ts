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
const sessions = api.nodes.filter((node) => node.type === "sessions");
const lectures = api.nodes.filter((node) => node.type === "lectures");
const withSlides = lectures.filter((node) => typeof node.meta?.slides === "string");

describe("curriculum", () => {
  it("covers weeks 1 through 12 with a session each, no week twice", () => {
    const weeks = sessions.map((node) => Number(node.meta?.week));
    const expected = Array.from({ length: 12 }, (_, i) => i + 1);
    expect([...weeks].sort((a, b) => a - b)).toEqual(expected);
  });

  it("gives every lecture a session in the same week", () => {
    const sessionWeeks = new Set(sessions.map((node) => Number(node.meta?.week)));
    for (const lecture of lectures) {
      const week = Number(lecture.meta?.week);
      expect(sessionWeeks.has(week), `${lecture.id} has no session in week ${week}`).toBe(true);
    }
  });

  // The live assertion here is the first one: at least one lecture declares
  // a `slides` path. Nothing else in the build enforces that — if every
  // lecture dropped its slides line, the build would succeed and the spec's
  // "at least one lecture carries a real deck" requirement would fail silently.
  // The second assertion, that the declared deck exists under dist/decks/, is
  // a backstop this test can rarely reach: astro-broken-links-checker runs on
  // the astro:build:done hook and throws when a lecture links a deck that
  // isn't in the build, which exits `astro build` before `vitest run spec`
  // ever starts. Its silence here is not coverage — the build already caught
  // it, earlier and harder, by failing outright.
  it("carries a real deck for at least one lecture's slides", () => {
    expect(withSlides.length, "no lecture declares a slides path").toBeGreaterThan(0);

    for (const lecture of withSlides) {
      const slides = String(lecture.meta?.slides);
      const match = slides.match(/^\/decks\/([a-z0-9-]+)\/$/);
      expect(match, `${lecture.id} has a slides path that isn't /decks/<name>/`).not.toBeNull();
      const deckDir = resolve("dist/decks", match![1]);
      expect(existsSync(deckDir), `${lecture.id} points at a deck that isn't in the build`).toBe(
        true,
      );
    }
  });

  it("gives each declared deck at least eight slides, titled for the lecture it belongs to", () => {
    // Turns red by: a deck with fewer than eight `---`-separated slides, or
    // a deck's <title> that has drifted from its lecture's title (a rename
    // on one side and not the other).
    for (const lecture of withSlides) {
      const slides = String(lecture.meta?.slides);
      const deckName = slides.match(/^\/decks\/([a-z0-9-]+)\/$/)![1];
      const indexPath = resolve("dist/decks", deckName, "index.html");
      const html = readFileSync(indexPath, "utf8");

      const sectionCount = (html.match(/<section[\s>]/g) ?? []).length;
      expect(
        sectionCount,
        `${deckName} has ${sectionCount} <section> elements, expected at least 8`,
      ).toBeGreaterThanOrEqual(8);

      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
      expect(title, `${deckName}'s <title> does not contain ${lecture.id}'s title`).toContain(
        String(lecture.title),
      );
    }
  });
});
