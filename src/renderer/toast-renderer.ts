import type { Toast } from '../types';
import { font, LAYOUT, scale } from '../layout';

export function renderToasts(
  ctx: CanvasRenderingContext2D,
  toasts: Toast[],
  width: number,
  height: number,
  minDim: number
): void {
  const centerX = width / 2;
  const toastHeight = scale(minDim, LAYOUT.toast.height);
  const toastGap = scale(minDim, LAYOUT.toast.gap);
  const totalHeight = toasts.length * toastHeight + (toasts.length - 1) * toastGap;
  const startY = height / 2 - totalHeight / 2 + toastHeight / 2;

  toasts.forEach((toast, index) => {
    const y = startY + index * (toastHeight + toastGap);
    const age = Date.now() - toast.createdAt;
    const opacity = calculateToastOpacity(age);
    renderSingleToast(ctx, toast.message, centerX, y, opacity, minDim);
  });
}

function calculateToastOpacity(age: number): number {
  const FADE_START = 1500;  // Start fading at 1.5s
  const FADE_DURATION = 500;  // Fade over 0.5s

  if (age < FADE_START) return 1;
  const fadeProgress = (age - FADE_START) / FADE_DURATION;
  return Math.max(0, 1 - fadeProgress);
}

function renderSingleToast(
  ctx: CanvasRenderingContext2D,
  message: string,
  centerX: number,
  centerY: number,
  opacity: number,
  minDim: number
): void {
  // Measure text to size the background
  ctx.font = font(minDim, 'normal', 'bold');
  const textMetrics = ctx.measureText(message);
  const textWidth = textMetrics.width;
  const padding = scale(minDim, LAYOUT.toast.padding);
  const boxWidth = textWidth + padding * 2;
  const boxHeight = scale(minDim, LAYOUT.toast.height);

  // Semi-transparent dark background with rounded corners
  ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * opacity})`;
  const boxX = centerX - boxWidth / 2;
  const boxY = centerY - boxHeight / 2;
  const radius = scale(minDim, LAYOUT.toast.borderRadius);

  ctx.beginPath();
  ctx.moveTo(boxX + radius, boxY);
  ctx.lineTo(boxX + boxWidth - radius, boxY);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
  ctx.lineTo(boxX + radius, boxY + boxHeight);
  ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
  ctx.lineTo(boxX, boxY + radius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  ctx.closePath();
  ctx.fill();

  // White text with opacity
  ctx.fillStyle = `rgba(236, 240, 241, ${opacity})`;
  ctx.textAlign = 'center';
  ctx.fillText(message, centerX, centerY + scale(minDim, 0.0075));
}
