export type BoardSize = 7 | 9 | 11;

export type Screen = 'setup' | 'game' | 'placement' | 'gameEnd';

export interface Patch {
  id: number;
  shape: boolean[][];  // 2D array where true = filled cell
  buttonCost: number;
  timeCost: number;
  buttonIncome: number;
}

export interface Player {
  name: string;
  buttons: number;
  income: number;
  position: number;  // Position on time track
  board: (number | null)[][];  // null = empty, number = patch id
}

export interface PlacementState {
  patchIndex: number;  // Index in available patches (0-2)
  x: number;
  y: number;
  rotation: number;  // 0, 90, 180, 270
}

export interface GameState {
  boardSize: BoardSize;
  players: [Player, Player];
  patches: Patch[];
  marketPosition: number;  // Index in patches array
  timeTrackLength: number;
}

export interface AppState {
  screen: Screen;
  gameState: GameState | null;
  placementState: PlacementState | null;
  selectedBoardSize: BoardSize;
}

export interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  action: string;
}
