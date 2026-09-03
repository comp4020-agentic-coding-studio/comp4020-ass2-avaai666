# CLAUDE.md — the harness for SLOP8217

This is a course website for a course about unreliable text. The rules below
exist because this particular course cannot survive the failure modes a generic
site would shrug off.

## The one idea

Every page serves one claim: **a mistranslation is evidence of the machine that
produced it.**

1. Before you write any week page, state in one sentence what that week adds to
   the claim that the previous eleven do not. If you cannot, say so and stop.
   Do not pad.
2. No two week pages — of the same kind, sessions or lectures — may open with
   the same first sentence, and no two may reach 0.15 word-trigram Jaccard
   similarity in body text. `spec/week-distinctness.test.ts` is the check; do
   not add week content that would turn it red.

## Evidence

3. Every specimen — every mistranslation quoted anywhere on this site — carries
   `source`, `sourceDate`, and `verification` set to `primary`, `secondary` or
   `apocryphal`.
4. `apocryphal` is allowed and wanted. Presenting an apocryphal specimen as real
   is not. Two of this field's most repeated examples — the Russian "the vodka
   is good but the meat is rotten", and the Chevrolet Nova — have no primary
   source, and the pages that use them say so.
5. Never invent a specimen, a date, a standard number, a case name, or a figure.
   If a page needs one you cannot source, write `TODO(source)` and tell me in
   your reply. Do not fill the gap.

## Prose

6. Deadpan. The register is a real university course website. No jokes told as
   jokes.
7. Banned everywhere: "delve", "tapestry", "landscape" (figurative), "journey",
   "realm", "dive into", "unlock", "in today's", "it's not just X, it's Y",
   "explore the fascinating", and any sentence whose only content is that the
   subject is interesting.
8. No paragraph longer than four sentences. No week page longer than 400 words
   of body prose.
9. Do not open two week pages with the same sentence shape.
10. Text I write myself is used verbatim. Do not merge my short sentences into
    longer ones, do not add transitions, do not improve the flow.

## The platform is fixed

11. Do not edit `astro.config.ts`, `scripts/`, `.github/workflows/`, the
    branding keys in `src/site-config.ts`, or anything under `dist/`.
12. Adding is allowed: a new collection, a page outside the collections, a
    component the theme does not have.

## Platform routing, measured

README.md says `src/layouts/PageLayout.astro` is "the layout every page
renders through." Measured against this repo by building the site and reading
`dist/`, that is false, and it has cost three separate turns of work assuming
it was true. What is actually true, as observed:

- Every hand-written `.astro` route under `src/pages/` that calls the theme's
  `ContentLayout` directly — as of this writing: `index.astro`,
  `sessions/index.astro`, `sessions/[slug].astro`, `specimens/index.astro`,
  `specimens/[slug].astro`, `lectures/[slug].astro`, `assessments/[slug].astro`,
  `people/[slug].astro` — never touches `PageLayout.astro`. It renders through
  `ContentLayout.astro` → `BaseLayout.astro` only.
- A bare `.mdx` file under `src/pages/` can name its own layout with a
  `layout:` frontmatter key, bypassing the theme integration's
  `defaultLayout` entirely. As of this writing: `assessments/index.mdx`,
  `lectures/index.mdx`, `people/index.mdx` and `policies/index.mdx` each
  carry `layout: ../../layouts/IndexLayout.astro`, our own layout, which
  calls the theme's `ContentLayout` directly — the same second-to-last hop
  as every route in the bullet above. Added because `MdxPageLayout.astro`
  (below) puts the description before the page's own heading and
  `ContentLayout.astro` does not.
- Only a bare `.md`/`.mdx` file under `src/pages/` with no `layout:`
  frontmatter of its own goes through `PageLayout.astro`, via the theme
  integration's `defaultLayout` option (`astro.config.ts`) and its
  `remark-default-layout.ts` plugin, which puts it through
  `MdxPageLayout.astro`. As of this writing that is `404.md` alone.
- All three paths converge on `BaseLayout.astro`, which renders
  `<nav class="at-nav">` on every page except deck pages (astromotion, which
  render their own chrome). `<nav class="at-nav">` in the built HTML is
  therefore the reliable marker of "a page on this site," not
  `PageLayout.astro`.

The rule that follows: a site-wide style has two places it must be imported —
every `ContentLayout` call site (including `src/layouts/IndexLayout.astro`),
and `PageLayout.astro` — and no single import point reaches every page.
Nothing in the build enforces that list; add a page
that calls `ContentLayout` and forget the import, and the style silently does
not reach it. `spec/layout-styling.test.ts` is the check: it finds every built
page carrying `<nav class="at-nav">` and asserts the style's selector is in
its loaded CSS. Extend that spec when adding another site-wide style; do not
rely on remembering the import list.

## ★ Checks

13. Do not weaken, skip or delete a failing assertion in `spec/`. If a test is
    wrong, say so, say why, and propose the replacement in the same message.
    A silently relaxed assertion is the worst thing you can hand me.
14. A test that cannot fail is worse than no test. When you write one, tell me
    the exact edit that would turn it red, so I can try it.

## ★ Reporting

15. Do not report work as done. Paste the actual output of the command —
    `pnpm check`, `pnpm check:evidence`, `git grep`, the file listing — not a
    summary of it.
16. You cannot see the rendered page. Do not tell me how it looks. Tell me what
    to open and what to look for, and I will look.

## ★ Commits

17. One commit per idea, message says what changed and why.
18. Never a single commit that both adds a spec test and satisfies it. Write the
    test, commit it, run it red, then implement.

## ★ Measured, not assumed

19. A threshold in a test is a measurement, not a taste. Before writing a cap —
    words per slide, characters per line, a breakpoint — measure the thing on
    the 390px and 1920px stages and derive the number from what fits; say the
    derivation in the test comment. (d90d75f, 3f92c58)
20. A document that describes a test is a claim about the test. When
    spec/README.md, a commit message or PROCESS.md says a check does X, open the
    check and confirm it does X; if the promise is right and the test is weaker,
    strengthen the test, never soften the promise. (cb90562)
21. "This edit would turn it red" is itself a claim. Make the edit, watch it
    fail, revert, and only then write the sentence; a rule-14 sentence that was
    not tried is deleted, not kept. (cb90562's message)
