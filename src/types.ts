export type BoardSize = 7 | 9 | 11;

export type Screen = 'setup' | 'game' | 'placement' | 'gameEnd' | 'mapView' | 'boardPreview';

export interface PatchVariant {
  buttonCost: number;
  timeCost: number;
  buttonIncome: number;
}

export interface PatchDefinition {
  shape: boolean[][];  // 2D array where true = filled cell
  variants: PatchVariant[];
}

export interface Patch {
  id: number;
  shape: boolean[][];  // 2D array where true = filled cell
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
}

export type ButtonType = 'standard' | 'patch' | 'track-position';

export interface ButtonMetadata {
  patchIndex?: number;
  trackPosition?: number;
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
