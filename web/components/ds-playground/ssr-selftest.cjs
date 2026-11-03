// NODE_PATH=<repo>/web/node_modules node ssr-selftest.cjs <compiled DSPlayground.js>
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const assert = require("node:assert/strict");
const DS = require(process.argv[2]).default;
for (const kind of ["stack", "queue", "linked-list", "bst", "heap"]) {
  for (const data of [
    "3,7,1",
    "",
    Array.from({ length: kind === "bst" || kind === "heap" ? 15 : 8 }, (_, i) => i).join(","),
  ]) {
    const html = renderToStaticMarkup(React.createElement(DS, { "data-type": kind, "data-init": data }));
    assert.ok(html.includes("<svg"));
    assert.ok(html.includes('aria-live="polite"'));
    assert.ok(!html.includes("NaN") && !html.includes("undefined"));
    for (const match of html.matchAll(/translate\(([-\d.]+)px, ([-\d.]+)px\)/g)) {
      assert.ok(Number(match[1]) >= 0 && Number(match[1]) <= 320);
      assert.ok(Number(match[2]) >= 0);
    }
  }
}
console.log("PASS: SSR empty/initial/full SVG for all five structures without window/document.");

function render(kind, values) {
  return renderToStaticMarkup(React.createElement(DS, { "data-type": kind, "data-init": values.join(",") }));
}
function height(html) {
  return Number(html.match(/viewBox="0 0 320 (\d+)"/)[1]);
}
const shortQueue = render("queue", [3, 7, 1]);
const queuePoints = [...shortQueue.matchAll(/translate\(([-\d.]+)px, ([-\d.]+)px\)/g)].map((m) =>
  Number(m[1]),
);
assert.equal(
  (Math.min(...queuePoints) + Math.max(...queuePoints)) / 2,
  160,
  "center the occupied queue span",
);
assert.ok(height(render("linked-list", [3, 7, 1])) < 150, "one-row list must not reserve a second row");
assert.ok(height(render("heap", [3, 7, 1])) < 230, "heap array must follow the actual last tree level");
assert.ok(!render("bst", [5, 3, 7]).includes("marker-end="), "BST edges do not have arrowheads");
assert.ok(!render("heap", [5, 3, 7]).includes("marker-end="), "heap edges do not have arrowheads");
const fullList = render("linked-list", [1, 2, 3, 4, 5, 6, 7, 8]);
assert.ok(!/Q 155 91 9 144/.test(fullList), "row wrap must not cross the diagram diagonally");
console.log("PASS: centered queue, content-sized SVG and marker-free tree edges.");

const path = require("node:path");
const compiled = path.dirname(process.argv[2]);
const Diagram = require(path.join(compiled, "ds-playground/Diagram.js")).default;
const { initial, operate } = require(path.join(compiled, "ds-playground/logic.js"));
const { layout, edges, treePath } = require(path.join(compiled, "ds-playground/geometry.js"));
const list = initial("linked-list", [3, 7, 1, 5, 9, 2, 4, 6]);
const reversing = operate("linked-list", list, "reverse");
const update = reversing.find((frame) => frame.note === "Đổi next của 7 về 3");
const svg = renderToStaticMarkup(
  React.createElement(Diagram, { kind: "linked-list", frame: update, marker: "test" }),
);
assert.ok(svg.includes('stroke="#f59e0b"'), "show the reversed pointer in amber");
assert.ok(svg.includes("url(#test-reverse)"), "the reversed pointer uses its amber arrowhead");
assert.ok(!svg.includes("Đang đảo liên kết"), "pointer labels must not share space with a status sentence");
const reverseEdges = edges("linked-list", update, layout("linked-list", update.state).points);
assert.ok(
  reverseEdges.some((edge) => edge.reversed && edge.path.includes(" Q ")),
  "same-row reversed pointers curve below the nodes",
);
// Every row-changing pointer must run through gutters without crossing a box.
for (const frame of reversing) {
  const { points } = layout("linked-list", frame.state);
  for (const edge of edges("linked-list", frame, points)) {
    if (!edge.path.includes(" V ")) continue;
    const commands = [...edge.path.matchAll(/([MHV]) ([-\d.]+)(?: ([-\d.]+))?/g)];
    let previous;
    for (const [, command, a, b] of commands) {
      const point =
        command === "M"
          ? { x: Number(a), y: Number(b) }
          : command === "H"
            ? { x: Number(a), y: previous.y }
            : { x: previous.x, y: Number(a) };
      if (previous) {
        for (const box of points.values()) {
          const crosses =
            point.y === previous.y
              ? point.y > box.y - 14 &&
                point.y < box.y + 14 &&
                Math.max(point.x, previous.x) > box.x - 23 &&
                Math.min(point.x, previous.x) < box.x + 23
              : point.x > box.x - 23 &&
                point.x < box.x + 23 &&
                Math.max(point.y, previous.y) > box.y - 14 &&
                Math.min(point.y, previous.y) < box.y + 14;
          assert.ok(!crosses, "row-changing edges must not cut any node");
        }
      }
      previous = point;
    }
  }
}
const a = { x: 160, y: 30 },
  b = { x: 80, y: 77 };
const endpoints = treePath(a, b)
  .match(/[-\d.]+/g)
  .map(Number);
assert.ok(Math.abs(Math.hypot(endpoints[0] - a.x, endpoints[1] - a.y) - 13) < 1e-8);
assert.ok(Math.abs(Math.hypot(endpoints[2] - b.x, endpoints[3] - b.y) - 13) < 1e-8);
console.log(
  "PASS: amber curved reverse links, orthogonal row routing avoids all boxes, tree edges meet circle boundaries.",
);
