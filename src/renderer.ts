import type { AppState, Button, GameState, Shape } from './types';
import { getCurrentPlayerIndex } from './game';
import { COLORS } from './colors';
import { getMinDim, getBoardLayout } from './layout';
import { renderSetupScreen } from './renderer/screens/setup-renderer';
import { renderAdminTestScreen } from './renderer/screens/admin-renderer';
import { renderGameScreen } from './renderer/screens/game-renderer';
import { renderPlacementScreen } from './renderer/screens/placement-renderer';
import { renderGameEndScreen } from './renderer/screens/game-end-renderer';
import { renderMapViewScreen, setTappedTrackPosition as setTappedTrackPos, clearTappedTrackPosition as clearTappedTrackPos } from './renderer/screens/map-view-renderer';
import { renderBoardPreview } from './renderer/screens/board-preview-renderer';
import { renderToasts } from './renderer/toast-renderer';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number;
let height: number;
let minDim: number;

// Store button positions for hit detection
export let buttons: Button[] = [];

// Board layout info for coordinate calculations
export interface BoardLayout {
  boardLeft: number;
  boardTop: number;
  boardSize: number;     // pixels
  cellSize: number;
  boardCells: number;    // 7, 9, or 11
}

export function getPlacementBoardLayout(gameState: GameState): BoardLayout {
  const layout = getBoardLayout(width, height, gameState.boardSize);
  return {
    boardLeft: layout.boardLeft,
    boardTop: layout.boardTop,
    boardSize: layout.boardSize,
    cellSize: layout.cellSize,
    boardCells: layout.boardCells,
  };
}

/**
 * Convert screen coordinates to cell coordinates.
 */
export function screenToCellCoords(
  screenX: number,
  screenY: number,
  layout: BoardLayout
): { cellX: number; cellY: number } {
  return {
    cellX: (screenX - layout.boardLeft) / layout.cellSize,
    cellY: (screenY - layout.boardTop) / layout.cellSize,
  };
}

/**
 * Calculate the cell position to center a shape on a given cell coordinate.
 */
export function centerShapeOnCell(
  cellX: number,
  cellY: number,
  shape: Shape
): { x: number; y: number } {
  return {
    x: Math.round(cellX - shape[0].length / 2),
    y: Math.round(cellY - shape.length / 2),
  };
}

// Re-export map view functions for main.ts
export function setTappedTrackPosition(pos: number | null): void {
  setTappedTrackPos(pos);
}

export function clearTappedTrackPosition(): void {
  clearTappedTrackPos();
}

export function initRenderer(canvasElement: HTMLCanvasElement): void {
  canvas = canvasElement;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2D context');
  ctx = context;

  resize();
  window.addEventListener('resize', resize);
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  minDim = getMinDim(width, height);

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.scale(dpr, dpr);
}

function ctxTransaction(body: () => void): void {
  ctx.save();
  body();
  ctx.restore();
}

// Track if current render is rotated (for input coordinate transformation)
let isScreenRotated = false;

export function getIsScreenRotated(): boolean {
  return isScreenRotated;
}

export function getCanvasDimensions(): { width: number; height: number } {
  return { width, height };
}

export function render(state: AppState): void {
  buttons = [];

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // Determine if screen should be rotated (face-to-face mode + player 2's turn + game/placement screen)
  const shouldRotate = state.faceToFaceMode &&
    (state.screen === 'game' || state.screen === 'placement') &&
    state.gameState !== null &&
    getCurrentPlayerIndex(state.gameState) === 1;

  isScreenRotated = shouldRotate;

  // Render the screen with optional rotation
  let screenButtons: Button[] = [];

  if (shouldRotate) {
    // Apply rotation transform
    ctxTransaction(() => {
      ctx.translate(width / 2, height / 2);
      ctx.rotate(Math.PI);
      ctx.translate(-width / 2, -height / 2);

      screenButtons = renderScreen(state);
    });
    // Transform button positions for rotated screen
    buttons = transformButtonsForRotation(screenButtons, width, height);
  } else {
    // Render without rotation
    screenButtons = renderScreen(state);
    buttons = screenButtons;
  }

  // Render toast overlay (on top of everything, not rotated)
  if (state.toasts.length > 0) {
    renderToasts(ctx, state.toasts, width, height, minDim);
  }
}

function renderScreen(state: AppState): Button[] {
  switch (state.screen) {
    case 'setup':
      return renderSetupScreen(ctx, state, width, height, minDim);
    case 'adminTest':
      return renderAdminTestScreen(ctx, state, width, height, minDim);
    case 'game':
      return renderGameScreen(ctx, state, width, height, minDim);
    case 'placement':
      return renderPlacementScreen(ctx, state, width, height, minDim);
    case 'gameEnd':
      return renderGameEndScreen(ctx, state, width, height, minDim);
    case 'mapView':
      return renderMapViewScreen(ctx, state, width, height, minDim);
    case 'boardPreview':
      return renderBoardPreview(ctx, state, width, height, minDim);
    default:
      return [];
  }
}

function transformButtonsForRotation(originalButtons: Button[], screenWidth: number, screenHeight: number): Button[] {
  // When screen is rotated 180°, button positions need to be transformed
  return originalButtons.map(button => ({
    ...button,
    x: screenWidth - button.x - button.width,
    y: screenHeight - button.y - button.height,
  }));
}
