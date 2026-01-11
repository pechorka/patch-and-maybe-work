import Phaser from 'phaser';
import { COLORS, getPatchColor, getPlayerColor } from '../colors';
import { LAYOUT, getBoardLayout } from '../layout';
import {
  getAppState,
  skip,
  openMapView,
  selectPatch,
  startOpponentBoardPreview,
  stopOpponentBoardPreview,
} from '../main-phaser';
import {
  getAvailablePatches,
  getCurrentPlayerIndex,
  getOvertakeDistance,
  getNextIncomeDistance,
} from '../game';
import { getOpponentIndex } from '../player-utils';
import { getTransformedShape } from '../shape-utils';
import type { Player, Patch } from '../types';

export class GameScene extends Phaser.Scene {
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private patchesContainer!: Phaser.GameObjects.Container;
  private skipButton!: Phaser.GameObjects.Container;
  private mapButton!: Phaser.GameObjects.Container;
  private playerPanelsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.boardGraphics = this.add.graphics();
    this.patchesContainer = this.add.container();
    this.playerPanelsContainer = this.add.container();

    this.scale.on('resize', this.handleResize, this);
    this.refresh();
  }

  private handleResize(): void {
    this.refresh();
  }

  private refresh(): void {
    const state = getAppState();
    if (!state.gameState) {
      this.scene.start('SetupScene');
      return;
    }

    // Clear previous graphics
    this.boardGraphics.clear();
    this.patchesContainer.removeAll(true);
    this.playerPanelsContainer.removeAll(true);
    if (this.skipButton) this.skipButton.destroy();
    if (this.mapButton) this.mapButton.destroy();

    const game = state.gameState;
    const currentPlayerIdx = getCurrentPlayerIndex(game);
    const displayPlayerIdx = state.previewingOpponentBoard
      ? getOpponentIndex(currentPlayerIdx)
      : currentPlayerIdx;

    const width = this.scale.width;
    const height = this.scale.height;
    const minDim = Math.min(width, height);

    // Player panels at top
    const panelHeight = minDim * LAYOUT.panelHeight;
    this.renderPlayerPanels(game, currentPlayerIdx, panelHeight, width);

    // Board display
    const layout = getBoardLayout(width, height, game.boardSize);
    const { boardLeft, boardTop, boardSize } = layout;

    // Fill background below panels with displayed player's color
    const bgRect = this.add.rectangle(
      0,
      panelHeight,
      width,
      height - panelHeight,
      parseInt(getPlayerColor(displayPlayerIdx as 0 | 1, false).replace('#', ''), 16)
    );
    bgRect.setOrigin(0, 0);

    // Draw player color border around the board
    const borderWidth = minDim * LAYOUT.boardBorderWidth;
    const borderRect = this.add.rectangle(
      boardLeft - borderWidth,
      boardTop - borderWidth,
      boardSize + borderWidth * 2,
      boardSize + borderWidth * 2,
      parseInt(getPlayerColor(displayPlayerIdx as 0 | 1, true).replace('#', ''), 16)
    );
    borderRect.setOrigin(0, 0);

    // Render board
    this.renderBoard(game.players[displayPlayerIdx], boardLeft, boardTop, boardSize);

    // Available patches
    const patchesTop = boardTop + boardSize + minDim * LAYOUT.gap.large;
    this.renderAvailablePatches(game, boardLeft, patchesTop, boardSize, minDim);

    // Skip button
    const skipBtnWidth = boardSize;
    const skipBtnHeight = minDim * LAYOUT.buttonHeight.medium;
    const skipBtnX = boardLeft;
    const skipBtnY = height - skipBtnHeight - minDim * LAYOUT.gap.large;

    const currentPlayer = game.players[currentPlayerIdx];
    const opponent = game.players[getOpponentIndex(currentPlayerIdx)];
    const spacesToSkip = opponent.position - currentPlayer.position + 1;

    const isConfirming = state.confirmingSkip;
    this.skipButton = this.createSkipButton(
      skipBtnX,
      skipBtnY,
      skipBtnWidth,
      skipBtnHeight,
      spacesToSkip,
      isConfirming,
      minDim
    );

    // Toggle map button
    const mapBtnHeight = minDim * LAYOUT.buttonHeight.small;
    const mapBtnGap = minDim * LAYOUT.gap.medium;
    const mapBtnX = skipBtnX;
    const mapBtnY = skipBtnY - mapBtnHeight - mapBtnGap;
    const mapBtnWidth = skipBtnWidth;

    this.mapButton = this.createMapButton(mapBtnX, mapBtnY, mapBtnWidth, mapBtnHeight, minDim);
  }

  private renderPlayerPanels(
    game: any,
    currentPlayerIdx: number,
    panelHeight: number,
    width: number
  ): void {
    const panelWidth = width / 2;
    const overtakeDistance = getOvertakeDistance(game);
    const minDim = Math.min(width, this.scale.height);

    // Y positions relative to panel height
    const nameY = panelHeight * 0.225;
    const buttonsY = panelHeight * 0.475;
    const incomeY = panelHeight * 0.6875;
    const turnY = panelHeight * 0.9;

    for (let i = 0; i < 2; i++) {
      const player = game.players[i];
      const x = i * panelWidth;
      const isActive = i === currentPlayerIdx;
      const playerIdx = i as 0 | 1;

      // Panel background
      const panelBg = this.add.rectangle(
        x,
        0,
        panelWidth,
        panelHeight,
        parseInt(getPlayerColor(playerIdx, isActive).replace('#', ''), 16)
      );
      panelBg.setOrigin(0, 0);

      // If not active, make it clickable for opponent board preview
      if (!isActive) {
        panelBg.setInteractive({ useHandCursor: true });
        panelBg.on('pointerdown', () => startOpponentBoardPreview());
        panelBg.on('pointerup', () => stopOpponentBoardPreview());
      }

      this.playerPanelsContainer.add(panelBg);

      const centerX = x + panelWidth / 2;

      // Player name
      const nameText = this.add.text(centerX, nameY, player.name, {
        fontSize: Math.round(minDim * LAYOUT.fontSize[isActive ? 'small' : 'small']) + 'px',
        color: COLORS.text,
        fontStyle: isActive ? 'bold' : 'normal',
      });
      nameText.setOrigin(0.5);
      this.playerPanelsContainer.add(nameText);

      // Buttons and position
      const statsText = this.add.text(
        centerX,
        buttonsY,
        `Buttons: ${player.buttons}   Pos: ${player.position}/${game.timeTrackLength}`,
        {
          fontSize: Math.round(minDim * LAYOUT.fontSize.small) + 'px',
          color: COLORS.text,
          fontStyle: isActive ? 'bold' : 'normal',
        }
      );
      statsText.setOrigin(0.5);
      this.playerPanelsContainer.add(statsText);

      // Income info
      const incomeDistance = getNextIncomeDistance(game, playerIdx);
      const incomeText = incomeDistance !== null
        ? `+${player.income} in ${incomeDistance}`
        : `+${player.income} (done)`;
      const incomeLabel = this.add.text(centerX, incomeY, incomeText, {
        fontSize: Math.round(minDim * LAYOUT.fontSize.tiny) + 'px',
        color: COLORS.text,
      });
      incomeLabel.setOrigin(0.5);
      this.playerPanelsContainer.add(incomeLabel);

      // Turn ends info or 7x7 bonus
      if (isActive) {
        const turnText = this.add.text(centerX, turnY, `Turn ends in: ${overtakeDistance}`, {
          fontSize: Math.round(minDim * LAYOUT.fontSize.tiny) + 'px',
          color: COLORS.text,
        });
        turnText.setOrigin(0.5);
        this.playerPanelsContainer.add(turnText);
      }

      // 7x7 bonus indicator
      if (player.bonus7x7Area !== null) {
        const bonusOffset = isActive ? minDim * 0.075 : 0;
        const bonusText = this.add.text(centerX + bonusOffset, turnY, '+7 Bonus', {
          fontSize: Math.round(minDim * LAYOUT.fontSize.tiny) + 'px',
          color: COLORS.bonus7x7,
          fontStyle: 'bold',
        });
        bonusText.setOrigin(0.5);
        this.playerPanelsContainer.add(bonusText);
      }
    }
  }

  private renderBoard(player: Player, x: number, y: number, size: number): void {
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

  private renderAvailablePatches(
    game: any,
    x: number,
    y: number,
    totalWidth: number,
    minDim: number
  ): void {
    const patches = getAvailablePatches(game);
    const patchAreaWidth = totalWidth / 3;
    const patchAreaHeight = minDim * LAYOUT.patchPanelHeight;
    const patchMargin = minDim * LAYOUT.gap.small;

    patches.forEach((patch: Patch, i: number) => {
      const patchX = x + i * patchAreaWidth;
      const currentPlayer = game.players[getCurrentPlayerIndex(game)];
      const canBuy = currentPlayer.buttons >= patch.buttonCost;

      // Background
      const bgColor = canBuy ? COLORS.panel : COLORS.buttonDisabled;
      const patchBg = this.add.rectangle(
        patchX + patchMargin,
        y,
        patchAreaWidth - patchMargin * 2,
        patchAreaHeight,
        parseInt(bgColor.replace('#', ''), 16)
      );
      patchBg.setOrigin(0, 0);

      if (canBuy) {
        patchBg.setInteractive({ useHandCursor: true });
        patchBg.on('pointerdown', () => {
          selectPatch(i);
          this.scene.start('PlacementScene');
        });
      }

      this.patchesContainer.add(patchBg);

      // Draw patch shape
      const shape = patch.shape;
      const maxDim = Math.max(shape.length, shape[0].length);
      const maxCellSize = minDim * LAYOUT.patch.maxCellSize;
      const availableWidth = patchAreaWidth - minDim * 0.0375;
      const cellSize = Math.min(maxCellSize, availableWidth / maxDim, (minDim * 0.0625) / maxDim);
      const cellPadding = Math.max(1, cellSize * 0.02);
      const shapeWidth = shape[0].length * cellSize;
      const shapeX = patchX + (patchAreaWidth - shapeWidth) / 2;
      const shapeY = y + minDim * LAYOUT.gap.medium;

      const patchColor = getPatchColor(patch.id);
      const finalColor = canBuy ? patchColor : this.adjustColorOpacity(patchColor, 0.4);

      const patchGraphics = this.add.graphics();
      patchGraphics.fillStyle(parseInt(finalColor.replace('#', ''), 16));

      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col]) {
            patchGraphics.fillRect(
              shapeX + col * cellSize + cellPadding,
              shapeY + row * cellSize + cellPadding,
              cellSize - cellPadding * 2,
              cellSize - cellPadding * 2
            );
          }
        }
      }

      this.patchesContainer.add(patchGraphics);

      // Draw button indicators
      if (patch.buttonIncome > 0) {
        const btnGraphics = this.add.graphics();
        btnGraphics.fillStyle(parseInt(COLORS.buttonIndicator.replace('#', ''), 16));

        const filledCells: { row: number; col: number }[] = [];
        for (let row = 0; row < shape.length; row++) {
          for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
              filledCells.push({ row, col });
            }
          }
        }

        const indicatorCells = filledCells.slice(0, patch.buttonIncome);
        for (const cell of indicatorCells) {
          const cx = shapeX + cell.col * cellSize + cellSize / 2;
          const cy = shapeY + cell.row * cellSize + cellSize / 2;
          btnGraphics.fillCircle(cx, cy, cellSize * 0.25);
        }

        this.patchesContainer.add(btnGraphics);
      }

      // Cost info
      const infoY = y + patchAreaHeight - minDim * LAYOUT.gap.medium;
      const costText = this.add.text(
        patchX + patchAreaWidth / 2,
        infoY,
        `Cost: ${patch.buttonCost}  Time: ${patch.timeCost}`,
        {
          fontSize: Math.round(minDim * LAYOUT.fontSize.tiny) + 'px',
          color: COLORS.text,
        }
      );
      costText.setOrigin(0.5);
      this.patchesContainer.add(costText);
    });
  }

  private createSkipButton(
    x: number,
    y: number,
    width: number,
    height: number,
    spacesToSkip: number,
    isConfirming: boolean,
    minDim: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bgColor = isConfirming ? '#e67e22' : COLORS.button;
    const bg = this.add.rectangle(0, 0, width, height, parseInt(bgColor.replace('#', ''), 16));
    bg.setOrigin(0, 0);
    bg.setInteractive({ useHandCursor: true });

    const text = isConfirming
      ? 'TAP AGAIN TO CONFIRM'
      : `SKIP & MOVE AHEAD (+${spacesToSkip})`;
    const label = this.add.text(width / 2, height / 2, text, {
      fontSize: Math.round(minDim * LAYOUT.fontSize.button) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);

    bg.on('pointerdown', () => {
      skip();
      this.refresh();
    });

    container.add([bg, label]);
    return container;
  }

  private createMapButton(
    x: number,
    y: number,
    width: number,
    height: number,
    minDim: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, parseInt(COLORS.panel.replace('#', ''), 16));
    bg.setOrigin(0, 0);
    bg.setInteractive({ useHandCursor: true });

    const label = this.add.text(width / 2, height / 2, 'TOGGLE MAP', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.info) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);

    bg.on('pointerdown', () => {
      openMapView();
      this.scene.start('MapViewScene');
    });

    container.add([bg, label]);
    return container;
  }

  private adjustColorOpacity(color: string, opacity: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const newR = Math.floor(r * opacity);
    const newG = Math.floor(g * opacity);
    const newB = Math.floor(b * opacity);
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
}
