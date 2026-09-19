# The spec

Every file here protects one promise the course makes that the build cannot
check. `pnpm check` runs all of them after `astro build`, against `dist/`, so
each one reads what the site actually emits rather than what the source
intends. The build already owns compilation, accessibility (axe), internal
links, content refs, deck compilation and the generated API; nothing below
repeats that.

Read the files in this order and you have the course's shape. Twenty-three
files; the first ten are about the course, the rest about whether the page
— or the slide — shows what the data says.

| File | The promise it keeps |
| --- | --- |
| `curriculum.test.ts` | Twelve weeks, one bench each, none twice; every lecture has a bench in its week; every lecture carries a deck that exists in the build, has at least eight slides and is titled as the lecture is. |
| `bench-operations.test.ts` | Every bench declares a non-empty `material`, `operation` and `leaves`, and no two of the twelve operations match. The curriculum is twelve different things done, not one thing done twelve times. Prints the twelve operations in week order on every run. |
| `week-distinctness.test.ts` | No two week pages open with the same sentence, and no pair of bodies exceeds 0.15 word-trigram similarity. Prints the closest pairs on every run so the number is visible before it fails. |
| `assessment-weights.test.ts` | The four pieces of assessed work sum to exactly 100. |
| `data-integrity.test.ts` | Every dated thing falls inside the teaching period. Shipped with the template; kept. |
| `specimen-evidence.test.ts` | Every quoted mistranslation carries `source`, `sourceDate` and a verification level; a page marked `apocryphal` says so in its body, not only in its frontmatter; a specimen with a `sourceUrl` links its Source row to it, and one without links nowhere. |
| `page-claims.test.ts` | Prose does not contradict data: the Benches index cannot claim one shared operation; every home page specimen record renders with its badge; every specimen is cited by a week and every citation resolves; every page carrying the site navigation has exactly one `h1`, and shows it before its description. |
| `semester.test.ts` | The home page's semester table has exactly twelve rows; every lecture and bench appears in the row of its own week, and every assessment in the row of its own week and nowhere else; the number of break rows equals the number of gaps longer than a week between bench dates; every week page carries a week strip with exactly one current week, and on lecture pages a week with no lecture is a disabled span, never a link. |
| `this-week.test.ts` | Every bench page names its week's lecture (or "No lecture"), every lecture page names its week's bench, every specimen the week cites appears with its printed line, and every lecture links its own deck exactly once, from its page and from the index. |
| `specimen-printed.test.ts` | Every specimen declares the line as printed, and the blockquote in its body still equals it; every index rendering of that line equals the field. At least one specimen has no artefact, and the check proves it exercised that path rather than skipping it. |
| `voice.test.ts` | The banned-phrase list in CLAUDE.md rule 7 is enforced against the built HTML, with typographic quotes normalised. A second block tests the matcher itself against fixtures it must and must not catch. |
| `artwork.test.ts` | The social-card alt text in the built page equals the string exported from `src/lib/artwork.ts`, the only place that picture is described; the home page's hero case file names the first featured specimen's own title, its real verification level, and links to its own page. |
| `timeline.test.ts` | The corpus timeline's marks, caption numbers and marked-line label all come from the specimen and lecture data; the marked-line label never shares a baseline with the axis ticks, and no label in the SVG runs past twelve characters. |
| `timeline-visibility.test.ts` | Exactly one timeline variant is visible at each marking width. Resolves specificity, source order and the minifier's range-syntax media queries the way a browser does, because a rule being present is not the same as a rule winning. |
| `deck-legibility.test.ts` | Every slide carries exactly one of the seven slide classes; no slide exceeds 45 words, no list four items, no item 90 characters, no statement 180; every deck opens with its footer line and closes on a bench slide naming that week's bench; every specimen slide's printed line is a specimen's `printed`. The numbers come from measuring the 390px stage, not from taste. |
| `specimen-styling.test.ts` | Every page that uses `data-specimen` actually receives the specimen stylesheet. |
| `layout-styling.test.ts` | Every page carrying the site navigation actually receives the layout stylesheet, whichever layout path it rendered through (see CLAUDE.md, "Platform routing, measured"); that stylesheet's print block hides the site chrome, sets body text black on white and prints external hrefs, pins `color-scheme: light` on `:root` so a page printed from the dark theme resolves its `light-dark()` tokens to ink rather than to 95% white, and keeps the assessment weight bars' backgrounds; and its reduced-motion block disables view transitions. |
| `home-layout-grid.test.ts` | The home page's `<main>` loads CSS that puts the slotted hero on the full body grid, places every direct `.home-band` section at `grid-column: 1 / -1` instead of the theme's narrow content column, and removes the theme's inherited vertical main padding. Checks the grid contract's text only, not the rendered result. |
| `reconstruction-chain.test.ts` | Every specimen page renders one chain of exactly three items — input, mechanism, printed — carrying that specimen's own verification level as a class. Each item's text equals the field it names, an input the chain states also appears in the page's prose outside it, and the connector between items is drawn in the border token rather than the 12%-alpha hairline that was invisible on the dark theme. |
| `evidence-workbench.test.ts` | The home page's specimen interaction is one tab/panel pair per featured specimen, no more and no fewer; every tab's `aria-controls` and its panel's `aria-labelledby` name each other; every panel carries that specimen's own printed line, verification level and mechanism verbatim and links to that specimen's own page; and no panel is hidden before any script runs, so the interaction is already readable with JavaScript off. |
| `semester-visibility.test.ts` | Exactly one of the semester table and the phone navigation is visible at each marking width, resolved through the cascade the way a browser does rather than by finding the selector. |
| `course-record-layout.test.ts` | A lecture, a bench, an assessment, a specimen and the policies page all render a shared `record-header` element; each one's header states its own type-specific metadata — week, weight, due date or verification level — verbatim; and every one of them loads the stylesheet that styles that header. |
| `external-links.test.ts` | Nothing inside `<main>` links to a URL that `spec/fixtures/verified-links.json` does not record, and every URL that file records is linked from at least one page. Each lecture's Further reading list renders exactly the readings its frontmatter declares, title and href included, and a lecture declaring none has no such section. This is CLAUDE.md rule 5 made checkable: the fixture is the record of which pages someone opened, and a link may not appear on the site before its URL appears there. |

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
