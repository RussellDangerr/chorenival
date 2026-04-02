// ─── Level: tile-based geometry ───
const Level = {
  tileSize: 32,
  tiles: [],        // array of {x, y, w, h} rects
  spawnX: 100,
  spawnY: 300,
  levelWidth: 0,
  levelHeight: 0,

  // Tile map: 1 = solid, 0 = air
  maps: [
    {
      name: 'Awakening',
      spawn: [3, 13],
      data: [
        '1111111111111111111111111111111111111111111111111111111111111111',
        '1000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000001000000000000001',
        '1000000000000000000000000000000000000000000000001000000000000001',
        '1000000000000000000000000010000000000000000000001000000000000001',
        '1000000000000000000000000000000000000001100000001000000000000001',
        '10000000000000000000000000000000000000000000000010000000000000g1',
        '1000000000000000000001100000000000000000000000001111111111111111',
        '1000000000000000000000000000001100000000000000000000000000000001',
        '1000000000000000100000000000000000000000000000000000000000000001',
        '1000000000001000000000000000000000000000000000000000000000000001',
        '1111111111111111111111111111111111111111111111111111111111111111',
      ]
    }
  ],

  currentMap: 0,

  load(mapIndex) {
    this.currentMap = mapIndex;
    this.tiles = [];
    const map = this.maps[mapIndex];
    const data = map.data;

    this.levelHeight = data.length * this.tileSize;
    this.levelWidth = data[0].length * this.tileSize;
    this.spawnX = map.spawn[0] * this.tileSize;
    this.spawnY = map.spawn[1] * this.tileSize;

    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const ch = data[row][col];
        if (ch === '1') {
          this.tiles.push({
            x: col * this.tileSize,
            y: row * this.tileSize,
            w: this.tileSize,
            h: this.tileSize,
            type: 'solid'
          });
        } else if (ch === 'g') {
          // Goal
          this.tiles.push({
            x: col * this.tileSize,
            y: row * this.tileSize,
            w: this.tileSize,
            h: this.tileSize,
            type: 'goal'
          });
        }
      }
    }
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

  draw(ctx) {
    // Background gradient atmosphere
    const grad = ctx.createLinearGradient(0, 0, 0, Engine.height);
    grad.addColorStop(0, '#0d0d1a');
    grad.addColorStop(0.5, '#141428');
    grad.addColorStop(1, '#1a1a35');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    // Background decorative dots (parallax)
    const camX = Camera.x * 0.3;
    const camY = Camera.y * 0.3;
    ctx.fillStyle = 'rgba(100, 120, 180, 0.08)';
    for (let i = 0; i < 40; i++) {
      const bx = ((i * 137) % 2000) - camX % 2000;
      const by = ((i * 89) % 600) - camY % 600;
      const size = 2 + (i % 3);
      ctx.fillRect(bx, by, size, size);
    }

    ctx.save();
    ctx.translate(-Camera.x, -Camera.y);

    // Draw tiles
    for (const tile of this.tiles) {
      if (tile.type === 'solid') {
        // Main tile
        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
        // Inner highlight
        ctx.fillStyle = '#33335a';
        ctx.fillRect(tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2);
        // Top edge highlight
        ctx.fillStyle = '#3d3d6a';
        ctx.fillRect(tile.x + 1, tile.y + 1, tile.w - 2, 2);
      } else if (tile.type === 'goal') {
        // Pulsing goal
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
        ctx.fillStyle = `rgba(100, 255, 200, ${0.3 + pulse * 0.4})`;
        ctx.fillRect(tile.x + 4, tile.y + 4, tile.w - 8, tile.h - 8);
        ctx.strokeStyle = `rgba(100, 255, 200, ${0.5 + pulse * 0.3})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 4);
      }
    }

    ctx.restore();
  }
};
