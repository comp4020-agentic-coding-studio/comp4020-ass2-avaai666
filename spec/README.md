# The spec

Every file here protects one promise the course makes that the build cannot
check. `pnpm check` runs all of them after `astro build`, against `dist/`, so
each one reads what the site actually emits rather than what the source
intends. The build already owns compilation, accessibility (axe), internal
links, content refs, deck compilation and the generated API; nothing below
repeats that.

Read the files in this order and you have the course's shape. Sixteen files;
the first ten are about the course, the rest about whether the page shows
what the data says.

| File | The promise it keeps |
| --- | --- |
| `curriculum.test.ts` | Twelve weeks, one bench each, none twice; every lecture has a bench in its week; at least one lecture carries a real deck. |
| `bench-operations.test.ts` | Every bench declares a non-empty `material`, `operation` and `leaves`, and no two of the twelve operations match. The curriculum is twelve different things done, not one thing done twelve times. Prints the twelve operations in week order on every run. |
| `week-distinctness.test.ts` | No two week pages open with the same sentence, and no pair of bodies exceeds 0.15 word-trigram similarity. Prints the closest pairs on every run so the number is visible before it fails. |
| `assessment-weights.test.ts` | The four pieces of assessed work sum to exactly 100. |
| `data-integrity.test.ts` | Every dated thing falls inside the teaching period. Shipped with the template; kept. |
| `specimen-evidence.test.ts` | Every quoted mistranslation carries `source`, `sourceDate` and a verification level; a page marked `apocryphal` says so in its body, not only in its frontmatter. |
| `page-claims.test.ts` | Prose does not contradict data: the Benches index cannot claim one shared operation; every home page specimen record renders with its badge; every specimen is cited by a week and every citation resolves; every page carrying the site navigation has exactly one `h1`, and shows it before its description. |
| `semester.test.ts` | The home page's semester table has exactly twelve rows; every lecture and bench appears in the row of its own week, and every assessment in the row of its own week and nowhere else; the number of break rows equals the number of gaps longer than a week between bench dates; every week page carries a week strip with exactly one current week, and on lecture pages a week with no lecture is a disabled span, never a link. |
| `this-week.test.ts` | Every bench page names its week's lecture (or "No lecture"), every lecture page names its week's bench, and the one lecture with a deck links to it exactly once, from its page and from the index. |
| `specimen-printed.test.ts` | Every specimen declares the line as printed, and the blockquote in its body still equals it; every index rendering of that line equals the field. At least one specimen has no artefact, and the check proves it exercised that path rather than skipping it. |
| `voice.test.ts` | The banned-phrase list in CLAUDE.md rule 7 is enforced against the built HTML, with typographic quotes normalised. A second block tests the matcher itself against fixtures it must and must not catch. |
| `artwork.test.ts` | The hero and social-card alt text in the built page equal the strings exported from `src/lib/artwork.ts`, the only place either picture is described. |
| `timeline.test.ts` | The corpus timeline's marks, caption numbers and marked-line label all come from the specimen and lecture data; the marked-line label never shares a baseline with the axis ticks, and no label in the SVG runs past twelve characters. |
| `timeline-visibility.test.ts` | Exactly one timeline variant is visible at each marking width. Resolves specificity, source order and the minifier's range-syntax media queries the way a browser does, because a rule being present is not the same as a rule winning. |
| `specimen-styling.test.ts` | Every page that uses `data-specimen` actually receives the specimen stylesheet. |
| `layout-styling.test.ts` | Every page carrying the site navigation actually receives the layout stylesheet, whichever layout path it rendered through (see CLAUDE.md, "Platform routing, measured"); that stylesheet's print block hides the site chrome, sets body text black on white and prints external hrefs, and its reduced-motion block disables view transitions. |

## How a check earns its place

Rule 18 of CLAUDE.md: a commit that adds an assertion never also satisfies
it. New behaviour arrived as a red assertion commit, answered by a change in
its own commit. A few guards — the citation-integrity and home-badge
assertions in `page-claims`, for instance — were added for invariants that
were already true and say so in their commit messages. Rule 14: a test that
cannot fail is worse than no test, so every commit adding one names the
edit that would turn it red.

Two of these — `voice` and `timeline-visibility` — were rewritten after they
had passed while the promise was already broken; `page-claims` was rewritten
when one of its assertions turned out to check a mechanism rather than the
intent behind it, and its heading-order assertion was left red for a commit
while the fix was found. PROCESS.md tells those stories with the commits.

## What is deliberately not here

The 400-word cap on week pages, the deadpan register and rule 1 ("say in one
sentence what this week adds") are rules in CLAUDE.md, not tests. A word count
would make the agent write to a number; the other two cannot be measured, and
are judged by reading.
