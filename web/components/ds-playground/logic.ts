export type Kind = "stack" | "queue" | "linked-list" | "bst" | "heap";
export type Item = { id: number; value: number; left?: number; right?: number };
export type State = { nodes: Item[]; root?: number };
export type Frame = {
  state: State;
  active: number[];
  note: string;
  result: number[];
  pointers: Record<string, number | undefined>;
  links?: [number, number][];
};
export const limit = (kind: Kind) => (kind === "bst" || kind === "heap" ? 15 : 8);
export function parseNumbers(raw: string, max: number): number[] | null {
  if (!raw.trim()) return [];
  const parts = raw.split(",");
  if (parts.length > max || parts.some((x) => !/^-?\d+$/.test(x.trim()))) return null;
  const values = parts.map(Number);
  return values.every((x) => Number.isInteger(x) && x >= -99 && x <= 999) ? values : null;
}
const clone = (s: State): State => ({ root: s.root, nodes: s.nodes.map((n) => ({ ...n })) });
export function initial(kind: Kind, values: number[]): State {
  let s: State = { nodes: [] };
  values.slice(0, limit(kind)).forEach((v, i) => {
    const frames = operate(kind, s, kind === "bst" ? "insert" : "push", v, i + 1);
    s = frames[frames.length - 1].state;
  });
  return s;
}
export function operate(
  kind: Kind,
  input: State,
  op: string,
  value = 0,
  id = 1,
  position = 0,
  values: number[] = [],
): Frame[] {
  let s = clone(input);
  const frames: Frame[] = [];
  let links: [number, number][] | undefined;
  const emit = (
    note: string,
    active: number[] = [],
    pointers: Frame["pointers"] = {},
    result: number[] = [],
  ) => {
    frames.push({
      state: clone(s),
      note,
      active: [...active],
      pointers: { ...pointers },
      result: [...result],
      links: links?.map(([a, b]) => [a, b]),
    });
  };
  const node = (nid: number | undefined) => s.nodes.find((n) => n.id === nid);
  const fresh = (): Item => ({ id, value });
  const adding = ["push", "insert", "prepend", "append", "at"].includes(op);
  if (adding && s.nodes.length >= limit(kind)) {
    emit(`Đã đầy: tối đa ${limit(kind)} phần tử.`);
    return frames;
  }
  if (kind === "stack" || kind === "queue") {
    const top = kind === "stack" ? s.nodes[s.nodes.length - 1] : s.nodes[0];
    if (op === "push") {
      s.nodes.push(fresh());
      emit(`${kind === "stack" ? "push" : "enqueue"}(${value}) · O(1)`, [id]);
    } else if (!top)
      emit(
        `${op === "peek" ? "peek" : kind === "stack" ? "pop" : "dequeue"} trên ${kind} rỗng: không có gì để lấy · O(1)`,
      );
    else {
      emit(`Xét ${kind === "stack" ? "top" : "front"}: ${top.value}`, [top.id]);
      if (op !== "peek") kind === "stack" ? s.nodes.pop() : s.nodes.shift();
      emit(
        `${op === "peek" ? "peek" : kind === "stack" ? "pop" : "dequeue"} → ${top.value} · O(1)`,
        op === "peek" ? [top.id] : [],
      );
    }
  } else if (kind === "linked-list") {
    if (op === "reverse") {
      const original = [...s.nodes];
      links = original.slice(0, -1).map((n, i) => [n.id, original[i + 1].id]);
      for (let i = 0; i < original.length; i++) {
        const cur = original[i],
          prev = original[i - 1],
          next = original[i + 1];
        emit(`cur = ${cur.value}: lưu next = ${next?.value ?? "null"}`, [cur.id], {
          prev: prev?.id,
          cur: cur.id,
          next: next?.id,
        });
        links = links.filter(([from]) => from !== cur.id);
        if (prev) links.push([cur.id, prev.id]);
        emit(`Đổi next của ${cur.value} về ${prev?.value ?? "null"}`, [cur.id], {
          prev: prev?.id,
          cur: cur.id,
          next: next?.id,
        });
        emit(`Dịch prev tới ${cur.value}, cur tới ${next?.value ?? "null"}`, [cur.id], {
          prev: cur.id,
          cur: next?.id,
          next: original[i + 2]?.id,
        });
      }
      s.nodes = [...original].reverse();
      links = undefined;
      emit("Đảo ngược xong; head = prev · O(n)");
    } else if (op === "delete") {
      let index = -1;
      for (let i = 0; i < s.nodes.length; i++) {
        emit(
          `cur = ${s.nodes[i].value}: ${s.nodes[i].value === value ? "tìm thấy" : `khác ${value}, đi tiếp`}`,
          [s.nodes[i].id],
          { cur: s.nodes[i].id },
        );
        if (s.nodes[i].value === value) {
          index = i;
          break;
        }
      }
      if (index >= 0) {
        s.nodes.splice(index, 1);
        emit(`Nối con trỏ bỏ qua ${value}; xoá lần xuất hiện đầu · O(n)`);
      } else emit(`Không tìm thấy ${value} · O(n)`);
    } else {
      const index = op === "prepend" ? 0 : op === "append" || op === "push" ? s.nodes.length : position;
      if (!Number.isInteger(index) || index < 0 || index > s.nodes.length) {
        emit(`Vị trí phải từ 0 đến ${s.nodes.length}.`);
        return frames;
      }
      for (let i = 0; i < index; i++)
        emit(`Từ head: cur ở vị trí ${i}, giá trị ${s.nodes[i].value}`, [s.nodes[i].id], {
          cur: s.nodes[i].id,
        });
      emit(
        `Nối node mới tới ${s.nodes[index]?.value ?? "null"}, rồi nối ${index ? "node trước" : "head"} tới node mới`,
      );
      s.nodes.splice(index, 0, fresh());
      emit(`Chèn ${value} tại ${index} · ${index ? "O(n)" : "O(1)"}`, [id]);
    }
  } else if (kind === "heap") {
    const swap = (a: number, b: number) => {
      const x = s.nodes[a],
        y = s.nodes[b];
      [s.nodes[a], s.nodes[b]] = [y, x];
      emit(`Đổi chỗ ${x.value} với ${y.value} vì ${x.value < y.value ? x.value : y.value} nhỏ hơn`, [
        x.id,
        y.id,
      ]);
    };
    const down = (start: number) => {
      let i = start;
      while (2 * i + 1 < s.nodes.length) {
        let c = 2 * i + 1;
        if (c + 1 < s.nodes.length && s.nodes[c + 1].value < s.nodes[c].value) c++;
        emit(`Xét ${s.nodes[i].value} và con nhỏ nhất ${s.nodes[c].value}`, [s.nodes[i].id, s.nodes[c].id]);
        if (s.nodes[i].value <= s.nodes[c].value) break;
        swap(i, c);
        i = c;
      }
    };
    if (op === "heapify") {
      if (values.length > 15 || values.some((v) => !Number.isInteger(v) || v < -99 || v > 999)) {
        emit("Dãy không hợp lệ; tối đa 15 số nguyên -99..999.");
        return frames;
      }
      s.nodes = values.map((v, i) => ({ id: id + i, value: v }));
      emit("Đặt dãy vào cây hoàn chỉnh, bắt đầu từ ⌊n/2⌋ − 1");
      for (let i = Math.floor(s.nodes.length / 2) - 1; i >= 0; i--) {
        emit(`Sift down tại chỉ số ${i}`, [s.nodes[i].id]);
        down(i);
      }
      emit("heapify hoàn tất · O(n)");
    } else if (op === "push") {
      s.nodes.push(fresh());
      emit(`Thêm ${value} ở cuối mảng`, [id]);
      let i = s.nodes.length - 1;
      while (i > 0) {
        const p = Math.floor((i - 1) / 2);
        emit(`So sánh ${s.nodes[i].value} với cha ${s.nodes[p].value}`, [s.nodes[i].id, s.nodes[p].id]);
        if (s.nodes[p].value <= s.nodes[i].value) break;
        swap(i, p);
        i = p;
      }
      emit(`push(${value}) hoàn tất · O(log n)`, [id]);
    } else if (!s.nodes.length) emit("pop trên heap rỗng: không có gì để lấy · O(1)");
    else {
      const min = s.nodes[0];
      emit(`Lấy min = ${min.value}`, [min.id]);
      const last = s.nodes.pop()!;
      if (s.nodes.length) {
        s.nodes[0] = last;
        emit(`Đưa phần tử cuối ${last.value} lên gốc`, [last.id]);
        down(0);
      }
      emit(`pop → ${min.value} · O(log n)`);
    }
  } else {
    const walk = (nid: number | undefined, order: string, out: number[]) => {
      const n = node(nid);
      if (!n) return;
      if (order === "preorder") {
        out.push(n.value);
        emit(`Thăm ${n.value}`, [n.id], {}, out);
      }
      walk(n.left, order, out);
      if (order === "inorder") {
        out.push(n.value);
        emit(`Thăm ${n.value}`, [n.id], {}, out);
      }
      walk(n.right, order, out);
      if (order === "postorder") {
        out.push(n.value);
        emit(`Thăm ${n.value}`, [n.id], {}, out);
      }
    };
    if (["inorder", "preorder", "postorder", "bfs"].includes(op)) {
      const out: number[] = [];
      if (op === "bfs") {
        const queue = s.root === undefined ? [] : [s.root];
        while (queue.length) {
          const n = node(queue.shift())!;
          out.push(n.value);
          emit(`BFS: thăm ${n.value}`, [n.id], {}, out);
          if (n.left !== undefined) queue.push(n.left);
          if (n.right !== undefined) queue.push(n.right);
        }
      } else walk(s.root, op, out);
      emit(`${op}: ${out.join(" → ") || "cây rỗng"} · O(n)`, [], {}, out);
    } else {
      let cur = node(s.root),
        parent: Item | undefined;
      while (cur) {
        emit(
          value === cur.value
            ? `Tìm thấy ${value}`
            : `${value} ${value < cur.value ? "<" : ">"} ${cur.value} → sang ${value < cur.value ? "trái" : "phải"}`,
          [cur.id],
        );
        if (value === cur.value) break;
        parent = cur;
        cur = node(value < cur.value ? cur.left : cur.right);
      }
      if (op === "insert") {
        if (cur) emit(`${value} đã tồn tại; BST không chèn trùng · O(h)`, [cur.id]);
        else {
          s.nodes.push(fresh());
          if (!parent) s.root = id;
          else if (value < parent.value) parent.left = id;
          else parent.right = id;
          emit(`Chèn ${value} · O(h)`, [id]);
        }
      } else if (op === "find")
        emit(`${cur ? "Tìm thấy" : "Không tìm thấy"} ${value} · O(h)`, cur ? [cur.id] : []);
      else if (!cur) emit(`Không tìm thấy ${value} để xoá · O(h)`);
      else {
        const target = cur;
        const replace = (old: Item, replacement?: number) => {
          const p = s.nodes.find((n) => n.left === old.id || n.right === old.id);
          if (!p) s.root = replacement;
          else if (p.left === old.id) p.left = replacement;
          else p.right = replacement;
          s.nodes = s.nodes.filter((n) => n.id !== old.id);
        };
        if (target.left !== undefined && target.right !== undefined) {
          emit("Node có 2 con: tìm successor nhỏ nhất bên phải", [target.id]);
          let successor = node(target.right)!;
          emit(`Sang cây con phải: ${successor.value}`, [successor.id]);
          while (successor.left !== undefined) {
            successor = node(successor.left)!;
            emit(`Đi trái tới ${successor.value} để tìm successor`, [successor.id]);
          }
          emit(`Successor = ${successor.value}; chuyển successor vào vị trí node bị xoá`, [
            target.id,
            successor.id,
          ]);
          // Transplant the actual node, preserving its identity.
          if (target.right !== successor.id) {
            const p = s.nodes.find((n) => n.left === successor.id)!;
            p.left = successor.right;
            successor.right = target.right;
          }
          successor.left = target.left;
          replace(target, successor.id);
        } else {
          emit(
            target.left === undefined && target.right === undefined
              ? "Node lá: ngắt liên kết từ cha"
              : "Node có 1 con: nối cha trực tiếp tới con",
            [target.id],
          );
          replace(target, target.left ?? target.right);
        }
        emit(`Xoá ${value} hoàn tất · O(h)`);
      }
    }
  }
  return frames;
}
