import type { DeepReadonly } from "ts-essentials";
import type {
  Game,
  InitApi,
  UpdateApi,
  RenderApi,
} from "@clockwyrks/simple-2d";
import {
  ACTIONS,
  BINDINGS,
  CUES,
  FIELD_H,
  FIELD_W,
  STAR_X,
  STAR_Y,
  CORE_R,
  HALO_R,
  TICK_DT,
  MU,
  SOFTEN,
  SHIP_R,
  SHIP_TURN,
  SHIP_THRUST,
  SHIP_DRAG_HALFLIFE,
  SHIP_MAX,
  SAFE_X,
  SAFE_Y,
  FACE_UP,
  INVULN_TIME,
  BULLET_R,
  MUZZLE_SPEED,
  BULLET_LIFE,
  MAX_BULLETS,
  FIRE_INTERVAL_TICKS,
  TRAIL_TICKS,
  ROCK_RADIUS,
  ROCK_SPEED_MIN,
  ROCK_SPEED_MAX,
  ROCK_CHILD,
  ROCK_HEALTH,
  HIT_FLASH_TIME,
  SPLIT_KICK,
  TORPEDO_R,
  TORPEDO_SPEED,
  TORPEDO_TURN,
  TORPEDO_CONE,
  TORPEDO_LIFE,
  TORPEDO_RECHARGE,
  TORPEDO_SCATTER,
  SAUCER_R,
  SAUCER_SPEED,
  SAUCER_WEAVE_SPEED,
  SAUCER_WEAVE_INTERVAL,
  SAUCER_FIRE_INTERVAL,
  SAUCER_AIM_ERROR,
  SAUCER_BULLET_SPEED,
  SAUCER_BULLET_R,
  SAUCER_BULLET_LIFE,
  SAUCER_LIFETIME,
  SAUCER_FIRST_DELAY,
  SAUCER_GAP_MIN,
  SAUCER_GAP_MAX,
  WAVE_BASE_ROCKS,
  WAVE_SPEED_STEP,
  WAVE_SPEED_CAP,
  WAVE_BANNER_TIME,
  WAVE_MIN_SHIP_DIST,
  WAVE_MIN_STAR_DIST,
  START_LIVES,
  EXTRA_LIFE_STEP,
  SCORE_LARGE,
  SCORE_MEDIUM,
  SCORE_SMALL,
  SCORE_SAUCER,
  TITLE_TEXT,
  TAGLINE_TEXT,
  TITLE_ITEMS,
  PAUSE_ITEMS,
  GAMEOVER_ITEMS,
  SHATTER_DEBUG_VERSION,
  type RockSize,
} from "./constants";

export type Screen = "title" | "howto" | "playing" | "paused" | "gameover";
export type SaucerEdge = "left" | "right";
export type FieldEdge = "top" | "bottom" | "left" | "right";
export interface ShipState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly angle: number;
  readonly thrusting: boolean;
  readonly invuln: number;
  readonly collision: boolean;
  readonly fireCooldown: number;
}
export interface BulletState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly life: number;
}
export interface RockState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly size: RockSize;
  readonly spin: number;
  readonly health: number;
  readonly flash: number;
}
export interface SaucerState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly mind: boolean;
  readonly gun: boolean;
  readonly travel: boolean;
  readonly weave: 1 | -1;
  readonly fireClock: number;
  readonly weaveClock: number;
  readonly age: number;
}
export interface TorpedoState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly heading: number;
  readonly life: number;
  readonly homing: boolean;
}
export interface ShatterState {
  readonly screen: Screen;
  readonly menuIndex: number;
  readonly score: number;
  readonly lives: number;
  readonly wave: number;
  readonly waveBanner: number;
  readonly ship: ShipState;
  readonly bullets: readonly BulletState[];
  readonly rocks: readonly RockState[];
  readonly saucer: SaucerState | null;
  readonly enemyBullets: readonly BulletState[];
  readonly torpedoes: readonly TorpedoState[];
  readonly torpedoCharge: number;
  readonly waveSpawning: boolean;
  readonly saucerSpawning: boolean;
  readonly saucerClock: number;
  readonly saucerDue: number;
  readonly nextSaucerEdge: SaucerEdge | null;
  readonly nextSaucerRow: number | null;
  readonly nextSaucerAim: number | null;
  readonly nextRockSpeed: number | null;
  readonly nextRecycleEdge: FieldEdge | null;
  readonly tickClock: number;
  readonly nextId: number;
  readonly simTime: number;
  readonly muted: boolean;
}
type S = ShatterState;
type ReadState = DeepReadonly<S>;
const BACKGROUND = "#050812";
export { BACKGROUND };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const wrap = (v: number, n: number) => ((v % n) + n) % n;
const delta = (a: number, b: number, size: number) => {
  let d = b - a;
  if (d >= size / 2) d -= size;
  if (d < -size / 2) d += size;
  return d;
};
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(delta(a.x, b.x, FIELD_W), delta(a.y, b.y, FIELD_H));
const angleDelta = (a: number, b: number) =>
  wrap(b - a + Math.PI, Math.PI * 2) - Math.PI;
const normAngle = (a: number) => wrap(a + Math.PI, Math.PI * 2) - Math.PI;
const speed = (b: { vx: number; vy: number }) => Math.hypot(b.vx, b.vy);
const sweptContact = (
  a0: { x: number; y: number },
  a1: { x: number; y: number },
  b0: { x: number; y: number },
  b1: { x: number; y: number },
  radius: number,
) => {
  const rx = delta(a0.x, b0.x, FIELD_W);
  const ry = delta(a0.y, b0.y, FIELD_H);
  const vx = delta(a0.x, a1.x, FIELD_W) - delta(b0.x, b1.x, FIELD_W);
  const vy = delta(a0.y, a1.y, FIELD_H) - delta(b0.y, b1.y, FIELD_H);
  const denom = vx * vx + vy * vy;
  const t = denom === 0 ? 0 : clamp(-(rx * vx + ry * vy) / denom, 0, 1);
  return Math.hypot(rx + vx * t, ry + vy * t) <= radius;
};
const validNum = (n: number) => {
  if (!Number.isFinite(n)) throw new TypeError("Expected a finite number");
  return n;
};
const initial = (muted = false): S => ({
  screen: "title",
  menuIndex: 0,
  score: 0,
  lives: START_LIVES,
  wave: 0,
  waveBanner: 0,
  ship: {
    x: SAFE_X,
    y: SAFE_Y,
    vx: 0,
    vy: 0,
    angle: FACE_UP,
    thrusting: false,
    invuln: 0,
    collision: true,
    fireCooldown: 0,
  },
  bullets: [],
  rocks: [],
  saucer: null,
  enemyBullets: [],
  torpedoes: [],
  torpedoCharge: 1,
  waveSpawning: true,
  saucerSpawning: true,
  saucerClock: 0,
  saucerDue: SAUCER_FIRST_DELAY,
  nextSaucerEdge: null,
  nextSaucerRow: null,
  nextSaucerAim: null,
  nextRockSpeed: null,
  nextRecycleEdge: null,
  tickClock: 0,
  nextId: 1,
  simTime: 0,
  muted,
});
const takeId = (s: S) => [s.nextId, { ...s, nextId: s.nextId + 1 }] as const;
const makeRock = (
  s: S,
  size: RockSize,
  x: number,
  y: number,
  vx = 0,
  vy = 0,
  health = ROCK_HEALTH[size],
): [RockState, S] => {
  const [id, n] = takeId(s);
  return [
    {
      id,
      x: wrap(x, FIELD_W),
      y: wrap(y, FIELD_H),
      vx,
      vy,
      size,
      spin: Math.random() * Math.PI * 2,
      health,
      flash: 0,
    },
    n,
  ];
};
const makeWave = (s: S, wave: number): S => {
  let n = { ...s, rocks: [...s.rocks] as RockState[] };
  const mult = 1 + Math.min(WAVE_SPEED_CAP, WAVE_SPEED_STEP * (wave - 1));
  for (let i = 0; i < WAVE_BASE_ROCKS + wave; i++) {
    let x = 0,
      y = 0;
    for (let tries = 0; tries < 1000; tries++) {
      x = Math.random() * FIELD_W;
      y = Math.random() * FIELD_H;
      if (
        dist({ x, y }, n.ship) >= WAVE_MIN_SHIP_DIST &&
        Math.hypot(x - STAR_X, y - STAR_Y) >= WAVE_MIN_STAR_DIST
      )
        break;
    }
    const a = Math.random() * Math.PI * 2;
    const base =
      n.nextRockSpeed ??
      ROCK_SPEED_MIN.large +
        Math.random() * (ROCK_SPEED_MAX.large - ROCK_SPEED_MIN.large);
    if (i === 0 && n.nextRockSpeed !== null) n = { ...n, nextRockSpeed: null };
    const [r, nn] = makeRock(
      n,
      "large",
      x,
      y,
      Math.cos(a) * base * mult,
      Math.sin(a) * base * mult,
    );
    n = { ...nn, rocks: [...n.rocks, r] };
  }
  return n;
};
const resetGame = (state: S): S => {
  const n = initial(state.muted);
  return {
    ...n,
    screen: "playing",
    lives: START_LIVES,
    wave: 1,
    waveBanner: 0,
    saucerDue: SAUCER_FIRST_DELAY,
    rocks: [],
    nextId: state.nextId,
  };
};
const spawnSaucer = (s: S): S => {
  const edge = s.nextSaucerEdge ?? (Math.random() < 0.5 ? "left" : "right");
  const y =
    s.nextSaucerRow ?? SAUCER_R + Math.random() * (FIELD_H - 2 * SAUCER_R);
  const [id, n] = takeId(s);
  return {
    ...n,
    saucer: {
      id,
      x: edge === "left" ? 0 : FIELD_W,
      y: wrap(y, FIELD_H),
      vx: edge === "left" ? SAUCER_SPEED : -SAUCER_SPEED,
      vy: 0,
      mind: true,
      gun: true,
      travel: true,
      weave: Math.random() < 0.5 ? 1 : -1,
      fireClock: SAUCER_FIRE_INTERVAL,
      weaveClock: SAUCER_WEAVE_INTERVAL,
      age: 0,
    },
    nextSaucerEdge: null,
    nextSaucerRow: null,
  };
};
const rectFor = (screen: Screen, index: number) => {
  const count =
    screen === "title"
      ? TITLE_ITEMS.length
      : screen === "paused"
        ? PAUSE_ITEMS.length
        : screen === "gameover"
          ? GAMEOVER_ITEMS.length
          : 0;
  if (index < 0 || index >= count) return null;
  return { x: 390, y: 424 + index * 62, w: 500, h: 48 };
};
const menuCount = (screen: Screen) =>
  screen === "title"
    ? TITLE_ITEMS.length
    : screen === "paused"
      ? PAUSE_ITEMS.length
      : screen === "gameover"
        ? GAMEOVER_ITEMS.length
        : 0;
const snapshot = (s: ReadState) => ({
  version: SHATTER_DEBUG_VERSION,
  screen: s.screen,
  menuIndex: s.menuIndex,
  score: s.score,
  lives: s.lives,
  wave: s.wave,
  waveBanner: s.waveBanner,
  muted: s.muted,
  waveSpawning: s.waveSpawning,
  saucerSpawning: s.saucerSpawning,
  saucerClock: s.saucerClock,
  saucerDue: s.saucerDue,
  nextSaucerEdge: s.nextSaucerEdge,
  nextSaucerRow: s.nextSaucerRow,
  nextSaucerAim: s.nextSaucerAim,
  nextRockSpeed: s.nextRockSpeed,
  nextRecycleEdge: s.nextRecycleEdge,
  ship: {
    x: s.ship.x,
    y: s.ship.y,
    vx: s.ship.vx,
    vy: s.ship.vy,
    angle: s.ship.angle,
    speed: speed(s.ship),
    thrusting: s.ship.thrusting,
    invuln: s.ship.invuln,
    collision: s.ship.collision,
    fireCooldown: s.ship.fireCooldown,
  },
  bullets: s.bullets.map(({ id, x, y, vx, vy, life }) => ({
    id,
    x,
    y,
    vx,
    vy,
    life,
  })),
  rocks: s.rocks.map(({ id, x, y, vx, vy, size, health }) => ({
    id,
    x,
    y,
    vx,
    vy,
    size,
    radius: ROCK_RADIUS[size],
    health,
  })),
  saucer: s.saucer,
  enemyBullets: s.enemyBullets,
  torpedoes: s.torpedoes,
  torpedoCharge: s.torpedoCharge,
  torpedoReady: s.torpedoCharge >= 1,
  simTime: s.simTime,
});
function createDebug(): ShatterDebugApi {
  const num = (n: number) => validNum(n);
  const find = (arr: readonly { id: number }[], id: number) => {
    const i = arr.findIndex((v) => v.id === id);
    if (i < 0) throw new Error(`No live entity with id ${id}`);
    return i;
  };
  const pose = (s: ReadState, part: Partial<S>): S => ({ ...s, ...part });
  const api: Record<string, unknown> = {
    version: SHATTER_DEBUG_VERSION,
    reset: (s: ReadState) => ({ ...initial(s.muted), nextId: 1 }),
    snapshot,
    reconcile: (s: ReadState) => ({ ...s }),
    menuItemRect: (s: ReadState, i: number) => rectFor(s.screen, i),
    setScreen: (s: ReadState, v: Screen) => {
      if (!["title", "howto", "playing", "paused", "gameover"].includes(v))
        throw new Error("Invalid screen");
      return pose(s, { screen: v });
    },
    setMenuIndex: (s: ReadState, v: number) => pose(s, { menuIndex: num(v) }),
    setScore: (s: ReadState, v: number) => pose(s, { score: num(v) }),
    setLives: (s: ReadState, v: number) => pose(s, { lives: num(v) }),
    setWave: (s: ReadState, v: number) => pose(s, { wave: num(v) }),
    setWaveBanner: (s: ReadState, v: number) =>
      pose(s, { waveBanner: num(v), ...(v === 0 ? { wave: 0 } : {}) }),
    setWaveSpawning: (s: ReadState, v: boolean) => pose(s, { waveSpawning: v }),
    setSaucerSpawning: (s: ReadState, v: boolean) =>
      pose(s, { saucerSpawning: v }),
    setSaucerDue: (s: ReadState, v: number) => pose(s, { saucerDue: num(v) }),
    setShipPosition: (s: ReadState, x: number, y: number) =>
      pose(s, { ship: { ...s.ship, x: num(x), y: num(y) } }),
    setShipVelocity: (s: ReadState, vx: number, vy: number) =>
      pose(s, { ship: { ...s.ship, vx: num(vx), vy: num(vy) } }),
    setShipAngle: (s: ReadState, a: number) =>
      pose(s, { ship: { ...s.ship, angle: num(a) } }),
    setShipInvuln: (s: ReadState, v: number) =>
      pose(s, { ship: { ...s.ship, invuln: num(v) } }),
    setFireCooldown: (s: ReadState, v: number) =>
      pose(s, { ship: { ...s.ship, fireCooldown: num(v) } }),
    setShipCollision: (s: ReadState, v: boolean) =>
      pose(s, { ship: { ...s.ship, collision: v } }),
    addBullet: (s: ReadState, x: number, y: number, vx: number, vy: number) => {
      const [id, n] = takeId(s as S);
      return {
        ...n,
        bullets: [
          ...s.bullets,
          {
            id,
            x: num(x),
            y: num(y),
            vx: num(vx),
            vy: num(vy),
            life: BULLET_LIFE,
          },
        ],
      };
    },
    removeBullet: (s: ReadState, id: number) => ({
      ...s,
      bullets: s.bullets.filter((_, i) => i !== find(s.bullets, id)),
    }),
    clearBullets: (s: ReadState) => ({ ...s, bullets: [] }),
    addEnemyBullet: (
      s: ReadState,
      x: number,
      y: number,
      vx: number,
      vy: number,
    ) => {
      const [id, n] = takeId(s as S);
      return {
        ...n,
        enemyBullets: [
          ...s.enemyBullets,
          {
            id,
            x: num(x),
            y: num(y),
            vx: num(vx),
            vy: num(vy),
            life: SAUCER_BULLET_LIFE,
          },
        ],
      };
    },
    removeEnemyBullet: (s: ReadState, id: number) => ({
      ...s,
      enemyBullets: s.enemyBullets.filter(
        (_, i) => i !== find(s.enemyBullets, id),
      ),
    }),
    clearEnemyBullets: (s: ReadState) => ({ ...s, enemyBullets: [] }),
    addRock: (s: ReadState, size: RockSize, x: number, y: number) => {
      if (!(size in ROCK_RADIUS)) throw new Error("Invalid rock size");
      const [r, n] = makeRock(s as S, size, num(x), num(y));
      return { ...n, rocks: [...s.rocks, r] };
    },
    setRockVelocity: (s: ReadState, id: number, vx: number, vy: number) => {
      const a = [...s.rocks],
        i = find(a, id);
      a[i] = { ...a[i]!, vx: num(vx), vy: num(vy) };
      return { ...s, rocks: a };
    },
    setRockHealth: (s: ReadState, id: number, hp: number) => {
      const a = [...s.rocks],
        i = find(a, id);
      const h = num(hp);
      if (!Number.isInteger(h) || h < 1 || h > ROCK_HEALTH[a[i]!.size])
        throw new RangeError("Invalid rock health");
      a[i] = { ...a[i]!, health: h };
      return { ...s, rocks: a };
    },
    removeRock: (s: ReadState, id: number) => ({
      ...s,
      rocks: s.rocks.filter((_, i) => i !== find(s.rocks, id)),
    }),
    clearRocks: (s: ReadState) => ({ ...s, rocks: [] }),
    addSaucer: (s: ReadState, x: number, y: number) => {
      const [id, n] = takeId(s as S);
      return {
        ...n,
        saucer: {
          id,
          x: num(x),
          y: num(y),
          vx: SAUCER_SPEED,
          vy: 0,
          mind: true,
          gun: true,
          travel: true,
          weave: 1 as const,
          fireClock: SAUCER_FIRE_INTERVAL,
          weaveClock: SAUCER_WEAVE_INTERVAL,
          age: 0,
        },
      };
    },
    setSaucerVelocity: (s: ReadState, vx: number, vy: number) =>
      s.saucer
        ? { ...s, saucer: { ...s.saucer, vx: num(vx), vy: num(vy) } }
        : (() => {
            throw new Error("No saucer");
          })(),
    setSaucerWeave: (s: ReadState, v: 1 | -1) => {
      if (v !== 1 && v !== -1) throw new Error("Invalid weave");
      if (!s.saucer) throw new Error("No saucer");
      return { ...s, saucer: { ...s.saucer, weave: v } };
    },
    removeSaucer: (s: ReadState) => ({ ...s, saucer: null }),
    setSaucerMind: (s: ReadState, v: boolean) =>
      s.saucer
        ? { ...s, saucer: { ...s.saucer, mind: v } }
        : (() => {
            throw new Error("No saucer");
          })(),
    setSaucerGun: (s: ReadState, v: boolean) =>
      s.saucer
        ? { ...s, saucer: { ...s.saucer, gun: v } }
        : (() => {
            throw new Error("No saucer");
          })(),
    setSaucerTravel: (s: ReadState, v: boolean) =>
      s.saucer
        ? { ...s, saucer: { ...s.saucer, travel: v } }
        : (() => {
            throw new Error("No saucer");
          })(),
    setNextSaucerEdge: (s: ReadState, v: SaucerEdge) => {
      if (v !== "left" && v !== "right") throw new Error("Invalid edge");
      return pose(s, { nextSaucerEdge: v });
    },
    setNextSaucerRow: (s: ReadState, v: number) =>
      pose(s, { nextSaucerRow: num(v) }),
    setNextSaucerAim: (s: ReadState, v: number) =>
      pose(s, { nextSaucerAim: num(v) }),
    setNextRockSpeed: (s: ReadState, v: number) =>
      pose(s, { nextRockSpeed: num(v) }),
    setNextRecycleEdge: (s: ReadState, v: FieldEdge) => {
      if (!["top", "bottom", "left", "right"].includes(v))
        throw new Error("Invalid edge");
      return pose(s, { nextRecycleEdge: v });
    },
    setTorpedoCharge: (s: ReadState, v: number) => {
      const n = num(v);
      if (n < 0 || n > 1) throw new RangeError("Invalid charge");
      return pose(s, { torpedoCharge: n });
    },
    addTorpedo: (s: ReadState, x: number, y: number, h: number) => {
      const a = num(h),
        [id, n] = takeId(s as S);
      return {
        ...n,
        torpedoes: [
          ...s.torpedoes,
          {
            id,
            x: num(x),
            y: num(y),
            vx: Math.cos(a) * TORPEDO_SPEED,
            vy: Math.sin(a) * TORPEDO_SPEED,
            heading: a,
            life: TORPEDO_LIFE,
            homing: true,
          },
        ],
      };
    },
    setTorpedoHeading: (s: ReadState, id: number, h: number) => {
      const a = [...s.torpedoes],
        i = find(a, id),
        v = num(h);
      a[i] = {
        ...a[i]!,
        heading: v,
        vx: Math.cos(v) * TORPEDO_SPEED,
        vy: Math.sin(v) * TORPEDO_SPEED,
      };
      return { ...s, torpedoes: a };
    },
    setTorpedoHoming: (s: ReadState, id: number, v: boolean) => {
      const a = [...s.torpedoes],
        i = find(a, id);
      a[i] = { ...a[i]!, homing: v };
      return { ...s, torpedoes: a };
    },
    removeTorpedo: (s: ReadState, id: number) => ({
      ...s,
      torpedoes: s.torpedoes.filter((_, i) => i !== find(s.torpedoes, id)),
    }),
    clearTorpedoes: (s: ReadState) => ({ ...s, torpedoes: [] }),
  };
  return api as unknown as ShatterDebugApi;
}
export interface ShatterDebugApi {
  readonly version: number;
  reset(s: ReadState): S;
  snapshot(s: ReadState): ReturnType<typeof snapshot>;
  reconcile(s: ReadState): S;
  menuItemRect(
    s: ReadState,
    index: number,
  ): { x: number; y: number; w: number; h: number } | null;
  setScreen(s: ReadState, v: Screen): S;
  setMenuIndex(s: ReadState, n: number): S;
  setScore(s: ReadState, n: number): S;
  setLives(s: ReadState, n: number): S;
  setWave(s: ReadState, n: number): S;
  setWaveBanner(s: ReadState, seconds: number): S;
  setWaveSpawning(s: ReadState, v: boolean): S;
  setSaucerSpawning(s: ReadState, v: boolean): S;
  setSaucerDue(s: ReadState, n: number): S;
  setShipPosition(s: ReadState, x: number, y: number): S;
  setShipVelocity(s: ReadState, vx: number, vy: number): S;
  setShipAngle(s: ReadState, a: number): S;
  setShipInvuln(s: ReadState, n: number): S;
  setFireCooldown(s: ReadState, n: number): S;
  setShipCollision(s: ReadState, v: boolean): S;
  addBullet(s: ReadState, x: number, y: number, vx: number, vy: number): S;
  removeBullet(s: ReadState, id: number): S;
  clearBullets(s: ReadState): S;
  addEnemyBullet(s: ReadState, x: number, y: number, vx: number, vy: number): S;
  removeEnemyBullet(s: ReadState, id: number): S;
  clearEnemyBullets(s: ReadState): S;
  addRock(s: ReadState, size: RockSize, x: number, y: number): S;
  setRockVelocity(s: ReadState, id: number, vx: number, vy: number): S;
  setRockHealth(s: ReadState, id: number, hp: number): S;
  removeRock(s: ReadState, id: number): S;
  clearRocks(s: ReadState): S;
  addSaucer(s: ReadState, x: number, y: number): S;
  setSaucerVelocity(s: ReadState, vx: number, vy: number): S;
  setSaucerWeave(s: ReadState, direction: 1 | -1): S;
  removeSaucer(s: ReadState): S;
  setSaucerMind(s: ReadState, v: boolean): S;
  setSaucerGun(s: ReadState, v: boolean): S;
  setSaucerTravel(s: ReadState, v: boolean): S;
  setNextSaucerEdge(s: ReadState, e: SaucerEdge): S;
  setNextSaucerRow(s: ReadState, y: number): S;
  setNextSaucerAim(s: ReadState, radians: number): S;
  setNextRockSpeed(s: ReadState, speed: number): S;
  setNextRecycleEdge(s: ReadState, e: FieldEdge): S;
  setTorpedoCharge(s: ReadState, fraction: number): S;
  addTorpedo(s: ReadState, x: number, y: number, heading: number): S;
  setTorpedoHeading(s: ReadState, id: number, heading: number): S;
  setTorpedoHoming(s: ReadState, id: number, v: boolean): S;
  removeTorpedo(s: ReadState, id: number): S;
  clearTorpedoes(s: ReadState): S;
}
function grav(vx: number, vy: number, x: number, y: number) {
  const dx = STAR_X - x,
    dy = STAR_Y - y,
    d = Math.hypot(dx, dy);
  if (d < 1e-6) return [vx, vy];
  const a = MU / Math.max(d, SOFTEN) ** 2;
  return [vx + (dx / d) * a * TICK_DT, vy + (dy / d) * a * TICK_DT] as const;
}
function tick(
  s0: S,
  held: {
    left: number;
    right: number;
    thrust: number;
    fire: boolean;
    torpedo: boolean;
  },
  cues: Set<string>,
): S {
  let s = { ...s0, simTime: s0.simTime + TICK_DT };
  const shipStart = { x: s.ship.x, y: s.ship.y };
  let ship = { ...s.ship };
  if (s.screen !== "playing") return s;
  ship.angle = normAngle(
    ship.angle + (held.right - held.left) * SHIP_TURN * TICK_DT,
  );
  ship.thrusting = held.thrust > 0;
  if (ship.thrusting) {
    ship.vx += Math.cos(ship.angle) * SHIP_THRUST * TICK_DT;
    ship.vy += Math.sin(ship.angle) * SHIP_THRUST * TICK_DT;
    cues.add(CUES.thrust);
  }
  const drag = Math.pow(0.5, TICK_DT / SHIP_DRAG_HALFLIFE);
  ship.vx *= drag;
  ship.vy *= drag;
  const sp = speed(ship);
  if (sp > SHIP_MAX) {
    ship.vx *= SHIP_MAX / sp;
    ship.vy *= SHIP_MAX / sp;
  }
  ship.invuln = Math.max(0, ship.invuln - TICK_DT);
  ship.fireCooldown = Math.max(0, ship.fireCooldown - 1);
  let bullets = [...s.bullets] as BulletState[],
    enemy = [...s.enemyBullets] as BulletState[],
    rocks = [...s.rocks] as RockState[],
    torps = [...s.torpedoes] as TorpedoState[],
    score = s.score,
    lives = s.lives,
    saucer = s.saucer ? { ...s.saucer } : null,
    charge = Math.min(1, s.torpedoCharge + TICK_DT / TORPEDO_RECHARGE),
    waveBanner = Math.max(0, s.waveBanner - TICK_DT),
    wave = s.wave;
  const saucerStart = saucer ? { ...saucer } : null;
  if (held.fire && ship.fireCooldown <= 0 && bullets.length < MAX_BULLETS) {
    const [id, n] = takeId(s);
    s = n;
    bullets.push({
      id,
      x: wrap(ship.x + Math.cos(ship.angle) * SHIP_R, FIELD_W),
      y: wrap(ship.y + Math.sin(ship.angle) * SHIP_R, FIELD_H),
      vx: ship.vx + Math.cos(ship.angle) * MUZZLE_SPEED,
      vy: ship.vy + Math.sin(ship.angle) * MUZZLE_SPEED,
      life: BULLET_LIFE,
    });
    ship.fireCooldown = FIRE_INTERVAL_TICKS;
    cues.add(CUES.fire);
  }
  if (held.torpedo && charge >= 1 && torps.length === 0) {
    const [id, n] = takeId(s);
    s = n;
    torps.push({
      id,
      x: wrap(ship.x + Math.cos(ship.angle) * SHIP_R, FIELD_W),
      y: wrap(ship.y + Math.sin(ship.angle) * SHIP_R, FIELD_H),
      vx: Math.cos(ship.angle) * TORPEDO_SPEED,
      vy: Math.sin(ship.angle) * TORPEDO_SPEED,
      heading: ship.angle,
      life: TORPEDO_LIFE,
      homing: true,
    });
    charge = 0;
  }
  const torpedoStarts = new Map(torps.map((body) => [body.id, body]));
  // Move and guide powered torpedoes; ballistic bodies receive the star's pull.
  torps = torps
    .map((t) => {
      let h = t.heading;
      if (t.homing) {
        let best = Infinity,
          target: { x: number; y: number } | null = null;
        for (const r of rocks) {
          const d = dist(t, r),
            bearing = Math.atan2(
              delta(t.y, r.y, FIELD_H),
              delta(t.x, r.x, FIELD_W),
            );
          if (Math.abs(angleDelta(h, bearing)) <= TORPEDO_CONE && d < best) {
            best = d;
            target = r;
          }
        }
        if (saucer) {
          const d = dist(t, saucer),
            bearing = Math.atan2(
              delta(t.y, saucer.y, FIELD_H),
              delta(t.x, saucer.x, FIELD_W),
            );
          if (Math.abs(angleDelta(h, bearing)) <= TORPEDO_CONE && d < best)
            target = saucer;
        }
        if (target)
          h = normAngle(
            h +
              clamp(
                angleDelta(
                  h,
                  Math.atan2(
                    delta(t.y, target.y, FIELD_H),
                    delta(t.x, target.x, FIELD_W),
                  ),
                ),
                -TORPEDO_TURN * TICK_DT,
                TORPEDO_TURN * TICK_DT,
              ),
          );
      }
      return {
        ...t,
        heading: h,
        vx: Math.cos(h) * TORPEDO_SPEED,
        vy: Math.sin(h) * TORPEDO_SPEED,
        x: wrap(t.x + Math.cos(h) * TORPEDO_SPEED * TICK_DT, FIELD_W),
        y: wrap(t.y + Math.sin(h) * TORPEDO_SPEED * TICK_DT, FIELD_H),
        life: t.life - TICK_DT,
      };
    })
    .filter(
      (t) =>
        t.life > 0 &&
        !sweptContact(
          torpedoStarts.get(t.id) ?? t,
          t,
          { x: STAR_X, y: STAR_Y },
          { x: STAR_X, y: STAR_Y },
          CORE_R + TORPEDO_R,
        ),
    );
  const bulletStarts = new Map(bullets.map((body) => [body.id, body]));
  const enemyStarts = new Map(enemy.map((body) => [body.id, body]));
  const rockStarts = new Map(rocks.map((body) => [body.id, body]));
  const moveBallistic = (arr: BulletState[]) =>
    arr
      .map((b) => {
        const [vx, vy] = grav(b.vx, b.vy, b.x, b.y);
        return {
          ...b,
          vx,
          vy,
          x: wrap(b.x + vx * TICK_DT, FIELD_W),
          y: wrap(b.y + vy * TICK_DT, FIELD_H),
          life: b.life - TICK_DT,
        };
      })
      .filter(
        (b) =>
          b.life > 0 &&
          !sweptContact(
            arr === bullets
              ? (bulletStarts.get(b.id) ?? b)
              : (enemyStarts.get(b.id) ?? b),
            b,
            { x: STAR_X, y: STAR_Y },
            { x: STAR_X, y: STAR_Y },
            CORE_R + BULLET_R,
          ),
      );
  bullets = moveBallistic(bullets);
  enemy = moveBallistic(enemy);
  rocks = rocks.map((r) => {
    const [vx, vy] = grav(r.vx, r.vy, r.x, r.y);
    return {
      ...r,
      vx,
      vy,
      x: wrap(r.x + vx * TICK_DT, FIELD_W),
      y: wrap(r.y + vy * TICK_DT, FIELD_H),
      spin: r.spin + 0.25 * TICK_DT,
      flash: Math.max(0, r.flash - TICK_DT),
    };
  });
  // Rocks swallowed by the core recycle with their armor intact.
  const recycledRockIds = new Set<number>();
  rocks = rocks.map((r) => {
    const previous = rockStarts.get(r.id) ?? r;
    if (
      !sweptContact(
        previous,
        r,
        { x: STAR_X, y: STAR_Y },
        { x: STAR_X, y: STAR_Y },
        CORE_R + ROCK_RADIUS[r.size],
      )
    )
      return r;
    recycledRockIds.add(r.id);
    const edge =
      s.nextRecycleEdge ??
      (["top", "bottom", "left", "right"] as FieldEdge[])[
        Math.floor(Math.random() * 4)
      ]!;
    if (s.nextRecycleEdge) s = { ...s, nextRecycleEdge: null };
    const u = Math.random(),
      x = edge === "left" ? 0 : edge === "right" ? FIELD_W : u * FIELD_W,
      y = edge === "top" ? 0 : edge === "bottom" ? FIELD_H : u * FIELD_H,
      a = Math.atan2(STAR_Y - y, STAR_X - x) + (Math.random() - 0.5) * 0.9,
      base =
        s.nextRockSpeed ??
        ROCK_SPEED_MIN[r.size] +
          Math.random() * (ROCK_SPEED_MAX[r.size] - ROCK_SPEED_MIN[r.size]);
    s = { ...s, nextRockSpeed: null };
    return { ...r, x, y, vx: Math.cos(a) * base, vy: Math.sin(a) * base };
  });
  for (const r of rocks) {
    if (recycledRockIds.has(r.id)) rockStarts.set(r.id, r);
  }
  if (saucer) {
    saucer.age += TICK_DT;
    saucer.fireClock -= TICK_DT;
    saucer.weaveClock -= TICK_DT;
    if (saucer.mind && saucer.weaveClock <= 0) {
      saucer = {
        ...saucer,
        vy: -(Math.sign(saucer.vy) || saucer.weave) * SAUCER_WEAVE_SPEED,
        weaveClock: SAUCER_WEAVE_INTERVAL,
      };
    }
    if (
      saucer.mind &&
      Math.hypot(saucer.x - STAR_X, saucer.y - STAR_Y) < CORE_R + SAUCER_R + 28
    )
      saucer = {
        ...saucer,
        vy: saucer.y < STAR_Y ? -SAUCER_WEAVE_SPEED : SAUCER_WEAVE_SPEED,
      };
    if (saucer.travel)
      saucer = {
        ...saucer,
        x: wrap(saucer.x + saucer.vx * TICK_DT, FIELD_W),
        y: wrap(saucer.y + saucer.vy * TICK_DT, FIELD_H),
      };
    if (saucer.gun && saucer.fireClock <= 0) {
      const aim = s.nextSaucerAim ?? (Math.random() * 2 - 1) * SAUCER_AIM_ERROR;
      s = { ...s, nextSaucerAim: null };
      const a =
          Math.atan2(
            delta(saucer.y, ship.y, FIELD_H),
            delta(saucer.x, ship.x, FIELD_W),
          ) + aim,
        [id, n] = takeId(s);
      s = n;
      enemy.push({
        id,
        x: saucer.x,
        y: saucer.y,
        vx: saucer.vx + Math.cos(a) * SAUCER_BULLET_SPEED,
        vy: saucer.vy + Math.sin(a) * SAUCER_BULLET_SPEED,
        life: SAUCER_BULLET_LIFE,
      });
      saucer = { ...saucer, fireClock: SAUCER_FIRE_INTERVAL };
    }
    if (saucer.age >= SAUCER_LIFETIME) {
      saucer = null;
      s = {
        ...s,
        saucerClock: 0,
        saucerDue:
          SAUCER_GAP_MIN + Math.random() * (SAUCER_GAP_MAX - SAUCER_GAP_MIN),
      };
    }
  }
  ship.x = wrap(ship.x + ship.vx * TICK_DT, FIELD_W);
  ship.y = wrap(ship.y + ship.vy * TICK_DT, FIELD_H);
  // Resolve impacts after all bodies have advanced for this fixed tick.
  const contact = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    r: number,
    a0 = a,
    b0 = b,
  ) => sweptContact(a0, a, b0, b, r);
  // Star slides the ship out of its solid core and removes inward velocity.
  const coreD = Math.hypot(ship.x - STAR_X, ship.y - STAR_Y);
  if (coreD < CORE_R + SHIP_R) {
    const ux = (ship.x - STAR_X) / (coreD || 1),
      uy = (ship.y - STAR_Y) / (coreD || 1);
    ship.x = STAR_X + ux * (CORE_R + SHIP_R);
    ship.y = STAR_Y + uy * (CORE_R + SHIP_R);
    const into = ship.vx * ux + ship.vy * uy;
    if (into < 0) {
      ship.vx -= into * ux;
      ship.vy -= into * uy;
    }
  }
  // Ship bullets chip rocks and destroy them at zero health.
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi]!;
    let hit = -1;
    for (let ri = 0; ri < rocks.length; ri++)
      if (
        contact(
          b,
          rocks[ri]!,
          BULLET_R + ROCK_RADIUS[rocks[ri]!.size],
          bulletStarts.get(b.id) ?? b,
          rockStarts.get(rocks[ri]!.id) ?? rocks[ri]!,
        )
      ) {
        hit = ri;
        break;
      }
    if (hit >= 0) {
      bullets.splice(bi, 1);
      const r = rocks[hit]!;
      if (r.health > 1)
        rocks[hit] = { ...r, health: r.health - 1, flash: HIT_FLASH_TIME };
      else {
        rocks.splice(hit, 1);
        score +=
          r.size === "large"
            ? SCORE_LARGE
            : r.size === "medium"
              ? SCORE_MEDIUM
              : SCORE_SMALL;
        cues.add(CUES.shatter);
        const child = ROCK_CHILD[r.size];
        if (child) {
          for (const sign of [-1, 1]) {
            const [id, n] = takeId(s);
            s = n;
            const a = Math.atan2(b.vy, b.vx) + (sign * Math.PI) / 2;
            rocks.push({
              id,
              x: r.x,
              y: r.y,
              vx: r.vx + Math.cos(a) * SPLIT_KICK,
              vy: r.vy + Math.sin(a) * SPLIT_KICK,
              size: child,
              spin: Math.random() * Math.PI * 2,
              health: ROCK_HEALTH[child],
              flash: 0,
            });
          }
        }
      }
    }
  }
  // Torpedoes destroy one rock outright or take out the saucer.
  for (let ti = torps.length - 1; ti >= 0; ti--) {
    const t = torps[ti]!;
    const hit = rocks.findIndex((r) =>
      contact(
        t,
        r,
        TORPEDO_R + ROCK_RADIUS[r.size],
        torpedoStarts.get(t.id) ?? t,
        rockStarts.get(r.id) ?? r,
      ),
    );
    if (hit >= 0) {
      const r = rocks.splice(hit, 1)[0]!;
      torps.splice(ti, 1);
      score +=
        r.size === "large"
          ? SCORE_LARGE
          : r.size === "medium"
            ? SCORE_MEDIUM
            : SCORE_SMALL;
      cues.add(CUES.shatter);
      const child = ROCK_CHILD[r.size];
      if (child)
        for (const sign of [-1, 1]) {
          const [id, n] = takeId(s);
          s = n;
          rocks.push({
            id,
            x: r.x,
            y: r.y,
            vx: r.vx + Math.cos(t.heading) * TORPEDO_SCATTER * sign,
            vy: r.vy + Math.sin(t.heading) * TORPEDO_SCATTER * sign,
            size: child,
            spin: Math.random() * Math.PI * 2,
            health: ROCK_HEALTH[child],
            flash: 0,
          });
        }
    } else if (
      saucer &&
      contact(
        t,
        saucer,
        TORPEDO_R + SAUCER_R,
        torpedoStarts.get(t.id) ?? t,
        saucerStart ?? saucer,
      )
    ) {
      torps.splice(ti, 1);
      saucer = null;
      score += SCORE_SAUCER;
      cues.add(CUES.shatter);
      s = {
        ...s,
        saucerClock: 0,
        saucerDue:
          SAUCER_GAP_MIN + Math.random() * (SAUCER_GAP_MAX - SAUCER_GAP_MIN),
      };
    }
  }
  for (const b of bullets) {
    if (
      saucer &&
      contact(
        b,
        saucer,
        BULLET_R + SAUCER_R,
        bulletStarts.get(b.id) ?? b,
        saucerStart ?? saucer,
      )
    ) {
      saucer = null;
      score += SCORE_SAUCER;
      cues.add(CUES.shatter);
      s = {
        ...s,
        saucerClock: 0,
        saucerDue:
          SAUCER_GAP_MIN + Math.random() * (SAUCER_GAP_MAX - SAUCER_GAP_MIN),
      };
    }
  }
  if (
    saucer &&
    ship.collision &&
    ship.invuln <= 0 &&
    contact(ship, saucer, SHIP_R + SAUCER_R, shipStart, saucerStart ?? saucer)
  )
    lives--;
  if (
    lives === s.lives &&
    ship.collision &&
    ship.invuln <= 0 &&
    (rocks.some((r) =>
      contact(
        ship,
        r,
        SHIP_R + ROCK_RADIUS[r.size],
        shipStart,
        rockStarts.get(r.id) ?? r,
      ),
    ) ||
      enemy.some((b) =>
        contact(
          ship,
          b,
          SHIP_R + SAUCER_BULLET_R,
          shipStart,
          enemyStarts.get(b.id) ?? b,
        ),
      ))
  ) {
    lives--;
    enemy = enemy.filter(
      (b) =>
        !contact(
          ship,
          b,
          SHIP_R + SAUCER_BULLET_R,
          shipStart,
          enemyStarts.get(b.id) ?? b,
        ),
    );
  }
  if (lives < s.lives) {
    cues.add(CUES.death);
    if (lives > 0)
      ship = {
        ...ship,
        x: SAFE_X,
        y: SAFE_Y,
        vx: 0,
        vy: 0,
        angle: FACE_UP,
        invuln: INVULN_TIME,
        fireCooldown: 0,
      };
    else s = { ...s, screen: "gameover", menuIndex: 0 };
  }
  const extra =
    Math.floor(score / EXTRA_LIFE_STEP) - Math.floor(s.score / EXTRA_LIFE_STEP);
  if (extra > 0) {
    lives += extra;
    cues.add(CUES.extraLife);
  }
  let saucerClock = s.saucerClock;
  if (!saucer) saucerClock += TICK_DT;
  if (!s.saucer && s.saucerSpawning && saucerClock >= s.saucerDue) {
    s = { ...s, saucerClock };
    s = spawnSaucer(s);
    saucer = s.saucer;
    cues.add(CUES.saucer);
  }
  if (waveBanner === 0 && s0.waveBanner > 0 && s.waveSpawning) {
    s = makeWave({ ...s, rocks: [], wave }, wave);
  }
  if (
    s.waveSpawning &&
    rocks.length === 0 &&
    s0.rocks.length > 0 &&
    s.screen === "playing"
  ) {
    wave++;
    waveBanner = WAVE_BANNER_TIME;
  }
  return {
    ...s,
    ship,
    bullets,
    enemyBullets: enemy,
    rocks,
    saucer,
    torpedoes: torps,
    torpedoCharge: charge,
    score,
    lives,
    wave,
    waveBanner,
    saucerClock,
  };
}
function handleMenu(s: S, api: UpdateApi): S {
  const count = menuCount(s.screen);
  if (!count) return s;
  let index = s.menuIndex;
  if (api.input.pressed("up")) index = (index - 1 + count) % count;
  if (api.input.pressed("down")) index = (index + 1) % count;
  const samples = api.input.pointerSamples().filter((p) => p.primary);
  let hover = index;
  for (const p of samples) {
    for (let i = 0; i < count; i++) {
      const r = rectFor(s.screen, i)!;
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)
        hover = i;
    }
  }
  const pointer = api.input.pointer();
  for (let i = 0; i < count; i++) {
    const r = rectFor(s.screen, i)!;
    if (
      pointer.x >= r.x &&
      pointer.x <= r.x + r.w &&
      pointer.y >= r.y &&
      pointer.y <= r.y + r.h
    )
      hover = i;
  }
  const keyConfirm = api.input.pressed("confirm");
  const down = api.input.pointerPressed(),
    up = api.input.pointerReleased();
  let pressIndex = -1,
    releaseIndex = -1;
  for (const p of samples) {
    for (let i = 0; i < count; i++) {
      const r = rectFor(s.screen, i)!;
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        if (p.type === "down") pressIndex = i;
        if (p.type === "up") releaseIndex = i;
      }
    }
  }
  s = { ...s, menuIndex: hover };
  if (keyConfirm) return choose(s, index);
  if (down && up && pressIndex >= 0 && pressIndex === releaseIndex)
    return choose(s, pressIndex);
  return s;
}
function choose(s: S, i: number): S {
  if (s.screen === "title")
    return i === 0
      ? { ...makeWave(resetGame(s), 1), screen: "playing" }
      : { ...s, screen: "howto", menuIndex: 1 };
  if (s.screen === "paused")
    return i === 0
      ? { ...s, screen: "playing", menuIndex: 0 }
      : i === 1
        ? { ...makeWave(resetGame(s), 1), screen: "playing" }
        : { ...initial(s.muted), nextId: s.nextId };
  if (s.screen === "gameover")
    return i === 0
      ? { ...makeWave(resetGame(s), 1), screen: "playing" }
      : { ...initial(s.muted), nextId: s.nextId };
  return s;
}
export const game: Game<ShatterState, ShatterDebugApi> = {
  initialize(api: InitApi<ShatterState>): [ShatterState, ShatterDebugApi] {
    for (const a of ACTIONS) api.input.register(a, BINDINGS[a]);
    for (const cue of Object.values(CUES))
      api.audio.define(cue, {
        wave: "triangle",
        freq: 280 + Object.values(CUES).indexOf(cue as never) * 90,
        gain: 0.18,
        durationMs: 110,
      });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("score", (s) => s.score);
    api.diagnostics.register("lives / wave", (s) => `${s.lives} / ${s.wave}`);
    api.diagnostics.register(
      "ship position",
      (s) => `${s.ship.x.toFixed(1)}, ${s.ship.y.toFixed(1)}`,
    );
    api.diagnostics.register(
      "ship velocity",
      (s) => `${s.ship.vx.toFixed(1)}, ${s.ship.vy.toFixed(1)}`,
    );
    api.diagnostics.register("ship speed", (s) => speed(s.ship));
    api.diagnostics.register(
      "ship facing / grace",
      (s) => `${s.ship.angle.toFixed(2)} / ${s.ship.invuln.toFixed(2)}s`,
    );
    api.diagnostics.register(
      "bullets / rocks",
      (s) => `${s.bullets.length} / ${s.rocks.length}`,
    );
    api.diagnostics.register("saucer", (s) =>
      s.saucer ? `${s.saucer.x.toFixed(0)}, ${s.saucer.y.toFixed(0)}` : "away",
    );
    api.diagnostics.register(
      "torpedo charge / flight",
      (s) => `${s.torpedoCharge.toFixed(2)} / ${s.torpedoes.length}`,
    );
    api.diagnostics.register("sim time", (s) => s.simTime.toFixed(2));
    return [initial(), createDebug()];
  },
  update(state: ReadState, api: UpdateApi, dt: number): S {
    let s = { ...state, muted: api.audio.muted() };
    if (api.input.pressed("mute")) {
      api.audio.setMuted(!s.muted);
      s = { ...s, muted: !s.muted };
    }
    if (s.screen === "paused") {
      api.audio.stop(CUES.thrust);
      if (api.input.pressed("pause") || api.input.pressed("back"))
        s = { ...s, screen: "playing", menuIndex: 0 };
      else s = handleMenu(s, api);
      s = {
        ...s,
        simTime: s.simTime + Math.floor((s.tickClock + dt) / TICK_DT) * TICK_DT,
        tickClock: (s.tickClock + dt) % TICK_DT,
      };
      return s;
    }
    if (s.screen !== "playing") api.audio.stop(CUES.thrust);
    if (s.screen === "playing" && api.input.pressed("pause")) {
      api.audio.stop(CUES.thrust);
      return { ...s, screen: "paused", menuIndex: 0 };
    }
    if (
      s.screen === "howto" &&
      (api.input.pressed("confirm") || api.input.pressed("back"))
    )
      return { ...s, screen: "title", menuIndex: s.menuIndex };
    if (
      (s.screen === "title" || s.screen === "gameover") &&
      api.input.pressed("back")
    )
      return { ...initial(s.muted), nextId: s.nextId };
    if (s.screen !== "playing") {
      s = handleMenu(s, api);
      s = {
        ...s,
        simTime: s.simTime + Math.floor((s.tickClock + dt) / TICK_DT) * TICK_DT,
        tickClock: (s.tickClock + dt) % TICK_DT,
      };
      return s;
    }
    const total = s.tickClock + Math.max(0, dt),
      ticks = Math.floor(total / TICK_DT);
    s = { ...s, tickClock: total - ticks * TICK_DT };
    const held = {
      left: api.input.value("left"),
      right: api.input.value("right"),
      thrust: api.input.value("up"),
      fire: api.input.value("a") > 0,
      torpedo: api.input.pressed("b"),
    };
    const cues = new Set<string>();
    for (let i = 0; i < ticks; i++) s = tick(s, held, cues);
    if (held.thrust > 0) api.audio.loop(CUES.thrust);
    else api.audio.stop(CUES.thrust);
    for (const c of cues) if (c !== CUES.thrust) api.audio.play(c);
    return s;
  },
  render(state: ReadState, api: RenderApi): void {
    const c = api.ctx;
    c.fillStyle = BACKGROUND;
    c.fillRect(0, 0, FIELD_W, FIELD_H);
    c.save();
    c.strokeStyle = "rgba(112,145,196,.12)";
    c.lineWidth = 1;
    for (let i = 0; i < 65; i++) {
      const x = (i * 197) % FIELD_W,
        y = (i * 331) % FIELD_H;
      c.fillStyle = i % 4 === 0 ? "#8db8ea" : "#40516d";
      c.globalAlpha = 0.35 + (i % 5) * 0.1;
      c.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    c.globalAlpha = 1;
    const halo = c.createRadialGradient(
      STAR_X,
      STAR_Y,
      CORE_R,
      STAR_X,
      STAR_Y,
      HALO_R * 1.5,
    );
    halo.addColorStop(0, "rgba(255,186,82,.26)");
    halo.addColorStop(0.35, "rgba(255,107,72,.12)");
    halo.addColorStop(1, "rgba(255,80,66,0)");
    c.fillStyle = halo;
    c.beginPath();
    c.arc(STAR_X, STAR_Y, HALO_R * 1.5, 0, Math.PI * 2);
    c.fill();
    const core = c.createRadialGradient(
      STAR_X - 8,
      STAR_Y - 9,
      2,
      STAR_X,
      STAR_Y,
      CORE_R,
    );
    core.addColorStop(0, "#fff2b3");
    core.addColorStop(0.45, "#ffb65c");
    core.addColorStop(1, "#d95054");
    c.fillStyle = core;
    c.beginPath();
    c.arc(STAR_X, STAR_Y, CORE_R, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(255,194,110,.24)";
    c.beginPath();
    c.arc(STAR_X, STAR_Y, CORE_R + 8, 0, Math.PI * 2);
    c.stroke();
    const seam = (
      x: number,
      y: number,
      r: number,
      draw: (x: number, y: number) => void,
    ) => {
      for (const ox of [-FIELD_W, 0, FIELD_W])
        for (const oy of [-FIELD_H, 0, FIELD_H])
          if (
            x + ox > -r &&
            x + ox < FIELD_W + r &&
            y + oy > -r &&
            y + oy < FIELD_H + r
          )
            draw(x + ox, y + oy);
    };
    for (const r of state.rocks)
      seam(r.x, r.y, ROCK_RADIUS[r.size], (x, y) => {
        c.save();
        c.translate(x, y);
        c.rotate(r.spin);
        const radius = ROCK_RADIUS[r.size],
          points = r.size === "large" ? 11 : r.size === "medium" ? 9 : 8;
        c.beginPath();
        for (let i = 0; i < points; i++) {
          const a = (i * 2 * Math.PI) / points,
            rr = radius * (0.78 + ((i * 13 + r.id * 7) % 19) / 100);
          const px = Math.cos(a) * rr,
            py = Math.sin(a) * rr;
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.closePath();
        c.fillStyle =
          r.flash > 0
            ? "#fff4d2"
            : r.health < ROCK_HEALTH[r.size]
              ? "#7b5161"
              : "#29384d";
        c.strokeStyle = r.flash > 0 ? "#fff" : "#a9bfd6";
        c.lineWidth = 2;
        c.fill();
        c.stroke();
        if (r.health < ROCK_HEALTH[r.size]) {
          c.strokeStyle = "#ff846f";
          c.globalAlpha = 0.9;
          c.beginPath();
          c.moveTo(-radius * 0.4, -radius * 0.1);
          c.lineTo(radius * 0.05, radius * 0.15);
          c.lineTo(radius * 0.25, -radius * 0.3);
          c.stroke();
        }
        c.restore();
      });
    for (const b of [...state.bullets, ...state.enemyBullets])
      seam(b.x, b.y, 30, (x, y) => {
        const ang = Math.atan2(b.vy, b.vx),
          len = Math.min(40, speed(b) * TRAIL_TICKS * TICK_DT);
        const g = c.createLinearGradient(
          x - Math.cos(ang) * len,
          y - Math.sin(ang) * len,
          x,
          y,
        );
        g.addColorStop(0, "rgba(116,214,255,0)");
        g.addColorStop(1, "rgba(145,231,255,.8)");
        c.strokeStyle = g;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len);
        c.lineTo(x, y);
        c.stroke();
        c.fillStyle = "#e6fbff";
        c.beginPath();
        c.arc(x, y, BULLET_R, 0, Math.PI * 2);
        c.fill();
      });
    for (const t of state.torpedoes)
      seam(t.x, t.y, 15, (x, y) => {
        c.save();
        c.translate(x, y);
        c.rotate(t.heading);
        c.fillStyle = "#ffdc82";
        c.strokeStyle = "#fff2cf";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(12, 0);
        c.lineTo(-7, -5);
        c.lineTo(-4, 0);
        c.lineTo(-7, 5);
        c.closePath();
        c.fill();
        c.stroke();
        c.fillStyle = "#ff875e";
        c.fillRect(-11, -2, 4, 4);
        c.restore();
      });
    if (state.saucer)
      seam(state.saucer.x, state.saucer.y, 22, (x, y) => {
        c.fillStyle = "#a5ffe1";
        c.strokeStyle = "#e4fff4";
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(x, y, SAUCER_R, 8, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = "#d0f8ff";
        c.beginPath();
        c.arc(x, y - 6, 8, Math.PI, Math.PI * 2);
        c.fill();
        c.fillStyle = "#4a8c91";
        for (let k = -1; k <= 1; k++) c.fillRect(x + k * 8 - 1, y - 1, 3, 2);
      });
    for (const b of state.enemyBullets)
      seam(b.x, b.y, 5, (x, y) => {
        c.fillStyle = "#ff6485";
        c.beginPath();
        c.arc(x, y, SAUCER_BULLET_R + 1, 0, Math.PI * 2);
        c.fill();
      });
    if (state.screen === "playing" || state.screen === "paused") {
      const sh = state.ship;
      seam(sh.x, sh.y, 25, (x, y) => {
        if (sh.invuln > 0 && Math.floor(state.simTime * 12) % 2 === 0)
          c.globalAlpha = 0.42;
        c.save();
        c.translate(x, y);
        c.rotate(sh.angle);
        if (sh.thrusting) {
          c.fillStyle = "#ff8e4a";
          c.beginPath();
          c.moveTo(-10, -5);
          c.lineTo(-23, 0);
          c.lineTo(-10, 5);
          c.closePath();
          c.fill();
          c.fillStyle = "#fff1a0";
          c.beginPath();
          c.moveTo(-10, -3);
          c.lineTo(-18, 0);
          c.lineTo(-10, 3);
          c.fill();
        }
        c.fillStyle = "#d7f7ff";
        c.strokeStyle = "#67dafa";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(17, 0);
        c.lineTo(-11, -11);
        c.lineTo(-7, 0);
        c.lineTo(-11, 11);
        c.closePath();
        c.fill();
        c.stroke();
        c.restore();
        c.globalAlpha = 1;
      });
      c.textAlign = "left";
      c.font = "700 25px system-ui";
      c.fillStyle = "#f3f7ff";
      c.fillText(String(state.score).padStart(6, "0"), 38, 48);
      c.font = "12px system-ui";
      c.fillStyle = "#89a2c3";
      c.fillText("SCORE", 40, 67);
      for (let i = 0; i < Math.max(0, state.lives - 1); i++) {
        c.save();
        c.translate(48 + i * 25, 94);
        c.rotate(-Math.PI / 2);
        c.strokeStyle = "#9ceaff";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(9, 0);
        c.lineTo(-7, -6);
        c.lineTo(-4, 0);
        c.lineTo(-7, 6);
        c.closePath();
        c.stroke();
        c.restore();
      }
      c.fillStyle = "#9ceaff";
      c.font = "12px system-ui";
      c.fillText("TORPEDO", 40, 128);
      c.strokeStyle = "#446078";
      c.strokeRect(40, 138, 118, 8);
      c.fillStyle = state.torpedoCharge >= 1 ? "#ffc86c" : "#55d7d3";
      c.fillRect(41, 139, 116 * state.torpedoCharge, 6);
      if (state.score > 0 && state.score % EXTRA_LIFE_STEP < SCORE_SMALL) {
        c.textAlign = "center";
        c.fillStyle = "#ffe08a";
        c.font = "700 22px system-ui";
        c.fillText("EXTRA SHIP", FIELD_W / 2, 70);
      }
      if (state.waveBanner > 0) {
        c.textAlign = "center";
        c.fillStyle = "#f4f2df";
        c.font = "700 28px system-ui";
        c.fillText(`WAVE ${state.wave}`, FIELD_W / 2, FIELD_H / 2 + 130);
      }
    }
    if (
      state.screen === "title" ||
      state.screen === "paused" ||
      state.screen === "gameover"
    ) {
      c.fillStyle = "rgba(3,7,16,.76)";
      c.fillRect(0, 0, FIELD_W, FIELD_H);
      c.textAlign = "center";
      c.fillStyle = "#eff8ff";
      c.font = "900 82px system-ui";
      c.fillText(
        state.screen === "title"
          ? TITLE_TEXT
          : state.screen === "paused"
            ? "PAUSED"
            : "RUN ENDED",
        FIELD_W / 2,
        220,
      );
      c.fillStyle = "#8aa9c7";
      c.font = "600 17px system-ui";
      if (state.screen === "title") c.fillText(TAGLINE_TEXT, FIELD_W / 2, 263);
      if (state.screen === "gameover")
        c.fillText(
          `FINAL SCORE  ${state.score}     WAVE  ${state.wave}`,
          FIELD_W / 2,
          275,
        );
      const items =
        state.screen === "title"
          ? TITLE_ITEMS
          : state.screen === "paused"
            ? PAUSE_ITEMS
            : GAMEOVER_ITEMS;
      items.forEach((item, i) => {
        const r = rectFor(state.screen, i)!;
        c.fillStyle =
          i === state.menuIndex ? "rgba(80,216,224,.17)" : "rgba(29,44,64,.55)";
        c.strokeStyle = i === state.menuIndex ? "#69e5e1" : "#52647c";
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(r.x, r.y, r.w, r.h, 8);
        c.fill();
        c.stroke();
        c.fillStyle = i === state.menuIndex ? "#e9ffff" : "#91a5bd";
        c.font = "700 18px system-ui";
        c.fillText(item, FIELD_W / 2, r.y + 30);
      });
      c.fillStyle = "#7186a0";
      c.font = "13px system-ui";
      c.fillText(
        "WASD / ARROWS  FLY     SPACE  FIRE     F  TORPEDO     P  PAUSE",
        FIELD_W / 2,
        670,
      );
    }
    if (state.screen === "howto") {
      c.fillStyle = "rgba(3,7,16,.93)";
      c.fillRect(0, 0, FIELD_W, FIELD_H);
      c.textAlign = "center";
      c.fillStyle = "#eff8ff";
      c.font = "800 48px system-ui";
      c.fillText("HOW TO PLAY", FIELD_W / 2, 105);
      const lines = [
        "Clear each wave by breaking every rock through its fragments.",
        "The star pulls bullets and rocks, never your ship. Bend shots around it.",
        "Rocks swallowed by the star return from a field edge; larger rocks are armored.",
        "A hunting saucer can be shot down. The guided torpedo destroys any rock outright.",
        "The torpedo homes in a narrow forward cone and recharges in ten seconds.",
        "ARROWS / WASD steer and thrust     SPACE fire     F torpedo",
        "ENTER confirm     ESC back     P pause     M mute",
      ];
      c.font = "17px system-ui";
      c.fillStyle = "#b5c9df";
      lines.forEach((line, i) => c.fillText(line, FIELD_W / 2, 205 + i * 49));
      c.fillStyle = "#6de3db";
      c.fillText("ENTER OR ESC TO RETURN", FIELD_W / 2, 620);
    }
    c.restore();
  },
};
