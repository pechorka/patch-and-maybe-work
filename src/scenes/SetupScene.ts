import { BaseScene } from './BaseScene';
import { COLORS } from '../colors';
import { LAYOUT } from '../layout';
import {
  editName,
  selectFirstPlayer,
  toggleAutoSkip,
  toggleFaceToFaceMode,
  togglePlacementAnimations,
  startGame,
  getIsAdminMode,
  openAdminTestScreen,
  getAppState,
} from '../main-phaser';

export class SetupScene extends BaseScene {
  constructor() {
    super({ key: 'SetupScene' });
  }

  create() {
    super.create();
    this.refresh();
  }

  protected refresh(): void {
    // Clear scene
    this.children.removeAll();

    // Draw gradient background using Graphics
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(
      parseInt(COLORS.player1.replace('#', ''), 16),
      parseInt(COLORS.player1.replace('#', ''), 16),
      parseInt(COLORS.player2.replace('#', ''), 16),
      parseInt(COLORS.player2.replace('#', ''), 16),
      1
    );
    graphics.fillRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const state = getAppState();

    // Title
    const title = this.add.text(centerX, this.height * 0.18, 'PATCHWORK', {
      fontSize: this.getFont('title'),
      color: COLORS.text,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Players label
    const playersLabel = this.add.text(centerX, this.height * 0.30, 'Players:', {
      fontSize: this.getFont('large'),
      color: COLORS.text,
    });
    playersLabel.setOrigin(0.5);

    // Player name buttons
    const nameButtonWidth = this.scaleValue(LAYOUT.nameButton.width);
    const nameButtonHeight = this.scaleValue(LAYOUT.nameButton.height);
    const nameGap = this.scaleValue(LAYOUT.nameButton.gap);
    const totalNameWidth = 2 * nameButtonWidth + nameGap;
    const nameStartX = centerX - totalNameWidth / 2;
    const nameY = this.height * 0.34;

    for (let i = 0; i < 2; i++) {
      const x = nameStartX + i * (nameButtonWidth + nameGap);
      this.createNameButton(x, nameY, nameButtonWidth, nameButtonHeight, i as 0 | 1, state.playerNames[i]);
    }

    // First player checkboxes
    const checkboxWidth = this.scaleValue(LAYOUT.checkbox.firstPlayer.width);
    const checkboxHeight = this.scaleValue(LAYOUT.checkbox.firstPlayer.height);
    const checkboxY = this.height * 0.42;

    for (let i = 0; i < 2; i++) {
      const x = nameStartX + i * (nameButtonWidth + nameGap) + (nameButtonWidth - checkboxWidth) / 2;
      this.createFirstPlayerCheckbox(x, checkboxY, checkboxWidth, checkboxHeight, i as 0 | 1, state.firstPlayerIndex === i);
    }

    // Auto-skip toggle
    const autoSkipY = this.height * 0.50;
    this.createCheckbox(autoSkipY, 'Auto-skip when can\'t buy', state.autoSkipEnabled, toggleAutoSkip);

    // Face-to-face mode toggle
    const faceToFaceY = this.height * 0.56;
    this.createCheckbox(faceToFaceY, 'Face-to-face mode', state.faceToFaceMode, toggleFaceToFaceMode);

    // Placement animations toggle
    const animationsY = this.height * 0.61;
    this.createCheckbox(animationsY, 'Placement animations', state.placementAnimationsEnabled, togglePlacementAnimations);

    // Start button
    const startBtnWidth = this.scaleValue(LAYOUT.buttonWidth.large);
    const startBtnHeight = this.scaleValue(LAYOUT.buttonHeight.large);
    const startBtnX = centerX - startBtnWidth / 2;
    const startBtnY = this.height * 0.66;

    const startButton = this.add.rectangle(startBtnX, startBtnY, startBtnWidth, startBtnHeight, parseInt(COLORS.button.replace('#', ''), 16));
    startButton.setOrigin(0, 0);
    startButton.setInteractive({ useHandCursor: true });

    const startText = this.add.text(centerX, startBtnY + startBtnHeight / 2, 'START GAME', {
      fontSize: this.getFont('large'),
      color: COLORS.text,
      fontStyle: 'bold',
    });
    startText.setOrigin(0.5);

    startButton.on('pointerdown', () => {
      startGame();
      this.scene.start('GameScene');
    });

    // Admin test button
    if (getIsAdminMode()) {
      const adminBtnWidth = this.scaleValue(LAYOUT.buttonWidth.large);
      const adminBtnHeight = this.scaleValue(LAYOUT.buttonHeight.medium);
      const adminBtnX = centerX - adminBtnWidth / 2;
      const adminBtnY = startBtnY + startBtnHeight + this.scaleValue(LAYOUT.gap.large);

      const adminButton = this.add.rectangle(adminBtnX, adminBtnY, adminBtnWidth, adminBtnHeight, 0xe74c3c);
      adminButton.setOrigin(0, 0);
      adminButton.setInteractive({ useHandCursor: true });

      const adminText = this.add.text(centerX, adminBtnY + adminBtnHeight / 2, 'ADMIN TESTS', {
        fontSize: this.getFont('normal'),
        color: COLORS.text,
        fontStyle: 'bold',
      });
      adminText.setOrigin(0.5);

      adminButton.on('pointerdown', () => {
        openAdminTestScreen();
        this.scene.start('AdminTestScene');
      });
    }
  }

  private createNameButton(x: number, y: number, width: number, height: number, index: 0 | 1, name: string): void {
    const bg = this.add.rectangle(x, y, width, height, parseInt(COLORS.panel.replace('#', ''), 16));
    bg.setOrigin(0, 0);
    bg.setInteractive({ useHandCursor: true });

    const displayName = name.length > 12 ? name.slice(0, 12) + '...' : name;
    const text = this.add.text(x + width / 2, y + height / 2, displayName, {
      fontSize: this.getFont('normal'),
      color: COLORS.text,
    });
    text.setOrigin(0.5);

    bg.on('pointerdown', () => {
      editName(index);
      this.refresh();
    });
  }

  private createFirstPlayerCheckbox(x: number, y: number, width: number, height: number, index: 0 | 1, isSelected: boolean): void {
    if (isSelected) {
      const bg = this.add.rectangle(x, y, width, height, parseInt(COLORS.panelActive.replace('#', ''), 16));
      bg.setOrigin(0, 0);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        selectFirstPlayer(index);
        this.refresh();
      });
    } else {
      const graphics = this.add.graphics();
      graphics.lineStyle(2, parseInt(COLORS.panel.replace('#', ''), 16));
      graphics.strokeRect(x, y, width, height);

      const hitArea = this.add.rectangle(x, y, width, height, 0x000000, 0);
      hitArea.setOrigin(0, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        selectFirstPlayer(index);
        this.refresh();
      });
    }
  }

  private createCheckbox(y: number, label: string, checked: boolean, callback: () => void): void {
    const centerX = this.width / 2;
    const checkboxSize = this.scaleValue(LAYOUT.checkbox.size);
    const checkboxX = centerX - this.scaleValue(0.1875);
    const labelX = checkboxX + checkboxSize + this.scaleValue(LAYOUT.gap.medium);

    // Checkbox
    if (checked) {
      const bg = this.add.rectangle(checkboxX, y, checkboxSize, checkboxSize, parseInt(COLORS.panelActive.replace('#', ''), 16));
      bg.setOrigin(0, 0);

      // Checkmark
      const graphics = this.add.graphics();
      graphics.lineStyle(3, parseInt(COLORS.text.replace('#', ''), 16));
      graphics.beginPath();
      graphics.moveTo(checkboxX + checkboxSize * 0.2, y + checkboxSize * 0.5);
      graphics.lineTo(checkboxX + checkboxSize * 0.4, y + checkboxSize * 0.73);
      graphics.lineTo(checkboxX + checkboxSize * 0.8, y + checkboxSize * 0.27);
      graphics.strokePath();
    } else {
      const graphics = this.add.graphics();
      graphics.lineStyle(2, parseInt(COLORS.panel.replace('#', ''), 16));
      graphics.strokeRect(checkboxX, y, checkboxSize, checkboxSize);
    }

    // Label
    const labelText = this.add.text(labelX, y + checkboxSize / 2, label, {
      fontSize: this.getFont('small'),
      color: COLORS.text,
    });
    labelText.setOrigin(0, 0.5);

    // Hit area
    const checkboxHitWidth = this.scaleValue(0.375);
    const hitArea = this.add.rectangle(checkboxX, y, checkboxHitWidth, checkboxSize, 0x000000, 0);
    hitArea.setOrigin(0, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => {
      callback();
      this.refresh();
    });
  }
}
