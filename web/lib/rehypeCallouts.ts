// Rehype plugin: turn blockquotes that begin with an emoji marker (💡 ⚠️ ✅ ❌ 📌)
// into typed callouts. Strips the leading emoji from the text and tags the
// blockquote with `callout callout-<type>` so components/Callout.tsx can render
// a proper lucide icon instead of the AI-looking emoji.

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const MARKERS: { re: RegExp; type: string }[] = [
  { re: /^\s*💡\s*/, type: "tip" },
  { re: /^\s*⚠️️?\s*/, type: "warning" },
  { re: /^\s*(✅|✔️?)\s*/, type: "success" },
  { re: /^\s*❌\s*/, type: "danger" },
  { re: /^\s*(📌|📍|ℹ️)\s*/, type: "note" },
];

function firstTextNode(node: HastNode): HastNode | null {
  if (node.type === "text") return node;
  if (node.children) {
    for (const c of node.children) {
      const t = firstTextNode(c);
      if (t) return t;
    }
  }
  return null;
}

export default function rehypeCallouts() {
  return (tree: HastNode) => visit(tree);
}

function visit(node: HastNode) {
  if (node.type === "element" && node.tagName === "blockquote") {
    const tn = firstTextNode(node);
    if (tn && typeof tn.value === "string") {
      for (const { re, type } of MARKERS) {
        if (re.test(tn.value)) {
          tn.value = tn.value.replace(re, "");
          const cls = (node.properties?.className as string[] | undefined) ?? [];
          node.properties = { ...node.properties, className: [...cls, "callout", `callout-${type}`], dataCallout: type };
          break;
        }
      }
    }
  }
  if (node.children) for (const c of node.children) visit(c);
}
