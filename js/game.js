// ─── Game: main entry point + state machine ───
// States: title -> playing -> levelComplete -> (next level or win) -> credits
// Pause overlay available during 'playing'
const Game = {
  state: 'title',    // 'title', 'playing', 'levelComplete', 'win', 'paused'
  timer: 0,
  levelTimer: 0,
  currentLevel: 0,
  totalLevels: 0,
  transitionAlpha: 0,
  transitionDir: 0,     // 1 = fading in (to black), -1 = fading out (from black)
  transitionCallback: null,
  totalDeaths: 0,

  init() {
    Engine.init();
    Input.init();
    this.totalLevels = Level.maps.length;

    // Register systems in update/draw order
    Engine.register(Input);
    Engine.register(this);
    Engine.register(Level);
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

  // ── Transition helper ──
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
  },

  update(dt) {
    this.timer += dt;

    // ── Transition fade ──
    if (this.transitionDir !== 0) {
      this.transitionAlpha += this.transitionDir * dt * 3; // ~0.33s fade
      if (this.transitionDir === 1 && this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        this.transitionDir = 0;
        if (this.transitionCallback) this.transitionCallback();
      } else if (this.transitionDir === -1 && this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionDir = 0;
      }
      return; // Don't process game logic during transitions
    }

    // ── State-specific updates ──
    if (this.state === 'title') {
      this.updateTitle(dt);
    } else if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'levelComplete') {
      this.updateLevelComplete(dt);
    } else if (this.state === 'paused') {
      this.updatePaused(dt);
    } else if (this.state === 'win') {
      this.updateWin(dt);
    }
  },

  // ── TITLE SCREEN ──
  updateTitle(dt) {
    if (Input.pressed('Space') || Input.pressed('Enter') || Input.pressed('KeyZ')) {
      this.fadeToBlack(() => {
        this.state = 'playing';
        this.totalDeaths = 0;
        this.loadLevel(0);
        this.fadeFromBlack();
      });
    }
  },

  // ── PLAYING ──
  updatePlaying(dt) {
    this.levelTimer += dt;

    // Pause
    if (Input.pressed('Escape') || Input.pressed('KeyP')) {
      this.state = 'paused';
      return;
    }

    // Don't process while dead (player handles its own death timer)
    if (Player.dead) return;

    // Check checkpoints
    for (const cp of Level.checkpoints) {
      if (!cp.active &&
          Player.x + Player.w > cp.x && Player.x < cp.x + cp.w &&
          Player.y + Player.h > cp.y && Player.y < cp.y + cp.h) {
        for (const other of Level.checkpoints) other.active = false;
        cp.active = true;
        Player.setCheckpoint(cp.x, cp.y);
        Particles.burst(cp.x + cp.w / 2, cp.y + cp.h / 2, 12, 100, 'rgba(255, 215, 50, 0.7)', 0.3);
      }
    }

    // Check goal
    const goals = Level.getGoals();
    for (const g of goals) {
      if (Player.x + Player.w > g.x && Player.x < g.x + g.w &&
          Player.y + Player.h > g.y && Player.y < g.y + g.h) {
        Particles.burst(g.x + g.w / 2, g.y + g.h / 2, 30, 200, 'rgba(255, 215, 100, 0.7)', 0.5);
        Camera.shake(8);
        this.totalDeaths += Player.deathCount;
        this.state = 'levelComplete';
        this.timer = 0;
        return;
      }
    }

    // Fall off level = die
    if (Player.y > Level.levelHeight + 100) {
      Player.die();
    }

    // Full restart (back to level 1)
    if (Input.pressed('KeyR')) {
      Player.setCheckpoint(Level.spawnX, Level.spawnY);
      Player.spawn(Level.spawnX, Level.spawnY);
      Player.deathCount = 0;
    }
  },

  // ── LEVEL COMPLETE ──
  updateLevelComplete(dt) {
    // Brief pause to show the celebration, then transition
    if (this.timer > 1.5) {
      const nextLevel = this.currentLevel + 1;
      if (nextLevel >= this.totalLevels) {
        // Beat the game!
        this.fadeToBlack(() => {
          this.state = 'win';
          this.timer = 0;
          this.fadeFromBlack();
        });
      } else {
        // Next level
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
    // Restart level from pause
    if (Input.pressed('KeyR')) {
      this.state = 'playing';
      this.loadLevel(this.currentLevel);
    }
    // Quit to title
    if (Input.pressed('KeyQ')) {
      this.fadeToBlack(() => {
        this.state = 'title';
        this.fadeFromBlack();
      });
    }
  },

  // ── WIN SCREEN ──
  updateWin(dt) {
    if (Input.pressed('Space') || Input.pressed('Enter') || Input.pressed('KeyZ')) {
      this.fadeToBlack(() => {
        this.state = 'title';
        this.fadeFromBlack();
      });
    }
  },

  // ── DRAW OVERLAY (all screens, HUD, transitions) ──
  drawOverlay(ctx) {
    // State-specific overlays
    if (this.state === 'title') {
      this.drawTitle(ctx);
    } else if (this.state === 'playing') {
      this.drawHUD(ctx);
    } else if (this.state === 'levelComplete') {
      this.drawLevelComplete(ctx);
    } else if (this.state === 'paused') {
      this.drawHUD(ctx);
      this.drawPause(ctx);
    } else if (this.state === 'win') {
      this.drawWin(ctx);
    }

    // Transition fade overlay (always on top)
    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, Engine.width, Engine.height);
    }
  },

  drawTitle(ctx) {
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, Engine.height);
    grad.addColorStop(0, '#0a0a12');
    grad.addColorStop(1, '#1a0a20');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    // Floating particles in background
    const t = this.timer;
    ctx.fillStyle = 'rgba(200, 150, 50, 0.1)';
    for (let i = 0; i < 30; i++) {
      const px = (i * 137 + t * 20) % Engine.width;
      const py = (i * 89 + Math.sin(t + i) * 30) % Engine.height;
      ctx.fillRect(px, py, 2 + (i % 3), 2 + (i % 2));
    }

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#e8e0d0';
    ctx.font = 'bold 52px monospace';
    ctx.fillText('CLOWN CITY', Engine.width / 2, Engine.height / 2 - 60);

    // Subtitle
    ctx.fillStyle = 'rgba(200, 180, 150, 0.6)';
    ctx.font = '16px monospace';
    ctx.fillText('a momentum platformer', Engine.width / 2, Engine.height / 2 - 20);

    // Prompt (blinking)
    if (Math.sin(t * 3) > -0.3) {
      ctx.fillStyle = 'rgba(255, 215, 100, 0.8)';
      ctx.font = '18px monospace';
      ctx.fillText('PRESS SPACE TO START', Engine.width / 2, Engine.height / 2 + 50);
    }

    // Credits
    ctx.fillStyle = 'rgba(150, 140, 130, 0.4)';
    ctx.font = '12px monospace';
    ctx.fillText('ARROWS / WASD = move    SPACE = jump    SHIFT = dash', Engine.width / 2, Engine.height - 40);
  },

  drawHUD(ctx) {
    ctx.textAlign = 'left';

    // Level name (top-center, fades)
    if (this.levelTimer < 4) {
      const alpha = this.levelTimer < 2 ? 0.7 : 0.7 * (1 - (this.levelTimer - 2) / 2);
      ctx.fillStyle = `rgba(200, 190, 170, ${alpha})`;
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      const mapName = Level.maps[this.currentLevel].name;
      ctx.fillText(mapName, Engine.width / 2, 30);
      ctx.font = '12px monospace';
      ctx.fillText(`${this.currentLevel + 1} / ${this.totalLevels}`, Engine.width / 2, 48);
      ctx.textAlign = 'left';
    }

    // Death counter
    if (Player.deathCount > 0) {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.7)';
      ctx.font = '14px monospace';
      ctx.fillText('deaths: ' + Player.deathCount, 16, 24);
    }
  },

  drawLevelComplete(ctx) {
    ctx.textAlign = 'center';
    const alpha = Math.min(1, this.timer * 2);
    ctx.fillStyle = `rgba(255, 215, 100, ${alpha * 0.9})`;
    ctx.font = 'bold 28px monospace';
    ctx.fillText('LEVEL COMPLETE', Engine.width / 2, Engine.height / 2 - 10);

    if (Player.deathCount > 0) {
      ctx.fillStyle = `rgba(200, 180, 150, ${alpha * 0.5})`;
      ctx.font = '14px monospace';
      ctx.fillText(`deaths: ${Player.deathCount}`, Engine.width / 2, Engine.height / 2 + 20);
    }
  },

  drawPause(ctx) {
    // Dim overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e0d0';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('PAUSED', Engine.width / 2, Engine.height / 2 - 40);

    ctx.fillStyle = 'rgba(200, 190, 170, 0.7)';
    ctx.font = '14px monospace';
    ctx.fillText('ESC / P  —  resume', Engine.width / 2, Engine.height / 2 + 10);
    ctx.fillText('R  —  restart level', Engine.width / 2, Engine.height / 2 + 35);
    ctx.fillText('Q  —  quit to title', Engine.width / 2, Engine.height / 2 + 60);
  },

  drawWin(ctx) {
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, Engine.height);
    grad.addColorStop(0, '#0a0a12');
    grad.addColorStop(1, '#14100a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    // Celebration particles
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
    ctx.fillText('CONGRATULATIONS', Engine.width / 2, Engine.height / 2 - 60);

    ctx.fillStyle = '#e8e0d0';
    ctx.font = '18px monospace';
    ctx.fillText('You escaped Clown City', Engine.width / 2, Engine.height / 2 - 15);

    // Stats
    ctx.fillStyle = 'rgba(200, 190, 170, 0.7)';
    ctx.font = '14px monospace';
    ctx.fillText(`total deaths: ${this.totalDeaths}`, Engine.width / 2, Engine.height / 2 + 30);

    // Prompt
    if (Math.sin(t * 3) > -0.3) {
      ctx.fillStyle = 'rgba(255, 215, 100, 0.6)';
      ctx.font = '16px monospace';
      ctx.fillText('PRESS SPACE TO RETURN', Engine.width / 2, Engine.height / 2 + 80);
    }
  }
};

// Boot
window.addEventListener('load', () => Game.init());
