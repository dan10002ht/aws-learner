import GithubSlugger from "github-slugger";

export interface TocItem {
  depth: 2 | 3;
  text: string;
  slug: string;
}

/**
 * Extract headings (h2, h3) from a markdown string. Slug matches rehype-slug.
 * Skips headings inside fenced code blocks.
 */
export function extractToc(md: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of md.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const depth = m[1].length as 2 | 3;
    const text = m[2].replace(/`/g, "").trim();
    if (!text) continue;
    items.push({ depth, text, slug: slugger.slug(text) });
  }
  return items;
}
