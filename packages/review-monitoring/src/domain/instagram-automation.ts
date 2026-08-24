export type InstagramAutomationMatchType = "ANY_COMMENT" | "CONTAINS" | "EXACT_MATCH" | "FULL_WORD";

/** Unicode-safe normalization: trims, collapses whitespace, and removes accents for matching. */
export function normalizeComment(text: string): string {
  return text
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "");
}

export function matchesInstagramComment(input: {
  text: string;
  matchType: InstagramAutomationMatchType;
  keywords: readonly string[];
  excludedKeywords?: readonly string[];
}): { matched: boolean; keyword?: string } {
  const text = normalizeComment(input.text);
  const exclusions = (input.excludedKeywords ?? []).map(normalizeComment).filter(Boolean);
  if (exclusions.some((keyword) => text.includes(keyword))) return { matched: false };
  if (input.matchType === "ANY_COMMENT") return { matched: text.length > 0 };
  for (const rawKeyword of input.keywords) {
    const keyword = normalizeComment(rawKeyword);
    if (!keyword) continue;
    const matched =
      input.matchType === "CONTAINS"
        ? text.includes(keyword)
        : input.matchType === "EXACT_MATCH"
          ? text === keyword
          : new RegExp(
              `(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(keyword)}(?=$|[^\\p{L}\\p{N}_])`,
              "u",
            ).test(text);
    if (matched) return { matched: true, keyword: rawKeyword.trim() };
  }
  return { matched: false };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export type InstagramTemplateVariables = {
  first_name?: string | undefined;
  username?: string | undefined;
  comment_text?: string | undefined;
  post_caption?: string | undefined;
  post_url?: string | undefined;
  link?: string | undefined;
};

export function renderInstagramTemplate(
  template: string,
  variables: InstagramTemplateVariables,
): string {
  return template.replace(
    /\{\{\s*([a-z_]+)\s*\}\}/giu,
    (_match, name: string) => variables[name as keyof InstagramTemplateVariables] ?? "",
  );
}
