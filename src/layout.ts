/**
 * Centralized layout configuration.
 * All sizes are expressed as percentages of minDim = Math.min(width, height).
 */

// Base unit for all sizing
export function getMinDim(width: number, height: number): number {
  return Math.min(width, height);
}

// Size constants as percentages of minDim
export const LAYOUT = {
  // Panels
  panelHeight: 0.10,           // 80px on 800px → 10%
  patchPanelHeight: 0.125,     // 100px on 800px → 12.5%

  // Board
  boardPadding: 0.05,          // 40px margin → 5%
  boardBorderWidth: 0.0075,    // 6px border → ~0.75%

  // Buttons
  buttonHeight: {
    large: 0.075,              // 60px → 7.5%
    medium: 0.0625,            // 50px → 6.25%
    small: 0.05,               // 40px → 5%
  },
  buttonWidth: {
    large: 0.25,               // 200px on 800 → 25%
    medium: 0.20,              // 160px → 20%
    small: 0.1875,             // 150px → 18.75%
  },

  // Gaps/Spacing
  gap: {
    large: 0.025,              // 20px → 2.5%
    medium: 0.0125,            // 10px → 1.25%
    small: 0.00625,            // 5px → 0.625%
  },

  // Font sizes as % of minDim
  fontSize: {
    title: 0.06,               // 48px on 800 → 6%
    heading: 0.045,            // 36px → 4.5%
    large: 0.03,               // 24px → 3%
    button: 0.025,             // 20px → 2.5%
    normal: 0.0225,            // 18px → 2.25%
    small: 0.02,               // 16px → 2%
    info: 0.0175,              // 14px → 1.75%
    tiny: 0.015,               // 12px → 1.5%
    micro: 0.0125,             // 10px → 1.25%
  },

  // Checkbox
  checkbox: {
    size: 0.0375,              // 30px → 3.75%
    firstPlayer: {
      width: 0.10,             // 80px → 10%
      height: 0.05,            // 40px → 5%
    },
  },

  // Name buttons on setup screen
  nameButton: {
    width: 0.20,               // 160px → 20%
    height: 0.05,              // 40px → 5%
    gap: 0.025,                // 20px → 2.5%
  },

  // Map view
  map: {
    trackRadius: 0.18,
    patchRingRadius: 0.42,
    trackLineWidth: 0.025,     // 20px → 2.5%
    playerTokenRadius: 0.02,   // 16px → 2%
    hitRadius: 0.0225,         // 18px → 2.25%
    positionMarkerRadius: 0.00375, // 3px → 0.375%
    incomeCheckpointRadius: 0.01, // 8px → 1%
    leatherPatchSize: 0.0175,  // 14px → 1.75%
  },

  // Charts
  chart: {
    maxHeight: 0.225,          // 180px → 22.5%
    gap: 0.01875,              // 15px → 1.875%
    padding: {
      top: 0.03125,            // 25px → 3.125%
      right: 0.01875,          // 15px → 1.875%
      bottom: 0.0375,          // 30px → 3.75%
      left: 0.05625,           // 45px → 5.625%
    },
    titleFontSize: 0.0175,     // 14px → 1.75%
    labelFontSize: 0.0125,     // 10px → 1.25%
    legendFontSize: 0.01375,   // 11px → 1.375%
    lineWidth: 0.0025,         // 2px → 0.25%
    pointRadius: 0.00375,      // 3px → 0.375%
  },

  // Toast notifications
  toast: {
    height: 0.0625,            // 50px → 6.25%
    gap: 0.0125,               // 10px → 1.25%
    padding: 0.025,            // 20px → 2.5%
    borderRadius: 0.0125,      // 10px → 1.25%
  },

  // Score panel (game end screen)
  scorePanel: {
    width: 0.375,              // 300px on 800 → 37.5%
    height: 0.075,             // 60px → 7.5%
    gap: 0.0875,               // 70px → 8.75%
  },

  // Tab buttons (game end screen)
  tab: {
    width: 0.15,               // 120px → 15%
    height: 0.05,              // 40px → 5%
    gap: 0.0125,               // 10px → 1.25%
  },

  // Admin test screen
  admin: {
    buttonWidth: 0.50,         // 400px max on 800 → 50%
    buttonHeight: 0.075,       // 60px → 7.5%
    buttonGap: 0.01875,        // 15px → 1.875%
  },

  // Cell rendering (relative to cell size)
  cell: {
    padding: 0.02,             // 2px of cell → 2%
    strokeWidth: 0.02,         // ~1px on small cells
  },

  // Patch display
  patch: {
    maxCellSize: 0.05,         // 40px → 5%
    minCellSize: 0.025,        // 20px → 2.5%
  },
} as const;

// Type for fontSize keys
export type FontSizeKey = keyof typeof LAYOUT.fontSize;

/**
 * Calculate scaled value from percentage.
 */
export function scale(minDim: number, percentage: number): number {
  return Math.round(minDim * percentage);
}

/**
 * Calculate font string from size key.
 */
export function font(minDim: number, sizeKey: FontSizeKey, weight: 'normal' | 'bold' = 'normal'): string {
  const size = Math.round(minDim * LAYOUT.fontSize[sizeKey]);
  return `${weight} ${size}px sans-serif`;
}

/**
 * Calculate font string from raw percentage.
 */
export function fontRaw(minDim: number, percentage: number, weight: 'normal' | 'bold' = 'normal'): string {
  const size = Math.round(minDim * percentage);
  return `${weight} ${size}px sans-serif`;
}

export interface BoardLayoutResult {
  boardLeft: number;
  boardTop: number;
  boardSize: number;
  cellSize: number;
  boardCells: number;
}

/**
 * Get board layout with relative calculations.
 * Used by game screen and placement screen.
 */
export function getBoardLayout(width: number, height: number, boardCells: number): BoardLayoutResult {
  const minDim = getMinDim(width, height);
  const panelHeight = scale(minDim, LAYOUT.panelHeight);
  const patchPanelHeight = scale(minDim, LAYOUT.patchPanelHeight);
  const buttonArea = scale(minDim,
    LAYOUT.buttonHeight.medium +      // skip button
    LAYOUT.buttonHeight.small +       // map button
    LAYOUT.gap.large * 3              // gaps
  );

  const boardTop = panelHeight + scale(minDim, LAYOUT.gap.large);
  const reservedBottom = patchPanelHeight + buttonArea;
  const availableHeight = height - boardTop - reservedBottom;
  const availableWidth = width - scale(minDim, LAYOUT.boardPadding * 2);

  const boardSize = Math.min(availableWidth, availableHeight);
  const boardLeft = (width - boardSize) / 2;
  const cellSize = boardSize / boardCells;

  return { boardLeft, boardTop, boardSize, cellSize, boardCells };
}
