// Shared Recharts look for every UshnaRaksha chart.
export const CHART = {
  grid: "#23262d",
  axis: "#8a8f98",
  text: "#ededef",
  brand: "#ff7a1a",
  muted: "#4b5059",
  fontSize: 12,
} as const;

export const axisTick = { fill: CHART.axis, fontSize: CHART.fontSize } as const;

export const axisProps = {
  tick: axisTick,
  axisLine: { stroke: CHART.grid },
  tickLine: false,
} as const;

export const gridProps = { stroke: CHART.grid, strokeDasharray: "3 3", vertical: false } as const;

export const tooltipProps = {
  contentStyle: {
    background: "#0c0e12",
    border: `1px solid ${CHART.grid}`,
    borderRadius: 8,
    fontSize: CHART.fontSize,
    color: CHART.text,
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  },
  labelStyle: { color: CHART.axis, fontSize: CHART.fontSize },
  itemStyle: { color: CHART.text, fontSize: CHART.fontSize },
  cursor: { stroke: CHART.grid },
} as const;
