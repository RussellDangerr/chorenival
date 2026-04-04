// ─── Game: main entry point + state machine ───
// States: title -> levelSelect -> playing -> levelComplete -> (next level or win)
// Pause overlay available during 'playing'
const Game = {
  state: 'title',
  timer: 0,
  levelTimer: 0,
  currentLevel: 0,
  totalLevels: 0,
  transitionAlpha: 0,
  transitionDir: 0,
  transitionCallback: null,
  totalDeaths: 0,
  totalGems: 0,

  // Save data
  save: {
    levelsComplete: [],     // boolean per level
    bestDeaths: [],         // best (lowest) death count per level
    gemsCollected: [],      // gems collected per level (count)
    totalGemsPerLevel: [],  // total possible per level
  },

  init() {
    Engine.init();
    Input.init();
    Audio.init();
    this.totalLevels = Level.maps.length;
    this.loadSave();

    // Register systems in update/draw order
    Engine.register(Input);
    Engine.register(this);
    Engine.register(Level);
    Engine.register(Entities);
    Engine.register(Particles);
    Engine.register({
      update(dt) {
        if (Game.state === 'playing' || Game.state === 'levelComplete') {
          Player.update(dt);
        }
      },
      draw(ctx) {
        if (Game.state === 'playing' || Game.state === 'levelComplete' || Game.state === 'paused') {
          ctx.save();
          ctx.translate(-Camera.x, -Camera.y);
          Player.draw(ctx);
          ctx.restore();
        }
      }
    });
    Engine.register(Camera);
    Engine.register({ draw(ctx) { Game.drawOverlay(ctx); } });

    Engine.start();
  },

  // ── Save / Load ──
  loadSave() {
    try {
      const raw = localStorage.getItem('clowncity_save');
      if (raw) {
        const data = JSON.parse(raw);
        this.save = { ...this.save, ...data };
      }
    } catch (e) { /* ignore corrupt saves */ }
    // Ensure arrays are properly sized
    while (this.save.levelsComplete.length < this.totalLevels) this.save.levelsComplete.push(false);
    while (this.save.bestDeaths.length < this.totalLevels) this.save.bestDeaths.push(-1);
    while (this.save.gemsCollected.length < this.totalLevels) this.save.gemsCollected.push(0);
    while (this.save.totalGemsPerLevel.length < this.totalLevels) this.save.totalGemsPerLevel.push(0);
  },

  writeSave() {
    try {
      localStorage.setItem('clowncity_save', JSON.stringify(this.save));
    } catch (e) { /* localStorage full or disabled */ }
  },

  // ── Transition helpers ──
  fadeToBlack(callback) {
    this.transitionDir = 1;
    this.transitionAlpha = 0;
    this.transitionCallback = callback;
  },

  fadeFromBlack() {
    this.transitionDir = -1;
    this.transitionAlpha = 1;
    this.transitionCallback = null;
  },

  loadLevel(index) {
    this.currentLevel = index;
    Level.load(index);
    Player.setCheckpoint(Level.spawnX, Level.spawnY);
    Player.spawn(Level.spawnX, Level.spawnY);
    Player.deathCount = 0;
    this.levelTimer = 0;
    // Store total collectibles for save data
    this.save.totalGemsPerLevel[index] = Level.totalCollectibles;
  },

  update(dt) {
    this.timer += dt;

    // ── Transition fade ──
    if (this.transitionDir !== 0) {
      this.transitionAlpha += this.transitionDir * dt * 3;
      if (this.transitionDir === 1 && this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        this.transitionDir = 0;
        if (this.transitionCallback) this.transitionCallback();
      } else if (this.transitionDir === -1 && this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionDir = 0;
      }
      return;
    }

    // ── State dispatch ──
    if (this.state === 'title') this.updateTitle(dt);
    else if (this.state === 'levelSelect') this.updateLevelSelect(dt);
    else if (this.state === 'playing') this.updatePlaying(dt);
    else if (this.state === 'levelComplete') this.updateLevelComplete(dt);
    else if (this.state === 'paused') this.updatePaused(dt);
    else if (this.state === 'win') this.updateWin(dt);
  },

  // ── TITLE ──
  updateTitle(dt) {
    if (Input.pressed('Space') || Input.pressed('Enter') || Input.pressed('KeyZ')) {
      Audio.uiSelect();
      this.fadeToBlack(() => {
        this.state = 'levelSelect';
        this.timer = 0;
        this.fadeFromBlack();
      });
    }
    // Mute toggle
    if (Input.pressed('KeyM')) Audio.toggle();
  },

  // ── LEVEL SELECT ──
  _selectedLevel: 0,

  updateLevelSelect(dt) {
    // Navigate
    if (Input.pressed('ArrowRight') || Input.pressed('KeyD')) {
      this._selectedLevel = Math.min(this._selectedLevel + 1, this.totalLevels - 1);
      Audio.uiSelect();
    }
    if (Input.pressed('ArrowLeft') || Input.pressed('KeyA')) {
      this._selectedLevel = Math.max(this._selectedLevel - 1, 0);
      Audio.uiSelect();
    }
    // Check if level is accessible (previous level complete, or it's level 0)
    const accessible = this._selectedLevel === 0 || this.save.levelsComplete[this._selectedLevel - 1];

    // Select
    if ((Input.pressed('Space') || Input.pressed('Enter') || Input.pressed('KeyZ')) && accessible) {
      Audio.uiSelect();
      this.fadeToBlack(() => {
        this.state = 'playing';
        this.totalDeaths = 0;
        this.totalGems = 0;
        this.loadLevel(this._selectedLevel);
        this.fadeFromBlack();
      });
    }
    // Back to title
    if (Input.pressed('Escape')) {
      this.fadeToBlack(() => {
        this.state = 'title';
        this.fadeFromBlack();
      });
    }
    if (Input.pressed('KeyM')) Audio.toggle();
  },

  // ── PLAYING ──
  updatePlaying(dt) {
    this.levelTimer += dt;

    if (Input.pressed('Escape') || Input.pressed('KeyP')) {
      this.state = 'paused';
      return;
    }
    if (Input.pressed('KeyM')) Audio.toggle();

    if (Player.dead) return;

    // Checkpoints
    for (const cp of Level.checkpoints) {
      if (!cp.active &&
          Player.x + Player.w > cp.x && Player.x < cp.x + cp.w &&
          Player.y + Player.h > cp.y && Player.y < cp.y + cp.h) {
        for (const other of Level.checkpoints) other.active = false;
        cp.active = true;
        Player.setCheckpoint(cp.x, cp.y);
        Particles.burst(cp.x + cp.w / 2, cp.y + cp.h / 2, 12, 100, 'rgba(255, 215, 50, 0.7)', 0.3);
        Audio.checkpoint();
      }
    }

    // Collectibles
    for (const col of Level.collectibles) {
      if (!col.collected &&
          Player.x + Player.w > col.x + 4 && Player.x < col.x + col.w - 4 &&
          Player.y + Player.h > col.y + 4 && Player.y < col.y + col.h - 4) {
        col.collected = true;
        Level.collectedCount++;
        Particles.burst(
          col.x + col.w / 2, col.y + col.h / 2,
          8, 80, `rgba(${Level.getTheme().goalColor.join(',')}, 0.8)`, 0.25
        );
        Audio.collect();
      }
    }

    // Goal
    const goals = Level.getGoals();
    for (const g of goals) {
      if (Player.x + Player.w > g.x && Player.x < g.x + g.w &&
          Player.y + Player.h > g.y && Player.y < g.y + g.h) {
        Particles.burst(g.x + g.w / 2, g.y + g.h / 2, 30, 200, 'rgba(255, 215, 100, 0.7)', 0.5);
        Camera.shake(8);
        Audio.levelComplete();

        // Save progress
        this.totalDeaths += Player.deathCount;
        this.totalGems += Level.collectedCount;
        this.save.levelsComplete[this.currentLevel] = true;
        const bd = this.save.bestDeaths[this.currentLevel];
        if (bd === -1 || Player.deathCount < bd) {
          this.save.bestDeaths[this.currentLevel] = Player.deathCount;
        }
        const prevGems = this.save.gemsCollected[this.currentLevel];
        if (Level.collectedCount > prevGems) {
          this.save.gemsCollected[this.currentLevel] = Level.collectedCount;
        }
        this.writeSave();

        this.state = 'levelComplete';
        this.timer = 0;
        return;
      }
    }

    // Pit death
    if (Player.y > Level.levelHeight + 100) {
      Player.die();
    }

    // Restart current level
    if (Input.pressed('KeyR')) {
      Player.setCheckpoint(Level.spawnX, Level.spawnY);
      Player.spawn(Level.spawnX, Level.spawnY);
      Player.deathCount = 0;
    }
  },

  // ── LEVEL COMPLETE ──
  updateLevelComplete(dt) {
    if (this.timer > 1.5) {
      const nextLevel = this.currentLevel + 1;
      if (nextLevel >= this.totalLevels) {
        this.fadeToBlack(() => {
          this.state = 'win';
          this.timer = 0;
          this.fadeFromBlack();
        });
      } else {
        this.fadeToBlack(() => {
          this.state = 'playing';
          this.loadLevel(nextLevel);
          this.fadeFromBlack();
        });
      }
    }
  },

  // ── PAUSED ──
  updatePaused(dt) {
    if (Input.pressed('Escape') || Input.pressed('KeyP')) {
      this.state = 'playing';
    }
    if (Input.pressed('KeyR')) {
      this.state = 'playing';
      this.loadLevel(this.currentLevel);
    }
    if (Input.pressed('KeyQ')) {
      this.fadeToBlack(() => {
        this.state = 'levelSelect';
        this.timer = 0;
        this.fadeFromBlack();
      });
    }
    if (Input.pressed('KeyM')) Audio.toggle();
  },

  // ── WIN ──
  updateWin(dt) {
    if (Input.pressed('Space') || Input.pressed('Enter') || Input.pressed('KeyZ')) {
      Audio.uiSelect();
      this.fadeToBlack(() => {
        this.state = 'title';
        this.fadeFromBlack();
      });
    }
  },

  // ═══════════════════════════════════════════
  // DRAW
  // ═══════════════════════════════════════════
  drawOverlay(ctx) {
    if (this.state === 'title') this.drawTitle(ctx);
    else if (this.state === 'levelSelect') this.drawLevelSelect(ctx);
    else if (this.state === 'playing') this.drawHUD(ctx);
    else if (this.state === 'levelComplete') this.drawLevelComplete(ctx);
    else if (this.state === 'paused') { this.drawHUD(ctx); this.drawPause(ctx); }
    else if (this.state === 'win') this.drawWin(ctx);

    // Mute indicator
    if (Audio.muted) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('[MUTED - M to toggle]', Engine.width - 12, 18);
    }

    // Transition overlay
    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, Engine.width, Engine.height);
    }
  },

  drawTitle(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, Engine.height);
    grad.addColorStop(0, '#0a0a12');
    grad.addColorStop(1, '#1a0a20');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    const t = this.timer;
    ctx.fillStyle = 'rgba(200, 150, 50, 0.1)';
    for (let i = 0; i < 30; i++) {
      const px = (i * 137 + t * 20) % Engine.width;
      const py = (i * 89 + Math.sin(t + i) * 30) % Engine.height;
      ctx.fillRect(px, py, 2 + (i % 3), 2 + (i % 2));
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e0d0';
    ctx.font = 'bold 52px monospace';
    ctx.fillText('CLOWN CITY', Engine.width / 2, Engine.height / 2 - 60);

    ctx.fillStyle = 'rgba(200, 180, 150, 0.6)';
    ctx.font = '16px monospace';
    ctx.fillText('a momentum platformer', Engine.width / 2, Engine.height / 2 - 20);

    if (Math.sin(t * 3) > -0.3) {
      ctx.fillStyle = 'rgba(255, 215, 100, 0.8)';
      ctx.font = '18px monospace';
      ctx.fillText('PRESS SPACE', Engine.width / 2, Engine.height / 2 + 50);
    }

    ctx.fillStyle = 'rgba(150, 140, 130, 0.4)';
    ctx.font = '12px monospace';
    ctx.fillText('ARROWS / WASD = move    SPACE = jump    SHIFT = dash    M = mute', Engine.width / 2, Engine.height - 40);
  },

  drawLevelSelect(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, Engine.height);
    grad.addColorStop(0, '#0a0a12');
    grad.addColorStop(1, '#120a18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e0d0';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('SELECT LEVEL', Engine.width / 2, 80);

    const cardW = 180;
    const cardH = 140;
    const gap = 30;
    const totalW = this.totalLevels * cardW + (this.totalLevels - 1) * gap;
    const startX = (Engine.width - totalW) / 2;
    const cardY = Engine.height / 2 - cardH / 2;

    for (let i = 0; i < this.totalLevels; i++) {
      const x = startX + i * (cardW + gap);
      const selected = i === this._selectedLevel;
      const accessible = i === 0 || this.save.levelsComplete[i - 1];
      const complete = this.save.levelsComplete[i];
      const theme = Level.themes[Level.maps[i].theme];

      // Card background
      if (!accessible) {
        ctx.fillStyle = 'rgba(40, 40, 50, 0.6)';
      } else if (selected) {
        ctx.fillStyle = 'rgba(60, 50, 80, 0.9)';
      } else {
        ctx.fillStyle = 'rgba(30, 28, 40, 0.8)';
      }
      ctx.fillRect(x, cardY, cardW, cardH);

      // Selection border
      if (selected && accessible) {
        ctx.strokeStyle = 'rgba(255, 215, 100, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, cardY, cardW, cardH);
      }

      // Theme color bar at top
      ctx.fillStyle = accessible ? theme.tile[1] : 'rgba(60, 60, 60, 0.5)';
      ctx.fillRect(x, cardY, cardW, 4);

      // Level number
      ctx.fillStyle = accessible ? '#e8e0d0' : 'rgba(100, 100, 100, 0.5)';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`${i + 1}`, x + cardW / 2, cardY + 32);

      // Level name
      ctx.font = '13px monospace';
      ctx.fillStyle = accessible ? 'rgba(200, 190, 170, 0.8)' : 'rgba(100, 100, 100, 0.4)';
      ctx.fillText(Level.maps[i].name, x + cardW / 2, cardY + 55);

      if (!accessible) {
        // Locked
        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
        ctx.font = '20px monospace';
        ctx.fillText('LOCKED', x + cardW / 2, cardY + 90);
      } else if (complete) {
        // Stats
        ctx.fillStyle = 'rgba(100, 255, 150, 0.6)';
        ctx.font = '12px monospace';
        ctx.fillText('COMPLETE', x + cardW / 2, cardY + 80);
        const bd = this.save.bestDeaths[i];
        if (bd >= 0) {
          ctx.fillStyle = 'rgba(200, 190, 170, 0.5)';
          ctx.fillText(`best: ${bd} deaths`, x + cardW / 2, cardY + 98);
        }
        const gc = this.save.gemsCollected[i];
        const tc = this.save.totalGemsPerLevel[i];
        if (tc > 0) {
          ctx.fillText(`gems: ${gc} / ${tc}`, x + cardW / 2, cardY + 114);
        }
      } else {
        // Not yet played
        ctx.fillStyle = 'rgba(200, 190, 170, 0.3)';
        ctx.font = '12px monospace';
        ctx.fillText('—', x + cardW / 2, cardY + 90);
      }
    }

    // Instructions
    ctx.fillStyle = 'rgba(150, 140, 130, 0.5)';
    ctx.font = '13px monospace';
    ctx.fillText('LEFT / RIGHT to select    SPACE to play    ESC to go back', Engine.width / 2, Engine.height - 40);
  },

  drawHUD(ctx) {
    ctx.textAlign = 'left';

    // Level name fade-in
    if (this.levelTimer < 4) {
      const alpha = this.levelTimer < 2 ? 0.7 : 0.7 * (1 - (this.levelTimer - 2) / 2);
      ctx.fillStyle = `rgba(200, 190, 170, ${alpha})`;
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Level.maps[this.currentLevel].name, Engine.width / 2, 30);
      ctx.font = '12px monospace';
      ctx.fillText(`${this.currentLevel + 1} / ${this.totalLevels}`, Engine.width / 2, 48);
      ctx.textAlign = 'left';
    }

    // Death counter (top-left)
    if (Player.deathCount > 0) {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.7)';
      ctx.font = '14px monospace';
      ctx.fillText('deaths: ' + Player.deathCount, 16, 24);
    }

    // Gem counter (top-right)
    if (Level.totalCollectibles > 0) {
      const gc = Level.getTheme().goalColor;
      ctx.fillStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, 0.8)`;
      ctx.font = '14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`gems: ${Level.collectedCount} / ${Level.totalCollectibles}`, Engine.width - 16, 24);
      ctx.textAlign = 'left';
    }
  },

  drawLevelComplete(ctx) {
    ctx.textAlign = 'center';
    const alpha = Math.min(1, this.timer * 2);

    ctx.fillStyle = `rgba(255, 215, 100, ${alpha * 0.9})`;
    ctx.font = 'bold 28px monospace';
    ctx.fillText('LEVEL COMPLETE', Engine.width / 2, Engine.height / 2 - 20);

    ctx.fillStyle = `rgba(200, 180, 150, ${alpha * 0.5})`;
    ctx.font = '14px monospace';
    if (Player.deathCount > 0) {
      ctx.fillText(`deaths: ${Player.deathCount}`, Engine.width / 2, Engine.height / 2 + 12);
    }
    if (Level.totalCollectibles > 0) {
      ctx.fillText(`gems: ${Level.collectedCount} / ${Level.totalCollectibles}`, Engine.width / 2, Engine.height / 2 + 32);
    }
  },

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e0d0';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('PAUSED', Engine.width / 2, Engine.height / 2 - 50);

    ctx.fillStyle = 'rgba(200, 190, 170, 0.7)';
    ctx.font = '14px monospace';
    ctx.fillText('ESC / P  —  resume', Engine.width / 2, Engine.height / 2);
    ctx.fillText('R  —  restart level', Engine.width / 2, Engine.height / 2 + 25);
    ctx.fillText('Q  —  quit to level select', Engine.width / 2, Engine.height / 2 + 50);
    ctx.fillText('M  —  toggle mute', Engine.width / 2, Engine.height / 2 + 75);
  },

  drawWin(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, Engine.height);
    grad.addColorStop(0, '#0a0a12');
    grad.addColorStop(1, '#14100a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    const t = this.timer;
    for (let i = 0; i < 40; i++) {
      const hue = (i * 37 + t * 50) % 360;
      const px = (i * 97 + Math.sin(t * 0.7 + i) * 40) % Engine.width;
      const py = (i * 61 + t * 15) % Engine.height;
      ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.15)`;
      ctx.fillRect(px, py, 3, 3);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd764';
    ctx.font = 'bold 42px monospace';
    ctx.fillText('CONGRATULATIONS', Engine.width / 2, Engine.height / 2 - 70);

    ctx.fillStyle = '#e8e0d0';
    ctx.font = '18px monospace';
    ctx.fillText('You escaped Clown City', Engine.width / 2, Engine.height / 2 - 25);

    ctx.fillStyle = 'rgba(200, 190, 170, 0.7)';
    ctx.font = '14px monospace';
    ctx.fillText(`total deaths: ${this.totalDeaths}`, Engine.width / 2, Engine.height / 2 + 15);
    ctx.fillText(`total gems: ${this.totalGems}`, Engine.width / 2, Engine.height / 2 + 38);

    if (Math.sin(t * 3) > -0.3) {
      ctx.fillStyle = 'rgba(255, 215, 100, 0.6)';
      ctx.font = '16px monospace';
      ctx.fillText('PRESS SPACE', Engine.width / 2, Engine.height / 2 + 80);
    }
  }
};

// Boot
window.addEventListener('load', () => Game.init());
