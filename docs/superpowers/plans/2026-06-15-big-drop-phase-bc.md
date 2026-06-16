# The Big Drop — Phase B/C Implementation Plan (merge Levels 2+3 → "The Catwalk", renumber)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Note:** Task 3 (climb playtest/tuning) is human-in-the-loop, NOT a subagent task — a skill-based wall-jump climb can't be verified headlessly, so it's driven live via the preview by the controller/user.

**Goal:** Merge the two existing harlequin/puppet levels (The Stage + The Workshop) into one bigger harlequin level "The Catwalk" with a mandatory wall-jump shaft + an optional gem shaft + an elevated catwalk traverse, then renumber so the lineup is the final 3 levels with The Big Drop as Level 3.

**Architecture:** Add "The Catwalk" as a temporary Level 5 (`maps[4]`) reusing the existing `harlequin` theme, verify/tune it, then in Phase C rebuild `Level.maps` to `[Big Top, The Catwalk, The Big Drop]` (dropping Stage + Workshop). Level count is dynamic (`Game.totalLevels = Level.maps.length`), so the renumber is just reordering the array. The wall-jump shaft transplants Level 1's PROVEN geometry: a **lifted left wall** (rows 12–19, open at the floor so the runner enters the shaft) + a **full-height right wall** (rows 12–21, blocks forward progress and forces the climb) + a 2-tile gap.

**Tech stack:** Vanilla JS singletons, no build/test runner. Verification = headless harness (`verify/sim.js`) for structure + reachable spot-checks, and **live play** for the climbs (this level is skill content; its real test is playing it).

**Spec:** `docs/superpowers/specs/2026-06-15-big-drop-verticality-design.md` (Phase B + Phase C).

**Decisions locked with the user:** climb role = **mandatory centerpiece + one optional bonus shaft**; name = **"The Catwalk"** (harlequin theme kept).

**Prereq:** Phase A is merged/parked on `dev` (The Big Drop is `maps[3]`). This plan builds on that.

---

## Conventions
- Dev server: no-cache server on **port 8081** via the preview tools (`preview_start` name `clowncity`). The serverId changes between sessions — call `mcp__Claude_Preview__preview_list` to get the current one. After editing JS, `preview_eval` → `location.reload()` and confirm the new code loaded before judging.
- Harness `verify/sim.js` is NOT auto-loaded; after each reload re-install: `fetch('/verify/sim.js').then(r=>r.text()).then(eval)`.
- Commit after each task on the `dev` branch with the message shown.

## File structure
| File | Change |
|------|--------|
| `verify/sim.js` | Extend harness to accept `jumpFrames: [...]` (multi-jump) for pit/climb spot-checks |
| `js/level.js` | Add "The Catwalk" map + entities (Phase B); reorder `maps` + drop Stage/Workshop + unused `puppet` theme (Phase C) |
| `CLAUDE.md` | Update level list + describe The Catwalk; trim addressed out-of-scope items |

---

## Task 1: Extend the harness with multi-jump

**Files:** Modify `verify/sim.js`

The Catwalk's lower route has pits that need timed jumps; the single `jumpFrame` can't script that. Add `jumpFrames` (array) — arm a jump on any listed frame. Keep `jumpFrame` working.

- [ ] **Step 1: Add `jumpFrames` support**

In `verify/sim.js`, where the single jump frame is read:
```js
    const jumpFrame = opts.jumpFrame != null ? opts.jumpFrame : -1;
```
add a normalized set:
```js
    const jumpFrame = opts.jumpFrame != null ? opts.jumpFrame : -1;
    const jumpSet = new Set(opts.jumpFrames || []);
    if (jumpFrame >= 0) jumpSet.add(jumpFrame);
```
and change the per-frame arm line from `if (f === jumpFrame) ...` to:
```js
        if (jumpSet.has(f)) Input.buffer.Jump = Input.bufferTime;   // arm a jump this frame
```

- [ ] **Step 2: Verify both still work**

Re-install the harness, then a flat-floor double-jump check:
```js
// preview_eval (after location.reload() + re-install):
JSON.stringify(window.runSim({ rows:['000000','000000','111111'], spawn:[3,0], runDir:1,
  skipRamp:true, vx:400, jumpFrames:[20,60], frames:90, sample:1 })
  .trace.filter(s => s.vy < -100).map(s => s.f))
```
Expected: two jump events (frames near 20 and 60 where `vy` goes to −480). Confirms multi-jump arms correctly.

- [ ] **Step 3: Commit**
```bash
git add verify/sim.js
git commit -m "test(verify): support multi-jump (jumpFrames) in the sim harness"
```

---

## Task 2: Build "The Catwalk" (merged Level 2, temporary Level 5)

**Files:** Modify `js/level.js` — add a new map object at the END of `Level.maps` (after The Big Drop). Reuse the existing `harlequin` theme (no new theme).

The map is the generated, verified starter below (25 rows × 112 chars; built and tuned further in Task 3). Legend recap: `1` solid, `0` air, `T` treadmill, `g` goal, `c` checkpoint, `o` gem. Layout: intro → pit → one-way+patrol flat → pit → treadmill → **optional gem shaft (cols 42–45)** → checkpoint → **mandatory shaft (cols 57–60)** → climb to the **catwalk (row 12)** → ferry gap (cols 73–79) → goal (col 95), all over a death-void (cols 63–110 on the floor).

- [ ] **Step 1: Add the map object** (after the `The Big Drop` map object, before the closing `]` of `maps` — add a leading comma)

```js
    ,{
      name: 'The Catwalk',
      theme: 'harlequin',
      spawn: [3, 21],
      entities: [
        // One-way ledge over the early patrol (ride over or drop to stomp).
        { type: 'oneway', x: 14 * 32, y: 18 * 32, w: 96 },
        { type: 'patrol', x: 16 * 32, y: 22 * 32 - 20, range: 64, speed: 60 },
        // Patrol pacing the treadmill.
        { type: 'patrol', x: 33 * 32, y: 22 * 32 - 20, range: 96, speed: 60 },
        // Ferry bridging the catwalk gap (rides at the catwalk surface, row 12).
        { type: 'platform', x: 73 * 32, y: 12 * 32, w: 64, toX: 78 * 32, toY: 12 * 32, speed: 60 },
        // Patrol on the far catwalk segment.
        { type: 'patrol', x: 85 * 32, y: 12 * 32 - 20, range: 96, speed: 60 },
      ],
      // 112 wide x 25 tall. Lower run (pits/treadmill/optional gem shaft) -> mandatory
      // wall-jump shaft (cols 57-60: left wall lifted rows 12-19, right wall full rows
      // 12-21, gap 58-59) -> climb to the catwalk (row 12) -> ferry gap (73-79) -> goal
      // (col 95). Floor cols 63-110 is a death-void, so the catwalk is the only way across.
      data: [
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000000000000o0000000000000000000000o0000g0000000000000001',
        '1000000000000000000000000000000000000000000o00000000000001001111111111111000000011111111111111111000000000000001',
        '1000000000000000000000000000000000000000001001000000000001001000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000001001000000000001o01000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000001001000000000001001000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000001001000000000001001000000000000000000000000000000000000000000000000001',
        '10000000000000000000000000000000000000000010010000000000010o1000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000001001000000000001001000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000001001000000000001001000000000000000000000000000000000000000000000000001',
        '1000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000001',
        '1000000o000000000000o0000000000000000000000000000000c00000001000000000000000000000000000000000000000000000000001',
        '1111111111000011111111110000TTTTTTTTTTTT111111111111111111111110000000000000000000000000000000000000000000000001',
        '1111111111000011111111110000TTTTTTTTTTTT111111111111111111111110000000000000000000000000000000000000000000000001',
        '1111111111000011111111110000TTTTTTTTTTTT111111111111111111111110000000000000000000000000000000000000000000000001',
      ]
    }
```

- [ ] **Step 2: Verify well-formed + loads + geometry** (after `location.reload()`)
```js
// preview_eval:
(function(){
  const i = Level.maps.findIndex(m=>m.name==='The Catwalk');
  Level.load(i);
  const m = Level.maps[i];
  const widths = Array.from(new Set(m.data.map(r=>r.length)));
  // geometry spot-checks (read tiles via the grid)
  const solid = (col,row)=> !!Level._tileGrid[col+','+row];
  return JSON.stringify({
    index:i, rows:m.data.length, widths,                 // expect 25, [112]
    theme: m.theme,                                       // 'harlequin'
    goals: Level.getGoals().map(g=>[g.x/32,g.y/32]),      // [[95,11]]
    mandRightWallFull: solid(60,12)&&solid(60,21),        // full-height right wall
    mandLeftWallLifted: solid(57,12)&&!solid(57,21),      // lifted left wall (open at floor)
    catwalkFloor: solid(60,12)&&solid(72,12)&&!solid(76,12)&&solid(80,12), // ferry gap at 73-79
    voidUnderCatwalk: !solid(80,22),                      // death-void below catwalk
    entities: Entities.list.length                        // patrols + ferry loaded
  });
})()
```
Expected: `rows:25, widths:[112], theme:'harlequin', goals:[[95,11]], mandRightWallFull:true, mandLeftWallLifted:true, catwalkFloor:true, voidUnderCatwalk:true`, entities > 0.

- [ ] **Step 3: Headless spot-check — lower route is reachable to the shaft**

Auto-run right and jump the two pits; confirm the player reaches the mandatory-shaft base (x ≈ col 59 = 1888) grounded, without dying. Pit edges: pit1 cols 10–13 (jump ~ when x≈ col 9), pit2 cols 24–27. Iterate `jumpFrames` to clear both (the exact frames depend on speed — try a few):
```js
// preview_eval (tune the two jump frames until it clears both pits):
JSON.stringify(window.runSim({
  rows: Level.maps.find(m=>m.name==='The Catwalk').data, theme:'harlequin',
  spawn:[3,21], runDir:1, skipRamp:true, vx:300, jumpFrames:[20,95], frames:400, sample:20
}).trace.map(s=>({f:s.f,x:+s.x.toFixed(0),grounded:s.grounded})))
```
Pass = the player reaches x ≥ ~1820 still grounded (at the shaft base) and never `y > levelHeight` (fell in a pit). This confirms the ground route up to the climb; the climb itself is Task 3 (live). If a pit is unclearable, note it for Task 3 tuning.

- [ ] **Step 4: Commit**
```bash
git add js/level.js
git commit -m "feat(level): add The Catwalk (merged Stage+Workshop, temp Level 5)"
```

---

## Task 3: Playtest + tune the climbs and the catwalk (HUMAN-IN-THE-LOOP)

**Files:** Modify `js/level.js` (geometry/entity tuning only).

**This task is driven live by the controller/user via the preview, not a subagent** — the mandatory and optional wall-jump climbs are skill content that must be felt. The shaft geometry is a verbatim transplant of Level 1's proven shaft, so the climb mechanic is known-good; tuning is about the entry/exit and pacing.

- [ ] **Step 1: Play the lower route** — `preview_start` (name `clowncity`), play The Catwalk (it's a level in select). Confirm: the two pits and treadmill feel right; the patrols/one-way read; the checkpoint (col 52) is reachable before the shaft.

- [ ] **Step 2: The mandatory shaft + catwalk exit** — confirm you can: run into the full-height right wall (col 60), wall-jump up the gap (cols 58–59), reach the top, and exit RIGHT onto the catwalk (row 12). This exit is the one new bit vs Level 1 (which ended at a goal) — if landing on the catwalk is awkward, tune: lower/raise the catwalk lip, widen the gap, or add a one-tile ledge at the shaft top. The level MUST be completable via the climb.

- [ ] **Step 3: The optional gem shaft (cols 42–45)** — confirm you can run PAST it at floor level (rows 20–21 open) AND optionally jump up into it to grab the gem (col 43, row 12). If it accidentally blocks the ground run, drop the walls one more row (rows 14–19).

- [ ] **Step 4: The catwalk traverse** — confirm the ferry (cols 73–79) carries you across the gap and the far patrol + goal (col 95) are reachable; falling off the catwalk lands in the void (death) as intended. Tune ferry `x/toX/speed` if the timing is unfair.

- [ ] **Step 5: Commit any tuning**
```bash
git add js/level.js
git commit -m "polish(level): tune The Catwalk climbs, catwalk exit, and ferry"
```
(If no changes were needed, skip the commit and note that in the report.)

---

## Task 4: Phase C — renumber to the final 3 levels

**Files:** Modify `js/level.js` — reorder `Level.maps` and remove the now-merged levels + the unused theme.

- [ ] **Step 1: Rebuild the maps array** — In `Level.maps`, the final order must be `[The Big Top, The Catwalk, The Big Drop]`:
  1. **Delete** the `The Stage` map object and the `The Workshop` map object.
  2. **Move** the `The Catwalk` map object so it sits immediately after `The Big Top` and before `The Big Drop`.
  Result: `maps[0]=The Big Top`, `maps[1]=The Catwalk`, `maps[2]=The Big Drop`.

- [ ] **Step 2: Remove the now-unused `puppet` theme** — The Workshop was the only user of `themes.puppet`. Delete the `puppet: { ... }` theme object from `Level.themes` (circus, harlequin, midnight remain). **Leave** the `currentTheme === 'puppet'` background branch in `draw()` untouched — it simply never fires now (no map selects puppet), and editing `draw()` risks destabilizing rendering for no gain.

- [ ] **Step 3: Verify the lineup** (after `location.reload()`)
```js
// preview_eval:
JSON.stringify({
  count: Level.maps.length,                          // 3
  names: Level.maps.map(m=>m.name),                  // ['The Big Top','The Catwalk','The Big Drop']
  totalLevels: Game.totalLevels,                     // 3 (read at init)
  themes: Level.maps.map(m=>m.theme),                // ['circus','harlequin','midnight']
  bigDropIsL3: Level.maps[2].name==='The Big Drop',
  puppetGone: !Level.themes.puppet
})
```
Expected: `count:3, names:['The Big Top','The Catwalk','The Big Drop'], totalLevels:3, bigDropIsL3:true, puppetGone:true`.

- [ ] **Step 4: Verify each level still loads + select works** — In the live game, go to level select (3 cards, named correctly), and load each of the 3 levels; confirm no console errors (`preview_console_logs level:error` is empty) and each spawns/renders.

- [ ] **Step 5: Note the save-data reset** — Level indices shifted, so old `localStorage['clowncity_save']` completion flags now point at different levels. Clear it once to avoid stale "complete/locked" states: `preview_eval` → `localStorage.removeItem('clowncity_save'); location.reload()`. (Saves regenerate cleanly sized to 3.)

- [ ] **Step 6: Commit**
```bash
git add js/level.js
git commit -m "feat(level): renumber to final 3 levels — Big Top, Catwalk, Big Drop"
```

---

## Task 5: Docs + final integration

**Files:** Modify `CLAUDE.md`.

- [ ] **Step 1: Update the level description** — In CLAUDE.md's `js/level.js` line, change "tile maps (3 lean tracks)" framing to reflect the final lineup: **The Big Top** (circus), **The Catwalk** (harlequin — merged Stage+Workshop, mandatory + optional wall-jump shafts, an elevated catwalk over a void), **The Big Drop** (midnight — slopes/overspeed/speed-jump → tent). Note maps are no longer all 80 wide (The Catwalk is 112, The Big Drop 80).

- [ ] **Step 2: Trim out-of-scope** — In CLAUDE.md's "Out of scope / follow-ups", remove "Level 2/3 feel tuning" (now merged + tuned). Leave real-sprite-art and the touch-pause-button items.

- [ ] **Step 3: Final integration sweep** — `preview_eval`: confirm `Level.maps.length===3`, all 3 load with no `console_logs level:error`, and the full game flow works (title → select → each level → win on completing Level 3). Spot-check Levels are distinct themes.

- [ ] **Step 4: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: update level lineup for the merged 3-level layout"
```

---

## Done-when (Phase B/C acceptance)
- "The Catwalk" exists as a single harlequin level with a **mandatory** wall-jump shaft (climb required to finish), an **optional** gem shaft, and a catwalk traverse with a ferry — completable in live play.
- `Level.maps` is exactly `[The Big Top, The Catwalk, The Big Drop]`; `Game.totalLevels===3`; level select shows 3; The Big Drop is Level 3.
- Old Stage/Workshop + the unused puppet theme are gone; no console errors; CLAUDE.md reflects the new lineup.
- This completes the original request; `dev` is then ready for a release-merge to `main` whenever the user wants to deploy.
