---
name: Charting Library — Apache ECharts
description: All charts use Apache ECharts via echarts-for-react; Recharts was fully removed. Documents component patterns and key decisions.
type: project
---

All chart components use **Apache ECharts** via `echarts-for-react`. Recharts was fully uninstalled.

**Why:** Recharts required manual workarounds for proportional time axes, didn't support Sankey dragging with live link re-routing, and ECharts has broader chart type coverage.

**How to apply:** New charts go through `ChartFrame` in `src/components/charts/chart-frame.tsx` — do not call `ReactECharts` directly, and do not re-introduce Recharts.

## Structure

- `chart-frame.tsx` — `ChartFrame` (title + caption + `ReactECharts` with `notMerge`), `ChartPlaceholder`, the `ChartProps` base (`title`, `height`) and the `TooltipParam` type for formatter callbacks
- `donut-chart.tsx` — generic categorical donut (status, company, anything)
- `status-timeline-chart.tsx` — line chart, `type: "time"` X axis
- `application-pipeline-sankey.tsx` — Sankey with an `interactive` prop
- Colours come from `src/config/theme.ts` (`STATUS_HEX`, `STATUS_BADGE`, `INTEREST_BADGE`, `SERIES_PALETTE`) — never redefine a status colour locally
- Data shaping lives in `src/utils/analytics.ts`, not in the page components

## `interactive` prop pattern (Sankey)

- `interactive` (analytics page): `draggable: true`, `emphasis.focus: "adjacency"`
- omitted (report page): `draggable: false`, `emphasis.disabled: true`

## Code splitting

ECharts is ~1.1 MB, so `/analytics` and `/report` are `React.lazy` routes in `src/app.tsx` and
`vite.config.ts` puts echarts in its own manual chunk. Keep new chart-using pages lazy.
