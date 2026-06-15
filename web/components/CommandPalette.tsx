"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { BookOpen, FileText, Hash, Search, CornerDownLeft, Loader2 } from "lucide-react";

type SearchKind = "course" | "lesson" | "section";
/** Stored fields returned by MiniSearch on each hit (see miniSearchOptions). */
interface Hit {
  id: string;
  kind: SearchKind;
  title: string;
  breadcrumb: string[];
  url: string;
  snippet: string;
}

// Module-level singletons so the worker + index survive remounts and only
// load once per session.
let sharedWorker: Worker | null = null;
let cachedDefaults: Hit[] = [];
let workerReady = false;

const KIND_ICON = { course: BookOpen, lesson: FileText, section: Hash } as const;

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [defaults, setDefaults] = useState<Hit[]>(cachedDefaults);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(!workerReady);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  // Global Cmd/Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Spin up the search worker on first open; it fetches + deserializes the
  // index off the main thread so the UI never janks.
  useEffect(() => {
    if (!open) return;

    if (!sharedWorker) {
      sharedWorker = new Worker(
        new URL("../lib/search.worker.ts", import.meta.url)
      );
    }
    const worker = sharedWorker;
    workerRef.current = worker;

    const onMessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "ready") {
        cachedDefaults = msg.defaults;
        workerReady = true;
        setDefaults(msg.defaults);
        setLoading(false);
      } else if (msg.type === "results" && msg.reqId === reqIdRef.current) {
        setHits(msg.hits);
      }
    };
    worker.addEventListener("message", onMessage);
    if (!workerReady) {
      setLoading(true);
      worker.postMessage({ type: "init" });
    }
    return () => worker.removeEventListener("message", onMessage);
  }, [open]);

  // Send each query to the worker; results arrive via the message handler.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      return;
    }
    if (!workerRef.current || !workerReady) return;
    const reqId = ++reqIdRef.current;
    workerRef.current.postMessage({ type: "search", reqId, query: q });
  }, [query]);

  const results = query.trim() ? hits : defaults;

  // Group results by their top-level breadcrumb (course name), GitBook-style.
  const groups = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const item of results) {
      const key = item.breadcrumb[0] ?? "Khác";
      const arr = map.get(key) ?? map.set(key, []).get(key)!;
      arr.push(item);
    }
    return [...map.entries()];
  }, [results]);

  const go = useCallback(
    (url: string) => {
      setOpen(false);
      setQuery("");
      router.push(url);
    },
    [router]
  );

  return (
    <>
      <SearchTrigger onClick={() => setOpen(true)} />

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        label="Tìm kiếm khoá học, bài học & nội dung"
        className="fixed inset-0 z-50"
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />

        <div className="absolute left-1/2 top-[12vh] w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
            {loading ? (
              <Loader2 size={18} className="shrink-0 animate-spin text-[var(--text-dim)]" />
            ) : (
              <Search size={18} className="shrink-0 text-[var(--text-dim)]" />
            )}
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Tìm khoá học, bài học, nội dung…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-dim)]"
            />
            <kbd className="hidden shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-dim)] sm:block">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {loading && (
              <div className="py-8 text-center text-sm text-[var(--text-dim)]">
                Đang tải nội dung tìm kiếm…
              </div>
            )}
            {!loading && (
              <Command.Empty className="py-8 text-center text-sm text-[var(--text-dim)]">
                Không tìm thấy kết quả cho “{query}”.
              </Command.Empty>
            )}

            {groups.map(([groupName, items]) => (
              <Command.Group
                key={groupName}
                heading={groupName}
                className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[var(--text-dim)]"
              >
                {items.map((item) => {
                  const Icon = KIND_ICON[item.kind];
                  const sub =
                    item.kind === "section" && item.breadcrumb[1]
                      ? item.breadcrumb[1]
                      : null;
                  const snip = item.snippet;
                  return (
                    <Command.Item
                      key={item.id}
                      value={item.id}
                      onSelect={() => go(item.url)}
                      className="group flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 data-[selected=true]:bg-brand-500/10"
                    >
                      <span className="mt-0.5 shrink-0 text-[var(--text-dim)]">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        {sub && (
                          <span className="flex items-center gap-1 truncate text-[11px] text-[var(--text-dim)]">
                            {sub}
                          </span>
                        )}
                        <span className="block truncate text-sm font-medium text-[var(--text)]">
                          {item.title}
                        </span>
                        {snip && (
                          <span className="line-clamp-1 text-xs text-[var(--text-dim)]">
                            {snip}
                          </span>
                        )}
                      </span>
                      <CornerDownLeft
                        size={14}
                        className="mt-1 shrink-0 text-[var(--text-dim)] opacity-0 group-data-[selected=true]:opacity-100"
                      />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>

          <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-dim)]">
            <span className="flex items-center gap-2">
              <kbd className="rounded border border-[var(--border)] px-1">↑</kbd>
              <kbd className="rounded border border-[var(--border)] px-1">↓</kbd>
              điều hướng
              <kbd className="rounded border border-[var(--border)] px-1">↵</kbd>
              mở
            </span>
            <span>{results.length} kết quả</span>
          </div>
        </div>
      </Command.Dialog>
    </>
  );
}

function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Tìm kiếm"
      className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-dim)] transition hover:text-[var(--text)]"
    >
      <Search size={16} />
      <span className="hidden md:inline">Tìm kiếm…</span>
      <kbd className="hidden rounded border border-[var(--border)] px-1 text-[10px] md:inline">
        ⌘K
      </kbd>
    </button>
  );
}
