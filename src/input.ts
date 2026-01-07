import type { AppState, Button } from './types';
import { buttons, getIsScreenRotated, getCanvasDimensions } from './renderer';
import { endDrag, isDragging, isInsidePlacedPatch, selectPatch, startDrag, startOpponentBoardPreview, stopOpponentBoardPreview, trackPositionRelease, updateDrag } from './main';

/**
 * Transform coordinates when screen is rotated 180°.
 */
function transformCoords(x: number, y: number): { x: number; y: number } {
  if (getIsScreenRotated()) {
    const { width, height } = getCanvasDimensions();
    return { x: width - x, y: height - y };
  }
  return { x, y };
}

/**
 * Extract pointer coordinates from mouse or touch event.
 */
function getPointerCoords(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
  if ('clientX' in e) {
    return { x: e.clientX, y: e.clientY };
  }
  if ('touches' in e && e.touches.length > 0) {
    const touch = e.touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  if ('changedTouches' in e && e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  return null;
}

export function initInput(canvas: HTMLCanvasElement, state: AppState): void {
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchend', handleTouchEnd);

  // Track position press/release handling and drag
  canvas.addEventListener('mousedown', (e) => handlePointerDown(e, state));
  canvas.addEventListener('touchstart', (e) => handlePointerDown(e, state));
  canvas.addEventListener('mouseup', handleRelease);
  canvas.addEventListener('touchend', handleRelease);

  // Drag move handlers
  canvas.addEventListener('mousemove', handlePointerMove);
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
}

function handleClick(e: MouseEvent): void {
  const { x, y } = transformCoords(e.clientX, e.clientY);
  checkHit(x, y);
}

function handleTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  const coords = getPointerCoords(e);
  if (coords) {
    const { x, y } = transformCoords(coords.x, coords.y);
    checkHit(x, y);
  }
}

function handlePointerDown(e: MouseEvent | TouchEvent, state: AppState): void {
  const rawCoords = getPointerCoords(e);
  if (!rawCoords) return;

  const { x, y } = transformCoords(rawCoords.x, rawCoords.y);

  // On game screen, check for player panel and patch button presses
  if (state.screen === 'game') {
    // Check player panel first (tap and hold to preview opponent's board)
    if (checkPlayerPanelHit(x, y)) {
      return;
    }
    if (checkPatchButtonHit(x, y)) {
      return;
    }
  }

  // On placement screen, only start drag if clicking on the patch
  if (state.screen === 'placement') {
    if (isInsidePlacedPatch(x, y)) {
      startDrag(x, y);
    }
    return;
  }

  checkTrackPositionHit(x, y);
}

function handleRelease(): void {
  // Always stop opponent board preview on release
  stopOpponentBoardPreview();

  if (isDragging()) {
    endDrag();
    return;
  }
  trackPositionRelease();
}

function checkPlayerPanelHit(x: number, y: number): boolean {
  for (const button of buttons) {
    if (button.type === 'player-panel' && isInside(x, y, button)) {
      startOpponentBoardPreview();
      return true;
    }
  }
  return false;
}

function checkPatchButtonHit(x: number, y: number): boolean {
  for (const button of buttons) {
    if (button.type === 'patch' && isInside(x, y, button)) {
      const patchIndex = button.metadata?.patchIndex ?? 0;
      selectPatch(patchIndex, x, y);
      return true;
    }
  }
  return false;
}

function checkHit(x: number, y: number): void {
  for (const button of buttons) {
    // Only handle standard buttons - patch and track-position are handled by press/release
    if (button.type !== 'standard') {
      continue;
    }
    if (isInside(x, y, button)) {
      button.action();
      return;
    }
  }
}

function checkTrackPositionHit(x: number, y: number): void {
  for (const button of buttons) {
    if (button.type === 'track-position' && isInside(x, y, button)) {
      button.action();
      return;
    }
  }
}

function isInside(x: number, y: number, button: Button): boolean {
  return (
    x >= button.x &&
    x <= button.x + button.width &&
    y >= button.y &&
    y <= button.y + button.height
  );
}

function handlePointerMove(e: MouseEvent): void {
  if (isDragging()) {
    const { x, y } = transformCoords(e.clientX, e.clientY);
    updateDrag(x, y);
  }
}

function handleTouchMove(e: TouchEvent): void {
  if (isDragging() && e.touches.length > 0) {
    e.preventDefault(); // Prevent scrolling during drag
    const touch = e.touches[0];
    const { x, y } = transformCoords(touch.clientX, touch.clientY);
    updateDrag(x, y);
  }
}
