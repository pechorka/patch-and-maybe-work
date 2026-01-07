import type { ChartData, TimeSeriesPoint } from '../stats';
import { COLORS } from '../colors';
import { LAYOUT, scale, font } from '../layout';

interface LineChartOptions {
  title: string;
  yAxisLabel: string;
  getValue: (point: TimeSeriesPoint) => [number, number];
  playerNames: [string, string];
  minDim: number;
}

/**
 * Render a line chart on the canvas.
 */
export function renderLineChart(
  ctx: CanvasRenderingContext2D,
  data: TimeSeriesPoint[],
  x: number,
  y: number,
  width: number,
  height: number,
  options: LineChartOptions
): void {
  if (data.length === 0) return;

  const { minDim } = options;

  // Padding as percentages of chart dimensions
  const padding = {
    top: height * 0.14,      // ~14% of chart height
    right: width * 0.04,     // ~4% of chart width
    bottom: height * 0.17,   // ~17% of chart height
    left: width * 0.11,      // ~11% of chart width
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const chartX = x + padding.left;
  const chartY = y + padding.top;

  // Calculate data bounds
  const values = data.flatMap(p => options.getValue(p));
  const maxVal = Math.max(...values, 1); // At least 1 to avoid division by zero
  const maxTurn = data.length - 1;

  // Draw chart title
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'info', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText(options.title, x + width / 2, y + height * 0.09);

  // Draw chart background
  ctx.fillStyle = COLORS.boardBg;
  ctx.fillRect(chartX, chartY, chartWidth, chartHeight);

  // Draw grid lines
  ctx.strokeStyle = COLORS.boardGrid;
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const gy = chartY + (chartHeight * i) / gridLines;
    ctx.beginPath();
    ctx.moveTo(chartX, gy);
    ctx.lineTo(chartX + chartWidth, gy);
    ctx.stroke();

    // Y-axis labels
    const value = Math.round(maxVal - (maxVal * i) / gridLines);
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'micro');
    ctx.textAlign = 'right';
    ctx.fillText(String(value), chartX - width * 0.02, gy + height * 0.02);
  }

  // Draw X-axis label (turn numbers)
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'micro');
  ctx.textAlign = 'center';
  const xLabels = Math.min(6, maxTurn + 1);
  for (let i = 0; i < xLabels; i++) {
    const turn = Math.round((maxTurn * i) / (xLabels - 1 || 1));
    const lx = chartX + (chartWidth * turn) / (maxTurn || 1);
    ctx.fillText(String(turn), lx, chartY + chartHeight + height * 0.08);
  }

  // Draw lines for each player
  const colors = [COLORS.player1, COLORS.player2];
  const lineWidth = Math.max(1, minDim * LAYOUT.chart.lineWidth);
  const pointRadius = Math.max(2, minDim * LAYOUT.chart.pointRadius);

  for (let playerIdx = 0; playerIdx < 2; playerIdx++) {
    const color = colors[playerIdx];

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      const value = options.getValue(point)[playerIdx];
      const px = chartX + (chartWidth * point.turn) / (maxTurn || 1);
      const py = chartY + chartHeight - (chartHeight * value) / (maxVal || 1);

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Draw points
    ctx.fillStyle = color;
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      const value = options.getValue(point)[playerIdx];
      const px = chartX + (chartWidth * point.turn) / (maxTurn || 1);
      const py = chartY + chartHeight - (chartHeight * value) / (maxVal || 1);

      ctx.beginPath();
      ctx.arc(px, py, pointRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw legend
  const legendY = y + height - height * 0.04;
  const legendX1 = x + width / 2 - width * 0.2;
  const legendX2 = x + width / 2 + width * 0.05;
  const legendDotRadius = Math.max(2, minDim * 0.005);

  ctx.font = font(minDim, 'micro');
  ctx.textAlign = 'left';

  // Player 1
  ctx.fillStyle = COLORS.player1;
  ctx.beginPath();
  ctx.arc(legendX1, legendY, legendDotRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.text;
  ctx.fillText(options.playerNames[0], legendX1 + width * 0.025, legendY + height * 0.02);

  // Player 2
  ctx.fillStyle = COLORS.player2;
  ctx.beginPath();
  ctx.arc(legendX2, legendY, legendDotRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.text;
  ctx.fillText(options.playerNames[1], legendX2 + width * 0.025, legendY + height * 0.02);
}

/**
 * Render all charts for the game end screen.
 */
export function renderCharts(
  ctx: CanvasRenderingContext2D,
  chartData: ChartData,
  x: number,
  y: number,
  width: number,
  availableHeight: number,
  minDim: number
): void {
  // Chart height as percentage of available height (max 22.5% of minDim)
  const maxChartHeight = scale(minDim, LAYOUT.chart.maxHeight);
  const gap = scale(minDim, LAYOUT.chart.gap);
  const chartHeight = Math.min(maxChartHeight, (availableHeight - gap * 2) / 3);

  // Buttons chart
  renderLineChart(ctx, chartData.series, x, y, width, chartHeight, {
    title: 'Buttons Over Time',
    yAxisLabel: 'Buttons',
    getValue: (p) => p.buttons,
    playerNames: chartData.playerNames,
    minDim,
  });

  // Income chart
  renderLineChart(ctx, chartData.series, x, y + chartHeight + gap, width, chartHeight, {
    title: 'Income Over Time',
    yAxisLabel: 'Income',
    getValue: (p) => p.income,
    playerNames: chartData.playerNames,
    minDim,
  });

  // Cells filled chart
  renderLineChart(ctx, chartData.series, x, y + 2 * (chartHeight + gap), width, chartHeight, {
    title: 'Board Coverage Over Time',
    yAxisLabel: 'Cells',
    getValue: (p) => p.cellsFilled,
    playerNames: chartData.playerNames,
    minDim,
  });
}
