import MiniSearch from "minisearch";
import { miniSearchOptions, searchParams } from "./searchConfig";

// Runs off the main thread: fetches the prebuilt index, deserializes it
// (the ~3MB JSON.parse + loadJSON that would otherwise jank the UI), and
// answers search queries via postMessage.

interface Hit {
  id: string;
  kind: "course" | "lesson" | "section";
  title: string;
  breadcrumb: string[];
  url: string;
  content: string;
  /** Index terms that matched this hit (folded) — used for highlighting. */
  terms?: string[];
}

type Incoming =
  | { type: "init" }
  | { type: "search"; reqId: number; query: string };

let engine: MiniSearch | null = null;
let defaults: Hit[] = [];

const ctx = self as unknown as {
  postMessage(message: unknown): void;
  onmessage: ((e: MessageEvent<Incoming>) => void) | null;
};

ctx.onmessage = async (e: MessageEvent<Incoming>) => {
  const msg = e.data;

  if (msg.type === "init") {
    if (engine) {
      ctx.postMessage({ type: "ready", defaults });
      return;
    }
    try {
      const json = await fetch("/search-index.json").then((r) => r.text());
      engine = MiniSearch.loadJSON(json, miniSearchOptions);
      defaults = (engine.search(MiniSearch.wildcard) as unknown as Hit[])
        .filter((h) => h.kind === "course")
        .slice(0, 6);
      ctx.postMessage({ type: "ready", defaults });
    } catch {
      ctx.postMessage({ type: "ready", defaults: [] });
    }
    return;
  }

  if (msg.type === "search") {
    const hits = engine
      ? (engine.search(msg.query, searchParams).slice(0, 25) as unknown as Hit[])
      : [];
    ctx.postMessage({ type: "results", reqId: msg.reqId, hits });
  }
};
