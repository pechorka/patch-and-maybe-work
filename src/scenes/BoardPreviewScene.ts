import Phaser from 'phaser';
import { COLORS, getPatchColor, getPlayerColor } from '../colors';
import { LAYOUT } from '../layout';
import { getAppState, backToGameEnd } from '../main-phaser';
import { calculateScore } from '../game';
import { getTransformedShape } from '../shape-utils';

export class BoardPreviewScene extends Phaser.Scene {
  private boardGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'BoardPreviewScene' });
  }

  create() {
    this.boardGraphics = this.add.graphics();

    const state = getAppState();
    if (!state.gameState || state.previewPlayerIdx === null) {
      this.scene.start('GameEndScene');
      return;
    }

    const game = state.gameState;
    const player = game.players[state.previewPlayerIdx];
    const width = this.scale.width;
    const height = this.scale.height;
    const minDim = Math.min(width, height);
    const centerX = width / 2;

    // Background
    const bgRect = this.add.rectangle(
      0,
      0,
      width,
      height,
      parseInt(getPlayerColor(state.previewPlayerIdx as 0 | 1, false).replace('#', ''), 16)
    );
    bgRect.setOrigin(0, 0);

    // Title
    const title = this.add.text(centerX, height * 0.08, `${player.name}'s Board`, {
      fontSize: Math.round(minDim * LAYOUT.fontSize.heading) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Score summary
    const score = calculateScore(player);
    const emptySpaces = player.board.flat().filter(cell => cell === null).length;
    const scoreText = this.add.text(
      centerX,
      height * 0.14,
      `Score: ${score} (${player.buttons} buttons - ${emptySpaces * 2} penalty)`,
      {
        fontSize: Math.round(minDim * LAYOUT.fontSize.button) + 'px',
        color: COLORS.text,
      }
    );
    scoreText.setOrigin(0.5);

    // Board
    const boardSize = Math.min(width * 0.85, height * 0.65);
    const boardX = centerX - boardSize / 2;
    const boardY = height * 0.18;

    this.renderBoard(player, boardX, boardY, boardSize);

    // Back button
    const btnWidth = minDim * LAYOUT.buttonWidth.small;
    const btnHeight = minDim * LAYOUT.buttonHeight.medium;
    const btnX = centerX - btnWidth / 2;
    const btnY = height * 0.9;

    const backBtn = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, parseInt(COLORS.button.replace('#', ''), 16));
    backBtn.setOrigin(0, 0);
    backBtn.setInteractive({ useHandCursor: true });

    const backLabel = this.add.text(centerX, btnY + btnHeight / 2, 'BACK', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.button) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    backLabel.setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      backToGameEnd();
      this.scene.start('GameEndScene');
    });
  }

  private renderBoard(player: any, x: number, y: number, size: number): void {
    const boardSize = player.board.length;
    const cellSize = size / boardSize;
    const cellPadding = Math.max(1, cellSize * 0.02);

    // Background
    this.boardGraphics.fillStyle(parseInt(COLORS.boardBg.replace('#', ''), 16));
    this.boardGraphics.fillRect(x, y, size, size);

    // Grid
    this.boardGraphics.lineStyle(1, parseInt(COLORS.boardGrid.replace('#', ''), 16));
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        this.boardGraphics.strokeRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize);
      }
    }

    // Placed patches
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
    }

    // 7x7 bonus
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
}
