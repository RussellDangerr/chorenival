// ─── Particles: lightweight particle system ───
const Particles = {
  pool: [],
  maxParticles: 300,

  // `size` is optional — pass it for chunkier bursts (e.g. the carnival spray);
  // omit it and particles default to the usual small 2-4px dust.
  // `lethal` (optional) marks a particle as able to kill enemies it lands on —
  // the combat spray uses this so the visible confetti IS the hitbox.
  emit(x, y, vx, vy, color, life, size, lethal) {
    if (this.pool.length >= this.maxParticles) {
      this.pool[0] = this.pool[this.pool.length - 1];
      this.pool.pop();
    }
    this.pool.push({
      x, y, vx, vy, color,
      life, maxLife: life,
      size: size != null ? size * (0.7 + Math.random() * 0.6) : 2 + Math.random() * 2,
      lethal: !!lethal
    });
  },

  burst(x, y, count, speed, color, life) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.5);
      this.emit(x, y, Math.cos(angle) * spd, Math.sin(angle) * spd, color, life);
    }
  },

  update(dt) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;  // gravity on particles
      p.life -= dt;
      if (p.life <= 0) {
        this.pool[i] = this.pool[this.pool.length - 1];
        this.pool.pop();
      }
    }
  },

  draw(ctx) {
    ctx.save();
    ctx.translate(-Camera.x, -Camera.y);
    for (const p of this.pool) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const s = p.size * alpha;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};
