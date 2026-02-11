import { useRef, useState, useEffect } from "react";
import { Sankey, Tooltip, Layer, Rectangle } from "recharts";
import type { Application, ApplicationStatus } from "../../types/application";

interface ApplicationPipelineSankeyProps {
  applications: Application[];
  title: string;
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
 *
 * Depth assignments for funnel calculation:
 *   bookmarked: 0, applied: 1, interviewing: 2
 *   Terminal exits assumed from: rejected/ghosted/withdrawn → applied (depth 1),
 *   offered → interviewing (depth 2)
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

  // Nodes indexed 0-9
  const nodes = [
    { name: "All Applications" },   // 0
    { name: "Bookmarked" },          // 1  (pre-interview, not yet applied)
    { name: "Applied" },             // 2  (reached applied stage)
    { name: "Interviewing" },        // 3  (reached interviewing)
    { name: "Awaiting Response" },   // 4  (still at "applied" — waiting)
    { name: "In Interviews" },       // 5  (still at "interviewing")
    { name: "Offered" },             // 6  (terminal — got an offer)
    { name: "Rejected" },            // 7  (terminal)
    { name: "Ghosted" },             // 8  (terminal)
    { name: "Withdrawn" },           // 9  (terminal)
  ];

  const links: { source: number; target: number; value: number }[] = [];
  const push = (s: number, t: number, v: number) => {
    if (v > 0) links.push({ source: s, target: t, value: v });
  };

  const total = apps.length;
  // Apps that reached "applied" or beyond
  const appliedPlus = total - counts.bookmarked;
  // Apps that reached "interviewing" or beyond (offered is terminal from interviewing)
  const interviewingPlus = counts.interviewing + counts.offered;

  // All → branches
  push(0, 1, counts.bookmarked);     // stayed at bookmarked
  push(0, 2, appliedPlus);           // progressed to applied+

  // Applied → branches
  push(2, 3, interviewingPlus);      // progressed to interviews
  push(2, 4, counts.applied);        // still awaiting response
  push(2, 7, counts.rejected);       // rejected at application
  push(2, 8, counts.ghosted);        // ghosted after applying
  push(2, 9, counts.withdrawn);      // withdrew

  // Interviewing → branches
  push(3, 6, counts.offered);        // got an offer (terminal)
  push(3, 5, counts.interviewing);   // still in interviews

  if (links.length === 0) return null;

  return { nodes, links };
}

function SankeyNode({ x, y, width, height, index, payload }: any) {
  const name = payload?.name ?? "";
  const value = payload?.value ?? 0;
  const color = NODE_COLORS[name] ?? "#94a3b8";
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.9} />
      {height > 14 && (
        <text
          x={x + width + 6}
          y={y + height / 2}
          textAnchor="start"
          dominantBaseline="central"
          className="text-xs fill-gray-700"
        >
          {name} ({value})
        </text>
      )}
    </Layer>
  );
}

function SankeyLink({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth }: any) {
  return (
    <Layer>
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={linkWidth}
        strokeOpacity={0.3}
      />
    </Layer>
  );
}

export function ApplicationPipelineSankey({
  applications,
  title,
}: ApplicationPipelineSankeyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
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

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      <Sankey
        width={width}
        height={400}
        data={data}
        node={<SankeyNode />}
        link={<SankeyLink />}
        nodePadding={24}
        nodeWidth={10}
        margin={{ top: 20, right: 160, bottom: 20, left: 20 }}
      >
        <Tooltip />
      </Sankey>
    </div>
  );
}
