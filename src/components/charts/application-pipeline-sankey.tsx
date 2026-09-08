import type { Application, ApplicationStatus } from "../../types/application";
import { STATUS_HEX, FALLBACK_COLOR } from "../../config/theme";
import { ChartFrame, ChartPlaceholder, type ChartProps } from "./chart-frame";

interface ApplicationPipelineSankeyProps extends ChartProps {
  applications: Application[];
  /** Enables node dragging and adjacency highlighting (analytics page). */
  interactive?: boolean;
}

/** Sankey node names, with the colour each one draws from. */
const NODES = {
  all: { name: "All Applications", color: "#6366f1" },
  bookmarked: { name: "Bookmarked", color: STATUS_HEX.bookmarked },
  applied: { name: "Applied", color: STATUS_HEX.applied },
  interviewing: { name: "Interviewing", color: STATUS_HEX.interviewing },
  awaiting: { name: "Awaiting Response", color: "#a5b4fc" },
  inInterviews: { name: "In Interviews", color: "#fcd34d" },
  offered: { name: "Offered", color: STATUS_HEX.offered },
  rejected: { name: "Rejected", color: STATUS_HEX.rejected },
  ghosted: { name: "Ghosted", color: STATUS_HEX.ghosted },
  withdrawn: { name: "Withdrawn", color: STATUS_HEX.withdrawn },
} as const;

function countByStatus(
  applications: Application[],
): Record<ApplicationStatus, number> {
  const counts: Record<ApplicationStatus, number> = {
    bookmarked: 0, applied: 0, interviewing: 0,
    offered: 0, rejected: 0, withdrawn: 0, ghosted: 0,
  };
  for (const app of applications) counts[app.status]++;
  return counts;
}

function buildOption(applications: Application[], interactive: boolean) {
  const counts = countByStatus(applications);
  const appliedPlus = applications.length - counts.bookmarked;
  const interviewingPlus = counts.interviewing + counts.offered;

  const links = (
    [
      [NODES.all, NODES.bookmarked, counts.bookmarked],
      [NODES.all, NODES.applied, appliedPlus],
      [NODES.applied, NODES.interviewing, interviewingPlus],
      [NODES.applied, NODES.awaiting, counts.applied],
      [NODES.applied, NODES.rejected, counts.rejected],
      [NODES.applied, NODES.ghosted, counts.ghosted],
      [NODES.applied, NODES.withdrawn, counts.withdrawn],
      [NODES.interviewing, NODES.offered, counts.offered],
      [NODES.interviewing, NODES.inInterviews, counts.interviewing],
    ] as const
  )
    .filter(([, , value]) => value > 0)
    .map(([source, target, value]) => ({
      source: source.name,
      target: target.name,
      value,
    }));

  if (links.length === 0) return null;

  return {
    tooltip: { trigger: "item" },
    series: [
      {
        type: "sankey",
        layout: "none",
        draggable: interactive,
        emphasis: interactive ? { focus: "adjacency" } : { disabled: true },
        data: Object.values(NODES).map((node) => ({
          name: node.name,
          // borderWidth 0 replaces the per-depth `levels` overrides
          itemStyle: { color: node.color ?? FALLBACK_COLOR, borderWidth: 0 },
        })),
        links,
        nodeWidth: 10,
        nodeGap: 24,
        lineStyle: { color: "source", opacity: 0.35 },
        label: { position: "right", fontSize: 12, color: "#374151" },
      },
    ],
  };
}

export function ApplicationPipelineSankey({
  applications,
  title,
  height = 420,
  interactive = false,
}: ApplicationPipelineSankeyProps) {
  const option = buildOption(applications, interactive);

  if (!option) {
    return (
      <ChartPlaceholder
        title={title}
        message="Not enough data to show pipeline."
      />
    );
  }

  return (
    <ChartFrame
      option={option}
      title={title}
      height={height}
      caption={
        interactive
          ? "Hover to highlight flows · drag nodes vertically to reposition"
          : undefined
      }
    />
  );
}
