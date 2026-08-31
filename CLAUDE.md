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