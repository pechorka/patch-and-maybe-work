import Phaser from 'phaser';
import { COLORS } from '../colors';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {

    // Temporary placeholder
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add.text(centerX, centerY, 'Game Scene - Under Construction', {
      fontSize: '32px',
      color: COLORS.text,
    }).setOrigin(0.5);

    // Back button
    const backText = this.add.text(centerX, centerY + 100, 'Back to Setup', {
      fontSize: '24px',
      color: COLORS.text,
    }).setOrigin(0.5);
    backText.setInteractive({ useHandCursor: true });
    backText.on('pointerdown', () => {
      this.scene.start('SetupScene');
    });
  }
}
