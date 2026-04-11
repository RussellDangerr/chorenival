// ─── Entities: moving platforms, hazards, enemies ───
const Entities = {
  list: [],

  clear() {
    this.list = [];
  },

  // Spawn entities from a level's entity definitions
  loadFromMap(entityDefs) {
    this.clear();
    if (!entityDefs) return;
    for (const def of entityDefs) {
      if (def.type === 'platform') {
        this.list.push(new MovingPlatform(def));
      } else if (def.type === 'sawblade') {
        this.list.push(new Sawblade(def));
      } else if (def.type === 'patrol') {
        this.list.push(new PatrolEnemy(def));
      } else if (def.type === 'oneway') {
        this.list.push(new OneWayPlatform(def));
      }
    }
  },

  update(dt) {
    for (const e of this.list) e.update(dt);
  },

  draw(ctx) {
    ctx.save();
    ctx.translate(-Camera.x, -Camera.y);
    for (const e of this.list) e.draw(ctx);
    ctx.restore();
  },

  // Get all solid rects the player should collide with (platforms, one-ways)
  getSolidRects() {
    const rects = [];
    for (const e of this.list) {
      if (e.getSolidRect) rects.push(e.getSolidRect());
    }
    return rects;
  },

  // Get all hazard rects (sawblades, enemies)
  getHazardRects() {
    const rects = [];
    for (const e of this.list) {
      if (e.getHazardRect) rects.push(e.getHazardRect());
    }
    return rects;
  },

  // Get one-way platforms specifically (need special collision)
  getOneWayRects() {
    const rects = [];
    for (const e of this.list) {
      if (e instanceof OneWayPlatform) rects.push(e.getSolidRect());
    }
    return rects;
  }
};

// ═══════════════════════════════════════════
// MOVING PLATFORM
// Moves between two points. Player rides it.
// ═══════════════════════════════════════════
class MovingPlatform {
  constructor({ x, y, w, h, toX, toY, speed, wait }) {
    this.startX = x; this.startY = y;
    this.endX = toX ?? x; this.endY = toY ?? y;
    this.w = w || 64; this.h = h || 12;
    this.speed = speed || 60;
    this.wait = wait || 0.5;
    this.x = x; this.y = y;
    this.prevX = x; this.prevY = y;
    this.t = 0;         // 0 = at start, 1 = at end
    this.dir = 1;       // 1 = going to end, -1 = going to start
    this.waitTimer = 0;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;

    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      return;
    }

    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const step = (this.speed / dist) * dt;

    this.t += this.dir * step;
    if (this.t >= 1) {
      this.t = 1; this.dir = -1; this.waitTimer = this.wait;
    } else if (this.t <= 0) {
      this.t = 0; this.dir = 1; this.waitTimer = this.wait;
    }

    this.x = this.startX + dx * this.t;
    this.y = this.startY + dy * this.t;
  }

  getSolidRect() {
    return {
      x: this.x, y: this.y, w: this.w, h: this.h,
      // Delta so player can ride the platform
      dx: this.x - this.prevX,
      dy: this.y - this.prevY,
      isMoving: true
    };
  }

  draw(ctx) {
    const theme = Level.getTheme();
    ctx.fillStyle = theme.tile[1];
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = theme.tile[2];
    ctx.fillRect(this.x + 1, this.y, this.w - 2, 2);
    // Subtle edge dots to show it moves
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(this.x + 4, this.y + this.h / 2 - 1, 2, 2);
    ctx.fillRect(this.x + this.w - 6, this.y + this.h / 2 - 1, 2, 2);
  }
}

// ═══════════════════════════════════════════
// ONE-WAY PLATFORM
// Player passes through from below, lands on top.
// ═══════════════════════════════════════════
class OneWayPlatform {
  constructor({ x, y, w }) {
    this.x = x; this.y = y;
    this.w = w || 64; this.h = 8;
  }

  update(dt) {}

  getSolidRect() {
    return {
      x: this.x, y: this.y, w: this.w, h: this.h,
      oneWay: true
    };
  }

  draw(ctx) {
    const theme = Level.getTheme();
    // Dashed/thin platform to visually signal one-way
    ctx.fillStyle = theme.tile[2];
    for (let dx = 0; dx < this.w; dx += 8) {
      ctx.fillRect(this.x + dx, this.y, 5, 3);
    }
    // Faint line underneath
    ctx.fillStyle = `rgba(255,255,255,0.06)`;
    ctx.fillRect(this.x, this.y + 3, this.w, 1);
  }
}

// ═══════════════════════════════════════════
// SAWBLADE
// Moves along a path. Kills on contact.
// ═══════════════════════════════════════════
class Sawblade {
  constructor({ x, y, toX, toY, speed, radius }) {
    this.startX = x; this.startY = y;
    this.endX = toX ?? x; this.endY = toY ?? y;
    this.speed = speed || 80;
    this.radius = radius || 12;
    this.x = x; this.y = y;
    this.t = 0;
    this.dir = 1;
    this.angle = 0;
  }

  update(dt) {
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const step = (this.speed / dist) * dt;

    this.t += this.dir * step;
    if (this.t >= 1) { this.t = 1; this.dir = -1; }
    else if (this.t <= 0) { this.t = 0; this.dir = 1; }

    this.x = this.startX + dx * this.t;
    this.y = this.startY + dy * this.t;
    this.angle += dt * 8; // spin
  }

  getHazardRect() {
    const r = this.radius - 2; // slightly forgiving
    return { x: this.x - r, y: this.y - r, w: r * 2, h: r * 2 };
  }

  draw(ctx) {
    const r = this.radius;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Blade body
    ctx.fillStyle = '#aa3333';
    ctx.beginPath();
    const teeth = 8;
    for (let i = 0; i < teeth; i++) {
      const a1 = (i / teeth) * Math.PI * 2;
      const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
      const outerR = r;
      const innerR = r * 0.65;
      ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
      ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
    }
    ctx.closePath();
    ctx.fill();

    // Center
    ctx.fillStyle = '#661a1a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ═══════════════════════════════════════════
// PATROL ENEMY
// Walks back and forth on platforms. Kills on contact.
// ═══════════════════════════════════════════
class PatrolEnemy {
  constructor({ x, y, range, speed }) {
    this.startX = x;
    this.x = x; this.y = y;
    this.w = 20; this.h = 20;
    this.range = range || 128;
    this.speed = speed || 50;
    this.dir = 1;
    this.animTimer = 0;
  }

  update(dt) {
    this.x += this.dir * this.speed * dt;
    this.animTimer += dt;

    // Reverse at range limits
    if (this.x > this.startX + this.range) {
      this.x = this.startX + this.range;
      this.dir = -1;
    } else if (this.x < this.startX) {
      this.x = this.startX;
      this.dir = 1;
    }
  }

  getHazardRect() {
    // Slightly smaller than visual for forgiveness
    return { x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 4 };
  }

  draw(ctx) {
    // Body
    ctx.fillStyle = '#cc4444';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    // Lighter middle
    ctx.fillStyle = '#dd6666';
    ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);

    // Googly eyes (LBP-inspired!)
    const eyeX = this.dir > 0 ? this.x + this.w * 0.6 : this.x + this.w * 0.2;
    const eyeX2 = this.dir > 0 ? this.x + this.w * 0.35 : this.x + this.w * 0.45;
    // White
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eyeX, this.y + 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX2, this.y + 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Pupils (jiggle slightly)
    const jiggle = Math.sin(this.animTimer * 6) * 1;
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(eyeX + this.dir * 1.5, this.y + 7 + jiggle, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX2 + this.dir * 1, this.y + 7 + jiggle * 0.8, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Little legs animation
    const legOffset = Math.sin(this.animTimer * 10) * 2;
    ctx.fillStyle = '#aa3333';
    ctx.fillRect(this.x + 3, this.y + this.h, 3, 4 + legOffset);
    ctx.fillRect(this.x + this.w - 6, this.y + this.h, 3, 4 - legOffset);
  }
}
