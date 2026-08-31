import { existsSync, readFileSync } from "node:fs";
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

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;
const sessions = api.nodes.filter((node) => node.type === "sessions");
const lectures = api.nodes.filter((node) => node.type === "lectures");

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

  it("carries a real deck for at least one lecture's slides", () => {
    const withSlides = lectures.filter((node) => typeof node.meta?.slides === "string");
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
});
