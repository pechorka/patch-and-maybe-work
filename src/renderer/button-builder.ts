import type { Button, ButtonMetadata, ButtonType } from '../types';
import { COLORS } from '../colors';

export interface ButtonStyle {
  fillColor?: string;
  textColor?: string;
  font?: string;
  textYOffset?: number;
}

const DEFAULT_STYLE: ButtonStyle = {
  fillColor: COLORS.panel,
  textColor: COLORS.text,
  font: 'bold 20px sans-serif',
  textYOffset: 7,
};

/**
 * Create a button with consistent styling.
 * Draws the button rectangle, text, and registers it for hit detection.
 */
export function createButton(
  ctx: CanvasRenderingContext2D,
  buttons: Button[],
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  label: string,
  action: () => void,
  type: ButtonType = 'standard',
  metadata?: ButtonMetadata,
  style: ButtonStyle = {}
): void {
  const s = { ...DEFAULT_STYLE, ...style };

  ctx.fillStyle = s.fillColor!;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = s.textColor!;
  ctx.font = s.font!;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + width / 2, y + height / 2 + s.textYOffset!);

  buttons.push({ x, y, width, height, label, action, type, metadata });
}
