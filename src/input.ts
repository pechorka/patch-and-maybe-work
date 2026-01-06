import type { Button } from './types';
import { buttons, getPlacementBoardLayout } from './renderer';
import { endDrag, getAppState, isDragging, startDrag, trackPositionRelease, updateDrag } from './main';
import { getAvailablePatches } from './game';
import { reflectPatch, rotatePatch } from './patches';

export function initInput(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchend', handleTouch);

  // Track position press/release handling and drag
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('mouseup', handleRelease);
  canvas.addEventListener('touchend', handleRelease);

  // Drag move handlers
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
}

function handleClick(e: MouseEvent): void {
  checkHit(e.clientX, e.clientY);
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    checkHit(touch.clientX, touch.clientY);
  }
}

function handleMouseDown(e: MouseEvent): void {
  // Check if on ghost patch for drag start
  if (isOnGhostPatch(e.clientX, e.clientY)) {
    startDrag(e.clientX, e.clientY);
    return;
  }
  checkTrackPositionHit(e.clientX, e.clientY);
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    // Check if on ghost patch for drag start
    if (isOnGhostPatch(touch.clientX, touch.clientY)) {
      startDrag(touch.clientX, touch.clientY);
      return;
    }
    checkTrackPositionHit(touch.clientX, touch.clientY);
  }
}

function handleRelease(): void {
  if (isDragging()) {
    endDrag();
    return;
  }
  trackPositionRelease();
}

function isTrackPositionButton(button: Button): boolean {
  return button.label.startsWith('Position ');
}

function checkHit(x: number, y: number): void {
  for (const button of buttons) {
    // Skip track position buttons - they're handled by press/release
    if (isTrackPositionButton(button)) {
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
    if (isInside(x, y, button) && isTrackPositionButton(button)) {
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

function handleMouseMove(e: MouseEvent): void {
  if (isDragging()) {
    updateDrag(e.clientX, e.clientY);
  }
}

function handleTouchMove(e: TouchEvent): void {
  if (isDragging() && e.touches.length > 0) {
    e.preventDefault(); // Prevent scrolling during drag
    const touch = e.touches[0];
    updateDrag(touch.clientX, touch.clientY);
  }
}

function isOnGhostPatch(screenX: number, screenY: number): boolean {
  const state = getAppState();
  if (state.screen !== 'placement' || !state.gameState || !state.placementState) {
    return false;
  }

  const layout = getPlacementBoardLayout(state.gameState);
  const placement = state.placementState;
  const patches = getAvailablePatches(state.gameState);
  const patch = patches[placement.patchIndex];
  if (!patch) return false;

  // Get transformed shape
  let shape = rotatePatch(patch.shape, placement.rotation);
  if (placement.reflected) {
    shape = reflectPatch(shape);
  }

  // Calculate bounding box of ghost patch in screen coordinates
  const patchLeft = layout.boardLeft + placement.x * layout.cellSize;
  const patchTop = layout.boardTop + placement.y * layout.cellSize;
  const patchWidth = shape[0].length * layout.cellSize;
  const patchHeight = shape.length * layout.cellSize;

  // Add padding for easier touch targeting (half a cell)
  const padding = layout.cellSize * 0.5;

  return (
    screenX >= patchLeft - padding &&
    screenX <= patchLeft + patchWidth + padding &&
    screenY >= patchTop - padding &&
    screenY <= patchTop + patchHeight + padding
  );
}
