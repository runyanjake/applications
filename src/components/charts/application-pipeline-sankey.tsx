import { useRef, useState, useEffect, useCallback } from "react";
import { Sankey, Tooltip, Layer, Rectangle } from "recharts";
import type { Application, ApplicationStatus } from "../../types/application";

interface ApplicationPipelineSankeyProps {
  applications: Application[];
  title: string;
  interactive?: boolean;
}

const NODE_COLORS: Record<string, string> = {
  "All Applications": "#6366f1",
  "Bookmarked": "#9ca3af",
  "Applied": "#818cf8",
  "Interviewing": "#fbbf24",
  "Awaiting Response": "#a5b4fc",
  "In Interviews": "#fcd34d",
  "Offered": "#34d399",
  "Rejected": "#f87171",
  "Ghosted": "#a78bfa",
  "Withdrawn": "#fb923c",
};

function buildSankeyData(apps: Application[]) {
  const counts: Record<ApplicationStatus, number> = {
    bookmarked: 0, applied: 0, interviewing: 0,
    offered: 0, rejected: 0, withdrawn: 0, ghosted: 0,
  };
  for (const app of apps) counts[app.status]++;

  const nodes = [
    { name: "All Applications" },   // 0
    { name: "Bookmarked" },          // 1
    { name: "Applied" },             // 2
    { name: "Interviewing" },        // 3
    { name: "Awaiting Response" },   // 4
    { name: "In Interviews" },       // 5
    { name: "Offered" },             // 6
    { name: "Rejected" },            // 7
    { name: "Ghosted" },             // 8
    { name: "Withdrawn" },           // 9
  ];

  const links: { source: number; target: number; value: number }[] = [];
  const push = (s: number, t: number, v: number) => {
    if (v > 0) links.push({ source: s, target: t, value: v });
  };

  const total = apps.length;
  const appliedPlus = total - counts.bookmarked;
  const interviewingPlus = counts.interviewing + counts.offered;

  push(0, 1, counts.bookmarked);
  push(0, 2, appliedPlus);
  push(2, 3, interviewingPlus);
  push(2, 4, counts.applied);
  push(2, 7, counts.rejected);
  push(2, 8, counts.ghosted);
  push(2, 9, counts.withdrawn);
  push(3, 6, counts.offered);
  push(3, 5, counts.interviewing);

  if (links.length === 0) return null;
  return { nodes, links };
}

// Recharts clones the node/link elements and merges in layout props, so extra
// props passed here are forwarded to the custom renderers.

function SankeyNode({
  x, y, width, height, index, payload,
  hoveredNode, onHover, dragOffsets, onDragStart,
}: any) {
  const name: string = payload?.name ?? "";
  const value: number = payload?.value ?? 0;
  const color = NODE_COLORS[name] ?? "#94a3b8";
  const yOff: number = dragOffsets?.[index] ?? 0;
  const ry = y + yOff;
  const dimmed = hoveredNode !== null && hoveredNode !== index;

  return (
    <Layer
      onMouseEnter={onHover ? () => onHover(index) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      onMouseDown={
        onDragStart
          ? (e: React.MouseEvent) => { e.preventDefault(); onDragStart(index, e.clientY); }
          : undefined
      }
    >
      <Rectangle
        x={x} y={ry} width={width} height={height}
        fill={color}
        fillOpacity={dimmed ? 0.2 : 0.9}
        style={{ cursor: onDragStart ? "grab" : "default" }}
      />
      {height > 14 && (
        <text
          x={x + width + 6}
          y={ry + height / 2}
          textAnchor="start"
          dominantBaseline="central"
          fontSize={12}
          fill={dimmed ? "#d1d5db" : "#374151"}
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {name} ({value})
        </text>
      )}
    </Layer>
  );
}

function SankeyLink({
  sourceX, targetX, sourceY, targetY,
  sourceControlX, targetControlX,
  linkWidth, payload,
  hoveredNode, dragOffsets,
}: any) {
  const srcNode = payload?.source;
  const tgtNode = payload?.target;
  const srcIdx: number = typeof srcNode === "object" ? srcNode?.index : srcNode;
  const tgtIdx: number = typeof tgtNode === "object" ? tgtNode?.index : tgtNode;
  const srcName: string = typeof srcNode === "object" ? (srcNode?.name ?? "") : "";

  const srcOff: number = dragOffsets?.[srcIdx] ?? 0;
  const tgtOff: number = dragOffsets?.[tgtIdx] ?? 0;
  const sy = sourceY + srcOff;
  const ty = targetY + tgtOff;

  const connected =
    hoveredNode === null || srcIdx === hoveredNode || tgtIdx === hoveredNode;
  const opacity = hoveredNode === null ? 0.3 : connected ? 0.6 : 0.04;

  // Color the link by its source node when highlighted so the origin is clear
  const stroke =
    hoveredNode !== null && connected
      ? (NODE_COLORS[srcName] ?? "#94a3b8")
      : "#94a3b8";

  return (
    <Layer>
      <path
        d={`M${sourceX},${sy} C${sourceControlX},${sy} ${targetControlX},${ty} ${targetX},${ty}`}
        fill="none"
        stroke={stroke}
        strokeWidth={linkWidth}
        strokeOpacity={opacity}
        style={{ transition: "stroke-opacity 0.12s ease, stroke 0.12s ease" }}
      />
    </Layer>
  );
}

export function ApplicationPipelineSankey({
  applications,
  title,
  interactive = false,
}: ApplicationPipelineSankeyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Record<number, number>>({});
  const [draggingNode, setDraggingNode] = useState<number | null>(null);
  const dragStartRef = useRef<{ clientY: number; startOffset: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Attach global move/up handlers only while a drag is active
  useEffect(() => {
    if (!interactive || draggingNode === null) return;

    const onMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const delta = e.clientY - dragStartRef.current.clientY;
      setDragOffsets((prev) => ({
        ...prev,
        [draggingNode]: dragStartRef.current!.startOffset + delta,
      }));
    };
    const onUp = () => {
      setDraggingNode(null);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [interactive, draggingNode]);

  const startDrag = useCallback(
    (nodeIndex: number, clientY: number) => {
      setDraggingNode(nodeIndex);
      setHoveredNode(nodeIndex);
      dragStartRef.current = {
        clientY,
        startOffset: dragOffsets[nodeIndex] ?? 0,
      };
    },
    [dragOffsets],
  );

  const data = buildSankeyData(applications);

  if (!data) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
        <p className="text-sm text-gray-400">Not enough data to show pipeline.</p>
      </div>
    );
  }

  const height = Math.max(400, data.nodes.length * 50);
  const hovered = interactive ? hoveredNode : null;
  const offsets = interactive ? dragOffsets : {};

  return (
    <div ref={containerRef} style={{ cursor: draggingNode !== null ? "grabbing" : undefined }}>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      {interactive && (
        <p className="mb-3 text-xs text-gray-400">
          Hover to highlight flows · drag nodes vertically to reposition
        </p>
      )}
      <Sankey
        width={width}
        height={height}
        data={data}
        node={
          <SankeyNode
            hoveredNode={hovered}
            onHover={interactive ? setHoveredNode : undefined}
            dragOffsets={offsets}
            onDragStart={interactive ? startDrag : undefined}
          />
        }
        link={
          <SankeyLink
            hoveredNode={hovered}
            dragOffsets={offsets}
          />
        }
        nodePadding={36}
        nodeWidth={10}
        margin={{ top: 20, right: 160, bottom: 20, left: 20 }}
      >
        <Tooltip />
      </Sankey>
    </div>
  );
}
