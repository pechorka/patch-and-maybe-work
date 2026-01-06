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
  patchColors: [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
    '#c0392b', '#9b59b6', '#e91e63', '#00bcd4', '#8bc34a',
    '#ff5722', '#795548', '#607d8b', '#673ab7', '#009688'
  ],
  ghostValid: 'rgba(46, 204, 113, 0.5)',
  ghostInvalid: 'rgba(231, 76, 60, 0.5)',
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
