import type { AppState, Button, GameState, Patch, Shape } from '../../types';
import { COLORS, getPlayerColor, getPatchColor, adjustColorOpacity } from '../../colors';
import { font, LAYOUT, scale, getBoardLayout } from '../../layout';
import { getCurrentPlayerIndex, getAvailablePatches } from '../../game';
import { closeMapView, trackPosition } from '../../main';

// Module-level variable to track last tapped position
let lastTappedTrackPos: number | null = null;

export function setTappedTrackPosition(pos: number | null): void {
  lastTappedTrackPos = pos;
}

export function clearTappedTrackPosition(): void {
  lastTappedTrackPos = null;
}

export function renderMapViewScreen(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  width: number,
  height: number,
  minDim: number
): Button[] {
  const buttons: Button[] = [];

  if (!state.gameState) return buttons;

  const game = state.gameState;
  const currentPlayerIdx = getCurrentPlayerIndex(game);
  const centerX = width / 2;
  const centerY = height / 2;

  // Fill background with current player's color
  ctx.fillStyle = getPlayerColor(currentPlayerIdx as 0 | 1, false);
  ctx.fillRect(0, 0, width, height);

  // Calculate dimensions based on screen size
  const trackRadius = scale(minDim, LAYOUT.map.trackRadius);
  const patchRingRadius = scale(minDim, LAYOUT.map.patchRingRadius);

  // Draw square background behind the patch ring area
  const bgPadding = scale(minDim, 0.075);
  const bgSize = patchRingRadius * 2 + bgPadding;
  ctx.fillStyle = COLORS.boardBg;
  ctx.fillRect(centerX - bgSize / 2, centerY - bgSize / 2, bgSize, bgSize);

  // Render circular time track in center
  renderCircularTimeTrack(ctx, game, centerX, centerY, trackRadius, minDim, buttons);

  // Render patches arranged in a circle around the track
  const innerRadius = trackRadius + scale(minDim, 0.0625);
  renderPatchRing(ctx, game, centerX, centerY, innerRadius, patchRingRadius, minDim);

  // Toggle map button (same position as game screen)
  const layout = getBoardLayout(width, height, game.boardSize);
  const { boardLeft, boardSize } = layout;
  const skipBtnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
  const skipBtnY = height - skipBtnHeight - scale(minDim, LAYOUT.gap.large);

  const mapBtnHeight = scale(minDim, LAYOUT.buttonHeight.small);
  const mapBtnGap = scale(minDim, LAYOUT.gap.medium);
  const mapBtnX = boardLeft;
  const mapBtnY = skipBtnY - mapBtnHeight - mapBtnGap;
  const mapBtnWidth = boardSize;

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(mapBtnX, mapBtnY, mapBtnWidth, mapBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'info', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('TOGGLE MAP', mapBtnX + mapBtnWidth / 2, mapBtnY + mapBtnHeight / 2 + scale(minDim, 0.00625));

  buttons.push({
    x: mapBtnX, y: mapBtnY, width: mapBtnWidth, height: mapBtnHeight,
    label: 'Toggle Map',
    action: closeMapView,
    type: 'standard',
  });

  return buttons;
}

function renderCircularTimeTrack(
  ctx: CanvasRenderingContext2D,
  game: GameState,
  centerX: number,
  centerY: number,
  radius: number,
  minDim: number,
  buttons: Button[]
): void {
  const trackLength = game.timeTrackLength;
  const currentPlayerIdx = getCurrentPlayerIndex(game);
  const currentPlayerPos = game.players[currentPlayerIdx].position;

  // Draw track circle background
  ctx.strokeStyle = COLORS.boardGrid;
  ctx.lineWidth = scale(minDim, LAYOUT.map.trackLineWidth);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw position markers around the circle and register clickable areas
  const hitRadius = scale(minDim, LAYOUT.map.hitRadius);
  const positionMarkerRadius = scale(minDim, LAYOUT.map.positionMarkerRadius);

  for (let pos = 0; pos <= trackLength; pos++) {
    const angle = (pos / trackLength) * Math.PI * 2 - Math.PI / 2; // Start from top

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    // Draw regular position marker (small dot)
    ctx.fillStyle = COLORS.text;
    ctx.beginPath();
    ctx.arc(x, y, positionMarkerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Register clickable area for this position
    buttons.push({
      x: x - hitRadius,
      y: y - hitRadius,
      width: hitRadius * 2,
      height: hitRadius * 2,
      label: `Position ${pos}`,
      action: () => trackPosition(pos),
      type: 'track-position',
      metadata: { trackPosition: pos },
    });
  }

  // Draw markers BETWEEN cells (at position + 0.5)
  // Income checkpoints
  const incomeCheckpointRadius = scale(minDim, LAYOUT.map.incomeCheckpointRadius);
  for (const incomePos of game.incomePositions) {
    const angle = ((incomePos + 0.5) / trackLength) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    ctx.fillStyle = COLORS.buttonIndicator;
    ctx.beginPath();
    ctx.arc(x, y, incomeCheckpointRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Leather patches (uncollected only)
  const leatherPatchSize = scale(minDim, LAYOUT.map.leatherPatchSize);
  for (const lp of game.leatherPatches) {
    if (lp.collected) continue;
    const angle = ((lp.position + 0.5) / trackLength) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    ctx.fillStyle = COLORS.leatherPatch;
    ctx.fillRect(x - leatherPatchSize / 2, y - leatherPatchSize / 2, leatherPatchSize, leatherPatchSize);
  }

  // Draw player tokens
  const playerTokenRadius = scale(minDim, LAYOUT.map.playerTokenRadius);
  const tokenOffset = playerTokenRadius;
  for (let i = 0; i < 2; i++) {
    const player = game.players[i];
    const pos = Math.min(player.position, trackLength);
    const angle = (pos / trackLength) * Math.PI * 2 - Math.PI / 2;

    // Offset tokens if players on same position
    const samePos = game.players[0].position === game.players[1].position;
    const offset = samePos ? (i === 0 ? -tokenOffset : tokenOffset) : 0;
    const tokenRadiusPos = radius + offset;

    const x = centerX + Math.cos(angle) * tokenRadiusPos;
    const y = centerY + Math.sin(angle) * tokenRadiusPos;

    // Draw player token (colored circle)
    ctx.fillStyle = i === 0 ? COLORS.player1 : COLORS.player2;
    ctx.beginPath();
    ctx.arc(x, y, playerTokenRadius, 0, Math.PI * 2);
    ctx.fill();

    // Player number inside token
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'info', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x, y + scale(minDim, 0.00625));
  }

  // Draw track info in center
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';

  if (lastTappedTrackPos !== null) {
    // Show distance from current player to tapped position
    const distance = lastTappedTrackPos - currentPlayerPos;
    const distanceText = distance > 0 ? `+${distance}` : String(distance);
    ctx.font = font(minDim, 'large', 'bold');
    ctx.fillText(distanceText, centerX, centerY - scale(minDim, 0.0025));
    ctx.font = font(minDim, 'tiny');
    ctx.fillText('spaces', centerX, centerY + scale(minDim, LAYOUT.gap.large));
  } else {
    // Show track length
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.fillText(`${trackLength}`, centerX, centerY - scale(minDim, 0.005));
    ctx.font = font(minDim, 'tiny');
    ctx.fillText('spaces', centerX, centerY + scale(minDim, LAYOUT.gap.large));
  }
}

function renderPatchRing(
  ctx: CanvasRenderingContext2D,
  game: GameState,
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  minDim: number
): void {
  const patches = game.patches;
  const patchCount = patches.length;

  if (patchCount === 0) return;

  const availablePatches = getAvailablePatches(game);
  const availablePatchIds = new Set(availablePatches.map(p => p.id));

  // Calculate cell size based on patch count (relative to radius difference)
  const maxCellSize = Math.min(scale(minDim, 0.03125), (outerRadius - innerRadius) * 0.4);

  for (let i = 0; i < patchCount; i++) {
    const angle = (i / patchCount) * Math.PI * 2 - Math.PI / 2; // Start from top
    const patchRadius = (innerRadius + outerRadius) / 2;

    const x = centerX + Math.cos(angle) * patchRadius;
    const y = centerY + Math.sin(angle) * patchRadius;

    const patch = patches[i];
    const isAvailable = availablePatchIds.has(patch.id);
    const availableIndex = isAvailable ? availablePatches.findIndex(p => p.id === patch.id) : -1;

    renderPatchInRing(ctx, patch, x, y, maxCellSize, isAvailable, availableIndex, minDim);
  }

  // Draw market position indicator (arrow pointing to first available)
  if (patchCount > 0) {
    const marketAngle = (game.marketPosition / patchCount) * Math.PI * 2 - Math.PI / 2;
    const markerOffset = scale(minDim, 0.01875);
    const markerRadius = innerRadius - markerOffset;
    const mx = centerX + Math.cos(marketAngle) * markerRadius;
    const my = centerY + Math.sin(marketAngle) * markerRadius;

    // Draw arrow pointing outward (size relative to minDim)
    const arrowSize = scale(minDim, 0.01);
    ctx.fillStyle = COLORS.button;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(marketAngle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -arrowSize);
    ctx.lineTo(arrowSize * 0.75, arrowSize * 0.5);
    ctx.lineTo(-arrowSize * 0.75, arrowSize * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function getFilledCells(shape: Shape): {row: number, col: number}[] {
  const cells: {row: number, col: number}[] = [];
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) cells.push({row, col});
    }
  }
  return cells;
}

function drawButtonIndicators(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  buttonIncome: number,
  startX: number,
  startY: number,
  cellSize: number
): void {
  if (buttonIncome === 0) return;
  const cells = getFilledCells(shape);
  const indicatorCells = cells.slice(0, buttonIncome);

  ctx.fillStyle = COLORS.buttonIndicator;
  const radius = cellSize * 0.25; // 25% of cell size
  for (const {row, col} of indicatorCells) {
    const cx = startX + col * cellSize + cellSize / 2;
    const cy = startY + row * cellSize + cellSize / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderPatchInRing(
  ctx: CanvasRenderingContext2D,
  patch: Patch,
  centerX: number,
  centerY: number,
  maxCellSize: number,
  isAvailable: boolean,
  availableIndex: number,
  minDim: number
): void {
  const shape = patch.shape;
  const patchHeight = shape.length;
  const patchWidth = shape[0].length;

  // Scale cell size to fit patch
  const cellSize = Math.min(maxCellSize, maxCellSize / Math.max(patchWidth, patchHeight) * 2);
  const cellPadding = Math.max(1, cellSize * 0.1);

  const startX = centerX - (patchWidth * cellSize) / 2;
  const startY = centerY - (patchHeight * cellSize) / 2;

  // Highlight available patches
  if (isAvailable) {
    const highlightPadding = scale(minDim, 0.005);
    const highlightTopPadding = scale(minDim, 0.015);
    ctx.strokeStyle = COLORS.button;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      startX - highlightPadding,
      startY - highlightTopPadding,
      patchWidth * cellSize + highlightPadding * 2,
      patchHeight * cellSize + highlightTopPadding + scale(minDim, 0.015)
    );

    // Show availability number (1, 2, or 3)
    ctx.fillStyle = COLORS.button;
    ctx.font = font(minDim, 'micro', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(availableIndex + 1), centerX, startY - scale(minDim, 0.00375));
  }

  // Draw patch cells
  const patchColor = getPatchColor(patch.id);
  ctx.fillStyle = isAvailable ? patchColor : adjustColorOpacity(patchColor, 0.4);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        ctx.fillRect(
          startX + col * cellSize + cellPadding,
          startY + row * cellSize + cellPadding,
          cellSize - cellPadding * 2,
          cellSize - cellPadding * 2
        );
      }
    }
  }

  // Draw button indicators for income
  if (patch.buttonIncome > 0) {
    drawButtonIndicators(ctx, shape, patch.buttonIncome, startX, startY, cellSize);
  }

  // Cost info below patch (compact)
  ctx.fillStyle = isAvailable ? COLORS.text : adjustColorOpacity(COLORS.text, 0.5);
  ctx.font = font(minDim, 'micro');
  ctx.textAlign = 'center';
  ctx.fillText(`${patch.buttonCost}/${patch.timeCost}`, centerX, startY + patchHeight * cellSize + scale(minDim, 0.01));
}
