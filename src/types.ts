import type { HistoryManager } from './history';

export type BoardSize = 9;

export type Screen = 'setup' | 'game' | 'placement' | 'gameEnd' | 'mapView' | 'boardPreview' | 'adminTest';

export type GameEndTab = 'summary' | 'charts';

export type Shape = (0 | 1)[][];

export interface PatchVariant {
  buttonCost: number;
  timeCost: number;
  buttonIncome: number;
}

export interface PatchDefinition {
  shape: Shape;  // 2D array where 1 = filled cell
  variants: PatchVariant[];
}

export interface Patch {
  id: number;
  shape: Shape;  // 2D array where 1 = filled cell
  buttonCost: number;
  timeCost: number;
  buttonIncome: number;
}

export interface PlacedPatch {
  patch: Patch;
  x: number;
  y: number;
  rotation: number;
  reflected: boolean;
}

export interface Player {
  name: string;
  buttons: number;
  income: number;
  position: number;  // Position on time track
  board: (number | null)[][];  // null = empty, number = patch id (for collision)
  placedPatches: PlacedPatch[];  // For rendering with full context
  bonus7x7Area: { x: number; y: number } | null;  // Top-left corner of completed 7x7, or null
}

export interface PlacementState {
  patchIndex: number;  // Index in available patches (0-2)
  x: number;
  y: number;
  rotation: number;  // 0, 90, 180, 270
  reflected: boolean;
}

export interface DragState {
  startScreenX: number;      // Screen coords where drag started
  startScreenY: number;
  startCellX: number;        // Original placementState.x when drag started
  startCellY: number;        // Original placementState.y when drag started
}

export type PlacementAnimationType = 'pop' | 'glow' | 'slideIn';

export interface PlacementAnimationState {
  type: PlacementAnimationType;
  startTime: number;
  patchId: number;
  placement: { x: number; y: number; rotation: number; reflected: boolean };
  playerIndex: 0 | 1;
}

export interface LeatherPatchOnTrack {
  position: number;
  collected: boolean;
  patchId: number;
}

export interface GameState {
  boardSize: BoardSize;
  players: [Player, Player];
  patches: Patch[];
  marketPosition: number;  // Index in patches array
  timeTrackLength: number;
  incomePositions: number[];  // Positions on time track where income is collected
  leatherPatches: LeatherPatchOnTrack[];  // Leather patches on time track
  firstPlayerIndex: 0 | 1;  // Which player goes first when positions are tied
  bonus7x7Claimed: boolean;  // True once any player has claimed the 7x7 bonus
}

export interface AppState {
  screen: Screen;
  gameState: GameState | null;
  placementState: PlacementState | null;
  dragState: DragState | null;
  selectedBoardSize: BoardSize;
  playerNames: [string, string];
  firstPlayerIndex: 0 | 1;  // Which player goes first
  previewPlayerIdx: number | null;
  pendingLeatherPatches: number[];   // Queue of leather patch positions to collect
  placingLeatherPatch: Patch | null; // Current leather patch being placed
  previewingOpponentBoard: boolean;  // True when holding opponent's panel to preview their board
  confirmingSkip: boolean;  // True when user tapped skip once and needs to confirm
  autoSkipEnabled: boolean;  // True when auto-skip is enabled for players who can't afford any patches
  toasts: Toast[];  // Active toast notifications
  faceToFaceMode: boolean;  // True when screen rotates 180° on player change for face-to-face play
  historyManager: HistoryManager | null;  // Turn history for stats/undo/replay
  gameEndTab: GameEndTab;  // Active tab on game end screen
  placementAnimationsEnabled: boolean;  // True when placement animations are enabled
  placementAnimation: PlacementAnimationState | null;  // Current placement animation in progress
}

export interface Toast {
  message: string;
  createdAt: number;  // timestamp for auto-dismiss
}

export type ButtonType = 'standard' | 'patch' | 'track-position' | 'player-panel';

export interface ButtonMetadata {
  patchIndex?: number;
  trackPosition?: number;
  playerIndex?: number;
}

export interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  action: () => void;
  type: ButtonType;
  metadata?: ButtonMetadata;
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  minDim: number;
}

export interface RenderResult {
  buttons: Button[];
  isScreenRotated: boolean;
}
