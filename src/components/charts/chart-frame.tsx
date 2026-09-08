import ReactECharts from "echarts-for-react";

/** Shape of the entries ECharts hands to a tooltip `formatter` callback. */
export interface TooltipParam {
  axisValue?: string | number;
  seriesName?: string;
  name?: string;
  marker?: string;
  value: number | (number | string)[];
}

export interface ChartProps {
  title?: string;
  height?: number;
}

interface ChartFrameProps extends ChartProps {
  /** ECharts option object. */
  option: object;
  /** Optional caption rendered under the title (usage hints). */
  caption?: string;
}

/**
 * Shared title + canvas wrapper for every chart.
 * `notMerge` prevents stale option state leaking across re-renders.
 */
export function ChartFrame({
  option,
  title,
  caption,
  height = 300,
}: ChartFrameProps) {
  return (
    <div>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      )}
      {caption && <p className="mb-3 text-xs text-gray-400">{caption}</p>}
      <ReactECharts option={option} style={{ height }} notMerge />
    </div>
  );
}

/** A chart slot that renders nothing rather than an empty canvas. */
export function ChartPlaceholder({
  title,
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      )}
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
