import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface IndexEntry {
  id: string;
  type: string;
}

interface CourseApi {
  nodes: IndexEntry[];
}

interface NodeFile {
  body: string;
}

// Strip HTML tags, inline code, markdown links/emphasis and entities so the
// text underneath is compared, not its markup. Bullet-list hyphens and
// heading hashes are stripped by the caller before this runs.
function stripMarkup(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,3}/g, "")
    .replace(/&[a-z#0-9]+;/gi, " ");
}

function normaliseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripHeadings(body: string): string {
  return body
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

// First sentence of a body, markup and headings removed, case-folded. Two
// weeks that open with the same sentence are the clearest, cheapest sign
// that one was written by starting from the other.
function firstSentence(body: string): string {
  const text = normaliseWhitespace(stripMarkup(stripHeadings(body)));
  const match = text.match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : text).trim().toLowerCase();
}

function words(text: string): string[] {
  return normaliseWhitespace(stripMarkup(text))
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ""))
    .filter((w) => /[a-z0-9]/.test(w));
}

function trigramSet(body: string): Set<string> {
  const w = words(body);
  const set = new Set<string>();
  for (let i = 0; i + 3 <= w.length; i++) {
    set.add(w.slice(i, i + 3).join(" "));
  }
  return set;
}

// Jaccard similarity over trigram sets, not single words: this course's
// pages legitimately share vocabulary (bench, specimen, corpus, provenance)
// on every page, and a word-level score would flag that shared vocabulary
// as repetition when it is not. Trigrams only agree when the same three
// words appear in the same order.
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.15;

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;

function loadNodes(type: "sessions" | "lectures") {
  return api.nodes
    .filter((node) => node.type === type)
    .map((node) => {
      const slug = node.id.slice(type.length + 1);
      const file = JSON.parse(
        readFileSync(resolve("dist/api", type, `${slug}.json`), "utf8"),
      ) as NodeFile;
      return { id: node.id, body: file.body };
    });
}

describe.each(["sessions", "lectures"] as const)("week distinctness: %s", (type) => {
  const nodes = loadNodes(type);

  it(`has at least one ${type} page to compare`, () => {
    expect(nodes.length).toBeGreaterThan(0);
  });

  it("never opens two pages with the same first sentence", () => {
    const bySentence = new Map<string, string[]>();
    for (const node of nodes) {
      const sentence = firstSentence(node.body);
      bySentence.set(sentence, [...(bySentence.get(sentence) ?? []), node.id]);
    }
    const repeats = [...bySentence.entries()].filter(([, ids]) => ids.length > 1);
    const detail = repeats
      .map(([sentence, ids]) => `"${sentence}" opens ${ids.join(" and ")}`)
      .join("; ");
    expect(repeats, detail).toEqual([]);
  });

  it(`keeps every pair of ${type} bodies below ${SIMILARITY_THRESHOLD} trigram similarity`, () => {
    const scored: Array<{ a: string; b: string; score: number }> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const score = jaccard(trigramSet(nodes[i].body), trigramSet(nodes[j].body));
        scored.push({ a: nodes[i].id, b: nodes[j].id, score });
      }
    }
    scored.sort((x, y) => y.score - x.score);

    const top = scored
      .slice(0, 3)
      .map((s) => `${s.a} / ${s.b}: ${s.score.toFixed(3)}`)
      .join("; ");
    // eslint-disable-next-line no-console
    console.log(`[week-distinctness] most similar ${type} pairs — ${top || "fewer than two pages to pair"}`);

    const tooSimilar = scored.filter((s) => s.score >= SIMILARITY_THRESHOLD);
    const detail = tooSimilar.map((s) => `${s.a} / ${s.b} scored ${s.score.toFixed(3)}`).join("; ");
    expect(tooSimilar, detail).toEqual([]);
  });
});
