import Phaser from 'phaser';
import { COLORS, getPatchColor, getPlayerColor } from '../colors';
import { LAYOUT, getBoardLayout } from '../layout';
import {
  getAppState,
  cancelPlacement,
  confirmPlacement,
  rotate,
  reflect,
  openMapView,
} from '../main-phaser';
import {
  getAvailablePatches,
  getCurrentPlayerIndex,
  canPlacePatch,
} from '../game';
import { getTransformedShape } from '../shape-utils';
import type { Player, Patch } from '../types';

export class PlacementScene extends Phaser.Scene {
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private buttonsContainer!: Phaser.GameObjects.Container;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartCellX: number = 0;
  private dragStartCellY: number = 0;

  constructor() {
    super({ key: 'PlacementScene' });
  }

  create() {
    this.boardGraphics = this.add.graphics();
    this.buttonsContainer = this.add.container();

    this.scale.on('resize', this.handleResize, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);

    this.refresh();
  }

  private handleResize(): void {
    this.refresh();
  }

  private refresh(): void {
    const state = getAppState();
    if (!state.gameState || !state.placementState) {
      this.scene.start('GameScene');
      return;
    }

    // Clear previous graphics
    this.boardGraphics.clear();
    this.buttonsContainer.removeAll(true);

    const game = state.gameState;
    const placement = state.placementState;
    const currentPlayerIdx = getCurrentPlayerIndex(game);
    const player = game.players[currentPlayerIdx];
    const isLeatherPatch = state.placingLeatherPatch !== null;

    // Get patch
    let patch: Patch | undefined;
    if (isLeatherPatch) {
      patch = state.placingLeatherPatch!;
    } else {
      const patches = getAvailablePatches(game);
      patch = patches[placement.patchIndex];
    }

    if (!patch) {
      this.scene.start('GameScene');
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const minDim = Math.min(width, height);

    // Fill background with player color
    const bgRect = this.add.rectangle(
      0,
      0,
      width,
      height,
      parseInt(getPlayerColor(currentPlayerIdx as 0 | 1, false).replace('#', ''), 16)
    );
    bgRect.setOrigin(0, 0);

    // Top panel
    const panelHeight = minDim * LAYOUT.panelHeight;
    this.renderTopPanel(isLeatherPatch, player.name, panelHeight, width, minDim);

    // Board with ghost
    const layout = getBoardLayout(width, height, game.boardSize);
    const { boardLeft, boardTop, boardSize } = layout;

    const shape = getTransformedShape(patch.shape, placement.rotation, placement.reflected);
    const canPlace = canPlacePatch(player.board, shape, placement.x, placement.y);

    this.renderBoardWithGhost(player, boardLeft, boardTop, boardSize, patch, canPlace);

    // Patch info panel
    const infoY = boardTop + boardSize + minDim * 0.03125;
    this.renderPatchInfo(patch, shape, isLeatherPatch, infoY, width / 2, minDim);

    // Buttons
    const btnHeight = minDim * LAYOUT.buttonHeight.medium;
    const btnGap = minDim * LAYOUT.gap.medium;
    const btnWidth = (boardSize - btnGap) / 2;

    // Rotate/Reflect buttons
    const rotateRowY = infoY + minDim * LAYOUT.gap.large;
    this.createRotateReflectButtons(boardLeft, rotateRowY, btnWidth, btnHeight, btnGap, minDim);

    // Bottom buttons
    const bottomRowY = height - btnHeight - minDim * LAYOUT.gap.large;

    // Toggle map button
    const mapBtnHeight = minDim * LAYOUT.buttonHeight.small;
    const mapBtnY = bottomRowY - mapBtnHeight - btnGap;
    this.createMapButton(boardLeft, mapBtnY, boardSize, mapBtnHeight, minDim);

    // Cancel/Confirm buttons
    this.createBottomButtons(
      boardLeft,
      bottomRowY,
      btnWidth,
      btnHeight,
      btnGap,
      boardSize,
      isLeatherPatch,
      canPlace,
      minDim
    );
  }

  private renderTopPanel(
    isLeatherPatch: boolean,
    playerName: string,
    panelHeight: number,
    width: number,
    minDim: number
  ): void {
    const bgColor = isLeatherPatch ? COLORS.leatherPatch : getPlayerColor(getCurrentPlayerIndex(getAppState().gameState!) as 0 | 1, true);
    const panelBg = this.add.rectangle(
      0,
      0,
      width,
      panelHeight,
      parseInt(bgColor.replace('#', ''), 16)
    );
    panelBg.setOrigin(0, 0);

    const text = isLeatherPatch ? 'LEATHER PATCH' : `${playerName} - Place Patch`;
    const label = this.add.text(width / 2, panelHeight / 2, text, {
      fontSize: Math.round(minDim * LAYOUT.fontSize.normal) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);
  }

  private renderBoardWithGhost(
    player: Player,
    x: number,
    y: number,
    size: number,
    patch: Patch,
    canPlace: boolean
  ): void {
    const state = getAppState();
    const placement = state.placementState!;
    const boardSize = player.board.length;
    const cellSize = size / boardSize;
    const cellPadding = Math.max(1, cellSize * 0.02);

    // Background
    this.boardGraphics.fillStyle(parseInt(COLORS.boardBg.replace('#', ''), 16));
    this.boardGraphics.fillRect(x, y, size, size);

    // Grid lines
    this.boardGraphics.lineStyle(1, parseInt(COLORS.boardGrid.replace('#', ''), 16));
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        this.boardGraphics.strokeRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize);
      }
    }

    // Draw placed patches
    for (const placed of player.placedPatches) {
      const shape = getTransformedShape(placed.patch.shape, placed.rotation, placed.reflected);
      const patchColor = getPatchColor(placed.patch.id);

      this.boardGraphics.fillStyle(parseInt(patchColor.replace('#', ''), 16));

      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col]) {
            const cellX = x + (placed.x + col) * cellSize;
            const cellY = y + (placed.y + row) * cellSize;
            this.boardGraphics.fillRect(
              cellX + cellPadding,
              cellY + cellPadding,
              cellSize - cellPadding * 2,
              cellSize - cellPadding * 2
            );
          }
        }
      }

      // Draw button indicators
      this.drawButtonIndicators(
        shape,
        placed.patch.buttonIncome,
        x + placed.x * cellSize,
        y + placed.y * cellSize,
        cellSize
      );
    }

    // Draw 7x7 bonus highlight
    if (player.bonus7x7Area !== null) {
      const bonusX = x + player.bonus7x7Area.x * cellSize;
      const bonusY = y + player.bonus7x7Area.y * cellSize;
      const bonusSize = 7 * cellSize;

      this.boardGraphics.lineStyle(
        Math.max(2, cellSize * 0.05),
        parseInt(COLORS.bonus7x7.replace('#', ''), 16)
      );
      this.boardGraphics.strokeRect(bonusX, bonusY, bonusSize, bonusSize);
    }

    // Draw ghost patch
    const ghostShape = getTransformedShape(patch.shape, placement.rotation, placement.reflected);
    const ghostColor = canPlace ? COLORS.ghostValid : COLORS.ghostInvalid;

    this.boardGraphics.fillStyle(parseInt(ghostColor.replace('#', ''), 16));

    for (let row = 0; row < ghostShape.length; row++) {
      for (let col = 0; col < ghostShape[row].length; col++) {
        if (ghostShape[row][col]) {
          const cellX = x + (placement.x + col) * cellSize;
          const cellY = y + (placement.y + row) * cellSize;
          this.boardGraphics.fillRect(
            cellX + cellPadding,
            cellY + cellPadding,
            cellSize - cellPadding * 2,
            cellSize - cellPadding * 2
          );
        }
      }
    }

    // Draw button indicators on ghost
    this.drawButtonIndicators(
      ghostShape,
      patch.buttonIncome,
      x + placement.x * cellSize,
      y + placement.y * cellSize,
      cellSize
    );
  }

  private drawButtonIndicators(
    shape: number[][],
    buttonIncome: number,
    startX: number,
    startY: number,
    cellSize: number
  ): void {
    if (buttonIncome === 0) return;

    const filledCells: { row: number; col: number }[] = [];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          filledCells.push({ row, col });
        }
      }
    }

    const indicatorCells = filledCells.slice(0, buttonIncome);
    const indicatorRadius = cellSize * 0.15;

    this.boardGraphics.fillStyle(parseInt(COLORS.buttonIndicator.replace('#', ''), 16));
    for (const cell of indicatorCells) {
      const cx = startX + cell.col * cellSize + cellSize / 2;
      const cy = startY + cell.row * cellSize + cellSize / 2;
      this.boardGraphics.fillCircle(cx, cy, indicatorRadius);
    }
  }

  private renderPatchInfo(
    patch: Patch,
    shape: number[][],
    isLeatherPatch: boolean,
    y: number,
    centerX: number,
    minDim: number
  ): void {
    const filledCells = shape.flat().filter(cell => cell === 1).length;
    const scoreDelta = (filledCells * 2) - patch.buttonCost;
    const infoText = isLeatherPatch
      ? 'Score: +2'
      : `Cells: ${filledCells} | Cost: ${patch.buttonCost} | Time: ${patch.timeCost} | Income: ${patch.buttonIncome} | Score: ${scoreDelta >= 0 ? '+' : ''}${scoreDelta}`;

    const info = this.add.text(centerX, y, infoText, {
      fontSize: Math.round(minDim * LAYOUT.fontSize.small) + 'px',
      color: COLORS.text,
    });
    info.setOrigin(0.5);
  }

  private createRotateReflectButtons(
    boardLeft: number,
    y: number,
    btnWidth: number,
    btnHeight: number,
    btnGap: number,
    minDim: number
  ): void {
    // Rotate button
    const rotateBg = this.add.rectangle(
      boardLeft,
      y,
      btnWidth,
      btnHeight,
      parseInt(COLORS.panel.replace('#', ''), 16)
    );
    rotateBg.setOrigin(0, 0);
    rotateBg.setInteractive({ useHandCursor: true });

    const rotateLabel = this.add.text(boardLeft + btnWidth / 2, y + btnHeight / 2, 'ROTATE', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.normal) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    rotateLabel.setOrigin(0.5);

    rotateBg.on('pointerdown', () => {
      rotate();
      this.refresh();
    });

    this.buttonsContainer.add([rotateBg, rotateLabel]);

    // Reflect button
    const reflectX = boardLeft + btnWidth + btnGap;
    const reflectBg = this.add.rectangle(
      reflectX,
      y,
      btnWidth,
      btnHeight,
      parseInt(COLORS.panel.replace('#', ''), 16)
    );
    reflectBg.setOrigin(0, 0);
    reflectBg.setInteractive({ useHandCursor: true });

    const reflectLabel = this.add.text(reflectX + btnWidth / 2, y + btnHeight / 2, 'REFLECT', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.normal) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    reflectLabel.setOrigin(0.5);

    reflectBg.on('pointerdown', () => {
      reflect();
      this.refresh();
    });

    this.buttonsContainer.add([reflectBg, reflectLabel]);
  }

  private createMapButton(
    boardLeft: number,
    y: number,
    width: number,
    height: number,
    minDim: number
  ): void {
    const mapBg = this.add.rectangle(
      boardLeft,
      y,
      width,
      height,
      parseInt(COLORS.panel.replace('#', ''), 16)
    );
    mapBg.setOrigin(0, 0);
    mapBg.setInteractive({ useHandCursor: true });

    const mapLabel = this.add.text(boardLeft + width / 2, y + height / 2, 'TOGGLE MAP', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.info) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    mapLabel.setOrigin(0.5);

    mapBg.on('pointerdown', () => {
      openMapView();
      this.scene.start('MapViewScene');
    });

    this.buttonsContainer.add([mapBg, mapLabel]);
  }

  private createBottomButtons(
    boardLeft: number,
    y: number,
    btnWidth: number,
    btnHeight: number,
    btnGap: number,
    boardSize: number,
    isLeatherPatch: boolean,
    canPlace: boolean,
    minDim: number
  ): void {
    // Cancel button (only for non-leather patches)
    if (!isLeatherPatch) {
      const cancelBg = this.add.rectangle(
        boardLeft,
        y,
        btnWidth,
        btnHeight,
        0xc0392b
      );
      cancelBg.setOrigin(0, 0);
      cancelBg.setInteractive({ useHandCursor: true });

      const cancelLabel = this.add.text(boardLeft + btnWidth / 2, y + btnHeight / 2, 'CANCEL', {
        fontSize: Math.round(minDim * LAYOUT.fontSize.normal) + 'px',
        color: COLORS.text,
        fontStyle: 'bold',
      });
      cancelLabel.setOrigin(0.5);

      cancelBg.on('pointerdown', () => {
        cancelPlacement();
        this.scene.start('GameScene');
      });

      this.buttonsContainer.add([cancelBg, cancelLabel]);
    }

    // Confirm button
    const confirmX = isLeatherPatch ? boardLeft : boardLeft + btnWidth + btnGap;
    const confirmWidth = isLeatherPatch ? boardSize : btnWidth;
    const confirmColor = canPlace ? COLORS.button : COLORS.buttonDisabled;

    const confirmBg = this.add.rectangle(
      confirmX,
      y,
      confirmWidth,
      btnHeight,
      parseInt(confirmColor.replace('#', ''), 16)
    );
    confirmBg.setOrigin(0, 0);

    if (canPlace) {
      confirmBg.setInteractive({ useHandCursor: true });
      confirmBg.on('pointerdown', () => {
        confirmPlacement();
        // Check if we need to go to placement screen again (leather patch) or back to game
        const state = getAppState();
        if (state.screen === 'placement') {
          this.refresh();
        } else {
          this.scene.start('GameScene');
        }
      });
    }

    const confirmLabel = this.add.text(confirmX + confirmWidth / 2, y + btnHeight / 2, 'CONFIRM', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.normal) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    confirmLabel.setOrigin(0.5);

    this.buttonsContainer.add([confirmBg, confirmLabel]);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const state = getAppState();
    if (!state.gameState || !state.placementState) return;

    const layout = getBoardLayout(this.scale.width, this.scale.height, state.gameState.boardSize);

    // Check if pointer is on the board
    if (
      pointer.x >= layout.boardLeft &&
      pointer.x <= layout.boardLeft + layout.boardSize &&
      pointer.y >= layout.boardTop &&
      pointer.y <= layout.boardTop + layout.boardSize
    ) {
      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.dragStartCellX = state.placementState.x;
      this.dragStartCellY = state.placementState.y;
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    const state = getAppState();
    if (!state.gameState || !state.placementState) return;

    const layout = getBoardLayout(this.scale.width, this.scale.height, state.gameState.boardSize);

    // Calculate pixel delta from drag start
    const deltaPixelsX = pointer.x - this.dragStartX;
    const deltaPixelsY = pointer.y - this.dragStartY;

    // Convert to cell delta
    const deltaCellsX = Math.round(deltaPixelsX / layout.cellSize);
    const deltaCellsY = Math.round(deltaPixelsY / layout.cellSize);

    // Update placement position
    state.placementState.x = this.dragStartCellX + deltaCellsX;
    state.placementState.y = this.dragStartCellY + deltaCellsY;

    this.refresh();
  }

  private handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;

      const state = getAppState();
      if (!state.gameState || !state.placementState) return;

      // Check if patch is completely outside board bounds - reset if so
      const patch = state.placingLeatherPatch || getAvailablePatches(state.gameState)[state.placementState.patchIndex];
      if (patch) {
        const shape = getTransformedShape(patch.shape, state.placementState.rotation, state.placementState.reflected);
        const boardCells = state.gameState.boardSize;

        const patchRight = state.placementState.x + shape[0].length;
        const patchBottom = state.placementState.y + shape.length;

        const isCompletelyOutside =
          patchRight <= 0 ||
          state.placementState.x >= boardCells ||
          patchBottom <= 0 ||
          state.placementState.y >= boardCells;

        if (isCompletelyOutside) {
          if (state.placingLeatherPatch) {
            // Reset to center for leather patches
            state.placementState.x = Math.floor(boardCells / 2);
            state.placementState.y = Math.floor(boardCells / 2);
            this.refresh();
          } else {
            // Cancel for regular patches
            cancelPlacement();
            this.scene.start('GameScene');
          }
        }
      }
    }
  }
}
