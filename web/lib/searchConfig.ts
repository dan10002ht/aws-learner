import type { Options, SearchOptions } from "minisearch";

/**
 * Accent-insensitive folding for Vietnamese: strip combining diacritics and
 * map đ→d. Applied identically at index time (server) and query time (client)
 * so "rebase" matches "Rebase" and typing without dấu still finds results.
 */
export function foldDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
}

/**
 * MiniSearch options — MUST be identical when building the index (server) and
 * when calling loadJSON (client), because processTerm/tokenize are functions
 * that aren't serialized into the index JSON.
 */
export const miniSearchOptions: Options = {
  fields: ["title", "content", "keywords"], // tokenized into the inverted index
  storeFields: ["kind", "title", "breadcrumb", "url", "snippet"], // returned on hits
  processTerm: (term) => {
    const t = foldDiacritics(term.toLowerCase());
    return t.length >= 2 ? t : null; // drop 1-char noise
  },
};

/** Per-query search behaviour: prefix as-you-type, light fuzzy, title-weighted. */
export const searchParams: SearchOptions = {
  prefix: true,
  fuzzy: 0.2,
  boost: { title: 3, keywords: 2, content: 1 },
  combineWith: "AND",
};
