// verify/sim.js — headless physics harness for the Big Drop slope work.
//
// Usage (via the preview MCP tools, in the running game page):
//   1) install:  fetch('/verify/sim.js').then(r=>r.text()).then(eval)
//   2) run:      JSON.stringify(window.runSim({ rows: [...], ... }))
//
// It stops Engine's RAF loop and steps Player.update() by hand so results are
// independent of real time. A scratch map named '__sim__' is appended to
// Level.maps and reused across runs.
(function () {
  function fakeInput() {
    return {
      runDir: 0, _jumpFrame: -1, _frame: 0,
      jumpBuffered() { return this._frame === this._jumpFrame; },
      consumeJump() {}, swipeEdge() { return 0; },
      pressed() { return false; }, tapped() { return false; },
    };
  }

  window.runSim = function (opts) {
    opts = opts || {};
    Engine.running = false;                       // halt the live loop

    const map = {
      name: '__sim__',
      theme: opts.theme || 'circus',
      spawn: opts.spawn || [2, 0],
      entities: opts.entities || [],
      data: opts.rows,
    };
    let idx = Level.maps.findIndex(m => m.name === '__sim__');
    if (idx === -1) { Level.maps.push(map); idx = Level.maps.length - 1; }
    else { Level.maps[idx] = map; }
    Level.load(idx);

    const wasMuted = Audio.muted; Audio.muted = true;
    const realInput = window.Input;
    const fin = fakeInput(); window.Input = fin;
    fin.runDir = opts.runDir != null ? opts.runDir : 0;
    fin._jumpFrame = opts.jumpFrame != null ? opts.jumpFrame : -1;

    const s = Level.tileSize;
    const px = opts.x != null ? opts.x : map.spawn[0] * s;
    const py = opts.y != null ? opts.y : map.spawn[1] * s;
    Player.spawn(px, py);
    if (opts.skipRamp) { Player.runState = 'cruise'; Player.rampT = 1; }
    if (opts.vx != null) Player.vx = opts.vx;

    const frames = opts.frames || 240;
    const sample = opts.sample || 1;
    const trace = [];
    for (let f = 0; f < frames; f++) {
      fin._frame = f;
      if (opts.steer && opts.steer[f] != null) fin.runDir = opts.steer[f];
      Player.update(Engine.fixedDt);
      if (f % sample === 0) {
        trace.push({
          f,
          x: +Player.x.toFixed(2), y: +Player.y.toFixed(2),
          vx: +Player.vx.toFixed(2), vy: +Player.vy.toFixed(2),
          grounded: Player.grounded,
          onSlope: !!Player.onSlope,
          slopeDir: Player.slopeDir || 0,
          momentum: +Player.momentum.toFixed(3),
          overspeed: +((Player.overspeed || 0)).toFixed(3),
        });
      }
    }
    Audio.muted = wasMuted;
    window.Input = realInput;
    return { idx, frames, last: trace[trace.length - 1], trace };
  };
})();
