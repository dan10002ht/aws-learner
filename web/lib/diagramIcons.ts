import fs from "fs";
import path from "path";

// Icon sprite for lesson diagrams. A lesson SVG draws an icon with
//   <use href="#aws-lambda" x="40" y="60" width="48" height="48"/>
// and the lesson page injects one hidden <svg> holding only the <symbol>s that
// lesson references. Icons come from data/diagramIcons.json, built by
// scripts/build-diagram-icons.mjs (AWS Architecture Icons + neutral ic-* icons).

type Icon = { viewBox: string; body: string };
type IconFile = { aliases: Record<string, string>; icons: Record<string, Icon> };

const ICONS_FILE = path.join(process.cwd(), "data", "diagramIcons.json");
let cache: IconFile | null = null;

function load(): IconFile {
  if (!cache) cache = JSON.parse(fs.readFileSync(ICONS_FILE, "utf8")) as IconFile;
  return cache;
}

export const ICON_REF = /href="#((?:aws|ic)-[a-z0-9-]+)"/g;

/** Icon ids a markdown lesson references, in first-use order. */
export function iconRefs(md: string): string[] {
  return Array.from(new Set(Array.from(md.matchAll(ICON_REF), (m) => m[1])));
}

/** Hidden sprite markup for the icons `md` uses, or null when it uses none. */
export function iconSprite(md: string): string | null {
  const ids = iconRefs(md);
  if (!ids.length) return null;
  const { aliases, icons } = load();
  const symbols = ids.map((id) => {
    const icon = icons[id] ?? icons[aliases[id]];
    if (!icon) {
      console.warn(`[diagramIcons] unknown icon "${id}"`);
      return "";
    }
    return `<symbol id="${id}" viewBox="${icon.viewBox}">${icon.body}</symbol>`;
  });
  return `<svg aria-hidden="true" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${symbols.join("")}</defs></svg>`;
}
