// Rehype plugin: group adjacent fenced code blocks of DIFFERENT programming
// languages into a <code-tabs> element, rendered as language tabs (Shopify-docs
// style) by components/CodeTabs.tsx.
//
// Only groups runs where every language is a "real" programming language and
// all are distinct — bash/yaml/json/output blocks never group, so existing
// lessons with consecutive shell snippets are unaffected.

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const TABBABLE = new Set([
  "python", "javascript", "typescript", "java", "go", "csharp", "cpp", "c",
  "ruby", "php", "kotlin", "swift", "rust",
]);

function codeLang(node: HastNode): string | null {
  if (node.type !== "element" || node.tagName !== "pre") return null;
  const code = node.children?.find((c) => c.type === "element" && c.tagName === "code");
  const cls = (code?.properties?.className as string[] | undefined) ?? [];
  for (const c of cls) {
    const m = /^language-([\w+-]+)$/.exec(String(c));
    if (m) return m[1].toLowerCase();
  }
  return null;
}

const isWhitespace = (n: HastNode) => n.type === "text" && !String(n.value ?? "").trim();

export default function rehypeCodeTabs() {
  return (tree: HastNode) => {
    visit(tree);
  };
}

function visit(parent: HastNode) {
  const kids = parent.children;
  if (!kids?.length) return;

  const out: HastNode[] = [];
  let i = 0;
  while (i < kids.length) {
    const lang = codeLang(kids[i]);
    if (lang && TABBABLE.has(lang)) {
      // collect a run of tabbable pres separated only by whitespace
      const run: { node: HastNode; lang: string }[] = [{ node: kids[i], lang }];
      let j = i + 1;
      while (j < kids.length) {
        if (isWhitespace(kids[j])) { j++; continue; }
        const l = codeLang(kids[j]);
        if (l && TABBABLE.has(l) && !run.some((r) => r.lang === l)) {
          run.push({ node: kids[j], lang: l });
          j++;
        } else break;
      }
      if (run.length >= 2) {
        out.push({
          type: "element",
          tagName: "code-tabs",
          properties: { dataLangs: run.map((r) => r.lang).join(",") },
          children: run.map((r) => r.node),
        });
        i = j;
        continue;
      }
    }
    out.push(kids[i]);
    if (kids[i].children) visit(kids[i]);
    i++;
  }
  parent.children = out;
}
