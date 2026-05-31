# Clown City

Bozo the Clown on a unicycle — a momentum-based **auto-runner**. Bozo is always
rolling; you only steer (swipe) and jump (tap). Reverse into monsters to whack
them with the unicycle wheel, or stomp them from above, across a lean
platforming track.

Play it live at [clowncity.russelldangerr.com](https://clowncity.russelldangerr.com).

## Status

v0.2.0 — unicycle auto-runner rework (mobile-playable).

## Play

Open `index.html` in a browser. No build step required.

## Controls

| Action | Touch | Keyboard |
|--------|-------|----------|
| Steer / reverse | Swipe left / right | ← → or A / D |
| Jump | Tap | Space / ↑ / W |
| Pause | — | Esc / P |
| Restart | — | R |

Reversing is a **weighty** turnaround: Bozo decelerates, pauses, then accelerates
the other way. The braking lunge — the wheel kicking out in the *old* direction —
is the attack. You can also **stomp** enemies from above. A pit fall, or touching
an enemy from the side, is fatal.

## Features

- Bidirectional auto-runner with weighty unicycle momentum and a start-of-level speed ramp
- Swipe / tap touch controls (plus keyboard parity) — fully mobile-playable
- Brake-kick + stomp combat
- Treadmill surfaces that cap speed at 0.5 and bleed momentum
- Moving + one-way platforms, gaps, and patrol monsters
- Coyote time + input buffering, squash & stretch, particles, screen shake/flash
- Centralized design tokens in [`js/tokens.js`](js/tokens.js) — see [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md)

## Project layout

Vanilla JS, no build step. Singleton-object modules loaded via `<script>` tags in
`index.html` (order matters; `tokens.js` first, `game.js` last). Fixed-timestep
loop at 120 Hz. See `CLAUDE.md` for architecture notes.
