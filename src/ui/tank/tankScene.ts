import { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';

import { createTankParts, TANK_HEIGHT, TANK_RADIUS } from './tankParts';
import type { TankSceneColors } from './tankParts';

export type { TankSceneColors } from './tankParts';

export interface TankSceneOptions {
  readonly canvas: HTMLCanvasElement;
  readonly colors: TankSceneColors;
  /** Without motion the water does not ripple and each change is drawn once, at once. */
  readonly animate: boolean;
}

/** Where a height of the tank lands on the canvas, as percentages from the top left corner. */
export interface TankAnchor {
  readonly xPercent: number;
  readonly yPercent: number;
}

export interface TankScene {
  /** Height of the water, 0 (empty) to 1 (full). */
  setLevel(fraction: number): void;
  setRange(range: { readonly low: number; readonly high: number } | null): void;
  /** The heights that carry a ring around the tank: band limits and the reserve. */
  setRings(fractions: readonly number[]): void;
  setColors(colors: TankSceneColors): void;
  resize(width: number, height: number): void;
  anchor(fraction: number, side: 'left' | 'front'): TankAnchor;
  setVisible(visible: boolean): void;
  dispose(): void;
}

const CAMERA_FOV = 20;
const CAMERA_LIFT = 0.24;
const FIT_HALF_WIDTH = 1.5;
const FIT_HALF_HEIGHT = 1.8;
const DEGREES_IN_TURN_HALF = 180;
const HALF = 0.5;
const PERCENT = 100;

const MAX_PIXEL_RATIO = 2;
const MS_PER_SECOND = 1000;
const FRAMES_PER_SECOND = 30;
/** The ripple does not need more; a low-end desktop keeps its fan quiet. */
const FRAME_MS = MS_PER_SECOND / FRAMES_PER_SECOND;
const MAX_DELTA_SECONDS = 0.1;
/** Exponential approach to the level: the first rise is slow, the slider follows closely. */
const RISE_RATE = 3;
const FOLLOW_RATE = 12;
const FOLLOW_AFTER_SECONDS = 1.1;
const SETTLED = 0.0005;

/** Throws when the browser cannot draw WebGL; the caller keeps the flat tank in that case. */
export function createTankScene({ canvas, colors, animate }: TankSceneOptions): TankScene {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setClearAlpha(0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV);
  const tank = createTankParts(colors);
  scene.add(tank.group);

  let currentLevel = 0;
  let targetLevel = 0;
  let elapsed = 0;
  let visible = true;
  let frame = 0;
  let lastFrameAt = 0;
  let disposed = false;

  const draw = (): void => {
    tank.setWaterLevel(currentLevel);
    renderer.render(scene, camera);
  };

  const tick = (now: number): void => {
    if (disposed) {
      return;
    }
    frame = requestAnimationFrame(tick);
    if (now - lastFrameAt < FRAME_MS) {
      return;
    }
    const delta = Math.min((now - lastFrameAt) / MS_PER_SECOND, MAX_DELTA_SECONDS);
    lastFrameAt = now;
    elapsed += delta;
    tank.setTime(elapsed);
    const rate = elapsed < FOLLOW_AFTER_SECONDS ? RISE_RATE : FOLLOW_RATE;
    currentLevel += (targetLevel - currentLevel) * (1 - Math.exp(-rate * delta));
    if (Math.abs(targetLevel - currentLevel) < SETTLED) {
      currentLevel = targetLevel;
    }
    draw();
  };

  const startLoop = (): void => {
    if (animate && frame === 0 && visible && !disposed) {
      lastFrameAt = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  const stopLoop = (): void => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  startLoop();

  return {
    setLevel(fraction) {
      targetLevel = fraction;
      if (!animate) {
        currentLevel = fraction;
        draw();
      }
    },
    setRange(next) {
      tank.setRange(next);
      if (!animate) {
        draw();
      }
    },
    setRings(fractions) {
      tank.setRings(fractions);
      if (!animate) {
        draw();
      }
    },
    setColors(next) {
      tank.setColors(next);
      if (!animate) {
        draw();
      }
    },
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const tangent = Math.tan((CAMERA_FOV * HALF * Math.PI) / DEGREES_IN_TURN_HALF);
      const distance = Math.max(
        FIT_HALF_HEIGHT / tangent,
        FIT_HALF_WIDTH / (tangent * camera.aspect),
      );
      const center = TANK_HEIGHT * HALF;
      camera.position.set(
        0,
        center + distance * Math.sin(CAMERA_LIFT),
        distance * Math.cos(CAMERA_LIFT),
      );
      camera.lookAt(0, center, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      draw();
    },
    anchor(fraction, side) {
      const point = new Vector3(
        side === 'left' ? -TANK_RADIUS : 0,
        fraction * TANK_HEIGHT,
        side === 'left' ? 0 : TANK_RADIUS,
      ).project(camera);
      return {
        xPercent: (point.x + 1) * HALF * PERCENT,
        yPercent: (1 - point.y) * HALF * PERCENT,
      };
    },
    setVisible(next) {
      visible = next;
      if (next) {
        startLoop();
      } else {
        stopLoop();
      }
    },
    dispose() {
      disposed = true;
      stopLoop();
      tank.dispose();
      renderer.dispose();
    },
  };
}
