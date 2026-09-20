# Process

SLOP8217 teaches students to read a mistranslation as evidence of the
machine that produced it. I took three positions: from
*Calling Bullshit*, one claim held for a semester; from constructive
alignment, each assessment is that claim at a different scale; and my
own, that a course about evidence must meet its own standard.

Each became a rule or a check; my first attempt at each was wrong.

The claim is rule 1 of CLAUDE.md — say what this week adds, or stop
([f0848ab](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/f0848abfcf305e1f0cef1fbf741add14df45617c)).
My rule against repetition started as a page-count proxy; I replaced it
with trigram similarity under 0.15
([7db6317](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/7db6317eeaeabe8295c9ca1ffa3eb0c6c70dedb6))
— until wording that repeated another bench still passed the
measurement, so every bench now declares `material`, `operation` and
what it `leaves`, checked so no two match
([e9ee529...eae0e70](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/e9ee52923089a1b242182dc317a8d185066f9cad...eae0e7011d08b36b684cbb52ea1d6bf3e130847f)).
The obvious move was a tighter threshold. A declared field is a claim
about the curriculum, not the prose.

Alignment: four assessments are one corpus at three scales plus the
room, summing to 100 by assertion
([ad6a6f6](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/ad6a6f66c3ee8b1d0e6f39d02b4c935462205b3a)).
The home page's read as "an information page" became a table naming
three specimens and three student outcomes
([d50786f](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/d50786fdfc8625ed0230e08b48572f5457d3fca4)),
and a "This week" block pairing lecture and bench, committed red first
([0aa030a](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/0aa030a47f7f7958d768b1d57e28e712d861f1ab),
[3939f36](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/3939f36aa018b14682b42bd57721fd45462a6bc2)).

The evidence standard: every quoted mistranslation carries a source,
date and verification, and an `apocryphal` page says so in its body
([0982dca](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/0982dcae329fe354deef64dd4ba7b0b08e32d7b4)).
The obvious call was to delete the two anecdotes I could not source.
Keeping them, labelled, is the course's argument. The printed line
became a `printed` field, checked against the blockquote
([2cdb592](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/2cdb592aa1196973dae971968d7e8997e3fade6a)).

Deliberately not encoded: the 400-word cap and deadpan register are
rules, not tests — a word count trims to a number, deadpan cannot be
measured.

How I knew a check was right: rule 18 requires new behaviour to arrive
red first; a guard for existing behaviour names its own red edit —
normalising curled apostrophes so the banned-phrase list's `dive` also
catches `divided`
([70d5904...c5e8516](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/70d5904d8b415c1676b96b6477fed0d0e86f9844...c5e8516a345c51c41a1dacd2f2fd3b944aff24df)),
and slide sentence caps measured off the 390px stage rather than guessed
([7bbd2a0](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/7bbd2a08fa9f8e90c2b2f75604586427c2f44aa1)).

The last red was the agent's, not mine. Four index pages showed
description before heading; the agent traced it to the theme and
stopped — no fix lived in an allowed file
([f181ead](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/f181ead954df455d0bce33f23aa333704577ca08)).
Those pages reached the theme's layout only because they declared none;
ours fixed it
([334a505](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/334a505c4d632974416a10f404ddedba995c3818)).
Stopping was correct; reading its record was my job.

The corpus timeline carries this weakness twice: four assertions passed
while the figure rendered twice, because a rule hiding one SVG lost the
cascade to a higher-specificity selector; the resolver I
wrote came back green for the wrong reason at first, inert until it
learned the minifier's own range syntax
([fdad3d4...c6147d4](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/fdad3d4512886690f1704a8ae74b4cf3a2a98abf...c6147d44b25968b5eedf9c9bbdf0adc68b10f9db)).
After the redesign it did it again, in a fact, not a rule: the caption
names the year and lecture arguing it, found with
`lectures.find(l => l.data.slides)` — true only while week five held
it. Every lecture got one; `.find()` returned week one, naming
week one's lecture for week five's year, while the test meant for this
asked only whether the caption held any lecture title — "any" sitting
in its own failure message. The obvious move was to read the right
lecture, or hardcode week five.
Instead the year and the lecture became one fact, `turningPointYear`,
set on the lecture whose argument it is, with a second assertion
requiring exactly one, not at least one. I rewrote the caption
assertion first and watched it fail naming "What makes it wrong" — week
one's title — then fixed the source
([147254f...ddaa120](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/147254f295209af47551f54c19d0e65e89e2f4b4...ddaa1204a0dd35e05f94f39d7cc670eb341dd192)).
I added the field to a second lecture to watch the guard go red, then
reverted it
([52aa5fc](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/52aa5fc904892c45cafcca47c21f4e8aa5d596b1)).
