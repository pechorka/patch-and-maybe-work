# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` - Start development server
- `pnpm build` - Type-check and build for production (outputs to `dist/`)
- `pnpm preview` - Preview production build locally

## Architecture

Patchwork is a 2-player board game implementation using vanilla TypeScript and HTML5 Canvas. No framework or game engine - all rendering is done directly on canvas.

### Screen State Machine

The app uses a simple state machine with four screens:
- `setup` → `game` → `placement` → `game` (loop until game ends) → `gameEnd` → `setup`

### Source Files

- **main.ts**: Entry point. Manages `AppState`, handles all user actions via string-based action dispatch (`"selectPatch:0"`, `"moveLeft"`, etc.), runs the game loop
- **game.ts**: Pure game logic. Turn order (player behind on time track goes next), buying patches, skip-ahead mechanics, scoring
- **renderer.ts**: All canvas drawing. Exports `buttons` array for hit detection. Each screen has its own render function
- **input.ts**: Touch/click handler. Checks button hits against exported `buttons` array from renderer
- **patches.ts**: Patch shape definitions (15 pieces). Includes rotation utility
- **types.ts**: TypeScript interfaces for game state, players, patches, buttons

### Key Patterns

- **Action strings**: Input triggers actions like `"selectPatch:2"` or `"rotate"` which are parsed in `handleAction()`
- **Button hit detection**: Renderer populates `buttons` array each frame; input module checks against it
- **Patch shapes**: 2D boolean arrays where `true` = filled cell. Rotation creates new arrays
- **Board state**: `(number | null)[][]` where `null` = empty, number = patch ID

## Code Style

- Always log errors with `console.error()` - never silently ignore them in catch blocks

## UI/Layout Rules

- **No layout shifts**: If the same element (e.g., board, panels) appears on different screens, it must maintain the same position and size. This prevents jarring visual jumps during screen transitions.
