// ─── Input: keyboard + touch (swipe / tap) with buffering ───
// Unicycle scheme: horizontal swipe = steer (sticky runDir), tap = jump.
// Keyboard parity is kept for desktop testing (arrows/WASD steer, Space/Up/W jump).
const Input = {
  keys: {},
  justPressed: {},
  buffer: {},          // jump buffer: remembers a press for a few frames
  bufferTime: 0.1,     // seconds to remember a press

  // ── Unicycle controls ──
  runDir: 1,           // sticky travel intent: -1 = left, +1 = right
  _jumpDown: false,    // jump held this frame (cleared each update)
  _tapped: false,      // single-frame: a tap happened (menus = confirm)
  _swipeEdge: 0,       // single-frame: -1/+1 when a swipe just registered (menus = navigate)

  // ── Touch gesture tuning ──
  _touches: {},
  swipeThreshold: 30,  // px of horizontal travel to register a swipe
  tapMaxMove: 14,      // px total movement under which a touch counts as a tap
  tapMaxTime: 0.25,    // s max duration for a tap

  init() {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
        this.buffer[e.code] = this.bufferTime;
      }
      this.keys[e.code] = true;
      // Keyboard parity for unicycle steering
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.runDir = -1;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.runDir = 1;
      // Prevent scrolling
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    this.initTouch();
  },

  initTouch() {
    const now = () => performance.now() / 1000;

    window.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this._touches[t.identifier] = { x0: t.clientX, y0: t.clientY, t0: now(), swiped: false };
      }
    }, { passive: false });

    window.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const rec = this._touches[t.identifier];
        if (!rec) continue;
        const dx = t.clientX - rec.x0;
        if (Math.abs(dx) >= this.swipeThreshold) {
          const dir = dx > 0 ? 1 : -1;
          this.runDir = dir;
          this._swipeEdge = dir;
          rec.swiped = true;
          rec.x0 = t.clientX;  // re-arm so a back-and-forth within one touch re-steers
          rec.y0 = t.clientY;
        }
      }
    }, { passive: false });

    window.addEventListener('touchend', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const rec = this._touches[t.identifier];
        if (rec) {
          const dur = now() - rec.t0;
          const dist = Math.hypot(t.clientX - rec.x0, t.clientY - rec.y0);
          if (!rec.swiped && dist < this.tapMaxMove && dur < this.tapMaxTime) {
            // Tap = jump (also a menu confirm)
            this.buffer['Jump'] = this.bufferTime;
            this._jumpDown = true;
            this._tapped = true;
          }
          delete this._touches[t.identifier];
        }
      }
    }, { passive: false });

    window.addEventListener('touchcancel', e => {
      for (const t of e.changedTouches) delete this._touches[t.identifier];
    }, { passive: false });
  },

  update(dt) {
    // Clear single-frame flags and tick down buffers
    for (const code in this.justPressed) {
      this.justPressed[code] = false;
    }
    for (const code in this.buffer) {
      this.buffer[code] -= dt;
      if (this.buffer[code] <= 0) delete this.buffer[code];
    }
    // Per-frame touch edges (runDir is sticky — do NOT clear it)
    this._jumpDown = false;
    this._tapped = false;
    this._swipeEdge = 0;
  },

  held(code) {
    return !!this.keys[code];
  },

  pressed(code) {
    return !!this.justPressed[code];
  },

  buffered(code) {
    return this.buffer[code] > 0;
  },

  consumeBuffer(code) {
    delete this.buffer[code];
  },

  // ── Unicycle jump (touch tap OR keyboard) ──
  jumpBuffered() {
    return this.buffered('Jump') || this.buffered('Space') || this.buffered('ArrowUp') || this.buffered('KeyW');
  },

  jumpHeld() {
    return this._jumpDown || this.held('Space') || this.held('ArrowUp') || this.held('KeyW');
  },

  consumeJump() {
    this.consumeBuffer('Jump');
    this.consumeBuffer('Space');
    this.consumeBuffer('ArrowUp');
    this.consumeBuffer('KeyW');
  },

  // ── Menu helpers (so the game is fully playable on touch) ──
  tapped() {
    return this._tapped;
  },

  // Returns -1 / 0 / +1 for a fresh navigation swipe this frame
  swipeEdge() {
    return this._swipeEdge;
  }
};
