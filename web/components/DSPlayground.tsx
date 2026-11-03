"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Diagram from "./ds-playground/Diagram";
import { Frame, initial, Kind, limit, operate, parseNumbers, State } from "./ds-playground/logic";

const kinds: Kind[] = ["stack", "queue", "linked-list", "bst", "heap"];
const names: Record<Kind, string> = {
  stack: "Ngăn xếp",
  queue: "Hàng đợi",
  "linked-list": "Danh sách liên kết",
  bst: "Cây tìm kiếm nhị phân",
  heap: "Heap nhỏ nhất",
};
const button = "btn3d btn3d-secondary btn3d-sm";
const blank = (state: State, note: string): Frame => ({ state, active: [], note, pointers: {}, result: [] });

export default function DSPlayground(props: { "data-type"?: string; "data-init"?: string }) {
  const rawKind = props["data-type"];
  const kind: Kind = kinds.includes(rawKind as Kind) ? (rawKind as Kind) : "stack";
  const initValues = parseNumbers(props["data-init"] ?? "", limit(kind));
  const [frame, setFrame] = useState<Frame>(() =>
    blank(
      initial(kind, initValues ?? []),
      initValues
        ? "Chọn thao tác để bắt đầu."
        : "data-init không hợp lệ: dùng số nguyên -99..999, đúng giới hạn kích thước.",
    ),
  );
  const [pending, setPending] = useState<Frame[]>([]);
  const [manual, setManual] = useState(false);
  const [value, setValue] = useState("5");
  const [position, setPosition] = useState("0");
  const [sequence, setSequence] = useState("5,3,8,1");
  const nextId = useRef(limit(kind) + 1);
  const busy = pending.length > 0;
  const marker = `ds-pg-${useId().replace(/:/g, "")}`;
  const advance = () => {
    if (pending.length) {
      setFrame(pending[0]);
      setPending(pending.slice(1));
    }
  };
  useEffect(() => {
    if (!busy || manual) return;
    const timer = setTimeout(() => {
      setFrame(pending[0]);
      setPending(pending.slice(1));
    }, 700);
    return () => clearTimeout(timer);
  }, [pending, busy, manual]);
  const run = (op: string) => {
    if (busy) return;
    const needsValue = ["push", "insert", "find", "delete", "prepend", "append", "at"].includes(op);
    const parsed = parseNumbers(value, 1);
    if (needsValue && (!parsed || parsed.length !== 1)) {
      setFrame({ ...frame, note: "Nhập một số nguyên từ -99 đến 999." });
      return;
    }
    const values = parseNumbers(sequence, 15);
    if (op === "heapify" && !values) {
      setFrame({ ...frame, note: "Dãy heapify: tối đa 15 số nguyên -99..999, phân cách bằng dấu phẩy." });
      return;
    }
    if (op === "at" && !/^\d+$/.test(position)) {
      setFrame({ ...frame, note: "Vị trí phải là số nguyên không âm." });
      return;
    }
    const frames = operate(
      kind,
      frame.state,
      op,
      parsed?.[0],
      nextId.current,
      Number(position),
      values ?? [],
    );
    nextId.current += 16;
    // Always show a starting frame so additions can animate from their entry state.
    setFrame({ ...frame, note: "Bắt đầu thao tác…", active: [], result: [] });
    setPending(frames);
  };
  const replace = (random: boolean) => {
    const values = random
      ? Array.from({ length: 5 }, () => Math.floor(Math.random() * 50))
      : (initValues ?? []);
    const s = initial(kind, values);
    // New identities prevent reset/random from reusing a previous operation's nodes.
    const offset = nextId.current;
    nextId.current += 32;
    s.nodes = s.nodes.map((n) => ({
      ...n,
      id: n.id + offset,
      left: n.left === undefined ? undefined : n.left + offset,
      right: n.right === undefined ? undefined : n.right + offset,
    }));
    if (s.root !== undefined) s.root += offset;
    setFrame(blank(s, random ? "Đã tạo cấu trúc ngẫu nhiên." : "Đã đặt lại trạng thái khởi tạo."));
  };
  const action = (op: string, label: string) => (
    <button type="button" key={op} disabled={busy} className={button} onClick={() => run(op)}>
      {label}
    </button>
  );
  return (
    <div className="ds-pg not-prose my-6 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--text)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm">{names[kind]}</strong>
        <span className="text-xs text-[var(--text-dim)]">
          {frame.state.nodes.length}/{limit(kind)} phần tử
        </span>
      </div>
      <Diagram kind={kind} frame={frame} marker={marker} label={names[kind]} />
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(kind === "bst" ? "insert" : kind === "linked-list" ? "append" : "push");
        }}
      >
        <label className="ds-pg-label">
          Giá trị
          <input
            aria-label="Giá trị"
            type="number"
            min="-99"
            max="999"
            step="1"
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        {kind === "linked-list" && (
          <label className="ds-pg-label">
            Vị trí i
            <input
              aria-label="Vị trí i"
              type="number"
              min="0"
              max={frame.state.nodes.length}
              value={position}
              disabled={busy}
              onChange={(e) => setPosition(e.target.value)}
            />
          </label>
        )}
        <button type="submit" disabled={busy} className="btn3d btn3d-primary btn3d-sm">
          {kind === "bst"
            ? "Chèn"
            : kind === "linked-list"
              ? "Chèn cuối"
              : kind === "queue"
                ? "Thêm (enqueue)"
                : "Thêm (push)"}
        </button>
        {(kind === "stack" || kind === "queue") && (
          <>
            {action("pop", kind === "stack" ? "Lấy (pop)" : "Lấy (dequeue)")}
            {action("peek", "Xem đầu (peek)")}
          </>
        )}
        {kind === "linked-list" && (
          <>
            {action("prepend", "Chèn đầu")}
            {action("at", "Chèn tại i")}
            {action("delete", "Xoá giá trị")}
            {action("reverse", "Đảo ngược")}
          </>
        )}
        {kind === "bst" && (
          <>
            {action("find", "Tìm")}
            {action("delete", "Xoá")}
            {action("inorder", "Inorder")}
            {action("preorder", "Preorder")}
            {action("postorder", "Postorder")}
            {action("bfs", "BFS")}
          </>
        )}
        {kind === "heap" && action("pop", "Lấy min (pop)")}
      </form>
      {kind === "heap" && (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run("heapify");
          }}
        >
          <label className="ds-pg-label ds-pg-sequence">
            Dãy heapify
            <input
              aria-label="Dãy heapify"
              value={sequence}
              disabled={busy}
              maxLength={100}
              onChange={(e) => setSequence(e.target.value)}
            />
          </label>
          <button disabled={busy} className={button}>
            Heapify
          </button>
        </form>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button disabled={busy} className={button} onClick={() => replace(true)}>
          Ngẫu nhiên
        </button>
        <button disabled={busy} className={button} onClick={() => replace(false)}>
          Đặt lại
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
          Từng bước
        </label>
        <button className={button} disabled={!busy || !manual} onClick={advance}>
          Tiếp
        </button>
      </div>
      <div
        className="mt-3 min-h-[3.5rem] rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {frame.note}
        {kind === "linked-list" && frame.links && (
          <div className="mt-1 text-xs text-[var(--text-dim)]">
            next = null tại:{" "}
            {frame.state.nodes
              .filter((node) => !frame.links!.some(([from]) => from === node.id))
              .map((node) => node.value)
              .join(", ")}
          </div>
        )}
        {Object.entries(frame.pointers).some(([, id]) => id === undefined) && (
          <div className="mt-1 text-xs text-[var(--text-dim)]">
            {Object.entries(frame.pointers)
              .filter(([, id]) => id === undefined)
              .map(([label]) => `${label} = null`)
              .join(" · ")}
          </div>
        )}
        {frame.result.length > 0 && (
          <div className="mt-1 break-words font-mono">Dãy kết quả: {frame.result.join(" → ")}</div>
        )}
      </div>
    </div>
  );
}
