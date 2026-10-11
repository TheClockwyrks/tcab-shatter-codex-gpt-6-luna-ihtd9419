import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { describe, expect, it } from "vitest";
import { game } from "./game";

const makeEngine = async () => {
  const engine = createEngine({
    canvas: createCanvas(1280, 720) as unknown as HTMLCanvasElement,
    width: 1280,
    height: 720,
    game,
    background: "#050812",
    surface: {
      cssWidth: () => 1280,
      cssHeight: () => 720,
      dpr: () => 1,
      events: () => new EventTarget(),
    },
    clock: new ConstantClock(1000 / 120),
  });
  await engine.initialize();
  return engine;
};

describe("Shatter simulation", () => {
  it("starts with a complete title state and a readable debug surface", async () => {
    const engine = await makeEngine();
    const state = engine.state;
    expect(state.screen).toBe("title");
    expect(state.ship.x).toBe(640);
    expect(engine.debug.snapshot(state).torpedoReady).toBe(true);
    expect(engine.debug.menuItemRect(state, 0)).not.toBeNull();
  });

  it("poses entities immutably and assigns distinct ids", async () => {
    const engine = await makeEngine();
    const before = engine.state;
    const rockState = engine.debug.addRock(before, "large", 200, 200);
    const rockId = rockState.rocks[0]!.id;
    const bulletState = engine.debug.addBullet(rockState, 200, 200, 0, 0);
    expect(before.rocks).toHaveLength(0);
    expect(bulletState.bullets[0]!.id).not.toBe(rockId);
    expect(engine.debug.snapshot(bulletState).rocks[0]!.radius).toBe(46);
  });

  it("advances only whole fixed ticks and starts play from the menu", async () => {
    const engine = await makeEngine();
    await engine.advance(1);
    expect(engine.state.simTime).toBeCloseTo(1 / 120);
    await engine.apply((state) => ({ ...state, screen: "playing", wave: 1 }));
    await engine.advance(1);
    expect(engine.state.simTime).toBeCloseTo(2 / 120);
  });
});
