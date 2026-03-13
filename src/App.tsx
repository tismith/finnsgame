import { useEffect, useRef } from "react";

type Crop = "carrot" | "pumpkin";
type Scene = "farm" | "shop" | "forest" | "dungeon";
type Tool = "hoe" | "seeds" | "water" | "axe" | "pickaxe";
type Node = { x: number; y: number; hp: number; maxHp: number };
type Enemy = { x: number; y: number; w: number; h: number; vx: number; vy: number; alive: boolean };
type Dragon = Enemy & { hp: number; maxHp: number };
type Plot = { tilled: boolean; watered: boolean; planted: boolean; cropType: Crop; growth: number; ready: boolean };

type State = {
  bridge: boolean;
  time: number;
  day: number;
  scene: Scene;
  msg: string;
  p: {
    x: number;
    y: number;
    w: number;
    h: number;
    speed: number;
    dir: "up" | "down" | "left" | "right";
    tool: Tool;
    seed: Crop;
    inv: Record<string, number>;
    harvest: number;
    gold: number;
    hp: number;
    iframes: number;
  };
  crops: Map<string, Plot>;
  slimes: Enemy[];
  forestSlimes: Enemy[];
  dragon: Dragon;
  shop: { carrot: number; pumpkin: number };
  village: { wood: number; goal: number; level: number };
};

export default function App() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;

    const T = 32;
    const W = 20 * T;
    const H = 14 * T;
    c.width = W;
    c.height = H;

    const keys = new Set<string>();
    const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
    const tileKey = (x: number, y: number) => `${x},${y}`;
    const tileAt = (x: number, y: number) => ({ tx: Math.floor(x / T), ty: Math.floor(y / T) });
    const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const mkSet = (xs: number[], ys: number[]) => {
      const s = new Set<string>();
      for (const y of ys) for (const x of xs) s.add(tileKey(x, y));
      return s;
    };
    const mkNodes = (pts: number[][], hp: number): Node[] => pts.map(([x, y]) => ({ x, y, hp, maxHp: hp }));
    const mkSlimes = (n: number, ox: number, oy: number, w: number, h: number, vx: number, vy: number): Enemy[] =>
      Array.from({ length: n }, (_, i) => ({
        x: (ox + i * 2) * T,
        y: (oy + (i % 2) * 2) * T,
        w,
        h,
        vx: i % 2 ? -(vx - 5) : vx,
        vy: i % 2 ? vy + 4 : vy,
        alive: true,
      }));
    const mkDragon = (): Dragon => ({ x: 9 * T, y: 5 * T, w: 5 * T, h: 3 * T, vx: 48, vy: 24, hp: 12, maxHp: 12, alive: true });

    const farmTiles = mkSet([2, 3, 4, 5, 6, 7], [8, 9, 10, 11]);
    const waterTiles = new Set<string>([...Array(4)].map((_, i) => tileKey(13 + i, 10)).concat([9, 10, 11].map((y) => tileKey(16, y))));

    const bridge = { x: 16, y: 10 };
    const eastGate = { x: 19, y: 10 };
    const westGate = { x: 0, y: 10 };
    const mine = { x: 18, y: 12 };
    const stairs = { x: 1, y: 12 };
    const house = { x: 1, y: 1, w: 4, h: 3 };
    const shopB = { x: 6, y: 1, w: 4, h: 3 };
    const shopDoor = { x: 7, y: 3 };
    const npc = { x: 8.5 * T, y: 5.5 * T, w: 20, h: 24 };

    const trees = mkNodes([[11, 3], [12, 4], [14, 3], [15, 5], [17, 3], [18, 5], [10, 6], [13, 6]], 2);
    const rocks = mkNodes([[9, 10], [10, 10], [10, 11]], 2);
    const bigTrees = mkNodes([[4, 3], [7, 5], [10, 2], [13, 6], [16, 4], [17, 9], [14, 11]], 4);
    const bigRocks = mkNodes([[6, 9], [10, 10], [15, 8], [17, 11]], 4);
    const pillars = mkNodes([[6, 4], [13, 4], [6, 9], [13, 9]], 1);

    const s: State = {
      bridge: false,
      time: 0,
      day: 1,
      scene: "farm",
      msg: "WASD move. E use. 1 hoe, 2 seeds, 3 water, 4 axe, 5 pickaxe.",
      p: {
        x: 3 * T,
        y: 6 * T,
        w: 20,
        h: 20,
        speed: 140,
        dir: "down",
        tool: "hoe",
        seed: "carrot",
        inv: { carrotSeeds: 3, pumpkinSeeds: 1, carrots: 0, pumpkins: 0, wood: 0, stone: 0 },
        harvest: 0,
        gold: 10,
        hp: 5,
        iframes: 0,
      },
      crops: new Map(),
      slimes: mkSlimes(2, 12, 8, 22, 18, 35, 20),
      forestSlimes: mkSlimes(3, 8, 4, 24, 18, 42, 24),
      dragon: mkDragon(),
      shop: { carrot: 3, pumpkin: 5 },
      village: { wood: 0, goal: 20, level: 1 },
    };

    const msg = (m: string) => (s.msg = m);
    const enter = (scene: Scene, x: number, y: number, dir: State["p"]["dir"], text: string) => {
      s.scene = scene;
      s.p.x = x;
      s.p.y = y;
      s.p.dir = dir;
      s.msg = text;
    };
    const getPlot = (k: string): Plot => s.crops.get(k) || { tilled: false, watered: false, planted: false, cropType: "carrot", growth: 0, ready: false };
    const sceneTrees = () => (s.scene === "forest" ? bigTrees : trees);
    const sceneRocks = () => (s.scene === "forest" ? bigRocks : rocks);
    const inBuilding = (tx: number, ty: number, b: { x: number; y: number; w: number; h: number }, d?: { x: number; y: number }) =>
      !(d && tx === d.x && ty === d.y) && tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h;
    const facing = () => {
      const p = s.p;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      return tileAt(cx + (p.dir === "right" ? T : p.dir === "left" ? -T : 0), cy + (p.dir === "down" ? T : p.dir === "up" ? -T : 0));
    };
    const playerTile = () => tileAt(s.p.x + s.p.w / 2, s.p.y + s.p.h / 2);
    const nearTile = (target: { x: number; y: number }, pad = 1) => {
      const here = playerTile();
      const front = facing();
      const touch = (t: { tx: number; ty: number }) => Math.abs(t.tx - target.x) <= pad && Math.abs(t.ty - target.y) <= pad;
      return touch(here) || touch(front);
    };

    const isBlocked = (x: number, y: number) => {
      const { tx, ty } = tileAt(x, y);
      if (tx < 0 || ty < 0 || tx >= 20 || ty >= 14) return true;
      if (s.scene === "farm") {
        if (waterTiles.has(tileKey(tx, ty)) && !(s.bridge && tx === bridge.x && ty === bridge.y)) return true;
        if (trees.some((n) => n.hp > 0 && n.x === tx && n.y === ty)) return true;
        if (rocks.some((n) => n.hp > 0 && n.x === tx && n.y === ty)) return true;
        return inBuilding(tx, ty, house) || inBuilding(tx, ty, shopB, shopDoor);
      }
      if (s.scene === "forest") {
        if (bigTrees.some((n) => n.hp > 0 && n.x === tx && n.y === ty)) return true;
        if (bigRocks.some((n) => n.hp > 0 && n.x === tx && n.y === ty)) return true;
      }
      if (s.scene === "dungeon") return pillars.some((n) => n.x === tx && n.y === ty);
      return false;
    };

    const move = (dx: number, dy: number, dt: number) => {
      const p = s.p;
      const mx = dx * p.speed * dt;
      const my = dy * p.speed * dt;
      const collides = (nx: number, ny: number) => [[nx, ny], [nx + p.w, ny], [nx, ny + p.h], [nx + p.w, ny + p.h]].some(([a, b]) => isBlocked(a, b));
      if (!collides(p.x + mx, p.y)) p.x += mx;
      if (!collides(p.x, p.y + my)) p.y += my;
      p.x = clamp(p.x, 0, W - p.w);
      p.y = clamp(p.y, 0, H - p.h);
    };

    const shopAction = (a: "buyCarrot" | "buyPumpkin" | "sell") => {
      if (s.scene !== "shop") return false;
      const p = s.p;
      if (a === "buyCarrot") {
        if (p.gold >= s.shop.carrot) {
          p.gold -= s.shop.carrot;
          p.inv.carrotSeeds += 1;
          msg("Bought carrot seed.");
        } else msg("Not enough gold for carrot seed.");
      }
      if (a === "buyPumpkin") {
        if (p.gold >= s.shop.pumpkin) {
          p.gold -= s.shop.pumpkin;
          p.inv.pumpkinSeeds += 1;
          msg("Bought pumpkin seed.");
        } else msg("Not enough gold for pumpkin seed.");
      }
      if (a === "sell") {
        const v = p.inv.carrots * 4 + p.inv.pumpkins * 8 + p.inv.wood * 2;
        if (v > 0) {
          p.gold += v;
          p.inv.carrots = 0;
          p.inv.pumpkins = 0;
          p.inv.wood = 0;
          msg(`Sold goods for ${v}g.`);
        } else msg("No crops or wood to sell.");
      }
      return true;
    };

    const donate = () => {
      if (s.scene !== "shop") return false;
      const p = s.p;
      if (p.inv.wood <= 0) return msg("No wood to donate."), false;
      s.village.wood += p.inv.wood;
      const donated = p.inv.wood;
      p.inv.wood = 0;
      while (s.village.wood >= s.village.goal) {
        s.village.wood -= s.village.goal;
        s.village.level += 1;
        s.village.goal += 10;
      }
      msg(s.village.level >= 3 ? `Donated ${donated} wood. The village is growing fast.` : `Donated ${donated} wood to expand the village.`);
      return true;
    };

    const interact = () => {
      const p = s.p;
      const { tx, ty } = facing();
      const k = tileKey(tx, ty);

      if (s.scene === "shop") return msg("Shop: B buy carrot seed, N buy pumpkin seed, S sell goods, D donate wood, E leave.");

      if (s.scene === "farm") {
        if (overlap({ x: p.x - 18, y: p.y - 18, w: p.w + 36, h: p.h + 36 }, npc)) return msg("Mara: Mine 10 stone, repair the bridge, then head east into the deep forest.");
        const c = tileAt(p.x + p.w / 2, p.y + p.h / 2);
        if (c.tx === shopDoor.x && c.ty === shopDoor.y + 1) return enter("shop", 9 * T, 9 * T, "down", "Inside the shop. B buy carrot, N buy pumpkin, S sell, D donate wood, E leave.");
        if (!s.bridge && tx === bridge.x && ty === bridge.y) {
          return p.inv.stone >= 10 ? (p.inv.stone -= 10, s.bridge = true, msg("You repaired the bridge with stone. Keep heading east to reach the deep forest.")) : msg("The bridge is broken. Need 10 stone to repair.");
        }
        if (s.bridge && nearTile(eastGate, 0)) return enter("forest", 1 * T, 10 * T, "right", "You step into the deep forest.");
      }

      if (s.scene === "forest") {
        if (nearTile(westGate, 0)) return enter("farm", 18 * T, 10 * T, "left", "Back at the village edge.");
        if (nearTile(mine, 0)) return enter("dungeon", 2 * T, 11 * T, "right", "You descend into the dragon's hall.");
      }

      if (s.scene === "dungeon") {
        if (nearTile(stairs, 0)) return enter("forest", 17 * T, 12 * T, "left", "You retreat to the deep forest.");
        if (keys.has(" ") && s.dragon.alive && overlap({ x: p.x - 16, y: p.y - 16, w: p.w + 32, h: p.h + 32 }, s.dragon)) {
          s.dragon.hp -= 1;
          if (s.dragon.hp <= 0) {
            s.dragon.alive = false;
            p.gold += 50;
            return msg("The dragon is defeated. +50g");
          }
          return msg(`You strike the dragon. HP ${s.dragon.hp}/${s.dragon.maxHp}`);
        }
      }

      if (p.tool === "axe") {
        const n = sceneTrees().find((n) => n.hp > 0 && n.x === tx && n.y === ty);
        if (!n) return msg("No tree there.");
        n.hp -= 1;
        if (n.hp <= 0) {
          const gain = n.maxHp >= 4 ? 6 : 3;
          p.inv.wood += gain;
          return msg(`Tree chopped down. +${gain} wood`);
        }
        return msg("Chop! The tree is cracking.");
      }

      if (p.tool === "pickaxe") {
        const n = sceneRocks().find((n) => n.hp > 0 && n.x === tx && n.y === ty);
        if (!n) return msg(s.scene === "dungeon" ? "No stone node here." : "No rock there.");
        n.hp -= 1;
        if (n.hp <= 0) {
          const gain = n.maxHp >= 4 ? 5 : 2;
          p.inv.stone += gain;
          return msg(`Rock broken. +${gain} stone`);
        }
        return msg("Clang! The rock cracks.");
      }

      if (s.scene !== "farm") return msg(s.scene === "dungeon" ? "Press Space near the dragon to attack. E at the stairs to leave." : "Nothing to farm here. Explore the forest, gather resources, or head deeper.");
      if (!farmTiles.has(k)) return msg("You can only farm on the brown patch.");

      const pl = getPlot(k);
      if (pl.ready) {
        pl.planted = false;
        pl.watered = false;
        pl.ready = false;
        pl.growth = 0;
        if (pl.cropType === "carrot") p.inv.carrots += 1; else p.inv.pumpkins += 1;
        p.harvest += 1;
        s.crops.set(k, pl);
        return msg(`Harvested ${pl.cropType}. Sell it at the shop.`);
      }
      if (p.tool === "hoe") return pl.tilled = true, s.crops.set(k, pl), msg("Soil tilled.");
      if (p.tool === "seeds") {
        if (!pl.tilled) return msg("Till the soil first.");
        if (pl.planted) return msg(pl.ready ? "Ready to harvest." : "Already planted.");
        const seedKey = p.seed === "carrot" ? "carrotSeeds" : "pumpkinSeeds";
        if (p.inv[seedKey] <= 0) return msg(`No ${p.seed} seeds left.`);
        p.inv[seedKey] -= 1;
        Object.assign(pl, { planted: true, cropType: p.seed, growth: 0, ready: false });
        s.crops.set(k, pl);
        return msg(`${p.seed} planted.`);
      }
      if (p.tool === "water") {
        if (!pl.planted) return msg("Nothing planted here.");
        pl.watered = true;
        s.crops.set(k, pl);
        return msg("Watered.");
      }
    };

    const updateEnemy = (e: Enemy, bounds: { minX: number; maxX: number; minY: number; maxY: number }, reward: number, text: string, dt: number) => {
      const p = s.p;
      if (!e.alive) return;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < bounds.minX || e.x > bounds.maxX) e.vx *= -1;
      if (e.y < bounds.minY || e.y > bounds.maxY) e.vy *= -1;
      if (!overlap(p, e)) return;
      if (p.iframes <= 0) {
        p.hp -= 1;
        p.iframes = 1.2;
        msg(text);
        p.x = clamp(p.x + (p.x < e.x ? -18 : 18), 0, W - p.w);
      }
      if (keys.has(" ")) {
        e.alive = false;
        p.gold += reward;
        msg(`You bonked the slime. +${reward}g`);
      }
    };

    const updateDragon = (dt: number) => {
      const p = s.p;
      const d = s.dragon;
      if (s.scene !== "dungeon" || !d.alive) return;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.x < 5 * T || d.x > 11 * T) d.vx *= -1;
      if (d.y < 2 * T || d.y > 8 * T) d.vy *= -1;
      if (overlap(p, d) && p.iframes <= 0) {
        p.hp -= 2;
        p.iframes = 1.4;
        msg("The dragon smashes into you.");
        p.x = clamp(p.x + (p.x < d.x ? -28 : 28), 0, W - p.w);
      }
    };

    const nextDay = () => {
      s.time = 0;
      s.day += 1;
      for (const pl of s.crops.values()) {
        if (pl.planted && pl.watered && !pl.ready) {
          pl.growth += 1;
          pl.watered = false;
          if (pl.cropType === "carrot" && pl.growth >= 2) pl.ready = true;
          if (pl.cropType === "pumpkin" && pl.growth >= 3) pl.ready = true;
        } else if (pl.planted) pl.watered = false;
      }
      [...trees, ...bigTrees, ...rocks, ...bigRocks].forEach((n) => { if (n.hp <= 0) n.hp = n.maxHp; });
      s.slimes = mkSlimes(2, 12, 8, 22, 18, 35, 20);
      s.forestSlimes = mkSlimes(3, 8, 4, 24, 18, 42, 24);
      if (!s.dragon.alive) s.dragon = mkDragon();
      msg(`Day ${s.day}. Crops advance, resources regrow, and slimes return.`);
    };

    const drawRect = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const circ = (x: number, y: number, r: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    const ell = (x: number, y: number, rx: number, ry: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    const label = (t: string, x: number, y: number, size = 12, c = "#fff") => { ctx.fillStyle = c; ctx.font = `${size}px sans-serif`; ctx.fillText(t, x, y); };

    const drawNodes = (ts: Node[], rs: Node[], big: boolean) => {
      ts.forEach((n) => {
        if (n.hp <= 0) return;
        drawRect(n.x * T + (big ? 10 : 11), n.y * T + 18, big ? 12 : 10, 14, big ? "#4a2f18" : "#5b3a1e");
        circ(n.x * T + 16, n.y * T + (big ? 12 : 14), big ? 18 : 14, big ? "#1f5b1f" : n.hp === 1 ? "#4f8a3a" : "#2f6b2f");
      });
      rs.forEach((n) => {
        if (n.hp <= 0) return;
        circ(n.x * T + 16, n.y * T + 18, big ? 16 : 12, big ? "#6e737c" : n.hp === 1 ? "#9aa0a8" : "#8a8f98");
      });
    };

    const drawFarm = () => {
      const g = Math.floor(105 + (Math.sin((s.time / 20) * Math.PI * 2) * 0.5 + 0.5) * 30);
      drawRect(0, 0, W, H, `rgb(70,${g},70)`);
      for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) if ((x + y) % 2 === 0) drawRect(x * T, y * T, T, T, "rgba(255,255,255,0.03)");
      farmTiles.forEach((v) => { const [x, y] = v.split(",").map(Number); drawRect(x * T, y * T, T, T, "#8b5a2b"); });
      waterTiles.forEach((v) => {
        const [x, y] = v.split(",").map(Number);
        drawRect(x * T, y * T, T, T, "#2f80c8");
        if (x === bridge.x && y === bridge.y) drawRect(x * T + 6, y * T + 12, T - 12, 8, s.bridge ? "#9b6b3f" : "#5a3b1e");
      });
      drawRect(house.x * T, house.y * T, house.w * T, house.h * T, "#b85c38");
      drawRect((house.x + 1.4) * T, (house.y + 2) * T, 1.2 * T, T, "#7a3f1e");
      drawRect(shopB.x * T, shopB.y * T, shopB.w * T, shopB.h * T, "#c9a227");
      drawRect(shopDoor.x * T, shopDoor.y * T, T, T, "#6d4c1f");
      drawRect((shopB.x + 1.2) * T, shopB.y * T + 8, 1.6 * T, 18, "#2b2b2b");
      label("SHOP", (shopB.x + 1.35) * T, shopB.y * T + 21);
      if (s.village.level >= 2) { drawRect(11 * T, 1 * T, 3 * T, 2 * T, "#8a5a36"); label("SHED", 11.7 * T, 1.7 * T); }
      if (s.village.level >= 3) { drawRect(15 * T, 1 * T, 3 * T, 2 * T, "#9a6a42"); label("HOME", 15.6 * T, 1.7 * T); }
      if (s.village.level >= 4) { drawRect(11 * T, 4 * T, 2 * T, 2 * T, "#6f8b4a"); label("PARK", 11.3 * T, 5.2 * T); }
      if (s.bridge) { drawRect(eastGate.x * T + 8, eastGate.y * T + 8, 8, 16, "rgba(255,255,255,0.18)"); label(">", eastGate.x * T + 10, eastGate.y * T + 19, 10); }
      drawNodes(trees, rocks, false);
      s.crops.forEach((pl, k) => {
        const [x, y] = k.split(",").map(Number);
        if (pl.tilled) { ctx.strokeStyle = "#5c3616"; ctx.strokeRect(x * T + 4, y * T + 4, T - 8, T - 8); }
        if (pl.watered) drawRect(x * T + 5, y * T + 5, T - 10, T - 10, "rgba(80,160,255,0.35)");
        if (pl.planted && !pl.ready) drawRect(x * T + 11, y * T + 11, 10, 12, pl.cropType === "carrot" ? (pl.growth >= 1 ? "#6bcf5d" : "#57b847") : (pl.growth >= 1 ? "#97b84a" : "#7aa33a"));
        if (pl.ready) circ(x * T + 16, y * T + 15, 8, pl.cropType === "carrot" ? "#f0c419" : "#ff8c42");
      });
      drawRect(npc.x, npc.y, npc.w, npc.h, "#e8c39e");
      drawRect(npc.x, npc.y, npc.w, 8, "#7a3db8");
      label("!", npc.x + 7, npc.y - 4, 11);
      s.slimes.forEach((e) => e.alive && ell(e.x + 11, e.y + 10, 11, 8, "#77dd77"));
    };

    const drawForest = () => {
      drawRect(0, 0, W, H, "#284b2f");
      for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) drawRect(x * T, y * T, T, T, (x + y) % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)");
      for (let x = 0; x < 20; x++) { drawRect(x * T, 0, T, T, "#18351e"); drawRect(x * T, 13 * T, T, T, "#18351e"); }
      for (let y = 0; y < 14; y++) { drawRect(0, y * T, T, T, "#18351e"); drawRect(19 * T, y * T, T, T, "#18351e"); }
      drawRect(westGate.x * T, westGate.y * T + 10, T, 12, "#d9d2a0");
      label("<", westGate.x * T + 10, westGate.y * T + 19, 10);
      drawNodes(bigTrees, bigRocks, true);
      drawRect(mine.x * T + 4, mine.y * T + 4, T - 8, T - 8, "#222");
      label("M", mine.x * T + 10, mine.y * T + 18, 10);
      s.forestSlimes.forEach((e) => e.alive && ell(e.x + 12, e.y + 10, 12, 9, "#dd6666"));
    };

    const drawDungeon = () => {
      drawRect(0, 0, W, H, "#16131a");
      for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) drawRect(x * T, y * T, T, T, (x + y) % 2 === 0 ? "#2b2533" : "#231f2a");
      for (let x = 0; x < 20; x++) { drawRect(x * T, 0, T, T, "#0d0b10"); drawRect(x * T, 13 * T, T, T, "#0d0b10"); }
      for (let y = 0; y < 14; y++) { drawRect(0, y * T, T, T, "#0d0b10"); drawRect(19 * T, y * T, T, T, "#0d0b10"); }
      pillars.forEach((p) => drawRect(p.x * T + 4, p.y * T + 4, T - 8, T - 8, "#4f4a59"));
      drawRect(stairs.x * T, stairs.y * T + 10, T, 12, "#d9d2a0");
      label("<", stairs.x * T + 10, stairs.y * T + 19, 10);
      const d = s.dragon;
      if (!d.alive) {
        drawRect(9 * T, 6 * T, 5 * T, T, "#5b3a3a");
        return label("Dragon defeated", 9.4 * T, 6.7 * T, 14);
      }
      const x = d.x;
      const y = d.y;
      ell(x + d.w * 0.38, y + d.h * 0.55, 54, 34, "#7b1e1e");
      ell(x + d.w * 0.72, y + d.h * 0.58, 36, 24, "#7b1e1e");
      ctx.fillStyle = "#5a0f0f";
      ctx.beginPath();
      ctx.moveTo(x + 34, y + 40);
      ctx.lineTo(x + 6, y + 18);
      ctx.lineTo(x + 18, y + 58);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 120, y + 36);
      ctx.lineTo(x + 154, y + 10);
      ctx.lineTo(x + 142, y + 58);
      ctx.fill();
      ctx.fillStyle = "#9f2f2f";
      ctx.beginPath();
      ctx.moveTo(x + 136, y + 42);
      ctx.lineTo(x + 166, y + 52);
      ctx.lineTo(x + 140, y + 68);
      ctx.fill();
      ell(x + d.w * 0.78, y + d.h * 0.46, 26, 18, "#c34d2e");
      circ(x + d.w * 0.84, y + d.h * 0.42, 4, "#f4d35e");
      circ(x + d.w * 0.85, y + d.h * 0.42, 2, "#111");
      ctx.fillStyle = "#d9b08c";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 86 + i * 10, y + 46);
        ctx.lineTo(x + 90 + i * 10, y + 60);
        ctx.lineTo(x + 94 + i * 10, y + 46);
        ctx.fill();
      }
      label("DRAGON", x + 44, y - 8, 12);
      drawRect(x + 18, y - 22, 120, 10, "rgba(0,0,0,0.45)");
      drawRect(x + 18, y - 22, 120 * (d.hp / d.maxHp), 10, "#8b1e1e");
    };

    const drawShop = () => {
      drawRect(0, 0, W, H, "#3a2b1f");
      for (let y = 2; y < 13; y++) for (let x = 2; x < 18; x++) drawRect(x * T, y * T, T, T, (x + y) % 2 === 0 ? "#8f6b45" : "#9b7650");
      drawRect(2 * T, 2 * T, W - 4 * T, T, "#5c3d24");
      drawRect(2 * T, H - 2 * T, W - 4 * T, T, "#5c3d24");
      drawRect(2 * T, 2 * T, T, H - 4 * T, "#5c3d24");
      drawRect(W - 3 * T, 2 * T, T, H - 4 * T, "#5c3d24");
      drawRect(8 * T, H - 2 * T, 2 * T, T, "#6d4c2e");
      label("EXIT", 8.45 * T, H - 1.35 * T, 12, "#d9c7a0");
      drawRect(4 * T, 4 * T, 4 * T, 2 * T, "#7a5231");
      drawRect(12 * T, 4 * T, 4 * T, 2 * T, "#7a5231");
      drawRect(6 * T, 8 * T, 8 * T, 2 * T, "#7a5231");
      circ(5.2 * T, 4.9 * T, 10, "#f0c419");
      circ(13.2 * T, 4.9 * T, 10, "#ff8c42");
      label("Carrot seeds - B - 3g", 4.6 * T, 5.7 * T, 14);
      label("Pumpkin seeds - N - 5g", 12.2 * T, 5.7 * T, 14);
      label("Sell crops + wood - S", 7.7 * T, 9.2 * T, 14);
      label("Donate wood - D", 8.1 * T, 10.1 * T, 14);
      drawRect(9 * T, 5.5 * T, 26, 32, "#cfa77b");
      drawRect(9 * T, 5.5 * T, 26, 10, "#6b3b9d");
      label("Shopkeeper", 8.3 * T, 5.1 * T, 14);
    };

    const drawHud = () => {
      const p = s.p;
      drawRect(0, 0, W, 86, "rgba(0,0,0,0.6)");
      drawRect(0, H - 42, W, 42, "rgba(0,0,0,0.6)");
      label(`Scene ${s.scene}`, 12, 20, 14);
      label(`Day ${s.day}`, 100, 20, 14);
      label(`Gold ${p.gold}`, 178, 20, 14);
      label(`Village L${s.village.level}`, 12, 68, 14);
      label(`Carrot seeds ${p.inv.carrotSeeds}`, 270, 20, 14);
      label(`Pumpkin seeds ${p.inv.pumpkinSeeds}`, 430, 20, 14);
      label(`Carrots ${p.inv.carrots}`, 12, 46, 14);
      label(`Pumpkins ${p.inv.pumpkins}`, 110, 46, 14);
      label(`Wood ${p.inv.wood}`, 220, 46, 14);
      label(`Stone ${p.inv.stone}`, 300, 46, 14);
      label(`Harvest ${p.harvest}`, 390, 46, 14);
      label(`HP ${p.hp}`, 470, 46, 14);
      label(`Tool ${p.tool}`, 520, 46, 14);
      label(`Seed ${p.seed}`, 12, 82, 14);
      label(`Wood goal ${s.village.wood}/${s.village.goal}`, 120, 68, 14);
      label(s.msg, 12, H - 16, 13);
    };

    const drawPlayer = () => {
      const p = s.p;
      if (p.iframes <= 0 || Math.floor(p.iframes * 10) % 2 === 0) {
        drawRect(p.x, p.y, p.w, p.h, "#f2d2b6");
        drawRect(p.x, p.y, p.w, 8, "#3b82f6");
      }
      if (s.scene !== "shop") {
        const { tx, ty } = facing();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.strokeRect(tx * T + 3, ty * T + 3, T - 6, T - 6);
      }
    };

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      s.time += dt;
      if (s.time >= 20) nextDay();

      let dx = 0;
      let dy = 0;
      const p = s.p;
      if (keys.has("ArrowUp") || keys.has("w")) {
        dy -= 1;
        p.dir = "up";
      }
      if (keys.has("ArrowDown") || keys.has("s")) {
        dy += 1;
        p.dir = "down";
      }
      if (keys.has("ArrowLeft") || keys.has("a")) {
        dx -= 1;
        p.dir = "left";
      }
      if (keys.has("ArrowRight") || keys.has("d")) {
        dx += 1;
        p.dir = "right";
      }
      if (dx && dy) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      if (s.scene === "shop") {
        p.x = clamp(p.x + dx * p.speed * dt, 2 * T, W - 2 * T - p.w);
        p.y = clamp(p.y + dy * p.speed * dt, 3 * T, H - 2 * T - p.h);
      } else move(dx, dy, dt);

      if (s.scene === "farm") s.slimes.forEach((e) => updateEnemy(e, { minX: 10 * T, maxX: 18 * T, minY: 7 * T, maxY: 12 * T }, 4, "A slime bumped you.", dt));
      if (s.scene === "forest") s.forestSlimes.forEach((e) => updateEnemy(e, { minX: 5 * T, maxX: 18 * T, minY: 2 * T, maxY: 12 * T }, 7, "A forest slime slammed into you.", dt));
      updateDragon(dt);

      if (p.iframes > 0) p.iframes -= dt;
      if (p.hp <= 0) {
        Object.assign(p, { x: 3 * T, y: 6 * T, hp: 5 });
        p.gold = Math.max(0, p.gold - 5);
        s.scene = "farm";
        msg("You passed out and lost 5g.");
      }

      if (s.scene === "farm") drawFarm();
      else if (s.scene === "forest") drawForest();
      else if (s.scene === "dungeon") drawDungeon();
      else drawShop();
      drawPlayer();
      drawHud();
      raf = requestAnimationFrame(tick);
    };

    const onDown = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keys.add(k);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (k === "1") {
        s.p.tool = "hoe";
        msg("Hoe equipped.");
      }
      if (k === "2") {
        s.p.tool = "seeds";
        msg(`Seeds equipped (${s.p.seed}). Press T to switch.`);
      }
      if (k === "3") {
        s.p.tool = "water";
        msg("Watering can equipped.");
      }
      if (k === "4") {
        s.p.tool = "axe";
        msg("Axe equipped.");
      }
      if (k === "5") {
        s.p.tool = "pickaxe";
        msg("Pickaxe equipped.");
      }
      if (k === "t") {
        s.p.seed = s.p.seed === "carrot" ? "pumpkin" : "carrot";
        msg(`Seed type: ${s.p.seed}`);
      }
      if (k === "e") s.scene === "shop" ? enter("farm", shopDoor.x * T + 6, (shopDoor.y + 1) * T, "down", "Back outside.") : interact();
      if (k === "b") shopAction("buyCarrot");
      if (k === "n") shopAction("buyPumpkin");
      if (k === "s") shopAction("sell");
      if (k === "d") donate();
      if (k === "r") enter("farm", 3 * T, 6 * T, "down", "Returned home.");
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keys.delete(k);
    };

    addEventListener("keydown", onDown);
    addEventListener("keyup", onUp);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("keydown", onDown);
      removeEventListener("keyup", onUp);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#eee", padding: "24px" }}>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "minmax(0,auto) 320px",
          alignItems: "start",
        }}
      >
        <div style={{ borderRadius: "18px", overflow: "hidden", border: "1px solid #444", background: "#000", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
          <canvas ref={ref} style={{ display: "block", maxWidth: "100%", height: "auto" }} />
        </div>
        <div style={{ borderRadius: "18px", border: "1px solid #444", background: "#1f1f1f", padding: "20px", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
          <h1 style={{ margin: "0 0 12px", fontSize: "28px" }}>Farm Quest Prototype</h1>
          <p style={{ fontSize: "14px", color: "#c7c7c7", marginBottom: "16px" }}>
            Compact playable Zelda + Stardew prototype with village, forest, dungeon, and dragon.
          </p>
          <div style={{ fontSize: "14px", color: "#ddd", lineHeight: 1.5 }}>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontWeight: 600 }}>Controls</div>
              <div>Move: WASD or arrows</div>
              <div>Use: E</div>
              <div>Tools: 1 hoe, 2 seeds, 3 water, 4 axe, 5 pickaxe</div>
              <div>Seed swap: T</div>
              <div>Shop: B carrot, N pumpkin, S sell, D donate</div>
              <div>Attack: Space</div>
              <div>Reset position: R</div>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Progression</div>
              <div>Farm, sell, donate wood, repair bridge with 10 stone, enter deep forest, then use the mine to fight the dragon.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
