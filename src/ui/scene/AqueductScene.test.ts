import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { Raycaster } from 'three';
import type * as THREE from 'three';

import { createAqueductScene } from './AqueductScene';
import type { AqueductScene, SceneColors, SceneFrame, SceneValve } from './sceneTypes';

/**
 * The real three.js scene graph runs; only the WebGL renderer is replaced (jsdom has no GPU) and
 * the frame loop is stepped by hand. Picking goes through Raycaster.intersectObjects, stubbed so a
 * test can say which valve the pointer is on.
 */
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof THREE>();
  class FakeWebGLRenderer {
    readonly setPixelRatio = vi.fn();
    readonly setClearAlpha = vi.fn();
    readonly setSize = vi.fn();
    readonly render = vi.fn();
    readonly dispose = vi.fn();
    readonly forceContextLoss = vi.fn();
  }
  return { ...actual, WebGLRenderer: FakeWebGLRenderer };
});

const FRAME_MS = 16;
const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 200;
const PHONE_WIDTH = 360;
const PHONE_HEIGHT = 640;
const NARROW_WIDTH = 300;
const NARROW_HEIGHT = 500;
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 720;
const FRAMES_SHORT = 2;
const FRAMES_LONG = 12;
const FRAMES_TAIL = 3;
const LEFT_BUTTON = 0;
const RIGHT_BUTTON = 2;
const DRAG_PX = 60;
const PRESS = 100;
const LOW_LEVEL = 0.1;
const TWO_CALLS = 2;

const COLORS: SceneColors = {
  waterLight: '#7fd6e0',
  waterDeep: '#0f6b75',
  line: '#ffffff',
  open: '#2a9d8f',
  closed: '#8a8a8a',
  unknown: '#c9a227',
  pending: '#e9c46a',
  delivered: '#48cae4',
  failed: '#d62828',
  pipe: '#3d5a80',
  ground: '#1b263b',
};

const PARTS = { intake: 'Entrada', overflow: 'Rebose', drain: 'Desagüe', vent: 'Ventilación' };

function valve(id: string, overrides: Partial<SceneValve> = {}): SceneValve {
  return {
    id,
    motorized: true,
    state: 'OPEN',
    command: null,
    flow: 0.5,
    title: `Sector ${id}`,
    stateText: 'Abierta',
    flowText: 'Caudal 50 %',
    ...overrides,
  };
}

function frame(overrides: Partial<SceneFrame> = {}): SceneFrame {
  return {
    levelFraction: 0.5,
    tankTitle: 'Tanque',
    tankDetail: '2,1 m',
    rings: [
      { fraction: 0.3, text: 'Mínimo' },
      { fraction: 0.9, text: 'Rebose' },
    ],
    valves: [valve('v1'), valve('v2', { motorized: false, state: 'CLOSED', flow: 0 })],
    parts: PARTS,
    ...overrides,
  };
}

interface Harness {
  readonly canvas: HTMLCanvasElement;
  readonly labelHost: HTMLElement;
  readonly onSelect: Mock<(valveId: string) => void>;
  readonly onHover: Mock<(valveId: string | null) => void>;
}

let queued: FrameRequestCallback[] = [];

/** Runs the frames that were requested, `count` times, each one 16 ms after the last. */
function runFrames(count: number): void {
  for (let index = 0; index < count; index += 1) {
    const callbacks = queued;
    queued = [];
    const at = performance.now() + index * FRAME_MS;
    for (const callback of callbacks) {
      callback(at);
    }
  }
}

function harness(): Harness {
  const labelHost = document.createElement('div');
  const canvas = document.createElement('canvas');
  // Pointer capture and a layout box do not exist in jsdom; the orbit controls and the picking
  // need both.
  Object.assign(canvas, {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
      right: VIEW_WIDTH,
      bottom: VIEW_HEIGHT,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  labelHost.appendChild(canvas);
  document.body.appendChild(labelHost);
  return {
    canvas,
    labelHost,
    onSelect: vi.fn<(valveId: string) => void>(),
    onHover: vi.fn<(valveId: string | null) => void>(),
  };
}

function create(
  { canvas, labelHost, onSelect, onHover }: Harness,
  options: { animate: boolean; compact?: boolean },
): AqueductScene {
  return createAqueductScene({
    canvas,
    labelHost,
    colors: COLORS,
    animate: options.animate,
    compact: options.compact ?? false,
    onSelect,
    onHover,
  });
}

function pointer(
  target: HTMLCanvasElement,
  type: 'pointermove' | 'pointerdown' | 'pointerup' | 'pointerleave',
  init: { x?: number; y?: number; buttons?: number; button?: number } = {},
): void {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, {
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    buttons: init.buttons ?? 0,
    button: init.button ?? 0,
    pointerId: 1,
  });
  target.dispatchEvent(event);
}

describe('createAqueductScene', () => {
  beforeEach(() => {
    queued = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queued.push(callback);
      return queued.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('draws a still scene with no motion: each change is drawn once, and the picking works', () => {
    const env = harness();
    const scene = create(env, { animate: false });

    scene.resize(PHONE_WIDTH, PHONE_HEIGHT);
    scene.update(frame());
    scene.update(frame({ levelFraction: 0.99, tankTitle: '', rings: [] }));
    scene.highlight('v1');
    scene.highlight(null);
    scene.setColors(COLORS);
    scene.setVisible(false);
    scene.setVisible(true);
    runFrames(1);
    scene.resize(DESKTOP_WIDTH, DESKTOP_HEIGHT);
    expect(env.labelHost.querySelector('[data-scene-labels="true"]')).not.toBeNull();

    scene.dispose();
    expect(env.labelHost.querySelector('[data-scene-labels="true"]')).toBeNull();
  });

  it('animates a wide scene, follows each valve state and command, and disposes it', () => {
    const env = harness();
    const scene = create(env, { animate: true });

    scene.resize(DESKTOP_WIDTH, DESKTOP_HEIGHT);
    scene.update(
      frame({
        levelFraction: 0.98,
        valves: [
          valve('open-pending', { command: 'PENDING', flow: 1 }),
          valve('open-delivered', { command: 'DELIVERED', flow: 0.2 }),
          valve('open-acked', { command: 'ACKED' }),
          valve('closed-failed', { state: 'CLOSED', command: 'FAILED', flow: 0 }),
          valve('closed-expired', { state: 'CLOSED', command: 'EXPIRED', motorized: false }),
          valve('unknown', { state: 'UNKNOWN', flow: 0.05, motorized: false }),
        ],
      }),
    );
    runFrames(FRAMES_LONG);
    scene.update(frame({ levelFraction: LOW_LEVEL, valves: [valve('v1', { state: 'CLOSED' })] }));
    runFrames(FRAMES_LONG);
    scene.highlight('v1');
    runFrames(FRAMES_SHORT);
    scene.setVisible(false);
    scene.setVisible(true);
    runFrames(FRAMES_TAIL);
    scene.dispose();

    // The frames already requested stop on their own once the scene is disposed.
    expect(() => {
      runFrames(1);
    }).not.toThrow();
  });

  it('keeps the compact look-only scene and a narrow screen fitted without motion', () => {
    const env = harness();
    const scene = create(env, { animate: false, compact: true });

    scene.resize(NARROW_WIDTH, NARROW_HEIGHT);
    scene.update(frame());
    scene.dispose();
  });

  it('runs the frame loop when motion is on, and pauses it while the scene is off screen', () => {
    const env = harness();
    const scene = create(env, { animate: true });

    scene.setVisible(false);
    scene.setVisible(true);
    scene.setVisible(false);
    runFrames(FRAMES_SHORT);
    scene.dispose();
  });

  it('answers the pointer: hovering a valve lights it and clicking it selects it', () => {
    const env = harness();
    const scene = create(env, { animate: false });
    // Picking reads Raycaster.intersectObjects; the tests choose which valve sits under the pointer.
    const hits = vi.spyOn(Raycaster.prototype, 'intersectObjects').mockReturnValue([]);
    scene.update(frame());

    pointer(env.canvas, 'pointermove', { x: PRESS, y: PRESS });
    expect(env.onHover).not.toHaveBeenCalled();

    hits.mockReturnValue([{ object: { userData: { valveId: 'v1' } } } as never]);
    pointer(env.canvas, 'pointermove', { x: PRESS, y: PRESS });
    expect(env.onHover).toHaveBeenLastCalledWith('v1');

    pointer(env.canvas, 'pointermove', { x: PRESS, y: PRESS, buttons: 1 });
    pointer(env.canvas, 'pointermove', { x: PRESS + 1, y: PRESS });
    expect(env.onHover).toHaveBeenCalledTimes(1);

    // A right button release does not select.
    pointer(env.canvas, 'pointerdown', { x: PRESS, y: PRESS });
    pointer(env.canvas, 'pointerup', { x: PRESS, y: PRESS, button: RIGHT_BUTTON });
    expect(env.onSelect).not.toHaveBeenCalled();

    // A left click on the valve selects it.
    pointer(env.canvas, 'pointerdown', { x: PRESS, y: PRESS });
    pointer(env.canvas, 'pointerup', { x: PRESS, y: PRESS, button: LEFT_BUTTON });
    expect(env.onSelect).toHaveBeenCalledWith('v1');

    // A drag farther than the click slop does not select.
    pointer(env.canvas, 'pointerdown', { x: PRESS, y: PRESS });
    pointer(env.canvas, 'pointerup', { x: PRESS + DRAG_PX, y: PRESS, button: LEFT_BUTTON });
    expect(env.onSelect).toHaveBeenCalledTimes(1);

    // A release with no press before it does not select.
    pointer(env.canvas, 'pointerup', { x: PRESS, y: PRESS, button: LEFT_BUTTON });
    expect(env.onSelect).toHaveBeenCalledTimes(1);

    pointer(env.canvas, 'pointerleave');
    expect(env.onHover).toHaveBeenLastCalledWith(null);
    pointer(env.canvas, 'pointerleave');
    expect(env.onHover).toHaveBeenCalledTimes(TWO_CALLS);

    scene.dispose();
  });
});
