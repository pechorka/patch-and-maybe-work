# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` - Start development server
- `pnpm build` - Type-check and build for production (outputs to `dist/`)
- `pnpm preview` - Preview production build locally

## Architecture

Patchwork is a 2-player board game implementation using vanilla TypeScript and HTML5 Canvas. No framework or game engine - all rendering is done directly on canvas.

## Code Style

- Always log errors with `console.error()` - never silently ignore them in catch blocks
- **No global variables**: Never use module-level mutable state. All functions should be pure - receive values through arguments and return results. State should be owned by `main.ts` and passed explicitly to other modules.

## UI/Layout Rules

- **No layout shifts**: If the same element (e.g., board, panels) appears on different screens, it must maintain the same position and size. This prevents jarring visual jumps during screen transitions.
- **Percentage-based sizing**: All layout dimensions (element sizes, gaps, margins, font sizes) must be expressed as percentages of `minDim = Math.min(screenWidth, screenHeight)`. Never use hardcoded pixel values. Use constants from `src/layout.ts`.
