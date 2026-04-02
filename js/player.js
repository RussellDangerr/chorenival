// ─── Player: momentum-based platformer character ───
const Player = {
  // Position & size
  x: 100, y: 300,
  w: 14, h: 28,

  // Velocity
  vx: 0, vy: 0,

  // Movement tuning — inspired by N / Fancy Pants feel
  groundAccel: 2800,
  airAccel: 1800,
  groundFriction: 12,
  airFriction: 2,
  maxRunSpeed: 320,
  maxFallSpeed: 700,

  // Jump tuning
  jumpForce: -460,
  jumpCutMultiplier: 0.4,   // release early = short hop
  gravity: 1400,

  // Wall mechanics
  wallSlideSpeed: 80,
  wallJumpForce: { x: 340, y: -420 },
  wallStickTime: 0.06,      // brief stick before sliding

  // Coyote time / jump buffer
  coyoteTime: 0.08,
  coyoteTimer: 0,

  // State
  grounded: false,
  wallDir: 0,               // -1 left wall, 1 right wall, 0 none
  wallStickTimer: 0,
  facing: 1,
  jumpHeld: false,

  // Animation state
  squash: 1,                // 1 = normal, <1 = squashed, >1 = stretched
  squashTarget: 1,
  trail: [],

  // Dash
  canDash: true,
  dashing: false,
  dashTimer: 0,
  dashDuration: 0.12,
  dashSpeed: 700,

  spawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.coyoteTimer = 0;
  },

  update(dt) {
    const leftHeld = Input.held('ArrowLeft') || Input.held('KeyA');
    const rightHeld = Input.held('ArrowRight') || Input.held('KeyD');
    const jumpBuffered = Input.buffered('Space') || Input.buffered('ArrowUp') || Input.buffered('KeyW');
    const jumpHeldNow = Input.held('Space') || Input.held('ArrowUp') || Input.held('KeyW');
    const dashPressed = Input.pressed('ShiftLeft') || Input.pressed('ShiftRight') || Input.pressed('KeyZ');

    let moveDir = 0;
    if (leftHeld) moveDir -= 1;
    if (rightHeld) moveDir += 1;

    if (moveDir !== 0) this.facing = moveDir;

    // ── Dash ──
    if (dashPressed && this.canDash && !this.dashing) {
      this.dashing = true;
      this.dashTimer = this.dashDuration;
      this.canDash = false;
      this.vx = this.facing * this.dashSpeed;
      this.vy = 0;
      this.squash = 0.5;
      // Dash particles
      for (let i = 0; i < 8; i++) {
        Particles.emit(
          this.x + this.w / 2, this.y + this.h / 2,
          -this.facing * (100 + Math.random() * 200),
          (Math.random() - 0.5) * 100,
          'rgba(255,255,255,0.6)', 0.2 + Math.random() * 0.15
        );
      }
    }

    if (this.dashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.dashing = false;
        this.vx *= 0.6;
      }
      // During dash: no gravity, no friction
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.resolveCollisions();
      return;
    }

    // ── Horizontal movement ──
    const accel = this.grounded ? this.groundAccel : this.airAccel;
    const friction = this.grounded ? this.groundFriction : this.airFriction;

    if (moveDir !== 0) {
      this.vx += moveDir * accel * dt;
      // Clamp to max speed
      if (Math.abs(this.vx) > this.maxRunSpeed) {
        this.vx = Math.sign(this.vx) * this.maxRunSpeed;
      }
    } else {
      // Apply friction
      this.vx -= this.vx * friction * dt;
      if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // ── Gravity ──
    this.vy += this.gravity * dt;
    if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;

    // ── Wall slide ──
    if (this.wallDir !== 0 && !this.grounded && this.vy > 0) {
      if (this.vy > this.wallSlideSpeed) {
        this.vy = this.wallSlideSpeed;
      }
    }

    // ── Coyote time ──
    if (this.grounded) {
      this.coyoteTimer = this.coyoteTime;
    } else {
      this.coyoteTimer -= dt;
    }

    // ── Jump ──
    if (jumpBuffered) {
      if (this.coyoteTimer > 0) {
        // Ground jump
        this.vy = this.jumpForce;
        this.coyoteTimer = 0;
        this.grounded = false;
        this.jumpHeld = true;
        this.squash = 1.4;
        Input.consumeBuffer('Space');
        Input.consumeBuffer('ArrowUp');
        Input.consumeBuffer('KeyW');
        // Jump particles
        for (let i = 0; i < 5; i++) {
          Particles.emit(
            this.x + Math.random() * this.w, this.y + this.h,
            (Math.random() - 0.5) * 80, 40 + Math.random() * 40,
            'rgba(255,255,255,0.4)', 0.15 + Math.random() * 0.1
          );
        }
      } else if (this.wallDir !== 0) {
        // Wall jump
        this.vx = -this.wallDir * this.wallJumpForce.x;
        this.vy = this.wallJumpForce.y;
        this.facing = -this.wallDir;
        this.jumpHeld = true;
        this.squash = 1.3;
        Input.consumeBuffer('Space');
        Input.consumeBuffer('ArrowUp');
        Input.consumeBuffer('KeyW');
        // Wall jump particles
        for (let i = 0; i < 5; i++) {
          Particles.emit(
            this.x + (this.wallDir > 0 ? this.w : 0), this.y + Math.random() * this.h,
            -this.wallDir * (50 + Math.random() * 100), (Math.random() - 0.5) * 60,
            'rgba(255,255,255,0.4)', 0.15 + Math.random() * 0.1
          );
        }
      }
    }

    // ── Variable jump height: release to cut short ──
    if (this.jumpHeld && !jumpHeldNow && this.vy < 0) {
      this.vy *= this.jumpCutMultiplier;
      this.jumpHeld = false;
    }
    if (jumpHeldNow) this.jumpHeld = true;

    // ── Apply velocity ──
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // ── Resolve collisions ──
    this.resolveCollisions();

    // ── Squash & stretch animation ──
    this.squash += (this.squashTarget - this.squash) * 12 * dt;
    if (Math.abs(this.squash - this.squashTarget) < 0.01) this.squash = this.squashTarget;
    this.squashTarget = 1;

    // ── Movement trail ──
    if (Math.abs(this.vx) > 100 || Math.abs(this.vy) > 100) {
      this.trail.push({ x: this.x + this.w / 2, y: this.y + this.h / 2, alpha: 0.3 });
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= dt * 2;
      if (this.trail[i].alpha <= 0) this.trail.splice(i, 1);
    }

    // Reset dash on ground
    if (this.grounded) this.canDash = true;
  },

  resolveCollisions() {
    this.grounded = false;
    this.wallDir = 0;

    const tiles = Level.getTilesNear(this.x, this.y, this.w, this.h);

    for (const tile of tiles) {
      // AABB overlap
      const overlapX = Math.min(this.x + this.w, tile.x + tile.w) - Math.max(this.x, tile.x);
      const overlapY = Math.min(this.y + this.h, tile.y + tile.h) - Math.max(this.y, tile.y);

      if (overlapX <= 0 || overlapY <= 0) continue;

      // Resolve along the smallest axis
      if (overlapX < overlapY) {
        // Horizontal
        const pushDir = (this.x + this.w / 2) < (tile.x + tile.w / 2) ? -1 : 1;
        this.x += pushDir * overlapX;
        this.vx = 0;
        this.wallDir = -pushDir;
        this.wallStickTimer = this.wallStickTime;
      } else {
        // Vertical
        const pushDir = (this.y + this.h / 2) < (tile.y + tile.h / 2) ? -1 : 1;
        this.y += pushDir * overlapY;
        if (pushDir === -1) {
          // Landed
          if (this.vy > 200) {
            this.squash = 0.6;
            // Land particles
            for (let i = 0; i < 4; i++) {
              Particles.emit(
                this.x + Math.random() * this.w, this.y + this.h,
                (Math.random() - 0.5) * 120, -(20 + Math.random() * 40),
                'rgba(255,255,255,0.3)', 0.2 + Math.random() * 0.1
              );
            }
          }
          this.grounded = true;
          this.vy = 0;
        } else {
          // Hit ceiling
          this.vy = 0;
        }
      }
    }
  },

  draw(ctx) {
    // Trail
    for (const t of this.trail) {
      ctx.fillStyle = `rgba(200, 220, 255, ${t.alpha * 0.3})`;
      ctx.fillRect(t.x - 3, t.y - 3, 6, 6);
    }

    // Player body with squash & stretch
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h;
    const sw = this.w * (1 / this.squash);
    const sh = this.h * this.squash;

    ctx.save();
    ctx.translate(cx, cy);

    // Body
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(-sw / 2, -sh, sw, sh);

    // Eyes
    const eyeY = -sh * 0.7;
    const eyeSpacing = sw * 0.22;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-eyeSpacing - 2, eyeY, 3, 4);
    ctx.fillRect(eyeSpacing, eyeY, 3, 4);

    // Direction indicator (little dash in facing direction)
    if (Math.abs(this.vx) > 30) {
      ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
      const ix = this.facing * sw / 2;
      ctx.fillRect(ix, -sh * 0.5, this.facing * 4, 2);
    }

    ctx.restore();
  }
};
