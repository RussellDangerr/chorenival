# Clown City — project memory

A browser game: **Bozo the Clown on a unicycle**, a bidirectional auto-runner
(as of v0.2.0). Vanilla JS, **no build step, no dependencies**. Open `index.html`
in a browser to run; deployed live at clowncity.russelldangerr.com (main → Cloudflare).

## Architecture
- Singleton-object modules (not ES modules/classes for the core), loaded via
  `<script>` tags in `index.html`. **Load order matters**: `tokens.js` first,
  then `engine.js`, …, `game.js` last.
- `Engine` (engine.js): fixed-timestep loop at 120 Hz; registered systems each
  expose `update(dt)` / `draw(ctx)`. **`Input` is registered LAST** so its
  single-frame flag clear runs after all consumers read them.
- Fixed internal canvas 960×540, CSS-scaled to fit.

## Key files
- `js/player.js` — Bozo. Unicycle **momentum state machine** (`ramp`→`cruise`→`brake`),
  `approach()` helper, brake-kick + stomp combat in `checkHazards()`/`getAttackRect()`.
  `facing` is frozen (always faces one way); `travelDir` is the real direction.
  `resolveCollisions()` X-pass uses a **`stepTolerance` guard** (`overlapY > 8`) so flat
  floor seams aren't misread as walls — that was snagging momentum. The player draws as
  a **procedural unicycle** in `_drawRectFallback()` (spinning wheel + frame + body),
  with a velocity-driven `lean`/`wheelAngle` sway; purely visual, hitbox unchanged.
- `js/input.js` — keyboard + **touch (swipe = steer via sticky `runDir`, tap = jump)**,
  `jumpBuffered()/consumeJump()`, plus `tapped()/swipeEdge()` for menu nav.
- `js/level.js` — tile maps (3 lean tracks), materials (`solid`, `treadmill`),
  themes, rendering. Tile legend: `1` solid, `0` air, `T` treadmill, `g` goal,
  `c` checkpoint, `o` gem. Maps are 80×25; floor on rows 22–24, spawn `[3,21]`.
- `js/entities.js` — `MovingPlatform`, `OneWayPlatform`, `PatrolEnemy`, `Entities.kill()`.
- `js/game.js` — state machine (title/levelSelect/playing/levelComplete/paused/win), HUD/menus.
- `js/camera.js` — follow + lookahead keyed to `travelDir`.
- `js/tokens.js` — **design tokens** (color/font/space/motion + `rgba()`); single
  source of truth for the visual language. Audit + reference in `DESIGN-SYSTEM.md`.

## Conventions
- Route colours/fonts/magic-numbers through `Tokens.*` (not new hardcoded literals).
- Per-level palettes live in `Level.themes` (deliberately separate from `Tokens`).
- Combat: reversing makes the wheel lunge in the OLD direction = the attack;
  stomp from above also kills; side/pit contact is fatal.

## Tuning knobs (all in `player.js` constants)
`runSpeed` (300), `startRampTime` (1.5), `reverseDecel`/`reverseAccel`,
`pauseAtZeroTime`, `treadmillCap` (150), `brakeWindow` (0.18), `jumpForce` (-480).
Collision/feel: `stepTolerance` (8, the flat-ground snag guard). Unicycle sway:
`cruiseLean` (0.10), `brakeLean` (0.14), `leanRate` (10), `wheelRadius` (8).

## Verifying changes
No tests. Run `index.html` (e.g. `py -m http.server 8080 --directory .`) and play,
or drive the sim headlessly by stepping `Engine.systems[*].update(Engine.fixedDt)`
and reading `Player`/`Entities` state.

## Out of scope / follow-ups
- Real sprite art (the player is a procedural unicycle now; no spritesheet). On-screen
  touch **pause** button. Level 2/3 feel tuning. The lone non-bold `20px` LOCKED font
  label (flagged in the audit).
