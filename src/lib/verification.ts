export const VERIFICATION_LEVELS = ["primary", "secondary", "apocryphal"] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

/** The full gloss for each verification level. Used on the specimen detail
 *  page's provenance block, where the right-hand column is already full
 *  sentences for every field (Mechanism, Source) — a fragment there would
 *  read as a typo, not a register. Do not use this form in the Specimens
 *  index legend; see verificationLegendNotes below for why. */
export const verificationNotes: Record<VerificationLevel, string> = {
  primary: "Recorded from the artefact, or from a report that reproduces it.",
  secondary: "Reported by others. This course has not seen the artefact itself.",
  apocryphal: "Widely repeated. No primary source has been found.",
};

/** The short gloss for each verification level. Used only by the Specimens
 *  index legend, where the left cell is a fixed-width badge rather than a
 *  label word — a key, not an explanation — and needs to stay two columns
 *  at phone widths. Do not swap this in for verificationNotes on the detail
 *  page: it is too compressed to stand alone as a field's value there. */
export const verificationLegendNotes: Record<VerificationLevel, string> = {
  primary: "the artefact, or a copy",
  secondary: "reported, and traceable",
  apocryphal: "repeated, never sourced",
};
