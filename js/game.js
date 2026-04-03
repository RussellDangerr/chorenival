// ─── Game: main entry point ───
const Game = {
  state: 'playing',  // 'playing', 'transition'
  timer: 0,

  init() {
    Engine.init();
    Input.init();
    Level.load(0);

    // Set initial checkpoint to spawn point
    Player.setCheckpoint(Level.spawnX, Level.spawnY);
    Player.spawn(Level.spawnX, Level.spawnY);

    // Register systems in update/draw order
    Engine.register(Input);
    Engine.register(this);
    Engine.register(Level);     // draws background + tiles
    Engine.register(Particles);
    Engine.register({
      // Player wrapper to handle camera-space drawing
      update(dt) { Player.update(dt); },
      draw(ctx) {
        ctx.save();
        ctx.translate(-Camera.x, -Camera.y);
        Player.draw(ctx);
        ctx.restore();
      }
    });
    Engine.register(Camera);

    // HUD drawn last, in screen space
    Engine.register({
      draw(ctx) { Game.drawHUD(ctx); }
    });

    Engine.start();
  },

  update(dt) {
    this.timer += dt;

    // Don't process game logic while player is dead
    if (Player.dead) return;

    // Check checkpoints
    for (const cp of Level.checkpoints) {
      if (!cp.active &&
          Player.x + Player.w > cp.x && Player.x < cp.x + cp.w &&
          Player.y + Player.h > cp.y && Player.y < cp.y + cp.h) {
        // Activate this checkpoint, deactivate others
        for (const other of Level.checkpoints) other.active = false;
        cp.active = true;
        Player.setCheckpoint(cp.x, cp.y);
        // Checkpoint activation effect
        Particles.burst(
          cp.x + cp.w / 2, cp.y + cp.h / 2,
          12, 100, 'rgba(255, 215, 50, 0.7)', 0.3
        );
      }
    }

    // Check goal
    const goals = Level.getGoals();
    for (const g of goals) {
      if (Player.x + Player.w > g.x && Player.x < g.x + g.w &&
          Player.y + Player.h > g.y && Player.y < g.y + g.h) {
        // Reached goal — burst effect
        Particles.burst(
          g.x + g.w / 2, g.y + g.h / 2,
          30, 200, 'rgba(255, 215, 100, 0.7)', 0.5
        );
        Camera.shake(8);
        // TODO: level transition — for now, respawn
        Player.setCheckpoint(Level.spawnX, Level.spawnY);
        Player.spawn(Level.spawnX, Level.spawnY);
      }
    }

    // Fall off level = die
    if (Player.y > Level.levelHeight + 100) {
      Player.die();
    }

    // Restart
    if (Input.pressed('KeyR')) {
      Player.setCheckpoint(Level.spawnX, Level.spawnY);
      Player.spawn(Level.spawnX, Level.spawnY);
      Player.deathCount = 0;
    }
  },

  drawHUD(ctx) {
    // Death counter (top-left)
    if (Player.deathCount > 0) {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.7)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('deaths: ' + Player.deathCount, 16, 24);
    }

    // Controls hint (fades after 5 seconds)
    if (this.timer < 7) {
      const alpha = this.timer < 5 ? 0.6 : 0.6 * (1 - (this.timer - 5) / 2);
      ctx.fillStyle = `rgba(180, 190, 220, ${alpha})`;
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ARROWS / WASD = move + jump    SHIFT / Z = dash    R = restart', Engine.width / 2, Engine.height - 20);
    }
  }
};

// Boot
window.addEventListener('load', () => Game.init());
