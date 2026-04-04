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
      spawn: [3, 28],
      entities: [
        // One-way platforms as stepping stones in the open area
        { type: 'oneway', x: 22 * 32, y: 27 * 32, w: 96 },
        // Moving platform over the spike pit
        { type: 'platform', x: 20 * 32, y: 30 * 32, w: 64, h: 10, toX: 28 * 32, toY: 30 * 32, speed: 70 },
        // Sawblade in the wall-jump chimney
        { type: 'sawblade', x: 78 * 32, y: 14 * 32, toX: 78 * 32, toY: 10 * 32, speed: 60, radius: 10 },
        // Patrol enemy on the long platform section
        { type: 'patrol', x: 40 * 32, y: 31 * 32 - 20, range: 160, speed: 55 },
      ],
      // 100 wide x 32 tall — medium-sized circus level
      // Layout: left-to-right flow, teaches run -> jump -> wall jump -> dash
      // Then vertical climb inside the "tent", ending at the top
      data: [
        // Row 0-3: top border / tent peak
        '1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000g00000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000011111100000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        // Row 4-7: upper tent area — spikes guard the approach to goal
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000001000000000o0000010000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000010000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000001>00000000000000<10000000000000001',
        // Row 8-11: mid-upper area — wall jump chimney with spikes
        '1000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000010000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000001100001>0000000000000<010000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000001000001100000000010000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000001>00000000000000<10000000000000001',
        // Row 12-15: mid area
        '1000000000000000000000000000000000000000000000000000000000000000000000000001000000000000110010000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000010000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000001100000001000000000000000010000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000001000011000000000010000000000000001',
        // Row 16-19: approaching the tent / vertical section — checkpoint at entrance
        '1000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000010000000000000001',
        '1000000000000000000000000000000000000000000000000000000011100000000000000001000000000011000010000000000000001',
        '100000000000000000000000000000000000000000000000000000000000000000000000c001000000000000000010000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000001111111111111111110000000000000001',
        // Row 20-23: main platforming area — momentum jumps over spike pits
        '100000000000000000000000000000000000000000111000000000000000000000000000000000000000000000000000000000000000^1',
        '10000000000000000000000000000000000000000000o0000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000011100000000000000000011100000000000000000000000000000000000000000000000000001',
        '10000000000000000000000000000o0000000000000000000000000000o00000000000000000000000000000000000000000000000001',
        // Row 24-27: lower platforms — learning to run and jump, first spikes
        '10000000000000000000000111o00000000000000000000000000000000000000000000000000000000000000000000000000000c0001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000001100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        // Row 28-31: ground level — start here, run right, spikes in the first gap
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1111111111111111111100000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000^1',
        '1111111111111111111111^^11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
      ]
    },
    {
      name: 'The Stage',
      theme: 'harlequin',
      spawn: [2, 18],
      entities: [
        // One-way platforms for alternative routes
        { type: 'oneway', x: 10 * 32, y: 16 * 32, w: 96 },
        { type: 'oneway', x: 30 * 32, y: 9 * 32, w: 64 },
        // Sawblade guarding the spike field
        { type: 'sawblade', x: 42 * 32, y: 14 * 32, toX: 42 * 32, toY: 17 * 32, speed: 70, radius: 11 },
        // Moving platform over the long spike row
        { type: 'platform', x: 50 * 32, y: 14 * 32, w: 64, h: 10, toX: 60 * 32, toY: 14 * 32, speed: 80 },
        // Patrol enemies
        { type: 'patrol', x: 15 * 32, y: 21 * 32 - 20, range: 128, speed: 45 },
        { type: 'patrol', x: 60 * 32, y: 16 * 32 - 20, range: 96, speed: 60 },
      ],
      // 80 wide x 22 tall — horizontal gauntlet with vertical drops
      data: [
        '11111111111111111111111111111111111111111111111111111111111111111111111111111111',
        '10000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '10000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '10000000000000000000000000000000000000000000000000000000000000000000000g00000001',
        '1000000000000000000000000000000000000000000000000000000000000000000001111100000^1',
        '1000000000000000000000000000000000000000000000000000000000000o000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000001100000000000000c001',
        '10000000000000000000000000000000000000000000000000000000000000000000000000001111',
        '100000000000000000000000000000000000000000000000000000110000o0000000000000000001',
        '10000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '100000000000000000000000000000000000000000000001100000000000000000000000000000^1',
        '100000000000000000000000000000000000000000000000000o0000000000000000001000000001',
        '1000000000000000000000000000000000000011100000000000000000000000000001000000001',
        '10000000000000000000000000000000000000000o00000000000000000000c0000001000000001',
        '10000000000000000000000000000000001000000000000000000000000011110000001000000001',
        '100000000000000000000000001110000000000000000000000^^^^^^^^^^^^^^^^^0001000000001',
        '10000000000000000000000000000000000000000000000000011111111111111111111000000001',
        '100000000000000000001100000000000000000000000000000000000000000000000000000000^1',
        '10000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '10000011100000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000^1',
        '11111111111111111111111111111111111111111111111111111111111111111111111111111111',
      ]
    },
    {
      name: 'The Workshop',
      theme: 'puppet',
      spawn: [2, 22],
      entities: [
        // One-way platforms as stepping stones in the vertical climb
        { type: 'oneway', x: 20 * 32, y: 20 * 32, w: 96 },
        { type: 'oneway', x: 10 * 32, y: 16 * 32, w: 64 },
        { type: 'oneway', x: 30 * 32, y: 12 * 32, w: 64 },
        // Moving platform near the top
        { type: 'platform', x: 12 * 32, y: 6 * 32, w: 64, h: 10, toX: 30 * 32, toY: 6 * 32, speed: 50 },
        // Sawblade in the middle section
        { type: 'sawblade', x: 28 * 32, y: 15 * 32, toX: 28 * 32, toY: 11 * 32, speed: 55, radius: 12 },
        // Patrol enemy at the bottom
        { type: 'patrol', x: 20 * 32, y: 24 * 32 - 20, range: 200, speed: 50 },
      ],
      // 60 wide x 26 tall — vertical tower climb
      data: [
        '111111111111111111111111111111111111111111111111111111111111',
        '100000000000000000000000000g000000000000000000000000000001',
        '100000000000000000000000011111100000000000000000000000000001',
        '100000000000000000000000000000000000000000000000000000000001',
        '1>00000000000000000000000000000000000000000000000000000o0<1',
        '100000000000000000000011000000000001100000000000000000000001',
        '100000000000000000000000000o00000000000000000000000000000001',
        '10000000c000000000000000000000000000000000000000000000000001',
        '100000011100000000000000000000000000000000000000011100000001',
        '100000000000000000000000000000000000000000000000000000000001',
        '1>0000000000000001100000000000000000001100000000000000000<1',
        '10000000000000000000000o000000000000000000o00000000000000001',
        '100000000000000000000000000000000000000000000000000000000001',
        '100000000000000000000000001110000000000000000000000000000001',
        '10000000000000000000000000000o0000000000000000000000000000001',
        '1>000000000000000000000000000000000000000000000000000000c0<1',
        '10000000011000000000000000000000000000000000000011000000001',
        '100000000000000000000000000000000000000000000000000000000001',
        '100000000000000000000000000000000000000000000000000000000001',
        '100000000000000001110000000000000000001110000000000000000001',
        '100000000000000000000000000000000000000000000000000000000001',
        '100000000000000000000000000000000000000000000000000000000001',
        '100000000000000000000000000001100000000000000000000000000001',
        '100000000000000000000000000000000000000000000000000000000001',
        '1111111111111111111100000000000000000000011111111111111111^1',
        '111111111111111111111111^^111111111111111111111111111111111',
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

    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const ch = data[row][col];
        const tx = col * this.tileSize;
        const ty = row * this.tileSize;

        if (ch === '1') {
          this.tiles.push({ x: tx, y: ty, w: this.tileSize, h: this.tileSize, type: 'solid' });
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

    // Load dynamic entities
    Entities.loadFromMap(map.entities);
  },

  getTilesNear(px, py, pw, ph) {
    // Return only tiles that could possibly overlap the given rect (broad phase)
    const margin = this.tileSize;
    const result = [];
    for (const tile of this.tiles) {
      if (tile.type !== 'solid') continue;
      if (tile.x + tile.w + margin < px || tile.x - margin > px + pw) continue;
      if (tile.y + tile.h + margin < py || tile.y - margin > py + ph) continue;
      result.push(tile);
    }
    return result;
  },

  getGoals() {
    return this.tiles.filter(t => t.type === 'goal');
  },

  getHazards() {
    // Return hazard rects (using the tighter spike hitbox)
    return this.tiles
      .filter(t => t.type === 'spike')
      .map(t => ({ x: t.hx, y: t.hy, w: t.hw, h: t.hh }));
  },

  getTheme() {
    const map = this.maps[this.currentMap];
    return this.themes[map.theme] || this.themes.circus;
  },

  draw(ctx) {
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

    ctx.save();
    ctx.translate(-Camera.x, -Camera.y);

    // Draw tiles
    for (const tile of this.tiles) {
      if (tile.type === 'solid') {
        // Main tile
        ctx.fillStyle = theme.tile[0];
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
        // Inner highlight
        ctx.fillStyle = theme.tile[1];
        ctx.fillRect(tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2);
        // Top edge highlight
        ctx.fillStyle = theme.tile[2];
        ctx.fillRect(tile.x + 1, tile.y + 1, tile.w - 2, 2);
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

    // Draw collectibles (gems)
    const theme = this.getTheme();
    const gc = theme.goalColor;
    for (const col of this.collectibles) {
      if (col.collected) continue;
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
