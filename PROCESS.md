# Process

SLOP8217 asks students to treat a mistranslation as evidence of the machine
that produced it — to distrust a text and go looking for what made it
wrong. Building it changed what I accepted back from the agent: a green
check stopped counting as evidence unless I had seen it fail. Four times
it had been green and meaningless.

Rule 7 bans "delve", "tapestry", and more; `spec/voice.test.ts` checks
the built HTML. One entry, "in today's", never fired: the renderer curls
a straight apostrophe, and the list kept it straight — green, and proved
nothing. The obvious fix was a curly-quote copy of the phrase in the list.

I normalised the extracted text instead, so the list stays a list of words,
not typographic variants
([70d5904](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/70d5904d8b415c1676b96b6477fed0d0e86f9844)).
The same commit also made the check too loose: a head-word-plus-suffix
match let "dive" catch "divided" and "division". The obvious move was
another
named exception. Instead I replaced the wildcard with a table of regular
English inflections and added a second block testing the matcher against fixtures it must catch
and must not — "diving into the corpus" against "the semester is divided
into three parts"
([70d5904...c5e8516](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/70d5904d8b415c1676b96b6477fed0d0e86f9844...c5e8516a345c51c41a1dacd2f2fd3b944aff24df)).

README.md calls `PageLayout.astro` "the layout every page renders through."
Reading `dist/` found the opposite: only bare `.md`/`.mdx` pages without
`layout:` frontmatter reach it, not `ContentLayout` routes — and that
claim cost three turns on a wrong spacing fix. The obvious move was to
fix my import and move on.

Instead I recorded the measured, false claim in CLAUDE.md, where the next
turn reads it before repeating the mistake
([bd680e2](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/bd680e23bf9960f0c5ac78e0e1e3e4a5bbf4c592)),
and wrote `spec/layout-styling.test.ts` to assert the layout style's selector
reaches every built page carrying the site navigation, not just an import
list I could remember. To test it, I removed the import from
`specimens/index.astro` and rebuilt; it went red on exactly that page, and I
restored it before committing
([0263441...3ea97f8](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/026344188ef9201293b66dff10e31964fac02aac...3ea97f85b31da006a1277c144b7e087d9212dc1b)).

The hero alt text drifted from the picture, twice, fixed by hand each time
([1740ea1](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/1740ea1f3d030a4ba5b0d962d318d72e8f9b7856),
[3703f25](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/3703f25e2ef1e24fd1cedf700f0917276c97f93e)).
The third time it was the card's description, naming artwork two versions
back, while every check stayed green: axe checks existence, not truth. The
obvious move was to rewrite the sentence again.

Instead I wrote a module that is the only place either picture is described,
wired the hero and the card through its exports, and asserted that the built
page's alt text matches exactly what the module exports — red before the
wiring, against the stale copy in `site-config.ts`, green after
([f0f425e...057fe86](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/f0f425e3a91d88b2097df7f05424039a3914023f...057fe86a39a9aca8d30dd7290739212a54cda487)).
The first two fixes treated the sentence; the third removed how it recurred.

The corpus timeline passed four assertions — every specimen has a mark,
the caption's numbers match, the marked line names a real lecture — while
it rendered twice at every width, because the hiding rule lost the cascade
to a higher-specificity selector. All four only ask whether a mark appears;
two copies satisfy that too. The obvious move was to delete one of the two
drawings.

Instead I kept both — scaled independently, not one stretched into the
other's shape — and wrote a second spec that resolves specificity and
source order the way a browser does, rather than checking that a rule is
merely present
([fdad3d4](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/fdad3d4512886690f1704a8ae74b4cf3a2a98abf)).
That spec was itself briefly wrong: it recognised `max-width` media queries
but not the minifier's range-syntax rewrite, so it stayed silently inert
([f8617c1](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/f8617c12b3169f3e6370bf81b81e9eae76bc7a57)).
Fixed, it went red for the real reason — both variants rendering at both
widths — then green once the fix landed
([c6147d4](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/c6147d44b25968b5eedf9c9bbdf0adc68b10f9db)).
