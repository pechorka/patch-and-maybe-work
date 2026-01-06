import type { Button } from './types';
import { buttons } from './renderer';
import { ACTIONS } from './actions';

export type InputHandler = (action: string) => void;

let handler: InputHandler | null = null;

export function initInput(canvas: HTMLCanvasElement, inputHandler: InputHandler): void {
  handler = inputHandler;

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchend', handleTouch);

  // Track position press/release handling
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('mouseup', handleRelease);
  canvas.addEventListener('touchend', handleRelease);
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
  checkTrackPositionHit(e.clientX, e.clientY);
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    checkTrackPositionHit(touch.clientX, touch.clientY);
  }
}

function handleRelease(): void {
  handler?.(ACTIONS.TRACK_POSITION_RELEASE);
}

function checkHit(x: number, y: number): void {
  for (const button of buttons) {
    // Skip track position buttons - they're handled by press/release
    if (button.action.startsWith(ACTIONS.TRACK_POSITION + ':')) {
      continue;
    }
    if (isInside(x, y, button)) {
      handler?.(button.action);
      return;
    }
  }
}

function checkTrackPositionHit(x: number, y: number): void {
  for (const button of buttons) {
    if (isInside(x, y, button) && button.action.startsWith(ACTIONS.TRACK_POSITION + ':')) {
      handler?.(button.action);
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
