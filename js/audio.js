// ─── Audio: lightweight sound system ───
// Generates SFX procedurally using Web Audio API (no external files needed)
const Audio = {
  ctx: null,
  masterVolume: 0.4,
  muted: false,

  init() {
    // Create audio context on first user interaction (browser policy)
    const resume = () => {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    };
    window.addEventListener('keydown', resume, { once: false });
    window.addEventListener('click', resume, { once: false });
  },

  // Play a procedurally generated tone
  _tone(freq, duration, type, volume, slide) {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slide) {
      osc.frequency.linearRampToValueAtTime(slide, this.ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime((volume || 0.3) * this.masterVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  // Noise burst (for landing, death)
  _noise(duration, volume) {
    if (this.muted || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime((volume || 0.15) * this.masterVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  },

  // ── Game SFX ──
  jump() {
    this._tone(300, 0.12, 'square', 0.2, 600);
  },

  wallJump() {
    this._tone(250, 0.1, 'square', 0.2, 550);
    this._tone(400, 0.08, 'triangle', 0.1, 700);
  },

  dash() {
    this._noise(0.1, 0.2);
    this._tone(200, 0.08, 'sawtooth', 0.15, 100);
  },

  land() {
    this._noise(0.06, 0.12);
  },

  die() {
    this._tone(400, 0.3, 'square', 0.25, 80);
    this._noise(0.2, 0.2);
  },

  collect() {
    this._tone(800, 0.08, 'sine', 0.2);
    this._tone(1200, 0.12, 'sine', 0.15);
  },

  checkpoint() {
    this._tone(500, 0.1, 'triangle', 0.2);
    this._tone(700, 0.1, 'triangle', 0.15);
    this._tone(900, 0.15, 'triangle', 0.1);
  },

  levelComplete() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    this._tone(523, 0.15, 'triangle', 0.2);
    setTimeout(() => this._tone(659, 0.15, 'triangle', 0.2), 100);
    setTimeout(() => this._tone(784, 0.15, 'triangle', 0.2), 200);
    setTimeout(() => this._tone(1047, 0.3, 'triangle', 0.25), 300);
  },

  grab() {
    this._tone(180, 0.08, 'triangle', 0.15);
    this._noise(0.04, 0.1);
  },

  bounce() {
    this._tone(400, 0.1, 'sine', 0.2, 800);
  },

  crumble() {
    this._noise(0.15, 0.18);
    this._tone(100, 0.12, 'sawtooth', 0.1, 60);
  },

  uiSelect() {
    this._tone(600, 0.06, 'square', 0.12);
  },

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }
};
