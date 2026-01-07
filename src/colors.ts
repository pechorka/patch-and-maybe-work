export const COLORS = {
  background: '#2c3e50',
  panel: '#34495e',
  panelActive: '#3498db',
  text: '#ecf0f1',
  button: '#27ae60',
  buttonDisabled: '#7f8c8d',
  boardBg: '#1a252f',
  boardGrid: '#2c3e50',
  buttonIndicator: '#3498db',
  leatherPatch: '#8B4513',  // Saddle brown - leather color
  leatherPatchGlow: '#f1c40f',  // Golden yellow glow for leather patches
  player1: '#FF33B9',  // Pink/magenta for Player 1
  player2: '#4c6cff',  // Blue for Player 2
  player1Dim: '#991F6F',  // Dimmed pink for inactive P1
  player2Dim: '#2E4199',  // Dimmed blue for inactive P2
  patchColors: [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
    '#c0392b', '#9b59b6', '#e91e63', '#00bcd4', '#8bc34a',
    '#ff5722', '#795548', '#607d8b', '#673ab7', '#009688'
  ],
  ghostValid: 'rgba(46, 204, 113, 0.5)',
  ghostInvalid: 'rgba(231, 76, 60, 0.5)',
  bonus7x7: '#f1c40f',  // Gold color for 7x7 bonus
} as const;

/**
 * Get the color for a patch based on its ID.
 * Leather patches (negative IDs) return the leather color.
 * Market patches use the patchColors array.
 */
export function getPatchColor(patchId: number): string {
  if (patchId < 0) {
    return COLORS.leatherPatch;
  }
  return COLORS.patchColors[(patchId - 1) % COLORS.patchColors.length];
}

/**
 * Adjust the opacity of a hex color.
 */
export function adjustColorOpacity(color: string, opacity: number): string {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

/**
 * Get player color based on player index.
 */
export function getPlayerColor(playerIndex: 0 | 1, isActive: boolean): string {
  if (playerIndex === 0) {
    return isActive ? COLORS.player1 : COLORS.player1Dim;
  }
  return isActive ? COLORS.player2 : COLORS.player2Dim;
}

/**
 * Draw a horizontal gradient from Player 1 to Player 2 colors.
 */
export function drawPlayerGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  useDimColors: boolean = true
): void {
  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  const color1 = useDimColors ? COLORS.player1Dim : COLORS.player1;
  const color2 = useDimColors ? COLORS.player2Dim : COLORS.player2;
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
}
