// ─── Input: keyboard state with buffering ───
const Input = {
  keys: {},
  justPressed: {},
  buffer: {},          // jump buffer: remembers press for a few frames
  bufferTime: 0.1,     // seconds to remember a press

  init() {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
        this.buffer[e.code] = this.bufferTime;
      }
      this.keys[e.code] = true;
      // Prevent scrolling
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
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
  }
};
