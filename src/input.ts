import type { Button } from './types';
import { buttons } from './renderer';

export type InputHandler = (action: string) => void;

let handler: InputHandler | null = null;

export function initInput(canvas: HTMLCanvasElement, inputHandler: InputHandler): void {
  handler = inputHandler;

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchend', handleTouch);
}

function handleClick(e: MouseEvent): void {
  const x = e.clientX;
  const y = e.clientY;
  checkHit(x, y);
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    checkHit(x, y);
  }
}

function checkHit(x: number, y: number): void {
  for (const button of buttons) {
    if (isInside(x, y, button)) {
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
