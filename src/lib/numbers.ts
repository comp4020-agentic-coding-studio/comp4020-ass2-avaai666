const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** Capitalized English word for a small non-negative integer, "Zero" through
 *  "Ten" — for a count that has to read as prose, not a digit. Throws
 *  outside that range rather than silently falling back to the digit: a
 *  count that grows past ten belongs on the page as a digit, not prose. */
export function capitalizedNumberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= NUMBER_WORDS.length) {
    throw new Error(`capitalizedNumberWord: ${n} is outside the 0-${NUMBER_WORDS.length - 1} range this supports`);
  }
  return NUMBER_WORDS[n];
}
