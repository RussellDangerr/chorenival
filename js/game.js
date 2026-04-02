// ─── Game: main entry point ───
const Game = {
  state: 'playing',  // 'playing', 'transition'
  timer: 0,

  init() {
    Engine.init();
    Input.init();
    Level.load(0);
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

    // Check goal
    const goals = Level.getGoals();
    for (const g of goals) {
      if (Player.x + Player.w > g.x && Player.x < g.x + g.w &&
          Player.y + Player.h > g.y && Player.y < g.y + g.h) {
        // Reached goal — burst effect
        Particles.burst(
          g.x + g.w / 2, g.y + g.h / 2,
          30, 200, 'rgba(100, 255, 200, 0.7)', 0.5
        );
        Camera.shake(8);
        // Respawn for now (will add level progression later)
        Player.spawn(Level.spawnX, Level.spawnY);
      }
    }

    // Fall off level = respawn
    if (Player.y > Level.levelHeight + 100) {
      Player.spawn(Level.spawnX, Level.spawnY);
      Camera.shake(4);
    }

    // Restart
    if (Input.pressed('KeyR')) {
      Player.spawn(Level.spawnX, Level.spawnY);
    }
  },

  drawHUD(ctx) {
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
