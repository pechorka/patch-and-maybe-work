import Phaser from 'phaser';
import { COLORS } from '../colors';
import {
  backToSetup,
  loadTestGame1Patch,
  loadTestGame2Patches,
  loadTestGameNearIncome,
  loadTestGameNearLastIncome,
  loadTestGameInfiniteMoney,
  loadTestGameNearLeatherPatch,
  loadTestGameOver,
} from '../main-phaser';

export class AdminTestScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AdminTestScene' });
  }

  create() {
    const centerX = this.scale.width / 2;

    this.add.text(centerX, this.scale.height * 0.1, 'Admin Test Screen', {
      fontSize: '32px',
      color: COLORS.text,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Test scenario buttons
    const scenarios = [
      { label: '1 Patch in Shop', action: () => { loadTestGame1Patch(); this.scene.start('GameScene'); } },
      { label: '2 Patches in Shop', action: () => { loadTestGame2Patches(); this.scene.start('GameScene'); } },
      { label: 'Near Income Checkpoint', action: () => { loadTestGameNearIncome(); this.scene.start('GameScene'); } },
      { label: 'Near Last Income (53)', action: () => { loadTestGameNearLastIncome(); this.scene.start('GameScene'); } },
      { label: 'Infinite Money', action: () => { loadTestGameInfiniteMoney(); this.scene.start('GameScene'); } },
      { label: 'Near Leather Patch', action: () => { loadTestGameNearLeatherPatch(); this.scene.start('GameScene'); } },
      { label: 'Game Over Screen', action: () => { loadTestGameOver(); this.scene.start('GameEndScene'); } },
    ];

    let y = this.scale.height * 0.25;
    const btnWidth = 300;
    const btnHeight = 50;
    const gap = 15;

    scenarios.forEach(scenario => {
      const bg = this.add.rectangle(centerX, y, btnWidth, btnHeight, parseInt(COLORS.button.replace('#', ''), 16));
      bg.setInteractive({ useHandCursor: true });

      this.add.text(centerX, y, scenario.label, {
        fontSize: '18px',
        color: COLORS.text,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      bg.on('pointerdown', scenario.action);

      y += btnHeight + gap;
    });

    // Back button
    const backY = this.scale.height - 80;
    const backBg = this.add.rectangle(centerX, backY, 150, 50, parseInt(COLORS.panel.replace('#', ''), 16));
    backBg.setInteractive({ useHandCursor: true });

    this.add.text(centerX, backY, 'BACK', {
      fontSize: '18px',
      color: COLORS.text,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    backBg.on('pointerdown', () => {
      backToSetup();
      this.scene.start('SetupScene');
    });
  }
}
