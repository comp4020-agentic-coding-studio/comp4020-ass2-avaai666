/** The rightmost language in a "A → B → C" languages field — the language
 *  the printed line ends up in. Used to set (or omit) the printed line's
 *  lang attribute: only English gets one, since that is the only target
 *  this corpus's readers are assumed to already read. */
export function printedLang(languages: string): string | undefined {
  const target = languages.split("→").pop()?.trim();
  return target === "English" ? "en" : undefined;
}
