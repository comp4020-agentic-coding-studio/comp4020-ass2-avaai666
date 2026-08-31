import { defineSiteConfig } from "astro-theme-university/types";
import { slopBranding } from "astro-theme-slop";

// Students meet at a bench, not in a lab or a seminar. The word is doing real
// work: a bench is where you put an object down and take it apart.
export const sessionLabels = {
  singular: "Bench",
  plural: "Benches",
} as const;

export const graphCollections = [
  "sessions",
  "assessments",
  "lectures",
  "people",
  "specimens",
];

export const courseApiCollections = [
  ...graphCollections.map((key) => ({ key })),
  { key: "policies", dir: "pages/policies" },
];

export const siteConfig = defineSiteConfig({
  ...slopBranding,
  name: "Slop University",

  links: [
    { text: "Lectures", href: "/lectures/" },
    { text: sessionLabels.plural, href: "/sessions/" },
    { text: "Specimens", href: "/specimens/" },
    { text: "Assessment", href: "/assessments/" },
    { text: "People", href: "/people/" },
    { text: "Policies", href: "/policies/" },
  ],

  licence: "CC-BY-NC-SA-4.0",
  socialImage: "/src/assets/images/card.png",
  socialImageAlt:
    "Two rows of solid blocks stand in for a sentence and its translation, " +
    "joined by thin curved lines. Two of the lines cross, and one block at " +
    "the end of the top row is dashed and joined to nothing.",
});