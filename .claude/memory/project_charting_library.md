---
name: Charting Library — Apache ECharts
description: All charts use Apache ECharts via echarts-for-react; Recharts was fully removed. Documents component patterns and key decisions.
type: project
---

All chart components were migrated from Recharts to **Apache ECharts** via the `echarts-for-react` package (`ReactECharts` component). Recharts was fully uninstalled.

**Why:** Recharts required manual workarounds for proportional time axes, didn't support Sankey dragging with live link re-routing, and ECharts has broader chart type coverage for future exploration.

**How to apply:** When adding new charts or modifying existing ones, always use `echarts-for-react` and the ECharts `option` object pattern. Do not re-introduce Recharts.

## Standard component pattern

```ts
import ReactECharts from "echarts-for-react";

const option = { /* ECharts option object */ };
return <ReactECharts option={option} style={{ height }} notMerge />;
```

Always pass `notMerge` to prevent stale option merging on re-render.

## Chart components and locations

- `src/components/charts/applications-timeline-chart.tsx` — line chart, `type: "time"` X axis
- `src/components/charts/application-pipeline-sankey.tsx` — Sankey diagram with `interactive` prop
- `src/components/charts/status-distribution-chart.tsx` — donut pie
- `src/components/charts/remote-distribution-chart.tsx` — donut pie
- `src/components/charts/interest-distribution-chart.tsx` — vertical bar
- `src/components/charts/top-companies-chart.tsx` — horizontal bar
- `src/components/charts/salary-range-chart.tsx` — horizontal grouped bar

## `interactive` prop pattern (Sankey)

`ApplicationPipelineSankey` accepts `interactive?: boolean`:
- `interactive={true}` (analytics page): `draggable: true`, `emphasis.focus: "adjacency"` — nodes can be repositioned, selected node highlights its full path
- `interactive` omitted / false (report page): `draggable: false`, `emphasis.disabled: true`

## Timeline data — event-based points only

`buildTimelineData` in `analytics-page.tsx` emits one data point per unique timestamp (when a status actually changes), not on a fixed interval. This is O(n log n) via sort + streaming delta. Each point is `{ ts: string } & Record<ApplicationStatus, number>`.
