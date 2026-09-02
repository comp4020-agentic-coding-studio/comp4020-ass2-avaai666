# Process

SLOP8217 teaches students to read a mistranslation as evidence of the
machine that produced it. Before the agent wrote a page I took three
positions on what a good course is, from the brief's examples and from
Biggs. From *Calling Bullshit*: a course is one claim, stated in the title
and held for a semester. From constructive alignment: what is marked is
what is learned, so each assessment must be that claim at a different scale.
And one of my own: a course about the standard of evidence has to meet that
standard on its own pages.

Each became a rule or a check, and my first attempt at each was wrong.

The claim went in as rule 1 of CLAUDE.md — say in one sentence what this
week adds, or stop
([f0848ab](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/f0848abfcf305e1f0cef1fbf741add14df45617c)).
My first rule against twelve weeks repeating one another was a proxy:
"never more than one week page per turn". I replaced it with a measurement
— no shared opening sentence, trigram similarity under 0.15
([7db6317](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/7db6317eeaeabe8295c9ca1ffa3eb0c6c70dedb6))
— then saw that a measurement of wording passes a bench that repeats another
in different words. So every bench declares its `material`, `operation` and
what `leaves` the room, and a check asserts no two operations match
([e9ee529...eae0e70](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/e9ee52923089a1b242182dc317a8d185066f9cad...eae0e7011d08b36b684cbb52ea1d6bf3e130847f)).
The obvious move was a tighter threshold. A declared field is a claim about
the curriculum, not about the prose.

Alignment: four assessments are one corpus at three scales plus the room,
summing to 100 by assertion
([ad6a6f6](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/ad6a6f66c3ee8b1d0e6f39d02b4c935462205b3a)).
When my tutor read the home page as "an information page", I made the
structure visible instead of adding prose: three specimens and the three
things a student will be able to do
([d50786f](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/d50786fdfc8625ed0230e08b48572f5457d3fca4)),
a semester table generated from the collections, a week strip, and a "This
week" block that makes the Monday lecture and the Wednesday bench name each
other — each with its spec
committed red first
([0aa030a](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/0aa030a47f7f7958d768b1d57e28e712d861f1ab),
[3939f36](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/3939f36aa018b14682b42bd57721fd45462a6bc2)).

The evidence standard: every quoted mistranslation carries a source, a date
and a verification level, and an `apocryphal` page must say so in its body
([0982dca](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/0982dcae329fe354deef64dd4ba7b0b08e32d7b4)).
The obvious call was to delete the two anecdotes I could not source. Keeping
them, labelled, is the course's argument. The printed line itself became a
`printed` field, with a check that the body's blockquote still equals it
([2cdb592](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/2cdb592aa1196973dae971968d7e8997e3fade6a)).

Deliberately not encoded: the 400-word cap and the deadpan register are
rules, not tests. A word count makes an agent trim to a number, and deadpan
cannot be measured.

How I knew a check was right: rule 18 forbids a commit that adds an
assertion and satisfies it, so I never accepted green without seeing red.
Twice a green check meant nothing. The banned-phrase list never fired on
"in today's" because the build curls the apostrophe; normalising the text
then let `dive` catch `divided`, so the matcher now runs against fixtures it
must and must not catch
([70d5904...c5e8516](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/70d5904d8b415c1676b96b6477fed0d0e86f9844...c5e8516a345c51c41a1dacd2f2fd3b944aff24df)).
The corpus timeline passed four assertions while rendering twice; the
replacement resolves the cascade as a browser does, and was itself inert
until it learned the minifier's range syntax
([fdad3d4...c6147d4](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/compare/fdad3d4512886690f1704a8ae74b4cf3a2a98abf...c6147d44b25968b5eedf9c9bbdf0adc68b10f9db)).

The last red was the agent's, not mine. Four index pages showed their
description above the heading; the agent wrote the assertion, found the
order came from the theme, and stopped: no fix in allowed files
([f181ead](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/f181ead954df455d0bce33f23aa333704577ca08)).
The fix was in the routing record it maintains in CLAUDE.md — those pages
only reached the theme's layout because they declared none — and a layout of
ours turned it green
([334a505](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-avaai666/commit/334a505c4d632974416a10f404ddedba995c3818)).
Stopping was correct. Reading its own record was my job.
