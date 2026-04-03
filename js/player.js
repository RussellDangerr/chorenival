// ─── Player: momentum-based platformer character ───
// Tuned for Super Meat Boy-level tightness
const Player = {
  // ── Hitbox (collision) ──
  x: 100, y: 300,
  w: 14, h: 28,

  // ── Sprite rendering (visual, larger than hitbox) ──
  spriteW: 32, spriteH: 32,
  spriteOffsetX: -9,   // from hitbox left to sprite left
  spriteOffsetY: -4,   // from hitbox top to sprite top

  // ── Velocity ──
  vx: 0, vy: 0,

  // ── Movement tuning — SMB-tight ──
  groundAccel: 4000,     // near-instant top speed (was 2800)
  airAccel: 2800,        // ~70% of ground (responsive air control)
  groundFriction: 16,    // snappy stop
  airFriction: 1.5,      // minimal air drag
  maxRunSpeed: 340,
  maxFallSpeed: 720,

  // ── Jump tuning ──
  jumpForce: -480,
  jumpCutMultiplier: 0.35,   // release early = short hop
  gravityUp: 1300,           // gravity while rising (lighter, floaty arc)
  gravityDown: 2100,         // gravity while falling (1.6x — snappy descent)

  // ── Wall mechanics ──
  wallSlideSpeed: 80,
  wallJumpForce: { x: 360, y: -440 },
  wallStickTime: 0.06,

  // ── Coyote time / jump buffer (tightened) ──
  coyoteTime: 0.06,      // ~7 frames at 120Hz
  coyoteTimer: 0,

  // ── Corner correction ──
  cornerCorrectionMax: 5, // pixels — nudge up to 5px to clear corners

  // ── Ledge assist ──
  ledgeAssist: 2,         // extra pixels for ground check width

  // ── State ──
  grounded: false,
  wasGrounded: false,     // for coyote: only grant when walking off, not jumping off
  wallDir: 0,
  wallStickTimer: 0,
  facing: 1,
  jumpHeld: false,

  // ── Animation state ──
  squash: 1,
  squashTarget: 1,
  trail: [],
  animState: 'idle',
  animTimer: 0,
  animFrame: 0,

  // Animation definitions: { frames: [indices], duration: ms per frame, loop: bool, next: state }
  anims: {
    idle:      { frames: [0], duration: 0.15, loop: true },
    run:       { frames: [1, 2, 3, 4, 5, 6], duration: 0.07, loop: true },
    jump:      { frames: [7, 8], duration: 0.08, loop: false, next: 'fall' },
    fall:      { frames: [9], duration: 0.1, loop: true },
    wallSlide: { frames: [10], duration: 0.1, loop: true },
    land:      { frames: [11, 0], duration: 0.04, loop: false, next: 'idle' },
    dash:      { frames: [12], duration: 0.1, loop: true },
    death:     { frames: [13], duration: 0.1, loop: true },
  },

  // ── Sprite sheet (null = use rect fallback) ──
  spriteSheet: null,
  spriteColumns: 8,  // columns in spritesheet grid

  // ── Dash ──
  canDash: true,
  dashing: false,
  dashTimer: 0,
  dashDuration: 0.12,
  dashSpeed: 720,

  // ── Death & respawn ──
  dead: false,
  deathTimer: 0,
  deathDuration: 0.6,       // seconds before respawn
  respawning: false,
  respawnTimer: 0,
  respawnDuration: 0.3,     // brief invuln flash after respawn
  deathCount: 0,
  checkpointX: 0,
  checkpointY: 0,

  // ── Hazard hitbox (smaller than platform hitbox for forgiving near-misses) ──
  hazardShrink: 3,          // pixels inset on each side

  spawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.wasGrounded = false;
    this.coyoteTimer = 0;
    this.dashing = false;
    this.canDash = true;
    this.dead = false;
    this.deathTimer = 0;
    this.respawning = true;
    this.respawnTimer = this.respawnDuration;
    this.setAnim('fall');
  },

  die() {
    if (this.dead || this.respawning) return;
    this.dead = true;
    this.deathTimer = this.deathDuration;
    this.deathCount++;
    this.vx = 0;
    this.vy = 0;
    this.setAnim('death');
    Camera.shake(6);
    Audio.die();
    // Death burst particles
    Particles.burst(
      this.x + this.w / 2, this.y + this.h / 2,
      20, 250, 'rgba(255, 80, 80, 0.8)', 0.4
    );
    Particles.burst(
      this.x + this.w / 2, this.y + this.h / 2,
      10, 150, 'rgba(255, 255, 255, 0.6)', 0.3
    );
    // Hitstop: freeze the game for a few frames
    Engine.hitstop(0.05);
  },

  respawn() {
    this.spawn(this.checkpointX, this.checkpointY);
  },

  setCheckpoint(x, y) {
    this.checkpointX = x;
    this.checkpointY = y;
  },

  setAnim(state) {
    if (this.animState === state) return;
    this.animState = state;
    this.animTimer = 0;
    this.animFrame = 0;
  },

  updateAnim(dt) {
    const anim = this.anims[this.animState];
    if (!anim) return;

    this.animTimer += dt;
    if (this.animTimer >= anim.duration) {
      this.animTimer -= anim.duration;
      this.animFrame++;
      if (this.animFrame >= anim.frames.length) {
        if (anim.loop) {
          this.animFrame = 0;
        } else {
          this.animFrame = anim.frames.length - 1;
          if (anim.next) this.setAnim(anim.next);
        }
      }
    }
  },

  update(dt) {
    // ── Death state: frozen, waiting to respawn ──
    if (this.dead) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.respawn();
      }
      this.updateAnim(dt);
      return;
    }

    // ── Respawn invulnerability tick-down ──
    if (this.respawning) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawning = false;
      }
    }

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
      this.setAnim('dash');
      Audio.dash();
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
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.resolveCollisions();
      this.updateAnim(dt);
      return;
    }

    // ── Horizontal movement ──
    const accel = this.grounded ? this.groundAccel : this.airAccel;
    const friction = this.grounded ? this.groundFriction : this.airFriction;

    if (moveDir !== 0) {
      this.vx += moveDir * accel * dt;
      if (Math.abs(this.vx) > this.maxRunSpeed) {
        this.vx = Math.sign(this.vx) * this.maxRunSpeed;
      }
    } else {
      this.vx -= this.vx * friction * dt;
      if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // ── Asymmetric gravity ──
    // Lighter on the way up (floaty arc), heavier on the way down (snappy)
    const grav = (this.vy > 0 || !jumpHeldNow) ? this.gravityDown : this.gravityUp;
    this.vy += grav * dt;
    if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;

    // ── Wall slide ──
    if (this.wallDir !== 0 && !this.grounded && this.vy > 0) {
      if (this.vy > this.wallSlideSpeed) {
        this.vy = this.wallSlideSpeed;
      }
    }

    // ── Coyote time (only when walking off, not jumping off) ──
    if (this.grounded) {
      this.coyoteTimer = this.coyoteTime;
    } else {
      if (this.wasGrounded && this.vy >= 0) {
        // Just walked off a ledge — coyote time is valid
      } else if (!this.wasGrounded) {
        this.coyoteTimer -= dt;
      }
    }

    // ── Jump ──
    if (jumpBuffered) {
      if (this.coyoteTimer > 0 && !this.grounded && this.wasGrounded) {
        // Coyote jump (walked off ledge)
        this._doGroundJump();
      } else if (this.grounded) {
        // Normal ground jump
        this._doGroundJump();
      } else if (this.wallDir !== 0) {
        // Wall jump
        this.vx = -this.wallDir * this.wallJumpForce.x;
        this.vy = this.wallJumpForce.y;
        this.facing = -this.wallDir;
        this.jumpHeld = true;
        this.squash = 1.3;
        this.setAnim('jump');
        Audio.wallJump();
        Input.consumeBuffer('Space');
        Input.consumeBuffer('ArrowUp');
        Input.consumeBuffer('KeyW');
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
    this.wasGrounded = this.grounded;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // ── Resolve collisions (with corner correction) ──
    this.resolveCollisions();

    // ── Check hazard collisions (with smaller hitbox) ──
    this.checkHazards();

    // ── Update animation state ──
    if (this.dashing) {
      this.setAnim('dash');
    } else if (this.grounded) {
      if (!this.wasGrounded) {
        this.setAnim('land');
      } else if (Math.abs(this.vx) > 30) {
        this.setAnim('run');
      } else {
        if (this.animState !== 'land') this.setAnim('idle');
      }
    } else if (this.wallDir !== 0 && this.vy > 0) {
      this.setAnim('wallSlide');
    } else if (this.vy < 0) {
      if (this.animState !== 'jump') this.setAnim('jump');
    } else {
      this.setAnim('fall');
    }
    this.updateAnim(dt);

    // ── Squash & stretch ──
    this.squash += (this.squashTarget - this.squash) * 14 * dt;
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

  _doGroundJump() {
    this.vy = this.jumpForce;
    this.coyoteTimer = 0;
    this.grounded = false;
    this.jumpHeld = true;
    this.squash = 1.4;
    this.setAnim('jump');
    Audio.jump();
    Input.consumeBuffer('Space');
    Input.consumeBuffer('ArrowUp');
    Input.consumeBuffer('KeyW');
    for (let i = 0; i < 5; i++) {
      Particles.emit(
        this.x + Math.random() * this.w, this.y + this.h,
        (Math.random() - 0.5) * 80, 40 + Math.random() * 40,
        'rgba(255,255,255,0.4)', 0.15 + Math.random() * 0.1
      );
    }
  },

  resolveCollisions() {
    this.grounded = false;
    this.wallDir = 0;

    const tiles = Level.getTilesNear(this.x, this.y, this.w, this.h);

    // ── Pass 1: Resolve X axis ──
    for (const tile of tiles) {
      const overlapX = Math.min(this.x + this.w, tile.x + tile.w) - Math.max(this.x, tile.x);
      const overlapY = Math.min(this.y + this.h, tile.y + tile.h) - Math.max(this.y, tile.y);
      if (overlapX <= 0 || overlapY <= 0) continue;

      // Only resolve if this is primarily a horizontal collision
      if (overlapX < overlapY) {
        const pushDir = (this.x + this.w / 2) < (tile.x + tile.w / 2) ? -1 : 1;
        this.x += pushDir * overlapX;
        this.vx = 0;
        this.wallDir = -pushDir;
      }
    }

    // ── Pass 2: Resolve Y axis with corner correction ──
    for (const tile of tiles) {
      const overlapX = Math.min(this.x + this.w, tile.x + tile.w) - Math.max(this.x, tile.x);
      const overlapY = Math.min(this.y + this.h, tile.y + tile.h) - Math.max(this.y, tile.y);
      if (overlapX <= 0 || overlapY <= 0) continue;

      // Vertical collision
      if (overlapY <= overlapX) {
        const pushDir = (this.y + this.h / 2) < (tile.y + tile.h / 2) ? -1 : 1;

        // ── Corner correction ──
        // If horizontal overlap is small, nudge the player sideways instead of blocking
        if (overlapX <= this.cornerCorrectionMax && overlapX > 0) {
          const nudgeDir = (this.x + this.w / 2) < (tile.x + tile.w / 2) ? -1 : 1;
          this.x += nudgeDir * overlapX;
          continue; // Skip vertical resolution — we nudged past the corner
        }

        this.y += pushDir * overlapY;

        if (pushDir === -1) {
          // Landed
          if (this.vy > 200) {
            this.squash = 0.6;
            Audio.land();
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
          // ── Ceiling corner correction ──
          // If we bonk a ceiling and are close to the edge, nudge sideways
          if (overlapX <= this.cornerCorrectionMax && overlapX > 0) {
            const nudgeDir = (this.x + this.w / 2) < (tile.x + tile.w / 2) ? -1 : 1;
            this.x += nudgeDir * overlapX;
          } else {
            this.vy = 0;
          }
        }
      }
    }

    // ── Ledge assist: extended ground check ──
    // Check 1-2px wider than hitbox for ground, so near-misses still land
    if (!this.grounded) {
      const footY = this.y + this.h;
      const extL = this.x - this.ledgeAssist;
      const extR = this.x + this.w + this.ledgeAssist;

      for (const tile of tiles) {
        // Check if foot is right at the top of a tile (within 2px)
        if (Math.abs(footY - tile.y) < 2) {
          // Check if the extended foot overlaps the tile horizontally
          if (extR > tile.x && extL < tile.x + tile.w) {
            // Check if the actual hitbox doesn't overlap (meaning only the assist does)
            const actualOverlapX = Math.min(this.x + this.w, tile.x + tile.w) - Math.max(this.x, tile.x);
            if (actualOverlapX <= 0) {
              // Nudge player onto the platform
              if (this.x + this.w / 2 < tile.x + tile.w / 2) {
                this.x = tile.x - this.w;
              } else {
                this.x = tile.x + tile.w;
              }
              this.y = tile.y - this.h;
              this.grounded = true;
              this.vy = 0;
              break;
            }
          }
        }
      }
    }
  },

  checkHazards() {
    if (this.dead || this.respawning) return;
    const hazards = Level.getHazards();
    // Use a smaller hitbox for hazard checks (more forgiving)
    const hx = this.x + this.hazardShrink;
    const hy = this.y + this.hazardShrink;
    const hw = this.w - this.hazardShrink * 2;
    const hh = this.h - this.hazardShrink * 2;

    for (const haz of hazards) {
      if (hx + hw > haz.x && hx < haz.x + haz.w &&
          hy + hh > haz.y && hy < haz.y + haz.h) {
        this.die();
        return;
      }
    }
  },

  draw(ctx) {
    // Don't draw during death (particles handle the visual)
    if (this.dead) return;

    // Trail
    for (const t of this.trail) {
      ctx.fillStyle = `rgba(200, 220, 255, ${t.alpha * 0.3})`;
      ctx.fillRect(t.x - 3, t.y - 3, 6, 6);
    }

    // Squash & stretch transform origin = bottom center of hitbox (feet planted)
    const cx = this.x + this.w / 2;
    const bottomY = this.y + this.h;
    const stretchX = 1 / this.squash;
    const stretchY = this.squash;

    // Respawn invuln flash
    if (this.respawning) {
      const flash = Math.sin(this.respawnTimer * 30) > 0;
      if (flash) return; // blink invisible every other frame
    }

    ctx.save();
    ctx.translate(cx, bottomY);
    ctx.scale(this.facing, 1); // flip horizontally based on facing
    ctx.scale(stretchX, stretchY);
    ctx.translate(-cx, -bottomY);

    if (this.spriteSheet) {
      // ── Sprite rendering ──
      const anim = this.anims[this.animState];
      const frameIdx = anim ? anim.frames[this.animFrame] : 0;
      const col = frameIdx % this.spriteColumns;
      const row = Math.floor(frameIdx / this.spriteColumns);
      const sx = col * this.spriteW;
      const sy = row * this.spriteH;
      const dx = this.x + this.spriteOffsetX;
      const dy = this.y + this.spriteOffsetY;

      ctx.drawImage(
        this.spriteSheet,
        sx, sy, this.spriteW, this.spriteH,
        Math.round(dx), Math.round(dy), this.spriteW, this.spriteH
      );
    } else {
      // ── Rect fallback (no spritesheet loaded) ──
      this._drawRectFallback(ctx);
    }

    ctx.restore();
  },

  _drawRectFallback(ctx) {
    // Body
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Eyes (positioned relative to hitbox)
    const eyeY = this.y + this.h * 0.25;
    const midX = this.x + this.w / 2;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(midX - 4, eyeY, 3, 4);
    ctx.fillRect(midX + 1, eyeY, 3, 4);

    // Speed lines when moving fast
    if (Math.abs(this.vx) > 200) {
      const alpha = Math.min(0.5, (Math.abs(this.vx) - 200) / 300);
      ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
      for (let i = 0; i < 3; i++) {
        const ly = this.y + 4 + i * 10;
        ctx.fillRect(this.x - this.facing * (4 + i * 3), ly, 6, 1);
      }
    }
  },

  // Load a spritesheet image. Call with an Image element or a URL string.
  loadSprite(src) {
    if (typeof src === 'string') {
      const img = new Image();
      img.onload = () => { this.spriteSheet = img; };
      img.src = src;
    } else {
      this.spriteSheet = src;
    }
  }
};
