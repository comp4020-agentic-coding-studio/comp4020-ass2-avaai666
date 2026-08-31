// week-distinctness.test.ts holds the *prose* apart: it measures whether two
// week bodies read too much alike. This file holds the *curriculum* apart: it
// checks the operation each bench declares, a field independent of how the
// prose describing it happens to be phrased. Do not delete either as
// redundant with the other — they check different things by different means.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface SessionNode {
  id: string;
  type: string;
  meta: {
    week: number;
    material?: string;
    operation?: string;
    leaves?: string;
  };
}

interface CourseApi {
  nodes: SessionNode[];
}

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;
const sessions = api.nodes.filter((node) => node.type === "sessions");

describe("bench operations", () => {
  it("has twelve benches", () => {
    expect(sessions.length).toBe(12);
  });

  it("gives every bench a non-empty material, operation and leaves", () => {
    const missing = sessions
      .filter(
        (s) =>
          !s.meta.material?.trim() || !s.meta.operation?.trim() || !s.meta.leaves?.trim(),
      )
      .map((s) => s.id);
    expect(missing, missing.join(", ")).toEqual([]);
  });

  it("prints the twelve operations in week order", () => {
    const byWeek = [...sessions].sort((a, b) => a.meta.week - b.meta.week);
    const list = byWeek.map((s) => `week ${s.meta.week}: ${s.meta.operation}`).join("\n  ");
    // eslint-disable-next-line no-console
    console.log(`[bench-operations] twelve operations, week order —\n  ${list}`);
    expect(byWeek.length).toBe(sessions.length);
  });

  it("never repeats an operation across two benches", () => {
    const byOperation = new Map<string, string[]>();
    for (const session of sessions) {
      const key = (session.meta.operation ?? "").trim().toLowerCase();
      byOperation.set(key, [...(byOperation.get(key) ?? []), session.id]);
    }
    const repeats = [...byOperation.entries()].filter(([, ids]) => ids.length > 1);
    const detail = repeats
      .map(([operation, ids]) => `"${operation}" is shared by ${ids.join(" and ")}`)
      .join("; ");
    expect(repeats, detail).toEqual([]);
  });
});
