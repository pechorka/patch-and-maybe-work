import type { Button } from './types';
import { buttons } from './renderer';
import { endDrag, getAppState, isDragging, selectPatch, spawnPatchAt, trackPositionRelease, updateDrag } from './main';

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
  const state = getAppState();

  // On game screen, check for patch button press
  if (state.screen === 'game') {
    if (checkPatchButtonHit(e.clientX, e.clientY)) {
      return;
    }
  }

  // On placement screen, reposition patch at touch location and start drag
  if (state.screen === 'placement') {
    spawnPatchAt(e.clientX, e.clientY);
    return;
  }

  checkTrackPositionHit(e.clientX, e.clientY);
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const state = getAppState();

    // On game screen, check for patch button press
    if (state.screen === 'game') {
      if (checkPatchButtonHit(touch.clientX, touch.clientY)) {
        return;
      }
    }

    // On placement screen, reposition patch at touch location and start drag
    if (state.screen === 'placement') {
      spawnPatchAt(touch.clientX, touch.clientY);
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

function isPatchButton(button: Button): boolean {
  return button.label.startsWith('Patch ');
}

function checkPatchButtonHit(x: number, y: number): boolean {
  for (const button of buttons) {
    if (isPatchButton(button) && isInside(x, y, button)) {
      // Extract patch index from label "Patch 1" → 0
      const patchIndex = parseInt(button.label.split(' ')[1]) - 1;
      selectPatch(patchIndex, x, y);
      return true;
    }
  }
  return false;
}

function checkHit(x: number, y: number): void {
  for (const button of buttons) {
    // Skip track position buttons and patch buttons - they're handled by press/release
    if (isTrackPositionButton(button) || isPatchButton(button)) {
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


