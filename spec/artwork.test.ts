// The hero and card images are described in exactly one place,
// src/lib/artwork.ts — see that file's own comment for why. This checks the
// built home page actually uses those exports, so a second, unimported copy
// of either description can't drift the way socialImageAlt and the hero alt
// each drifted once already.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cardImageAlt, heroImageAlt } from "../src/lib/artwork";

const homeHtml = readFileSync(resolve("dist/index.html"), "utf8");

function decodeAttr(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

describe("artwork alt text", () => {
  it("gives the hero image exactly the alt text exported from src/lib/artwork.ts", () => {
    const match = homeHtml.match(/<img[^>]*\bclass="at-hero-image"[^>]*>/);
    expect(match, "no img.at-hero-image found on the built home page").not.toBeNull();
    const alt = match?.[0].match(/\balt="([^"]*)"/);
    expect(alt, "img.at-hero-image has no alt attribute").not.toBeNull();
    expect(decodeAttr(alt?.[1] ?? "")).toBe(heroImageAlt);
  });

  it("gives the social card exactly the alt text exported from src/lib/artwork.ts", () => {
    const match = homeHtml.match(/<meta property="og:image:alt" content="([^"]*)">/);
    expect(match, "no og:image:alt meta tag found on the built home page").not.toBeNull();
    expect(decodeAttr(match?.[1] ?? "")).toBe(cardImageAlt);
  });
});
