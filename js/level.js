// ─── Level: tile-based geometry ───
const Level = {
  tileSize: 32,
  tiles: [],        // array of {x, y, w, h} rects
  spawnX: 100,
  spawnY: 300,
  levelWidth: 0,
  levelHeight: 0,

  // Tile legend:
  // 1 = solid, 0 = air, g = goal
  // ^ = spike (up), v = spike (down), < = spike (left), > = spike (right)
  // c = checkpoint, o = collectible (gem)
  // Materials: B = bouncy, I = ice/slippery, S = sponge/grabbable, D = breakable (destructible)

  // Material definitions: how each material affects physics and looks
  materials: {
    solid:     { friction: 1.0, bounce: 0, grabbable: false, breakable: false, color: null },
    bouncy:    { friction: 0.8, bounce: 0.7, grabbable: false, breakable: false, color: ['#2a6630', '#338844', '#44aa55'] },
    ice:       { friction: 0.15, bounce: 0, grabbable: false, breakable: false, color: ['#3a5a7a', '#4a7a9a', '#6a9abb'] },
    sponge:    { friction: 1.5, bounce: 0, grabbable: true, breakable: false, color: ['#7a5a2a', '#9a7a3a', '#bb9a55'] },
    breakable: { friction: 1.0, bounce: 0, grabbable: false, breakable: true, color: ['#5a4a3a', '#6a5a4a', '#7a6a5a'], breakTime: 0.4 },
  },
  // Theme palettes used by draw()
  themes: {
    circus: {
      name: 'The Big Top',
      bg: ['#1a0a0a', '#2a0f15', '#1a0a20'],
      tile: ['#8b1a1a', '#a02020', '#b83030'],
      accent: 'rgba(255, 215, 0, 0.15)',
      goalColor: [255, 215, 100],
      dotColor: 'rgba(200, 150, 50, 0.06)',
    },
    harlequin: {
      name: 'The Stage',
      bg: ['#0a0a14', '#12101e', '#1a1030'],
      tile: ['#2a1a3a', '#352248', '#402a55'],
      accent: 'rgba(180, 140, 255, 0.12)',
      goalColor: [180, 140, 255],
      dotColor: 'rgba(140, 100, 220, 0.05)',
    },
    puppet: {
      name: 'The Workshop',
      bg: ['#14100a', '#1e1810', '#281e14'],
      tile: ['#3a2a1a', '#4a3828', '#5a4832'],
      accent: 'rgba(120, 200, 180, 0.10)',
      goalColor: [120, 200, 180],
      dotColor: 'rgba(160, 140, 100, 0.05)',
    }
  },

  maps: [
    {
      name: 'The Big Top',
      theme: 'circus',
      spawn: [3, 21],
      entities: [
        // One-way platforms as stepping stones from ground to upper area
        { type: 'oneway', x: 22 * 32, y: 19 * 32, w: 96 },
        // Moving platform bridging dash gap (chimney top to material area)
        { type: 'platform', x: 55 * 32, y: 9 * 32, w: 64, h: 10, toX: 60 * 32, toY: 9 * 32, speed: 60 },
        // Patrol enemy on ground floor
        { type: 'patrol', x: 28 * 32, y: 23 * 32 - 20, range: 160, speed: 50 },
      ],
      // 80 wide × 25 tall — Tutorial level
      // Flow: run → jump → wall jump → dash → bouncy/ice/breakable → sponge climb → goal
      data: [
        '11111111111111111111111111111111111111111111111111111111111111111111111111111111',
        '100000000000000000000000g0000000000000000000000000000000000000000000000000000001',
        '10000000000000000000S0111110S000000000000000000000000000000000000000000000000001',
        '10000000000000000000S0111110S000000000000000000000000000000000000000000000000001',
        '10000000000000000000S0000000S000000000000000000000000000000000000000000000000001',
        '10000000000000000000S000o000S000000000000000000000000000000000000000000000000001',
        '10000000000000000000S0000000S000000000000000000000000000000000000000000000000001',
        '10000000000000000000S0000000S00000000000000000000o000000000000000000000000000001',
        '10000000000000000000S0000000S000000000000000000000000000000000000000000000000001',
        '10000000000000000000000011111000000000o0c000000000BBB110000000000000000000000001',
        '100000000000000000000000000000111IIII11111DDDD1110000000000000111111100000000001',
        '10000000000000000000000000000000000000000000000000000000000000100000100000000001',
        '10000000000000000000000000000000000000000000000000000000000000100000100000000001',
        '10000000000000000000000000000000000000000000000000000000000000100000100000000001',
        '10000000000000000000000000000000000000000000000000000000000000100o00100000000001',
        '10000000000000000000000000000000000000000000000000000000000000100000100000000001',
        '1000000000000000000000000000000000000000000000000000000000c000100000100000000001',
        '10000000000000000000000000000000000000000000000000000000111111111111111000000001',
        '10000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '10000000000000000000000000000000000000000000000001111100000000000000000000000001',
        '10000000000000000000000000000000000000000000o00000000000000000000000000000000001',
        '10000000000000000000000000000000000000000011111000000000000000000000000000000001',
        '11111111111111111000000000000000000000000000000000000000000000000000000000000001',
        '11111111111111111^^1111111111111111100001111111111111111111111111111111111111111',
        '11111111111111111111111111111111111111111111111111111111111111111111111111111111',
      ]
    },
    {
      name: 'The Stage',
      theme: 'harlequin',
      spawn: [3, 20],
      entities: [
        // One-way platforms as alternative routes
        { type: 'oneway', x: 15 * 32, y: 18 * 32, w: 96 },
        { type: 'oneway', x: 40 * 32, y: 12 * 32, w: 64 },
        // Sawblade near the spike wall
        { type: 'sawblade', x: 42 * 32, y: 12 * 32, toX: 42 * 32, toY: 16 * 32, speed: 65, radius: 11 },
        // Moving platform over spike gauntlet
        { type: 'platform', x: 36 * 32, y: 22 * 32, w: 64, h: 10, toX: 42 * 32, toY: 22 * 32, speed: 70 },
        // Patrol enemies
        { type: 'patrol', x: 50 * 32, y: 22 * 32 - 20, range: 128, speed: 55 },
      ],
      // 80 wide × 24 tall — Intermediate gauntlet
      // Combines all mechanics: spike gauntlets, materials required, sponge+goal
      data: [
        '11111111111111111111111111111111111111111111111111111111111111111111111111111111',
        '1000000000000000000000000000000000000000000000000000000000000000000000g000000001',
        '10000000000000000000000000000000000000000000000000000000000000000000111110000001',
        '100000000000000000000000000000000000000000000000000000000000000000000000S0000001',
        '100000000000000000000000000000000000000000000000000000000000000000001111S0000001',
        '100000000000000000000000000000000000000000000000000000000000000000000000S0000001',
        '100000000000000000000000000000000000000000000000000000000000000000000000S00c0001',
        '100000000000000000000000000000000000000000000000000000000000000o0000111110111111',
        '10000000000000000000000000000000000000000000000000000000000011111110000000000001',
        '1000000000000000000000000000000000000000000001000000000c000000000000000000000001',
        '100000000000000000000000000000000000000000000>0111110011DDDD10000000000000000001',
        '100000000000000000000000000000000000000000000>0000000000000000000000000000000001',
        '100000000000000000000000000000000000000000000>0000o00011^^^^11100000000000000001',
        '100000000000000000000000000000000000000o00000>0011111000000000000000000000000001',
        '100000000000000000000000000000000000111111100>00000000000000001BBB10000000000001',
        '10000000000000000000000000000000000000000000010000000000000000000000000000000001',
        '1000000000000000000000000000III1110000000000000000000000000000000000000000000001',
        '1000000000000000000000c000000000000000000000000000000000000000000000000000000001',
        '10000000000000000000111110000000000000000000000000000000000000000000000000000001',
        '10000000000000o00000000000000000000000000000000000000000000000000000000000000001',
        '10000000000011111000000000000000000000000000000000000000000000000000000000000001',
        '10000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '11111111111^^^111111111^^11111111111^^^^^^^^111111111111111111111111111111111111',
        '11111111111111111111111111111111111111111111111111111111111111111111111111111111',
      ]
    },
    {
      name: 'The Workshop',
      theme: 'puppet',
      spawn: [3, 26],
      entities: [
        // One-way platforms for vertical progression
        { type: 'oneway', x: 20 * 32, y: 24 * 32, w: 96 },
        { type: 'oneway', x: 12 * 32, y: 16 * 32, w: 64 },
        // Moving platform near the top
        { type: 'platform', x: 15 * 32, y: 6 * 32, w: 64, h: 10, toX: 25 * 32, toY: 6 * 32, speed: 50 },
        // Sawblades in the tower
        { type: 'sawblade', x: 24 * 32, y: 14 * 32, toX: 24 * 32, toY: 10 * 32, speed: 55, radius: 12 },
        { type: 'sawblade', x: 15 * 32, y: 20 * 32, toX: 15 * 32, toY: 18 * 32, speed: 50, radius: 10 },
        // Patrol enemy on ground floor
        { type: 'patrol', x: 28 * 32, y: 28 * 32 - 20, range: 160, speed: 50 },
      ],
      // 50 wide × 30 tall — Expert vertical tower
      // Demands mastery: grab-slingshot, ice momentum, breakable timing, sawblade dodging
      data: [
        '11111111111111111111111111111111111111111111111111',
        '1000000000000000000000000g000000000000000000000001',
        '10000000000000000000001111111000000000000000000001',
        '10000000000000000000000000000000000o00000000000001',
        '10000000000000000000000000000000111111100000000001',
        '10000000000000000000000000000000000000000000000001',
        '10000000000000000000111DDDDD1110000000000000000001',
        '10000000000000000000000000000000000000000000000001',
        '1S00000011IIIII110000000000000000000000000000000S1',
        '1S00000000000000000000000000c0o00000000000000000S1',
        '1S0000000000000000000000011111111111000000000000S1',
        '>S0000000000000000000000000000000000000000000000S<',
        '1S0000000000111111100000000000000000000000000000S1',
        '1S0000000000000000000000000000000o00000000000000S1',
        '10000000000000000000000000000011111110000000000001',
        '>000000000000000000000000000000000000000000000000<',
        '10000000001111111000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000c000001',
        '1S00000000000000000000000o000000000111DDDD111000S1',
        '1S0000000000000000000000000000000000000000000000S1',
        '1S0000000000000000001111BBB110000000000000000000S1',
        '1S0000000000000000000000000000000000000000000000S1',
        '1S00000011IIII1000000000000000000000000000000000S1',
        '1S00000000000000000000000000000000000000c0000000S1',
        '10000000000000000000000000000000000000111110000001',
        '10000000000000000000000000000000o00000000000000001',
        '10000000000000011111000000000011111100000000000001',
        '10000000000000000000000000000000000000000000000001',
        '1111111111111111111^^11111111111111111111111111111',
        '11111111111111111111111111111111111111111111111111',
      ]
    }
  ],

  currentMap: 0,

  load(mapIndex) {
    this.currentMap = mapIndex;
    this.tiles = [];
    this.checkpoints = [];
    this.collectibles = [];
    this.collectedCount = 0;
    this.totalCollectibles = 0;
    const map = this.maps[mapIndex];
    const data = map.data;

    this.levelHeight = data.length * this.tileSize;
    this.levelWidth = data[0].length * this.tileSize;
    this.spawnX = map.spawn[0] * this.tileSize;
    this.spawnY = map.spawn[1] * this.tileSize;

    const spikeDirections = { '^': 'up', 'v': 'down', '<': 'left', '>': 'right' };
    const materialMap = { 'B': 'bouncy', 'I': 'ice', 'S': 'sponge', 'D': 'breakable' };

    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const ch = data[row][col];
        const tx = col * this.tileSize;
        const ty = row * this.tileSize;

        if (ch === '1') {
          this.tiles.push({ x: tx, y: ty, w: this.tileSize, h: this.tileSize, type: 'solid', material: 'solid' });
        } else if (materialMap[ch]) {
          const mat = materialMap[ch];
          this.tiles.push({
            x: tx, y: ty, w: this.tileSize, h: this.tileSize,
            type: 'solid', material: mat,
            breaking: false, breakTimer: 0, broken: false
          });
        } else if (ch === 'g') {
          this.tiles.push({ x: tx, y: ty, w: this.tileSize, h: this.tileSize, type: 'goal' });
        } else if (spikeDirections[ch]) {
          // Spikes: full tile for rendering, but the lethal area is the pointy half
          const dir = spikeDirections[ch];
          const s = this.tileSize;
          let hx = tx, hy = ty, hw = s, hh = s;
          // Shrink hitbox to the pointy half of the spike
          if (dir === 'up')    { hy = ty; hh = s / 2; }
          if (dir === 'down')  { hy = ty + s / 2; hh = s / 2; }
          if (dir === 'left')  { hx = tx; hw = s / 2; }
          if (dir === 'right') { hx = tx + s / 2; hw = s / 2; }
          this.tiles.push({ x: tx, y: ty, w: s, h: s, hx, hy, hw, hh, type: 'spike', dir });
        } else if (ch === 'c') {
          this.checkpoints.push({ x: tx, y: ty, w: this.tileSize, h: this.tileSize, active: false });
        } else if (ch === 'o') {
          this.collectibles.push({ x: tx, y: ty, w: this.tileSize, h: this.tileSize, collected: false });
          this.totalCollectibles++;
        }
      }
    }

    // Cache hazard and goal rects (avoid per-frame allocation)
    this._cachedHazards = this.tiles
      .filter(t => t.type === 'spike')
      .map(t => ({ x: t.hx, y: t.hy, w: t.hw, h: t.hh }));
    this._cachedGoals = this.tiles.filter(t => t.type === 'goal');

    // Build spatial grid for fast tile lookups (getTilesNear)
    this._tileGrid = {};
    for (const tile of this.tiles) {
      if (tile.type !== 'solid') continue;
      const key = Math.floor(tile.x / this.tileSize) + ',' + Math.floor(tile.y / this.tileSize);
      this._tileGrid[key] = tile;
    }

    // Build solid grid for edge detection in rendering
    this.gridRows = data.length;
    this.gridCols = data[0].length;
    this.solidGrid = [];
    for (let row = 0; row < data.length; row++) {
      this.solidGrid[row] = [];
      for (let col = 0; col < data[row].length; col++) {
        const ch = data[row][col];
        this.solidGrid[row][col] = (ch === '1' || !!materialMap[ch]);
      }
    }

    // Load dynamic entities
    Entities.loadFromMap(map.entities);
  },

  // Check if grid cell is solid (for edge detection)
  _isSolid(row, col) {
    if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) return false;
    return this.solidGrid[row] && this.solidGrid[row][col];
  },

  getTilesNear(px, py, pw, ph) {
    // Spatial grid lookup — O(1) per cell instead of O(n) scan
    const s = this.tileSize;
    const x1 = Math.floor((px - s) / s);
    const x2 = Math.floor((px + pw + s) / s);
    const y1 = Math.floor((py - s) / s);
    const y2 = Math.floor((py + ph + s) / s);
    const result = [];
    for (let gy = y1; gy <= y2; gy++) {
      for (let gx = x1; gx <= x2; gx++) {
        const tile = this._tileGrid[gx + ',' + gy];
        if (tile && !tile.broken) result.push(tile);
      }
    }
    return result;
  },

  // Update breakable tiles (called from game loop)
  updateBreakables(dt) {
    for (const tile of this.tiles) {
      if (tile.material !== 'breakable' || tile.broken) continue;
      if (tile.breaking) {
        tile.breakTimer -= dt;
        if (tile.breakTimer <= 0) {
          tile.broken = true;
          // Crumble particles
          Particles.burst(
            tile.x + tile.w / 2, tile.y + tile.h / 2,
            12, 120, 'rgba(120,100,80,0.7)', 0.4
          );
        }
      }
    }
  },

  // Start breaking a tile (called when player stands on it)
  startBreaking(tile) {
    if (tile.material !== 'breakable' || tile.breaking || tile.broken) return;
    tile.breaking = true;
    tile.breakTimer = this.materials.breakable.breakTime;
  },

  // Reset all breakable tiles (called on respawn)
  resetBreakables() {
    for (const tile of this.tiles) {
      if (tile.material === 'breakable') {
        tile.breaking = false;
        tile.breakTimer = 0;
        tile.broken = false;
      }
    }
  },

  // Get material for a tile at a position (O(1) grid lookup)
  getMaterialAt(x, y) {
    const key = Math.floor(x / this.tileSize) + ',' + Math.floor(y / this.tileSize);
    const tile = this._tileGrid[key];
    if (tile && !tile.broken) return tile.material || 'solid';
    return null;
  },

  getGoals() {
    return this._cachedGoals;
  },

  getHazards() {
    return this._cachedHazards;
  },

  getTheme() {
    const map = this.maps[this.currentMap];
    return this.themes[map.theme] || this.themes.circus;
  },

  draw(ctx) {
    // Skip drawing until a level is loaded (title/levelSelect screens)
    if (!this.collectibles) return;
    const theme = this.getTheme();

    // Background gradient atmosphere
    const grad = ctx.createLinearGradient(0, 0, 0, Engine.height);
    grad.addColorStop(0, theme.bg[0]);
    grad.addColorStop(0.5, theme.bg[1]);
    grad.addColorStop(1, theme.bg[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    // Background decorative dots (parallax)
    const camX = Camera.x * 0.3;
    const camY = Camera.y * 0.3;
    ctx.fillStyle = theme.dotColor;
    for (let i = 0; i < 60; i++) {
      const bx = ((i * 137) % 3200) - camX % 3200;
      const by = ((i * 89) % 1000) - camY % 1000;
      const size = 2 + (i % 3);
      ctx.fillRect(bx, by, size, size);
    }

    // Theme-specific background effects
    const currentTheme = this.maps[this.currentMap].theme;
    ctx.save();
    if (currentTheme === 'circus') {
      // Faint tent stripe pattern
      const stripeW = 120;
      const offsetX = -Camera.x * 0.15;
      for (let sx = -stripeW; sx < Engine.width + stripeW; sx += stripeW * 2) {
        ctx.fillStyle = 'rgba(180, 30, 30, 0.03)';
        ctx.fillRect(sx + (offsetX % (stripeW * 2)), 0, stripeW, Engine.height);
      }
    } else if (currentTheme === 'harlequin') {
      // Diamond / checkerboard pattern (stage floor vibe)
      const dSize = 80;
      const offX = (-Camera.x * 0.1) % (dSize * 2);
      const offY = (-Camera.y * 0.1) % (dSize * 2);
      ctx.fillStyle = 'rgba(100, 60, 160, 0.02)';
      for (let dy = -dSize; dy < Engine.height + dSize; dy += dSize) {
        for (let dx = -dSize; dx < Engine.width + dSize; dx += dSize) {
          if (((Math.floor(dx / dSize) + Math.floor(dy / dSize)) % 2) === 0) {
            ctx.fillRect(dx + offX, dy + offY, dSize, dSize);
          }
        }
      }
    } else if (currentTheme === 'puppet') {
      // Faint horizontal wood grain lines
      const offY = (-Camera.y * 0.1) % 40;
      ctx.fillStyle = 'rgba(120, 90, 50, 0.025)';
      for (let ly = -40; ly < Engine.height + 40; ly += 40) {
        ctx.fillRect(0, ly + offY, Engine.width, 1);
        ctx.fillRect(0, ly + offY + 12, Engine.width, 1);
      }
    }
    ctx.restore();

    // Ambient floating particles (theme-specific)
    const t = performance.now() / 1000;
    ctx.save();
    if (currentTheme === 'circus') {
      // Confetti
      for (let i = 0; i < 15; i++) {
        const px = ((i * 211 + t * 12) % (Engine.width + 100)) - 50;
        const py = ((i * 157 + Math.sin(t * 0.8 + i * 2.1) * 40 + t * 20) % (Engine.height + 60)) - 30;
        const hue = (i * 72) % 360;
        ctx.fillStyle = `hsla(${hue}, 70%, 65%, 0.08)`;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(t * 1.5 + i);
        ctx.fillRect(-3, -1, 6, 2);
        ctx.restore();
      }
    } else if (currentTheme === 'harlequin') {
      // Stage light beams
      for (let i = 0; i < 4; i++) {
        const bx = (Engine.width / 5) * (i + 1) + Math.sin(t * 0.3 + i * 1.5) * 60;
        const grad2 = ctx.createLinearGradient(bx, 0, bx, Engine.height);
        grad2.addColorStop(0, 'rgba(140,100,220,0.04)');
        grad2.addColorStop(1, 'rgba(140,100,220,0)');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.moveTo(bx - 20, 0);
        ctx.lineTo(bx - 80, Engine.height);
        ctx.lineTo(bx + 80, Engine.height);
        ctx.lineTo(bx + 20, 0);
        ctx.fill();
      }
    } else if (currentTheme === 'puppet') {
      // Sawdust motes
      for (let i = 0; i < 20; i++) {
        const px = ((i * 193 + t * 8 + Math.sin(t * 0.5 + i) * 30) % (Engine.width + 40)) - 20;
        const py = ((i * 127 + t * 15) % (Engine.height + 40)) - 20;
        const size = 1 + (i % 2);
        ctx.fillStyle = `rgba(180,150,100,${0.06 + Math.sin(t + i * 0.7) * 0.02})`;
        ctx.fillRect(px, py, size, size);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-Camera.x, -Camera.y);

    // Draw tiles (viewport culled)
    const viewL = Camera.x - 32;
    const viewR = Camera.x + Engine.width + 32;
    const viewT = Camera.y - 32;
    const viewB = Camera.y + Engine.height + 32;

    for (const tile of this.tiles) {
      // Skip tiles outside viewport
      if (tile.x + tile.w < viewL || tile.x > viewR || tile.y + tile.h < viewT || tile.y > viewB) continue;

      if (tile.type === 'solid') {
        // Skip broken breakable tiles
        if (tile.broken) continue;

        const mat = tile.material && Level.materials[tile.material];
        const colors = (mat && mat.color) ? mat.color : theme.tile;

        // Grid position for edge detection
        const col = Math.floor(tile.x / this.tileSize);
        const row = Math.floor(tile.y / this.tileSize);
        const noTop = this._isSolid(row - 1, col);
        const noBot = this._isSolid(row + 1, col);
        const noLeft = this._isSolid(row, col - 1);
        const noRight = this._isSolid(row, col + 1);

        // Main tile fill
        ctx.fillStyle = colors[1];
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

        // Exposed edge highlights (only on sides facing air)
        if (!noTop) {
          ctx.fillStyle = colors[2];
          ctx.fillRect(tile.x, tile.y, tile.w, 2);
        }
        if (!noBot) {
          ctx.fillStyle = colors[0];
          ctx.fillRect(tile.x, tile.y + tile.h - 2, tile.w, 2);
        }
        if (!noLeft) {
          ctx.fillStyle = colors[2];
          ctx.fillRect(tile.x, tile.y, 2, tile.h);
        }
        if (!noRight) {
          ctx.fillStyle = colors[0];
          ctx.fillRect(tile.x + tile.w - 2, tile.y, 2, tile.h);
        }

        // Material-specific visual indicators
        if (tile.material === 'bouncy') {
          // Spring arrows
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          const cx = tile.x + tile.w / 2;
          ctx.beginPath();
          ctx.moveTo(cx - 6, tile.y + 12);
          ctx.lineTo(cx, tile.y + 4);
          ctx.lineTo(cx + 6, tile.y + 12);
          ctx.fill();
        } else if (tile.material === 'ice') {
          // Shine streaks
          ctx.fillStyle = 'rgba(200,230,255,0.15)';
          ctx.fillRect(tile.x + 4, tile.y + 6, 10, 1);
          ctx.fillRect(tile.x + 14, tile.y + 14, 12, 1);
          ctx.fillRect(tile.x + 6, tile.y + 22, 8, 1);
        } else if (tile.material === 'sponge') {
          // Porous dots
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          for (let dx = 5; dx < tile.w; dx += 8) {
            for (let dy = 5; dy < tile.h; dy += 8) {
              ctx.fillRect(tile.x + dx, tile.y + dy, 2, 2);
            }
          }
        } else if (tile.material === 'breakable') {
          // Crack lines
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tile.x + 8, tile.y);
          ctx.lineTo(tile.x + 16, tile.y + 16);
          ctx.lineTo(tile.x + 24, tile.y + 10);
          ctx.moveTo(tile.x + 4, tile.y + 20);
          ctx.lineTo(tile.x + 14, tile.y + 28);
          ctx.stroke();
          // Flash when breaking
          if (tile.breaking) {
            const flash = Math.sin(tile.breakTimer * 20) * 0.15 + 0.1;
            ctx.fillStyle = `rgba(255,255,255,${flash})`;
            ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
          }
        }
      } else if (tile.type === 'spike') {
        // Draw spike triangles
        ctx.fillStyle = '#dd3333';
        ctx.beginPath();
        const s = tile.w;
        if (tile.dir === 'up') {
          ctx.moveTo(tile.x, tile.y + s);
          ctx.lineTo(tile.x + s / 2, tile.y + 4);
          ctx.lineTo(tile.x + s, tile.y + s);
        } else if (tile.dir === 'down') {
          ctx.moveTo(tile.x, tile.y);
          ctx.lineTo(tile.x + s / 2, tile.y + s - 4);
          ctx.lineTo(tile.x + s, tile.y);
        } else if (tile.dir === 'left') {
          ctx.moveTo(tile.x + s, tile.y);
          ctx.lineTo(tile.x + 4, tile.y + s / 2);
          ctx.lineTo(tile.x + s, tile.y + s);
        } else if (tile.dir === 'right') {
          ctx.moveTo(tile.x, tile.y);
          ctx.lineTo(tile.x + s - 4, tile.y + s / 2);
          ctx.lineTo(tile.x, tile.y + s);
        }
        ctx.fill();
        // Highlight
        ctx.fillStyle = '#ff5555';
        ctx.beginPath();
        if (tile.dir === 'up') {
          ctx.moveTo(tile.x + s * 0.3, tile.y + s);
          ctx.lineTo(tile.x + s / 2, tile.y + 8);
          ctx.lineTo(tile.x + s * 0.7, tile.y + s);
        } else if (tile.dir === 'down') {
          ctx.moveTo(tile.x + s * 0.3, tile.y);
          ctx.lineTo(tile.x + s / 2, tile.y + s - 8);
          ctx.lineTo(tile.x + s * 0.7, tile.y);
        } else if (tile.dir === 'left') {
          ctx.moveTo(tile.x + s, tile.y + s * 0.3);
          ctx.lineTo(tile.x + 8, tile.y + s / 2);
          ctx.lineTo(tile.x + s, tile.y + s * 0.7);
        } else if (tile.dir === 'right') {
          ctx.moveTo(tile.x, tile.y + s * 0.3);
          ctx.lineTo(tile.x + s - 8, tile.y + s / 2);
          ctx.lineTo(tile.x, tile.y + s * 0.7);
        }
        ctx.fill();
      } else if (tile.type === 'goal') {
        // Pulsing goal with theme color
        const gc = theme.goalColor;
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
        ctx.fillStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, ${0.3 + pulse * 0.4})`;
        ctx.fillRect(tile.x + 4, tile.y + 4, tile.w - 8, tile.h - 8);
        ctx.strokeStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, ${0.5 + pulse * 0.3})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 4);
      }
    }

    // Draw collectibles (gems) — viewport culled
    const gc = theme.goalColor;
    for (const col of this.collectibles) {
      if (col.collected) continue;
      if (col.x + col.w < viewL || col.x > viewR || col.y + col.h < viewT || col.y > viewB) continue;
      const t = performance.now() / 1000;
      const bob = Math.sin(t * 3 + col.x * 0.1) * 3; // gentle bob
      const pulse = 0.6 + 0.3 * Math.sin(t * 4 + col.x * 0.2);
      const cx = col.x + col.w / 2;
      const cy = col.y + col.h / 2 + bob;
      // Outer glow
      ctx.fillStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, ${pulse * 0.15})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      // Diamond shape
      ctx.fillStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, ${pulse})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx + 5, cy);
      ctx.lineTo(cx, cy + 7);
      ctx.lineTo(cx - 5, cy);
      ctx.closePath();
      ctx.fill();
      // Inner highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.4})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx + 2, cy);
      ctx.lineTo(cx, cy + 4);
      ctx.lineTo(cx - 2, cy);
      ctx.closePath();
      ctx.fill();
    }

    // Draw checkpoints
    for (const cp of this.checkpoints) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 500);
      if (cp.active) {
        // Active checkpoint: bright gold flag
        ctx.fillStyle = `rgba(255, 215, 50, ${0.7 + pulse * 0.3})`;
        // Flagpole
        ctx.fillRect(cp.x + cp.w / 2 - 1, cp.y + 4, 2, cp.h - 4);
        // Flag
        ctx.fillRect(cp.x + cp.w / 2 + 1, cp.y + 4, 10, 8);
      } else {
        // Inactive: dim
        ctx.fillStyle = `rgba(150, 150, 150, ${0.3 + pulse * 0.1})`;
        ctx.fillRect(cp.x + cp.w / 2 - 1, cp.y + 4, 2, cp.h - 4);
        ctx.fillRect(cp.x + cp.w / 2 + 1, cp.y + 6, 8, 6);
      }
    }

    ctx.restore();
  }
};
