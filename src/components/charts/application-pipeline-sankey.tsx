import { useRef, useState, useEffect } from "react";
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

/**
 * Pipeline: bookmarked → applied → interviewing → complete
 * Complete (terminal): offered, rejected, ghosted, withdrawn
 */
function buildSankeyData(apps: Application[]) {
  const counts: Record<ApplicationStatus, number> = {
    bookmarked: 0,
    applied: 0,
    interviewing: 0,
    offered: 0,
    rejected: 0,
    withdrawn: 0,
    ghosted: 0,
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

function SankeyNode({ x, y, width, height, index, payload, hoveredNode, onHover }: any) {
  const name = payload?.name ?? "";
  const value = payload?.value ?? 0;
  const color = NODE_COLORS[name] ?? "#94a3b8";
  const dimmed = hoveredNode !== null && hoveredNode !== index;

  return (
    <Layer
      onMouseEnter={onHover ? () => onHover(index) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={dimmed ? 0.2 : 0.9}
        style={onHover ? { cursor: "pointer" } : undefined}
      />
      {height > 14 && (
        <text
          x={x + width + 6}
          y={y + height / 2}
          textAnchor="start"
          dominantBaseline="central"
          fontSize={12}
          fill={dimmed ? "#d1d5db" : "#374151"}
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
  linkWidth, payload, hoveredNode,
}: any) {
  // d3-sankey mutates source/target from indices to node objects
  const srcIdx = typeof payload?.source === "object" ? payload?.source?.index : payload?.source;
  const tgtIdx = typeof payload?.target === "object" ? payload?.target?.index : payload?.target;
  const connected = hoveredNode === null || srcIdx === hoveredNode || tgtIdx === hoveredNode;
  const opacity = hoveredNode === null ? 0.3 : connected ? 0.65 : 0.04;

  return (
    <Layer>
      <path
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={linkWidth}
        strokeOpacity={opacity}
        style={{ transition: "stroke-opacity 0.12s ease" }}
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const data = buildSankeyData(applications);

  if (!data) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
        <p className="text-sm text-gray-400">Not enough data to show pipeline.</p>
      </div>
    );
  }

  // Scale height so nodes have breathing room
  const height = Math.max(400, data.nodes.length * 50);
  const onHover = interactive ? setHoveredNode : undefined;
  const hovered = interactive ? hoveredNode : null;

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      <Sankey
        width={width}
        height={height}
        data={data}
        node={<SankeyNode hoveredNode={hovered} onHover={onHover} />}
        link={<SankeyLink hoveredNode={hovered} />}
        nodePadding={36}
        nodeWidth={10}
        margin={{ top: 20, right: 160, bottom: 20, left: 20 }}
      >
        <Tooltip />
      </Sankey>
    </div>
  );
}
