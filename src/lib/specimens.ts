/** The rightmost language in a "A → B → C" languages field — the language
 *  the printed line ends up in. Used to set (or omit) the printed line's
 *  lang attribute: only English gets one, since that is the only target
 *  this corpus's readers are assumed to already read. */
export function printedLang(languages: string): string | undefined {
  const target = languages.split("→").pop()?.trim();
  return target === "English" ? "en" : undefined;
}

/** The leftmost language in a "A → B → C" languages field — the language
 *  the input was written in. Mirrors the lang spans each specimen's body
 *  already wraps its input text in, so this reproduces those, it does not
 *  choose new ones. English inputs carry no lang span in the body, so
 *  there is no code to name for them here either. */
export function inputLang(languages: string): string | undefined {
  const source = languages.split("→")[0]?.trim();
  const codes: Record<string, string> = {
    "Chinese (Simplified)": "zh-Hans",
    Spanish: "es",
  };
  return source ? codes[source] : undefined;
}
