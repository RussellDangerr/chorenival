// ─── Player: Bozo on a unicycle — bidirectional auto-runner ───
// Bozo is ALWAYS moving; the player only steers (swipe) and jumps (tap).
// Reversing direction is a weighty, momentum-based turnaround whose braking
// lunge ("the wheel kicks out the old way") doubles as the attack.

// Move `cur` toward `target` by at most `maxDelta` (frame-rate independent).
function approach(cur, target, maxDelta) {
  if (cur < target) return Math.min(cur + maxDelta, target);
  if (cur > target) return Math.max(cur - maxDelta, target);
  return cur;
}

// Axis-aligned bounding-box overlap test.
function aabb(a, b) {
  return a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;
}

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

  // ── Unicycle momentum (auto-runner) ──
  runSpeed: 300,            // cruise top speed (speed = 1)
  startRampTime: 1.5,       // level start: ramp 0 -> full over this many seconds
  accelRate: 1400,          // px/s^2 — chase target during ramp / cruise
  reverseDecel: 2400,       // px/s^2 — braking old momentum during a turnaround
  reverseAccel: 1600,       // px/s^2 — accelerating into the new direction
  pauseAtZeroTime: 0.05,    // brief commit beat at the bottom of a reversal
  zeroEpsilon: 12,          // |vx| under this counts as "stopped"
  treadmillCap: 150,        // 0.5 * runSpeed — speed cap while on a treadmill
  treadmillDamp: 3000,      // px/s^2 — damp toward the cap (non-directional)
  brakeWindow: 0.18,        // max lifetime of the wheel-throw attack hitbox
  maxFallSpeed: 720,

  // ── Jump tuning (fixed-height tap jump) ──
  jumpForce: -480,
  gravityUp: 1300,           // gravity while rising (lighter, floaty arc)
  gravityDown: 2100,         // gravity while falling (1.6x — snappy descent)

  // ── Coyote time / jump buffer ──
  coyoteTime: 0.06,      // ~7 frames at 120Hz
  coyoteTimer: 0,

  // ── Corner correction ──
  cornerCorrectionMax: 5, // pixels — nudge up to 5px to clear corners

  // ── Ledge assist ──
  ledgeAssist: 2,         // extra pixels for ground check width

  // ── State ──
  grounded: false,
  wasGrounded: false,     // for coyote: only grant when walking off, not jumping off
  wallDir: 0,             // internal collision state (set in resolveCollisions)
  facing: 1,              // FIXED visual facing — Bozo always faces the same way

  // ── Unicycle run state ──
  travelDir: 1,           // committed direction of travel, never 0
  desiredDir: 1,          // last steer intent
  runState: 'ramp',       // 'ramp' | 'cruise' | 'brake'
  rampT: 0,               // 0..1 start-ramp progress
  brakeTimer: 0,          // counts down the wheel-throw window during a brake
  pausedAtZero: 0,        // commit-beat accumulator at the bottom of a reversal
  attackDir: 0,           // wheel-throw direction (= old travelDir); 0 = inactive

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
    land:      { frames: [11, 0], duration: 0.04, loop: false, next: 'idle' },
    death:     { frames: [13], duration: 0.1, loop: true },
  },

  // ── Sprite sheet (null = use rect fallback) ──
  spriteSheet: null,
  spriteColumns: 8,  // columns in spritesheet grid

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

  // ── Material state ──
  groundMaterial: 'solid',   // material of tile player is standing on

  // ── Particle timers ──
  _dustTimer: 0,
  _sparkTimer: 0,
  _iceTimer: 0,

  spawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.wasGrounded = false;
    this.coyoteTimer = 0;
    // Restart the unicycle: slowly ramp forward (right) from a standstill.
    this.travelDir = 1;
    this.desiredDir = 1;
    this.runState = 'ramp';
    this.rampT = 0;
    this.brakeTimer = 0;
    this.pausedAtZero = 0;
    this.attackDir = 0;
    this.facing = 1;
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
    Engine.flash('red', 0.3);
    Audio.die();
    // Death burst particles
    Particles.burst(
      this.x + this.w / 2, this.y + this.h / 2,
      20, 250, Tokens.rgba(Tokens.color.danger, 0.8), 0.4
    );
    Particles.burst(
      this.x + this.w / 2, this.y + this.h / 2,
      10, 150, Tokens.rgba(Tokens.color.white, 0.6), 0.3
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

    // ── Steer intent (sticky) + jump (tap / keyboard) ──
    const wantDir = Input.runDir;
    const jumpBuffered = Input.jumpBuffered();

    // Reversal: a steer against committed travel starts a weighty turnaround.
    // The wheel "kicks" out in the OLD direction (attackDir) as a braking
    // lunge — and that lunge is the attack hitbox (see getAttackRect).
    if (wantDir !== 0 && wantDir !== this.travelDir && this.runState !== 'brake') {
      this.runState = 'brake';
      this.brakeTimer = this.brakeWindow;
      this.pausedAtZero = 0;
      this.attackDir = this.travelDir;     // old direction = lunge / attack dir
      this.squash = 1.25;
      Audio.bounce();
      this._spawnBrakeDust();
    }
    if (wantDir !== 0) this.desiredDir = wantDir;

    // ── Unicycle momentum driver (replaces free-move accel/friction) ──
    const onTreadmill = this.grounded && this.groundMaterial === 'treadmill';

    if (this.runState === 'ramp') {
      // Level start: ease from a standstill up to full speed.
      this.rampT = Math.min(1, this.rampT + dt / this.startRampTime);
      const target = this.travelDir * this.runSpeed * this.rampT;
      this.vx = approach(this.vx, target, this.accelRate * dt);
      if (this.rampT >= 1) this.runState = 'cruise';
    } else if (this.runState === 'brake') {
      this.brakeTimer -= dt;
      const movingOldWay = Math.sign(this.vx) === this.travelDir && Math.abs(this.vx) > this.zeroEpsilon;
      if (movingOldWay) {
        // Phase A: brake the old momentum toward zero (the wheel kicks forward).
        this.vx = approach(this.vx, 0, this.reverseDecel * dt);
      } else {
        // Phase B: a brief commit beat at the bottom, then flip to the new way.
        this.vx = approach(this.vx, 0, this.reverseDecel * dt);
        this.pausedAtZero += dt;
        if (this.pausedAtZero >= this.pauseAtZeroTime) {
          this.travelDir = this.desiredDir;
          this.attackDir = 0;
          this.runState = 'cruise';
        }
      }
    } else {
      // Cruise: hold full speed in the committed direction.
      this.vx = approach(this.vx, this.travelDir * this.runSpeed, this.accelRate * dt);
    }

    // Treadmill: cap and damp speed toward 0.5, non-directional (only slows).
    if (onTreadmill && Math.abs(this.vx) > this.treadmillCap) {
      this.vx = approach(this.vx, Math.sign(this.vx) * this.treadmillCap, this.treadmillDamp * dt);
    }

    // ── Asymmetric gravity (floaty rise, snappy fall) ──
    const grav = this.vy < 0 ? this.gravityUp : this.gravityDown;
    this.vy += grav * dt;
    if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;

    // ── Coyote time (only when walking off, not jumping off) ──
    if (this.grounded) {
      this.coyoteTimer = this.coyoteTime;
    } else {
      this.coyoteTimer -= dt;
    }

    // ── Jump (fixed height: ground or coyote) ──
    if (jumpBuffered && (this.grounded || (this.coyoteTimer > 0 && this.wasGrounded))) {
      this._doGroundJump();
    }

    // ── Apply velocity ──
    this.wasGrounded = this.grounded;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // ── Resolve collisions (with corner correction) ──
    this.resolveCollisions();

    // ── Check hazard collisions (with smaller hitbox) ──
    this.checkHazards();

    // ── Update animation state ──
    if (this.grounded) {
      if (!this.wasGrounded) this.setAnim('land');
      else this.setAnim('run');            // Bozo is always rolling on the ground
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

    // ── Movement trail (speed dots) ──
    if (Math.abs(this.vx) > 100 || Math.abs(this.vy) > 100) {
      this.trail.push({ x: this.x + this.w / 2, y: this.y + this.h / 2, alpha: 0.3, type: 'dot' });
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= dt * 2;
      if (this.trail[i].alpha <= 0) this.trail.splice(i, 1);
    }

    // ── Run dust (kicked out behind the wheel) ──
    if (this.grounded && Math.abs(this.vx) > 150) {
      const dir = Math.sign(this.vx) || 1;
      this._dustTimer = (this._dustTimer || 0) + dt;
      if (this._dustTimer > 0.06) {
        this._dustTimer = 0;
        Particles.emit(
          this.x + (dir < 0 ? this.w : 0), this.y + this.h,
          -dir * (20 + Math.random() * 40), -(10 + Math.random() * 30),
          Tokens.rgba(Tokens.color.dust, 0.3), 0.15 + Math.random() * 0.1
        );
      }
    }

    // ── Treadmill belt dust ──
    if (onTreadmill && Math.abs(this.vx) > 30) {
      this._iceTimer = (this._iceTimer || 0) + dt;
      if (this._iceTimer > 0.05) {
        this._iceTimer = 0;
        Particles.emit(
          this.x + Math.random() * this.w, this.y + this.h,
          (Math.random() - 0.5) * 40, -(15 + Math.random() * 25),
          Tokens.rgba(Tokens.color.belt, 0.35), 0.15 + Math.random() * 0.1
        );
      }
    }
  },

  _doGroundJump() {
    this.vy = this.jumpForce;
    this.coyoteTimer = 0;
    this.grounded = false;
    this.squash = 1.4;
    this.setAnim('jump');
    Audio.jump();
    Input.consumeJump();
    for (let i = 0; i < 5; i++) {
      Particles.emit(
        this.x + Math.random() * this.w, this.y + this.h,
        (Math.random() - 0.5) * 80, 40 + Math.random() * 40,
        Tokens.rgba(Tokens.color.white, 0.4), 0.15 + Math.random() * 0.1
      );
    }
  },

  // Dust + a little kick when the wheel lunges out to brake (the attack motion).
  _spawnBrakeDust() {
    const dir = this.attackDir || this.travelDir || 1;
    Camera.shake(2);
    for (let i = 0; i < 6; i++) {
      Particles.emit(
        this.x + (dir > 0 ? this.w : 0), this.y + this.h * (0.5 + Math.random() * 0.5),
        dir * (60 + Math.random() * 120), -(10 + Math.random() * 40),
        'rgba(220,220,235,0.5)', 0.15 + Math.random() * 0.1
      );
    }
  },

  resolveCollisions() {
    this.grounded = false;
    this.wallDir = 0;
    this.groundMaterial = 'solid';

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

        // Ceiling corner correction: on a ceiling bonk with small horizontal
        // overlap, slide past the corner instead of hard-stopping. Must be
        // gated to pushDir === 1 — running it on ground collisions nudges the
        // player horizontally every frame while walking along flat ground.
        if (pushDir === 1 && overlapX <= this.cornerCorrectionMax && overlapX > 0) {
          const nudgeDir = (this.x + this.w / 2) < (tile.x + tile.w / 2) ? -1 : 1;
          this.x += nudgeDir * overlapX;
          continue;
        }

        this.y += pushDir * overlapY;

        if (pushDir === -1) {
          // Track ground material (drives the treadmill speed cap)
          this.groundMaterial = tile.material || 'solid';

          // Landed
          if (this.vy > 200) {
            this.squash = 0.6;
            Audio.land();
            for (let i = 0; i < 4; i++) {
              Particles.emit(
                this.x + Math.random() * this.w, this.y + this.h,
                (Math.random() - 0.5) * 120, -(20 + Math.random() * 40),
                Tokens.rgba(Tokens.color.white, 0.3), 0.2 + Math.random() * 0.1
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

    // ── Entity collisions: moving platforms ──
    const entitySolids = Entities.getSolidRects();
    for (const rect of entitySolids) {
      if (rect.oneWay) continue; // handle one-ways separately
      const overlapX = Math.min(this.x + this.w, rect.x + rect.w) - Math.max(this.x, rect.x);
      const overlapY = Math.min(this.y + this.h, rect.y + rect.h) - Math.max(this.y, rect.y);
      if (overlapX <= 0 || overlapY <= 0) continue;

      if (overlapY <= overlapX) {
        const pushDir = (this.y + this.h / 2) < (rect.y + rect.h / 2) ? -1 : 1;
        this.y += pushDir * overlapY;
        if (pushDir === -1) {
          this.grounded = true;
          if (this.vy > 0) this.vy = 0;
          // Ride the platform
          if (rect.isMoving) {
            this.x += rect.dx;
            this.y += rect.dy;
          }
        } else {
          this.vy = 0;
        }
      } else {
        const pushDir = (this.x + this.w / 2) < (rect.x + rect.w / 2) ? -1 : 1;
        this.x += pushDir * overlapX;
        this.vx = 0;
      }
    }

    // ── One-way platforms: only land on top ──
    const oneWays = Entities.getOneWayRects();
    for (const rect of oneWays) {
      const overlapX = Math.min(this.x + this.w, rect.x + rect.w) - Math.max(this.x, rect.x);
      if (overlapX <= 0) continue;
      // Only collide if player's feet are near the top of the platform and falling
      const footY = this.y + this.h;
      const prevFootY = footY - this.vy * Engine.fixedDt;
      if (this.vy >= 0 && footY >= rect.y && prevFootY <= rect.y + 6) {
        this.y = rect.y - this.h;
        this.grounded = true;
        this.vy = 0;
      }
    }
  },

  // The wheel-throw hitbox: a short lunge in the OLD travel direction, live
  // only during the braking phase of a reversal. This IS the attack.
  getAttackRect() {
    if (this.runState !== 'brake' || this.brakeTimer <= 0 || this.attackDir === 0) return null;
    const reach = 18;
    const hh = this.h * 0.7;
    const y = this.y + this.h - hh;        // lower body — where the wheel is
    const half = this.w / 2;
    // Spans from Bozo's center outward past the leading edge by `reach`.
    const x = this.attackDir > 0 ? this.x + half : this.x + half - (half + reach);
    return { x, y, w: half + reach, h: hh };
  },

  checkHazards() {
    if (this.dead || this.respawning) return;

    const attack = this.getAttackRect();
    const px = this.x + this.hazardShrink;
    const py = this.y + this.hazardShrink;
    const pw = this.w - this.hazardShrink * 2;
    const ph = this.h - this.hazardShrink * 2;
    const body = { x: px, y: py, w: pw, h: ph };

    // Enemies: killable by wheel-throw or stomp; lethal on any other contact.
    // Iterate backwards so kills (which splice the list) are safe.
    for (let i = Entities.list.length - 1; i >= 0; i--) {
      const e = Entities.list[i];
      if (!e.getHazardRect || e.dead) continue;
      const r = e.getHazardRect();

      // (a) Wheel-throw lunge connects.
      if (attack && aabb(attack, r)) { Entities.kill(e); continue; }

      // (b) Stomp from above (feet crossing the enemy's top while falling).
      const feet = this.y + this.h;
      const overlapH = (px + pw) > r.x && px < (r.x + r.w);
      if (this.vy >= 0 && overlapH && feet >= r.y - 6 && feet <= r.y + r.h * 0.6) {
        Entities.kill(e);
        this.vy = -260;          // bounce off
        this.squash = 1.3;
        continue;
      }

      // (c) Otherwise the enemy is lethal.
      if (aabb(body, r)) { this.die(); return; }
    }

    // Static tile hazards (none on a lean track, but kept for safety/future).
    for (const haz of Level.getHazards()) {
      if (aabb(body, haz)) { this.die(); return; }
    }
  },

  draw(ctx) {
    // Don't draw during death (particles handle the visual)
    if (this.dead) return;

    // Trail + afterimages
    for (const t of this.trail) {
      if (t.type === 'ghost') {
        ctx.fillStyle = Tokens.rgba(Tokens.color.trailGhost, t.alpha * 0.25);
        ctx.fillRect(t.x, t.y, t.w, t.h);
      } else {
        ctx.fillStyle = Tokens.rgba(Tokens.color.trailDot, t.alpha * 0.3);
        ctx.fillRect(t.x - 3, t.y - 3, 6, 6);
      }
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
    ctx.fillStyle = Tokens.color.playerBody;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Eyes (positioned relative to hitbox)
    const eyeY = this.y + this.h * 0.25;
    const midX = this.x + this.w / 2;
    ctx.fillStyle = Tokens.color.playerEye;
    ctx.fillRect(midX - 4, eyeY, 3, 4);
    ctx.fillRect(midX + 1, eyeY, 3, 4);

    // Speed lines when moving fast
    if (Math.abs(this.vx) > 200) {
      const alpha = Math.min(0.5, (Math.abs(this.vx) - 200) / 300);
      ctx.fillStyle = Tokens.rgba(Tokens.color.trailDot, alpha);
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
