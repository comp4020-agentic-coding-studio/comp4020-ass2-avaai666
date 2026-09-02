---
title: The network, and the confident wrong answer
description: >-
  The turning point of the semester — fluency and accuracy come apart, and an
  error stops announcing itself
week: 5
date: 2027-03-22
teachers:
  - aurel-marchetti
slides: /decks/week-05/
related:
  - sessions/05-starve-it
---

Everything before this week rests on an assumption: that a bad translation looks
bad. Neural systems ended that.

Given input it has nothing for, a neural model does not return an error. It
returns a well-formed sentence, because well-formed sentences are what it was
trained to produce. In 2018 people noticed that feeding repeated nonsense
syllables into low-resource language pairs produced fluent apocalyptic prose,
and the explanation is not mysterious: for several of those languages, the
largest available parallel text was scripture.

The output was a portrait of the training set. That is the most legible thing in
the whole course, and it arrives at the exact moment the errors stop being easy
to see.

## Outline

- what changed in 2016, in one diagram
- fluency and accuracy as separate axes
- hallucination as evidence: reading the training distribution off the output
- why this week is the turning point
