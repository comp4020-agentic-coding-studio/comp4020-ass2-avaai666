export const VERIFICATION_LEVELS = ["primary", "secondary", "apocryphal"] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

/** The one gloss for each verification level, shared by the specimen detail
 *  page's provenance block and the Specimens index legend. */
export const verificationNotes: Record<VerificationLevel, string> = {
  primary: "Recorded from the artefact, or from a report that reproduces it.",
  secondary: "Reported by others. This course has not seen the artefact itself.",
  apocryphal: "Widely repeated. No primary source has been found.",
};
