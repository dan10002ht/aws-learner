"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Frame, Item, Kind } from "./logic";
import { Edge, edges, layout, Point } from "./geometry";

type Ghost = { item: Item; point: Point };
type Props = { kind: Kind; frame: Frame; marker: string; label?: string };

export default function Diagram({ kind, frame, marker, label = kind }: Props) {
  const { state } = frame;
  const { points, arrayPoints, height, depth } = layout(kind, state);
  const connections = edges(kind, frame, points);
  const previousLinks = useRef<Edge[]>([]);
  const previousNodes = useRef(new Map<number, Ghost>());
  const [fadingLinks, setFadingLinks] = useState<Edge[]>([]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const isList = kind === "linked-list";
  const isTree = kind === "bst" || kind === "heap";

  useEffect(() => {
    const current = layout(kind, state);
    const links = edges(kind, frame, current.points);
    const keys = new Set(links.map((link) => link.key));
    setFadingLinks(kind === "linked-list" ? previousLinks.current.filter((link) => !keys.has(link.key)) : []);
    setGhosts([...previousNodes.current.values()].filter((node) => !current.points.has(node.item.id)));
    previousLinks.current = links;
    previousNodes.current = new Map(
      state.nodes.map((item) => [item.id, { item, point: current.points.get(item.id)! }]),
    );
    const timer = setTimeout(() => {
      setFadingLinks([]);
      setGhosts([]);
    }, 420);
    return () => clearTimeout(timer);
  }, [state, frame, kind]);

  const drawEdge = (edge: Edge, fading = false) => (
    <path
      key={`${fading ? "fading-" : ""}${edge.key}`}
      className={fading ? "ds-pg-edge-exit" : "ds-pg-edge"}
      d={edge.path}
      fill="none"
      stroke={edge.reversed ? "#f59e0b" : "currentColor"}
      strokeWidth={edge.reversed ? 2 : 1}
      opacity={edge.reversed ? 1 : 0.4}
      markerEnd={isList ? `url(#${marker}${edge.reversed ? "-reverse" : ""})` : undefined}
    />
  );

  const drawNode = (item: Item, point: Point, ghost = false) => {
    const active = frame.active.includes(item.id);
    const labels = Object.entries(frame.pointers)
      .filter(([, id]) => id === item.id)
      .map(([label]) => label);
    const halfWidth = isList ? 23 : kind === "queue" ? 17 : 29;
    const halfHeight = isList ? 14 : 15;
    return (
      <g
        key={item.id}
        className={`ds-pg-node ${ghost ? "ds-pg-exit" : ""}`}
        style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
      >
        {isTree ? (
          <circle
            r="13"
            fill={active ? "#f59e0b" : "#3b82f6"}
            fillOpacity={active ? 0.5 : 0.15}
            stroke={active ? "#f59e0b" : "currentColor"}
          />
        ) : (
          <rect
            x={-halfWidth}
            y={-halfHeight}
            width={halfWidth * 2}
            height={halfHeight * 2}
            rx="5"
            fill={active ? "#f59e0b" : "#10b981"}
            fillOpacity={active ? 0.5 : 0.15}
            stroke="currentColor"
          />
        )}
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="13"
          fill="currentColor"
          x={isList ? -6 : 0}
        >
          {item.value}
        </text>
        {isList && (
          <>
            <path d="M 8 -14 V 14" stroke="currentColor" opacity="0.5" />
            <circle cx="16" r="2" fill="currentColor" />
          </>
        )}
        {labels.length > 0 && (
          <text y="-24" textAnchor="middle" fontSize="12" fill="#f59e0b">
            {labels.join("/")}
          </text>
        )}
      </g>
    );
  };

  const first = state.nodes[0];
  const last = state.nodes[state.nodes.length - 1];
  const tail = isList
    ? state.nodes.find((node) => !connections.some((edge) => edge.key.startsWith(`${node.id}-`)))
    : undefined;

  return (
    <svg
      className="ds-pg-svg"
      viewBox={`0 0 320 ${height}`}
      role="img"
      aria-label={`${label}, ${state.nodes.length} phần tử`}
    >
      {isList && (
        <defs>
          {[false, true].map((reversed) => (
            <marker
              key={String(reversed)}
              id={`${marker}${reversed ? "-reverse" : ""}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerUnits="userSpaceOnUse"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={reversed ? "#f59e0b" : "currentColor"} />
            </marker>
          ))}
        </defs>
      )}
      {kind === "bst" && (
        <text x="310" y="14" textAnchor="end" fontSize="12" fill="currentColor">
          Độ cao: {Math.max(0, depth - 1)} cạnh
        </text>
      )}
      {fadingLinks.map((edge) => drawEdge(edge, true))}
      {connections.map((edge) => drawEdge(edge))}
      {ghosts.map((node) => drawNode(node.item, node.point, true))}
      {state.nodes.map((node) => drawNode(node, points.get(node.id)!))}
      {!state.nodes.length && (
        <text x="160" y="50" textAnchor="middle" fontSize="14" fill="currentColor">
          Cấu trúc rỗng
        </text>
      )}
      {kind === "stack" && first && (
        <text x="206" y="32" fontSize="12" fill="currentColor">
          ← top
        </text>
      )}
      {kind === "queue" && first && (
        <>
          <text x={points.get(first.id)!.x} y="16" textAnchor="middle" fontSize="12" fill="currentColor">
            front ↓
          </text>
          <text x={points.get(last.id)!.x} y="75" textAnchor="middle" fontSize="12" fill="currentColor">
            ↑ rear
          </text>
        </>
      )}
      {isList && first && !frame.links && (
        <text x={points.get(first.id)!.x} y="16" textAnchor="middle" fontSize="12" fill="currentColor">
          head ↓
        </text>
      )}
      {tail && !frame.links && (
        <text
          x={Math.min(276, Math.max(44, points.get(tail.id)!.x))}
          y={points.get(tail.id)!.y + 48}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
        >
          next → null
        </text>
      )}
      {kind === "heap" &&
        state.nodes.map((node) => {
          const point = arrayPoints.get(node.id)!;
          return (
            <g
              key={`array-${node.id}`}
              className="ds-pg-node"
              style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
            >
              <rect
                x="-18"
                y="-15"
                width="36"
                height="30"
                rx="3"
                fill={frame.active.includes(node.id) ? "#f59e0b" : "#3b82f6"}
                fillOpacity={frame.active.includes(node.id) ? 0.5 : 0.15}
                stroke="currentColor"
              />
              <text textAnchor="middle" dominantBaseline="central" fontSize="13" fill="currentColor">
                {node.value}
              </text>
            </g>
          );
        })}
      {/* Indices belong to array slots, so they stay put while values swap. */}
      {kind === "heap" &&
        state.nodes.map((node, index) => {
          const point = arrayPoints.get(node.id)!;
          return (
            <text key={`slot-${index}`} x={point.x} y={point.y + 29} textAnchor="middle" fontSize="12" fill="currentColor">
              {index}
            </text>
          );
        })}
    </svg>
  );
}
