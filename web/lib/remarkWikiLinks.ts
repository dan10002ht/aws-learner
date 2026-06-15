// Remark plugin: turn Obsidian-style [[lesson-slug]] references in lesson
// markdown into real internal links, using the target lesson's title as the
// link text. Unknown slugs are left as plain text. Only `text` nodes are
// touched, so [[...]] inside code blocks/inline code is never rewritten.
import { lessons } from "@/data/lessons";

const bySlug = new Map<string, { courseId: string; title: string }>();
for (const l of lessons) {
  if (!bySlug.has(l.slug)) bySlug.set(l.slug, { courseId: l.courseId, title: l.title });
}

const WIKILINK = /\[\[([^\]\n]+)\]\]/g;

type MdNode = {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
};

function splitText(value: string): MdNode[] {
  const out: MdNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  WIKILINK.lastIndex = 0;
  while ((m = WIKILINK.exec(value))) {
    const slug = m[1].trim();
    const target = bySlug.get(slug);
    if (m.index > last) out.push({ type: "text", value: value.slice(last, m.index) });
    if (target) {
      out.push({
        type: "link",
        url: `/courses/${target.courseId}/learn/${slug}`,
        children: [{ type: "text", value: target.title }],
      });
    } else {
      out.push({ type: "text", value: m[0] }); // keep unknown refs verbatim
    }
    last = m.index + m[0].length;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

function walk(node: MdNode): void {
  if (!node.children) return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value?.includes("[[")) {
      next.push(...splitText(child.value));
    } else {
      walk(child);
      next.push(child);
    }
  }
  node.children = next;
}

export default function remarkWikiLinks() {
  return (tree: MdNode) => walk(tree);
}
