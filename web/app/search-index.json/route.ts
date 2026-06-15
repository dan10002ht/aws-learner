import { NextResponse } from "next/server";
import MiniSearch from "minisearch";
import { buildContentIndex } from "@/lib/contentIndex";
import { miniSearchOptions } from "@/lib/searchConfig";

// A prebuilt MiniSearch (inverted index + BM25 ranking) is serialized at
// `next build` and served as a static asset; the client loads it as-is — no
// re-indexing in the browser. `content` is tokenized into the index but not
// stored, so the JSON stays compact.
export const dynamic = "force-static";

export function GET() {
  const mini = new MiniSearch(miniSearchOptions);
  mini.addAll(buildContentIndex());
  return NextResponse.json(mini.toJSON());
}
