// Compile logic.ts into a scratch directory, then pass the compiled module path.
// node web/components/ds-playground/selftest.cjs <absolute path to logic.js>
const assert = require("node:assert/strict");
const { initial, operate, parseNumbers, limit } = require(process.argv[2]);
let id = 1000,
  checks = 0;
const values = (s) => s.nodes.map((n) => n.value);
const run = (kind, s, op, v, pos = 0, vs = []) => {
  const before = JSON.stringify(s);
  const frames = operate(kind, s, op, v, id, pos, vs);
  id += 20;
  assert.equal(JSON.stringify(s), before, "input must stay immutable");
  assert.ok(frames.length > 0);
  frames.forEach((f) => {
    assert.equal(new Set(f.state.nodes.map((n) => n.id)).size, f.state.nodes.length);
    f.active.forEach((a) => assert.ok(f.state.nodes.some((n) => n.id === a)));
  });
  checks++;
  return frames.at(-1).state;
};
const heapOK = (s) =>
  s.nodes.forEach((n, i) => {
    if (i) assert.ok(s.nodes[Math.floor((i - 1) / 2)].value <= n.value);
  });
const bstOK = (s) => {
  const seen = new Set(),
    out = [];
  const visit = (id, lo = -Infinity, hi = Infinity) => {
    if (id === undefined) return;
    const n = s.nodes.find((n) => n.id === id);
    assert.ok(n && !seen.has(id));
    seen.add(id);
    assert.ok(n.value > lo && n.value < hi);
    visit(n.left, lo, n.value);
    out.push(n.value);
    visit(n.right, n.value, hi);
  };
  visit(s.root);
  assert.equal(seen.size, s.nodes.length);
  assert.deepEqual(
    out,
    [...out].sort((a, b) => a - b),
  );
  return out;
};
let s = initial("stack", [3, 7, 1]);
s = run("stack", s, "pop");
assert.deepEqual(values(s), [3, 7]);
s = run("stack", s, "push", 3);
assert.deepEqual(values(s), [3, 7, 3]);
assert.deepEqual(run("stack", s, "peek"), s);
s = initial("queue", [3, 7, 1]);
s = run("queue", s, "pop");
assert.deepEqual(values(s), [7, 1]);
s = run("queue", s, "push", 9);
assert.deepEqual(values(s), [7, 1, 9]);
for (const vs of [[], [1], [1, 1, 2], [1, 2, 3, 4, 5, 6, 7, 8]]) {
  s = initial("linked-list", vs);
  s = run("linked-list", s, "reverse");
  assert.deepEqual(values(s), [...vs].reverse());
}
s = initial("linked-list", [1, 2, 2, 3]);
s = run("linked-list", s, "delete", 2);
assert.deepEqual(values(s), [1, 2, 3]);
s = run("linked-list", s, "at", 9, 1);
assert.deepEqual(values(s), [1, 9, 2, 3]);
assert.deepEqual(run("linked-list", s, "at", 8, 99), s);
for (const [vs, target] of [
  [[5, 3, 7], 3],
  [[5, 3, 2], 3],
  [[5, 3, 8, 6, 9, 7], 5],
  [[5, 3, 8, 9], 5],
  [[5], 5],
  [[5, 3], 5],
]) {
  s = initial("bst", vs);
  s = run("bst", s, "delete", target);
  assert.deepEqual(
    bstOK(s),
    vs.filter((v) => v !== target).sort((a, b) => a - b),
  );
}
s = initial("bst", [5, 3, 7, 2, 4, 6, 8]);
for (const [op, expected] of Object.entries({
  inorder: [2, 3, 4, 5, 6, 7, 8],
  preorder: [5, 3, 2, 4, 7, 6, 8],
  postorder: [2, 4, 3, 6, 8, 7, 5],
  bfs: [5, 3, 7, 2, 4, 6, 8],
})) {
  const frames = operate("bst", s, op);
  assert.deepEqual(frames.at(-1).result, expected);
}
// Reproducible random operations, including duplicate values and negative numbers.
let seed = 37;
const rand = () => (seed = (seed * 16807) % 2147483647);
for (let trial = 0; trial < 100; trial++) {
  const vs = Array.from({ length: rand() % 16 }, () => (rand() % 50) - 20);
  s = run("heap", { nodes: [] }, "heapify", 0, 0, vs);
  heapOK(s);
  const expected = [...vs].sort((a, b) => a - b),
    popped = [];
  while (s.nodes.length) {
    popped.push(s.nodes[0].value);
    s = run("heap", s, "pop");
    heapOK(s);
  }
  assert.deepEqual(popped, expected);
  for (const v of vs) {
    s = run("heap", s, "push", v);
    heapOK(s);
  }
  let tree = initial("bst", []);
  for (const v of vs) {
    tree = run("bst", tree, "insert", v);
    bstOK(tree);
  }
  for (const v of [...new Set(vs)].reverse()) {
    tree = run("bst", tree, "delete", v);
    bstOK(tree);
  }
  assert.equal(tree.nodes.length, 0);
}
for (const kind of ["stack", "queue", "linked-list", "bst", "heap"]) {
  s = initial(
    kind,
    Array.from({ length: limit(kind) }, (_, i) => i),
  );
  assert.deepEqual(
    run(kind, s, kind === "bst" ? "insert" : kind === "linked-list" ? "append" : "push", 99),
    s,
  );
  assert.deepEqual(
    run(kind, { nodes: [] }, kind === "linked-list" || kind === "bst" ? "delete" : "pop", 99),
    { root: undefined, nodes: [] },
  );
}
assert.equal(parseNumbers("1,,2", 15), null);
assert.equal(parseNumbers("1.2", 15), null);
assert.equal(parseNumbers("1000", 15), null);
assert.equal(parseNumbers("1,2", 1), null);
assert.deepEqual(parseNumbers("-99,0,999", 15), [-99, 0, 999]);
console.log(
  `PASS: ${checks} operation checks; BST deletion/traversals, heap invariants, list reversal, FIFO/LIFO, limits, parsing and immutable frames.`,
);

// Reversed links must already exist in the frame that explains the change.
const list = initial("linked-list", [3, 7, 1, 5, 9]);
const reversing = operate("linked-list", list, "reverse");
const changed = reversing.find((f) => /đổi next của 7 về 3/i.test(f.note));
assert.ok(changed, "reverse must explain the pointer update");
assert.ok(
  changed.links.some(([from, to]) => from === list.nodes[1].id && to === list.nodes[0].id),
  "the 7 → 3 link must be visible when explained",
);
for (const f of reversing.slice(0, -1)) {
  assert.deepEqual(
    f.state.nodes.map((n) => n.id),
    list.nodes.map((n) => n.id),
    "keep node positions while changing next pointers",
  );
}
console.log("PASS: reverse frames show the updated link without rearranging nodes mid-operation.");
