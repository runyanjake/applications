import ReactECharts from "echarts-for-react";
import type { Application, ApplicationStatus } from "../../types/application";

interface ApplicationPipelineSankeyProps {
  applications: Application[];
  title: string;
  interactive?: boolean;
}

const NODE_COLORS: Record<string, string> = {
  "All Applications": "#6366f1",
  "Bookmarked":        "#9ca3af",
  "Applied":           "#818cf8",
  "Interviewing":      "#fbbf24",
  "Awaiting Response": "#a5b4fc",
  "In Interviews":     "#fcd34d",
  "Offered":           "#34d399",
  "Rejected":          "#f87171",
  "Ghosted":           "#a78bfa",
  "Withdrawn":         "#fb923c",
};

const N = {
  all:      "All Applications",
  bm:       "Bookmarked",
  ap:       "Applied",
  iv:       "Interviewing",
  ar:       "Awaiting Response",
  ii:       "In Interviews",
  of:       "Offered",
  re:       "Rejected",
  gh:       "Ghosted",
  wd:       "Withdrawn",
} as const;

function buildOption(apps: Application[], interactive: boolean) {
  const counts: Record<ApplicationStatus, number> = {
    bookmarked: 0, applied: 0, interviewing: 0,
    offered: 0, rejected: 0, withdrawn: 0, ghosted: 0,
  };
  for (const app of apps) counts[app.status]++;

  const appliedPlus      = apps.length - counts.bookmarked;
  const interviewingPlus = counts.interviewing + counts.offered;

  const rawLinks: [string, string, number][] = [
    [N.all, N.bm, counts.bookmarked],
    [N.all, N.ap, appliedPlus],
    [N.ap,  N.iv, interviewingPlus],
    [N.ap,  N.ar, counts.applied],
    [N.ap,  N.re, counts.rejected],
    [N.ap,  N.gh, counts.ghosted],
    [N.ap,  N.wd, counts.withdrawn],
    [N.iv,  N.of, counts.offered],
    [N.iv,  N.ii, counts.interviewing],
  ];

  const links = rawLinks
    .filter(([,, v]) => v > 0)
    .map(([source, target, value]) => ({ source, target, value }));

  if (links.length === 0) return null;

  const data = Object.values(N).map((name) => ({
    name,
    itemStyle: { color: NODE_COLORS[name] ?? "#94a3b8" },
  }));

  return {
    tooltip: { trigger: "item" },
    series: [
      {
        type: "sankey",
        layout: "none",
        draggable: interactive,
        emphasis: interactive
          ? { focus: "adjacency" }
          : { disabled: true },
        data,
        links,
        nodeWidth: 10,
        nodeGap: 24,
        lineStyle: {
          color: "source",
          opacity: 0.35,
        },
        label: {
          position: "right",
          fontSize: 12,
          color: "#374151",
        },
        levels: [
          { depth: 0, itemStyle: { borderWidth: 0 } },
          { depth: 1, itemStyle: { borderWidth: 0 } },
          { depth: 2, itemStyle: { borderWidth: 0 } },
          { depth: 3, itemStyle: { borderWidth: 0 } },
        ],
      },
    ],
  };
}

export function ApplicationPipelineSankey({
  applications,
  title,
  interactive = false,
}: ApplicationPipelineSankeyProps) {
  const option = buildOption(applications, interactive);

  if (!option) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
        <p className="text-sm text-gray-400">Not enough data to show pipeline.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      {interactive && (
        <p className="mb-3 text-xs text-gray-400">
          Hover to highlight flows · drag nodes vertically to reposition
        </p>
      )}
      <ReactECharts
        option={option}
        style={{ height: 420 }}
        notMerge
      />
    </div>
  );
}
