import type { Frame, Kind, State } from "./logic";

export type Point = { x: number; y: number };
export type Edge = { key: string; path: string; reversed: boolean };
export type Layout = {
  points: Map<number, Point>;
  arrayPoints: Map<number, Point>;
  height: number;
  depth: number;
};

export const TREE_RADIUS = 13;
export const LIST_HALF_WIDTH = 23;
export const LIST_HALF_HEIGHT = 14;

export function layout(kind: Kind, state: State): Layout {
  const points = new Map<number, Point>();
  const arrayPoints = new Map<number, Point>();
  const count = state.nodes.length;
  let depth = 0;

  if (kind === "bst") {
    let index = 0;
    const visit = (id: number | undefined, level: number) => {
      const node = state.nodes.find((node) => node.id === id);
      if (!node) return;
      visit(node.left, level + 1);
      const x = count === 1 ? 160 : 20 + index++ * (280 / Math.max(1, count - 1));
      points.set(node.id, { x, y: 38 + level * 46 });
      depth = Math.max(depth, level + 1);
      visit(node.right, level + 1);
    };
    visit(state.root, 0);
  } else {
    state.nodes.forEach((node, index) => {
      if (kind === "heap") {
        const level = Math.floor(Math.log2(index + 1));
        depth = Math.max(depth, level + 1);
        points.set(node.id, {
          x: (index - (2 ** level - 1) + 0.5) * (320 / 2 ** level),
          y: 30 + level * 47,
        });
      } else if (kind === "stack") {
        points.set(node.id, { x: 160, y: 28 + (count - 1 - index) * 38 });
      } else if (kind === "queue") {
        points.set(node.id, { x: 160 + (index - (count - 1) / 2) * 40, y: 42 });
      } else {
        const row = Math.floor(index / 4);
        const rowCount = Math.min(4, count - row * 4);
        points.set(node.id, {
          x: 160 + ((index % 4) - (rowCount - 1) / 2) * 84,
          y: 52 + row * 100,
        });
      }
    });
  }

  const bottom = Math.max(0, ...[...points.values()].map((point) => point.y));
  if (kind === "heap") {
    state.nodes.forEach((node, index) => {
      const row = Math.floor(index / 8);
      const rowCount = Math.min(8, count - row * 8);
      arrayPoints.set(node.id, {
        x: 160 + ((index % 8) - (rowCount - 1) / 2) * 40,
        y: bottom + TREE_RADIUS + 32 + row * 46,
      });
    });
  }

  let height = bottom + 30;
  if (kind === "heap") {
    height = Math.max(90, ...[...arrayPoints.values()].map((point) => point.y + 37));
  } else if (kind === "linked-list") {
    height = bottom + 66;
  } else if (kind === "queue") {
    height = bottom + 45;
  }
  return { points, arrayPoints, depth, height: Math.max(90, height) };
}

export function treePath(from: Point, to: Point): string {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const dx = ((to.x - from.x) / distance) * TREE_RADIUS;
  const dy = ((to.y - from.y) / distance) * TREE_RADIUS;
  return `M ${from.x + dx} ${from.y + dy} L ${to.x - dx} ${to.y - dy}`;
}

export function listPath(from: Point, to: Point): string {
  if (from.y !== to.y) {
    // Route row changes through the gutters, away from boxes and pointer labels.
    const reversed = from.y > to.y;
    const exit = reversed ? from.x - LIST_HALF_WIDTH : from.x + LIST_HALF_WIDTH;
    const entry = reversed ? to.x + LIST_HALF_WIDTH : to.x - LIST_HALF_WIDTH;
    const outerFrom = reversed ? 4 : 316;
    const outerTo = reversed ? 316 : 4;
    const middle = (from.y + to.y) / 2 + (reversed ? 6 : 0);
    return `M ${exit} ${from.y} H ${outerFrom} V ${middle} H ${outerTo} V ${to.y} H ${entry}`;
  }
  if (to.x < from.x) {
    // Reversed next pointers arc below the row, leaving labels above it clear.
    return `M ${from.x} ${from.y + LIST_HALF_HEIGHT} Q ${(from.x + to.x) / 2} ${from.y + 56} ${to.x} ${to.y + LIST_HALF_HEIGHT}`;
  }
  return `M ${from.x + LIST_HALF_WIDTH} ${from.y} H ${to.x - LIST_HALF_WIDTH}`;
}

export function edges(kind: Kind, frame: Frame, points: Map<number, Point>): Edge[] {
  const pairs: [number, number][] = [];
  const nodes = frame.state.nodes;
  if (kind === "linked-list") {
    pairs.push(
      ...(frame.links ?? nodes.slice(0, -1).map((node, i): [number, number] => [node.id, nodes[i + 1].id])),
    );
  } else if (kind === "bst") {
    nodes.forEach((node) => {
      if (node.left !== undefined) pairs.push([node.id, node.left]);
      if (node.right !== undefined) pairs.push([node.id, node.right]);
    });
  } else if (kind === "heap") {
    nodes.forEach((node, i) => {
      if (i > 0) pairs.push([nodes[Math.floor((i - 1) / 2)].id, node.id]);
    });
  }
  return pairs.map(([from, to]) => {
    const a = points.get(from)!;
    const b = points.get(to)!;
    return {
      key: `${from}-${to}`,
      path: kind === "linked-list" ? listPath(a, b) : treePath(a, b),
      reversed: kind === "linked-list" && (b.y < a.y || (b.y === a.y && b.x < a.x)),
    };
  });
}
