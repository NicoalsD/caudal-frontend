/* eslint-disable @typescript-eslint/no-magic-numbers --
   This file is geometry in world units (1 unit = the tank radius), tuned by eye. Business values
   (levels, flows, states) all arrive through the frame; nothing here decides what is true. */
import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Material, Object3D } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { createTankParts, TANK_HEIGHT, TANK_RADIUS } from '../tank/tankParts';
import type {
  AqueductScene,
  AqueductSceneOptions,
  SceneColors,
  SceneCommandStatus,
  SceneFrame,
  SceneValve,
  SceneValveState,
} from './sceneTypes';

const HALF = 0.5;
const MAX_PIXEL_RATIO = 2;
const MAX_DELTA_SECONDS = 0.1;
const CAMERA_FOV = 38;
const RISE_RATE = 2.6;

/* Pipes. The outlets leave the tank wall at PIPE_HEIGHT, run to PIPE_END and fall to the ground. */
const PIPE_RADIUS = 0.1;
const PIPE_HEIGHT = 0.5;
const PIPE_START = 0.9;
const PIPE_END = 3.8;
const VALVE_DISTANCE = 2.2;
const DROP_LENGTH = PIPE_HEIGHT + 0.02;
const HOUSE_DISTANCE = 4.7;
const MAX_HALF_SPAN = (100 * Math.PI) / 180;
const SPAN_PER_VALVE = (40 * Math.PI) / 180;
const MIN_HALF_SPAN = (24 * Math.PI) / 180;
/* Neighbour labels alternate between two heights and distances so they never sit on each other. */
const LABEL_LOW = 0.5;
const LABEL_HIGH = 2.4;
const LABEL_NEAR = 0.15;
const LABEL_FAR = 0.6;
/* The small scene (look only) comes closer so the tank and the valves fill the card. */
const COMPACT_DISTANCE = 1.15;
const COMPACT_TARGET_Y = 1.9;
const WIDE_ASPECT = 1.5;
/* The full scene starts a little farther so the outer valve labels stay inside the frame. */
const FULL_DISTANCE = 1.12;

/* Particles. */
const OUTLET_PARTICLES = 46;
const INTAKE_PARTICLES = 70;
const FALL_PARTICLES = 40;
const OVERFLOW_PARTICLES = 42;
const FULL_FLOW_SPEED = 2.8;
const INTAKE_SPEED = 2.2;
const PARTICLE_SIZE = 0.13;
const STREAM_EASE = 4;

/* The overflow pipe sits near the rim. */
const OVERFLOW_HEIGHT = 0.96 * TANK_HEIGHT;
const OVERFLOW_ANGLE = (150 * Math.PI) / 180;
const OVERFLOW_OFFSET = 1.65;
const OVERFLOW_START_FRACTION = 0.95;
const OVERFLOW_FULL_FRACTION = 0.985;

/* Valve handles. */
const HANDLE_TURN_CLOSED = Math.PI * 1.25;
const LEVER_TURN_CLOSED = Math.PI * HALF;
const WHEEL_RISE = 0.12;
const HANDLE_EASE = 5;
const HOVER_SCALE = 1.22;
const HIT_RADIUS = 0.6;
const CLICK_SLOP_PX = 6;
const ACKED_FLASH_SECONDS = 3.5;

const INTAKE_PATH = [
  new Vector3(-6.4, 0.3, -3.6),
  new Vector3(-6.2, 2.6, -3.5),
  new Vector3(-5.2, 4.3, -3),
  new Vector3(-2.4, 4.6, -1.4),
  new Vector3(-0.35, 4.3, -0.15),
  new Vector3(0, 3.95, 0),
];
const INTAKE_TIP = INTAKE_PATH[INTAKE_PATH.length - 1] ?? new Vector3(0, 3.95, 0);

const GROUND_VERTEX = /* glsl */ `
  varying vec2 vPlane;
  void main() {
    vPlane = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* A faint grid that fades with the distance, and a ripple that leaves the tank every few seconds. */
const GROUND_FRAGMENT = /* glsl */ `
  uniform vec3 uGround;
  uniform vec3 uLine;
  uniform float uTime;
  varying vec2 vPlane;
  void main() {
    float d = length(vPlane);
    vec2 cell = abs(fract(vPlane * 0.5) - 0.5);
    float grid = 1.0 - smoothstep(0.0, 0.02, min(cell.x, cell.y));
    float fade = 1.0 - smoothstep(3.0, 14.0, d);
    float wave = (1.0 - smoothstep(0.0, 0.04, abs(fract(d * 0.14 - uTime * 0.1) - 0.5))) * fade;
    float alpha = (0.55 + grid * 0.15 + wave * 0.12) * fade;
    vec3 color = mix(uGround, uLine, grid * 0.25 + wave * 0.2);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

interface Palette {
  readonly open: Color;
  readonly closed: Color;
  readonly unknown: Color;
  readonly pending: Color;
  readonly delivered: Color;
  readonly failed: Color;
  readonly pipe: Color;
  readonly ground: Color;
  readonly line: Color;
}

function paletteOf(colors: SceneColors): Palette {
  return {
    open: new Color(colors.open),
    closed: new Color(colors.closed),
    unknown: new Color(colors.unknown),
    pending: new Color(colors.pending),
    delivered: new Color(colors.delivered),
    failed: new Color(colors.failed),
    pipe: new Color(colors.pipe),
    ground: new Color(colors.ground),
    line: new Color(colors.line),
  };
}

function stateColor(palette: Palette, state: SceneValveState): Color {
  if (state === 'OPEN') {
    return palette.open;
  }
  return state === 'CLOSED' ? palette.closed : palette.unknown;
}

function commandColor(palette: Palette, command: SceneCommandStatus): Color {
  switch (command) {
    case 'PENDING':
      return palette.pending;
    case 'DELIVERED':
      return palette.delivered;
    case 'ACKED':
      return palette.open;
    default:
      return palette.failed;
  }
}

function disposeTree(root: Object3D): void {
  root.traverse((node) => {
    if (node instanceof Mesh || node instanceof Points) {
      (node.geometry as BufferGeometry).dispose();
      const material = node.material as Material | Material[];
      for (const item of Array.isArray(material) ? material : [material]) {
        item.dispose();
      }
    }
  });
}

/** A soft round sprite for the particles. */
function makeSprite(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context !== null) {
    const gradient = context.createRadialGradient(
      size * HALF,
      size * HALF,
      0,
      size * HALF,
      size * HALF,
      size * HALF,
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

/** Particles that follow a path. `speed` is in path lengths per second and eases to its target. */
class Stream {
  readonly points: Points;
  private readonly positions: Float32Array;
  private readonly phases: Float32Array;
  private readonly jitter: Float32Array;
  private readonly material: PointsMaterial;
  speed = 0;
  intensity = 0;
  targetSpeed = 0;
  targetIntensity = 0;

  constructor(
    private readonly count: number,
    sprite: CanvasTexture,
    color: Color,
    private readonly sample: (t: number, out: Vector3) => void,
    size = PARTICLE_SIZE,
  ) {
    this.positions = new Float32Array(count * 3);
    this.phases = new Float32Array(count);
    this.jitter = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      this.phases[index] = index / count;
      this.jitter[index * 3] = (Math.random() - HALF) * 2;
      this.jitter[index * 3 + 1] = (Math.random() - HALF) * 2;
      this.jitter[index * 3 + 2] = Math.random() - HALF;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.material = new PointsMaterial({
      color,
      size,
      map: sprite,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.writePositions();
  }

  setColor(color: Color): void {
    this.material.color.copy(color);
  }

  step(delta: number, animate: boolean): void {
    const ease = 1 - Math.exp(-STREAM_EASE * delta);
    this.speed += (this.targetSpeed - this.speed) * ease;
    this.intensity += (this.targetIntensity - this.intensity) * ease;
    if (!animate) {
      this.speed = this.targetSpeed;
      this.intensity = this.targetIntensity;
    }
    this.material.opacity = Math.min(1, this.intensity);
    this.points.visible = this.intensity > 0.01;
    if (animate && this.speed > 0.001) {
      for (let index = 0; index < this.count; index += 1) {
        const next = (this.phases[index] ?? 0) + delta * this.speed;
        this.phases[index] = next - Math.floor(next);
      }
    }
    this.writePositions();
  }

  private writePositions(): void {
    const out = new Vector3();
    for (let index = 0; index < this.count; index += 1) {
      this.sample(this.phases[index] ?? 0, out);
      this.positions[index * 3] = out.x + (this.jitter[index * 3] ?? 0) * 0.035;
      this.positions[index * 3 + 1] = out.y + (this.jitter[index * 3 + 1] ?? 0) * 0.035;
      this.positions[index * 3 + 2] = out.z + (this.jitter[index * 3 + 2] ?? 0) * 0.035;
    }
    this.points.geometry.attributes.position!.needsUpdate = true;
  }
}

function pipeMaterial(palette: Palette): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: palette.pipe,
    transparent: true,
    opacity: 0.38,
    roughness: 0.25,
    metalness: 0.4,
    depthWrite: false,
  });
}

function makeLabel(kind: string): { object: CSS2DObject; element: HTMLDivElement } {
  const element = document.createElement('div');
  element.dataset.sceneLabel = kind;
  return { object: new CSS2DObject(element), element };
}

/* Labels on screen: the tank and the valves always show; rings and parts give way. */
const LABEL_RANK: Readonly<Record<string, number>> = { tank: 0, valve: 1, ring: 2, part: 3 };
const LABEL_MUST_SHOW = 1;
const LABEL_GAP = 4;
const LABEL_EDGE = 6;
const LABEL_MEASURE_EVERY = 30;

interface LabelBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function boxesTouch(a: LabelBox, b: LabelBox): boolean {
  return (
    a.left < b.left + b.width + LABEL_GAP &&
    b.left < a.left + a.width + LABEL_GAP &&
    a.top < b.top + b.height + LABEL_GAP &&
    b.top < a.top + a.height + LABEL_GAP
  );
}

/**
 * Keeps the labels readable from any angle. CSS2DRenderer centers each label on its 3D anchor, so
 * from some angles they pile up or leave the frame. Each frame this works on the projected boxes
 * (no layout reads: the sizes are cached): a valve or the tank is pushed off whatever it covers and
 * kept inside the frame; a ring or part label that would cover something simply fades out.
 */
class LabelDeclutter {
  private readonly sizes = new Map<HTMLElement, { width: number; height: number }>();
  private readonly anchor = new Vector3();
  private framesToMeasure = 0;

  /** Sizes are read again soon: after a text change or a resize. */
  invalidate(): void {
    this.framesToMeasure = 0;
  }

  run(
    labels: readonly { object: CSS2DObject; element: HTMLElement }[],
    camera: PerspectiveCamera,
    width: number,
    height: number,
  ): void {
    if (this.framesToMeasure <= 0) {
      this.sizes.clear();
      for (const { element } of labels) {
        this.sizes.set(element, { width: element.offsetWidth, height: element.offsetHeight });
      }
      this.framesToMeasure = LABEL_MEASURE_EVERY;
    }
    this.framesToMeasure -= 1;

    const ranked = labels
      .map((label) => ({
        ...label,
        rank: LABEL_RANK[label.element.dataset.sceneLabel ?? ''] ?? LABEL_MUST_SHOW,
      }))
      .sort((a, b) => a.rank - b.rank);
    const placed: LabelBox[] = [];
    for (const { object, element, rank } of ranked) {
      const size = this.sizes.get(element);
      this.anchor.setFromMatrixPosition(object.matrixWorld).project(camera);
      if (size === undefined || size.width === 0 || Math.abs(this.anchor.z) > 1) {
        continue;
      }
      const box: LabelBox = {
        left: (this.anchor.x * 0.5 + 0.5) * width - size.width * 0.5,
        top: (-this.anchor.y * 0.5 + 0.5) * height - size.height * 0.5,
        width: size.width,
        height: size.height,
      };
      const origin = { left: box.left, top: box.top };
      const clamp = (): void => {
        box.left = Math.min(Math.max(box.left, LABEL_EDGE), width - LABEL_EDGE - box.width);
        box.top = Math.min(Math.max(box.top, LABEL_EDGE), height - LABEL_EDGE - box.height);
      };
      let hidden = false;
      if (rank > LABEL_MUST_SHOW) {
        hidden =
          box.left < 0 ||
          box.top < 0 ||
          box.left + box.width > width ||
          box.top + box.height > height ||
          placed.some((other) => boxesTouch(box, other));
      } else {
        clamp();
        if (placed.some((other) => boxesTouch(box, other))) {
          // Try the free spots right above, below and beside each label already placed, and take
          // the one closest to the anchor.
          const home = { left: box.left, top: box.top };
          let best: { left: number; top: number; cost: number } | null = null;
          for (const other of placed) {
            const spots = [
              { left: home.left, top: other.top + other.height + LABEL_GAP },
              { left: home.left, top: other.top - LABEL_GAP - box.height },
              { left: other.left + other.width + LABEL_GAP, top: home.top },
              { left: other.left - LABEL_GAP - box.width, top: home.top },
            ];
            for (const spot of spots) {
              box.left = spot.left;
              box.top = spot.top;
              clamp();
              const cost = Math.abs(box.left - home.left) + Math.abs(box.top - home.top);
              if (
                (best === null || cost < best.cost) &&
                !placed.some((candidate) => boxesTouch(box, candidate))
              ) {
                best = { left: box.left, top: box.top, cost };
              }
            }
          }
          box.left = best?.left ?? home.left;
          box.top = best?.top ?? home.top;
        }
      }
      if (!hidden) {
        placed.push(box);
      }
      const shift = hidden
        ? ''
        : `${(box.left - origin.left).toFixed(1)}px ${(box.top - origin.top).toFixed(1)}px`;
      if (element.style.translate !== shift) {
        element.style.translate = shift;
      }
      const clash = String(hidden);
      if (element.dataset.clash !== clash) {
        element.dataset.clash = clash;
      }
    }
  }
}

function setLines(element: HTMLElement, lines: readonly string[]): void {
  while (element.children.length < lines.length) {
    element.appendChild(document.createElement('span'));
  }
  while (element.children.length > lines.length) {
    element.lastElementChild?.remove();
  }
  lines.forEach((line, index) => {
    const child = element.children[index];
    if (child !== undefined && child.textContent !== line) {
      child.textContent = line;
    }
  });
}

/** One valve with its pipe, handle, halo, particles and label. */
class ValveRig {
  readonly root = new Group();
  readonly hit: Mesh;
  readonly label: { object: CSS2DObject; element: HTMLDivElement };
  private readonly valveGroup = new Group();
  private readonly handle = new Group();
  private readonly bodyMaterial: MeshStandardMaterial;
  private readonly handleMaterial: MeshStandardMaterial;
  private readonly haloMaterial: MeshBasicMaterial;
  private readonly halo: Mesh;
  private readonly fillMaterial: MeshBasicMaterial;
  readonly stream: Stream;
  private handleAngle = 0;
  private rise = 0;
  private hover = 0;
  private hoverTarget = 0;
  private ackedAt = -Infinity;
  private lastCommand: SceneCommandStatus | null = null;
  private pendingFlash = 0;
  private data: SceneValve;
  private first = true;

  constructor(
    data: SceneValve,
    sprite: CanvasTexture,
    private palette: Palette,
    waterLight: Color,
    private readonly animate: boolean,
  ) {
    this.data = data;
    this.root.position.y = PIPE_HEIGHT;

    const shell = pipeMaterial(palette);
    const pipe = new Mesh(
      new CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, PIPE_END - PIPE_START, 20, 1, true),
      shell,
    );
    pipe.rotation.x = Math.PI * HALF;
    pipe.position.z = (PIPE_END + PIPE_START) * HALF;
    pipe.renderOrder = 1;
    const drop = new Mesh(
      new CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, DROP_LENGTH, 20, 1, true),
      shell,
    );
    drop.position.set(0, -DROP_LENGTH * HALF, PIPE_END);
    drop.renderOrder = 1;
    const elbow = new Mesh(new SphereGeometry(PIPE_RADIUS * 1.02, 20, 14), shell);
    elbow.position.z = PIPE_END;

    // Water inside the pipe: a thin core that shows only while the valve lets water through.
    this.fillMaterial = new MeshBasicMaterial({
      color: waterLight,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const fill = new Mesh(
      new CylinderGeometry(PIPE_RADIUS * 0.72, PIPE_RADIUS * 0.72, PIPE_END - PIPE_START, 16, 1),
      this.fillMaterial,
    );
    fill.rotation.x = Math.PI * HALF;
    fill.position.z = (PIPE_END + PIPE_START) * HALF;

    // The end of the line: a basin on the ground and a little cluster of houses behind it.
    const basin = new Mesh(
      new CylinderGeometry(0.34, 0.28, 0.1, 24),
      new MeshStandardMaterial({ color: palette.pipe, roughness: 0.6, metalness: 0.3 }),
    );
    basin.position.set(0, -PIPE_HEIGHT + 0.05, PIPE_END);
    const houses = new Group();
    for (const [dx, dz, scale] of [
      [-0.55, 0, 1],
      [0.5, 0.35, 0.85],
      [0, 0.85, 0.7],
    ] as const) {
      const house = new Group();
      const walls = new Mesh(
        new BoxGeometry(0.5, 0.36, 0.44),
        new MeshStandardMaterial({
          color: palette.line,
          roughness: 0.8,
          transparent: true,
          opacity: 0.55,
        }),
      );
      walls.position.y = 0.18;
      const roof = new Mesh(
        new ConeGeometry(0.42, 0.26, 4),
        new MeshStandardMaterial({
          color: palette.closed,
          roughness: 0.7,
          transparent: true,
          opacity: 0.7,
        }),
      );
      roof.rotation.y = Math.PI * 0.25;
      roof.position.y = 0.49;
      house.add(walls, roof);
      house.scale.setScalar(scale);
      house.position.set(dx, 0, dz);
      houses.add(house);
    }
    houses.position.set(0, -PIPE_HEIGHT, HOUSE_DISTANCE);

    // The valve: flanges and a body on the pipe, a stem, and a wheel (motorized) or a lever.
    this.bodyMaterial = new MeshStandardMaterial({
      color: palette.unknown,
      roughness: 0.35,
      metalness: 0.55,
      emissive: palette.unknown,
      emissiveIntensity: 0.12,
    });
    this.handleMaterial = new MeshStandardMaterial({
      color: palette.unknown,
      roughness: 0.4,
      metalness: 0.35,
      emissive: palette.unknown,
      emissiveIntensity: 0.2,
    });
    const body = new Mesh(new SphereGeometry(0.22, 24, 16), this.bodyMaterial);
    const flangeGeometry = new CylinderGeometry(0.16, 0.16, 0.06, 20);
    const flangeA = new Mesh(flangeGeometry, this.bodyMaterial);
    flangeA.rotation.x = Math.PI * HALF;
    flangeA.position.z = -0.26;
    const flangeB = flangeA.clone();
    flangeB.position.z = 0.26;
    const stem = new Mesh(new CylinderGeometry(0.035, 0.035, 0.36, 12), this.bodyMaterial);
    stem.position.y = 0.3;

    if (data.motorized) {
      const actuator = new Mesh(new BoxGeometry(0.3, 0.2, 0.3), this.bodyMaterial);
      actuator.position.y = 0.5;
      this.valveGroup.add(actuator);
      const rim = new Mesh(new TorusGeometry(0.26, 0.032, 10, 36), this.handleMaterial);
      rim.rotation.x = Math.PI * HALF;
      this.handle.add(rim);
      for (let spoke = 0; spoke < 4; spoke += 1) {
        const bar = new Mesh(new BoxGeometry(0.52, 0.03, 0.04), this.handleMaterial);
        bar.rotation.y = (spoke * Math.PI) / 4;
        this.handle.add(bar);
      }
      const hub = new Mesh(new CylinderGeometry(0.05, 0.05, 0.07, 12), this.handleMaterial);
      this.handle.add(hub);
      this.handle.position.y = 0.72;
    } else {
      const arm = new Mesh(new BoxGeometry(0.07, 0.06, 0.62), this.handleMaterial);
      arm.position.z = 0.26;
      const knob = new Mesh(new SphereGeometry(0.06, 12, 10), this.handleMaterial);
      knob.position.z = 0.56;
      this.handle.add(arm, knob);
      this.handle.position.y = 0.5;
    }
    this.valveGroup.add(body, flangeA, flangeB, stem, this.handle);
    this.valveGroup.position.z = VALVE_DISTANCE;

    // A ring around the pipe that pulses with the command in course.
    this.haloMaterial = new MeshBasicMaterial({
      color: palette.pending,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    this.halo = new Mesh(new TorusGeometry(0.36, 0.028, 10, 48), this.haloMaterial);
    this.halo.renderOrder = 6;
    this.valveGroup.add(this.halo);

    this.hit = new Mesh(
      new SphereGeometry(HIT_RADIUS, 12, 8),
      new MeshBasicMaterial({ visible: false }),
    );
    this.hit.position.set(0, 0.3, VALVE_DISTANCE);
    this.hit.userData.valveId = data.id;

    this.stream = new Stream(
      OUTLET_PARTICLES,
      sprite,
      waterLight,
      (t, out) => {
        const along = t * (PIPE_END - PIPE_START + DROP_LENGTH);
        if (along <= PIPE_END - PIPE_START) {
          out.set(0, 0, PIPE_START + along);
        } else {
          const fall = (along - (PIPE_END - PIPE_START)) / DROP_LENGTH;
          out.set(0, -DROP_LENGTH * fall * fall, PIPE_END);
        }
      },
      0.11,
    );

    this.label = makeLabel('valve');
    this.setSlot(0);

    this.root.add(
      pipe,
      drop,
      elbow,
      fill,
      basin,
      houses,
      this.valveGroup,
      this.hit,
      this.stream.points,
      this.label.object,
    );
    this.apply(data, 0);
  }

  /** Neighbouring valves alternate the height and distance of their label. */
  setSlot(slot: number): void {
    const high = slot % 2 === 1;
    this.label.object.position.set(
      0,
      high ? LABEL_HIGH : LABEL_LOW,
      PIPE_END + (high ? LABEL_FAR : LABEL_NEAR),
    );
  }

  setPalette(palette: Palette, waterLight: Color): void {
    this.palette = palette;
    this.stream.setColor(waterLight);
    this.fillMaterial.color.copy(waterLight);
  }

  setHover(active: boolean): void {
    this.hoverTarget = active ? 1 : 0;
    this.label.element.dataset.hover = String(active);
  }

  /** Takes the new facts of the valve; the animation catches up on the next frames. */
  apply(next: SceneValve, now: number): void {
    if (next.command === 'ACKED' && this.lastCommand !== 'ACKED' && !this.first) {
      this.ackedAt = now;
    }
    this.lastCommand = next.command;
    this.data = next;
    this.stream.targetIntensity = next.flow > 0 ? 1 : 0;
    this.stream.targetSpeed = (next.flow * FULL_FLOW_SPEED) / (PIPE_END - PIPE_START + DROP_LENGTH);
    this.label.element.dataset.state = next.state.toLowerCase();
    this.label.element.dataset.command = next.command?.toLowerCase() ?? '';
    setLines(
      this.label.element,
      [next.title, next.stateText, next.flowText].filter((line) => line !== ''),
    );
    if (this.first) {
      this.handleAngle = this.targetHandle();
      this.rise = this.targetRise();
      this.first = false;
    }
  }

  private targetHandle(): number {
    const closed = this.data.state !== 'OPEN';
    if (this.data.motorized) {
      return closed ? HANDLE_TURN_CLOSED : 0;
    }
    return closed ? LEVER_TURN_CLOSED : 0;
  }

  private targetRise(): number {
    return this.data.motorized && this.data.state === 'OPEN' ? WHEEL_RISE : 0;
  }

  step(delta: number, elapsed: number): void {
    const ease = 1 - Math.exp(-HANDLE_EASE * delta);
    this.handleAngle += (this.targetHandle() - this.handleAngle) * ease;
    this.rise += (this.targetRise() - this.rise) * ease;
    this.hover += (this.hoverTarget - this.hover) * (1 - Math.exp(-12 * delta));
    this.handle.rotation.y = this.handleAngle;
    this.handle.position.y = (this.data.motorized ? 0.72 : 0.5) + this.rise;
    this.valveGroup.scale.setScalar(1 + (HOVER_SCALE - 1) * this.hover);

    const base = stateColor(this.palette, this.data.state);
    this.bodyMaterial.color.lerp(base, ease);
    this.bodyMaterial.emissive.lerp(base, ease);
    this.handleMaterial.color.lerp(base, ease);
    this.handleMaterial.emissive.lerp(base, ease);
    this.bodyMaterial.emissiveIntensity = 0.12 + 0.35 * this.hover;
    this.handleMaterial.emissiveIntensity = 0.25 + 0.6 * this.hover;

    this.fillMaterial.opacity = Math.min(0.5, this.stream.intensity * 0.5);

    // The halo: amber and slow while the command waits, blue and quick once delivered, red when it
    // fails, and a green flash for a few seconds after the valve confirms.
    const sinceAck = elapsed - this.ackedAt;
    let command: SceneCommandStatus | null = this.data.command;
    let pulse = 0;
    if (command === 'PENDING') {
      pulse = 0.5 + 0.5 * Math.sin(elapsed * 4);
    } else if (command === 'DELIVERED') {
      pulse = 0.5 + 0.5 * Math.sin(elapsed * 9);
    } else if (command === 'FAILED' || command === 'EXPIRED') {
      pulse = Math.sin(elapsed * 6) > 0 ? 1 : 0.25;
    } else if (command === 'ACKED' && sinceAck < ACKED_FLASH_SECONDS) {
      pulse = 1 - sinceAck / ACKED_FLASH_SECONDS;
    } else {
      command = null;
    }
    if (command !== null) {
      this.haloMaterial.color.copy(commandColor(this.palette, command));
      this.halo.scale.setScalar(1 + 0.25 * pulse);
    }
    this.haloMaterial.opacity = command === null ? 0 : 0.25 + 0.7 * pulse;
    this.halo.visible = command !== null;
    this.pendingFlash = pulse;
    this.stream.step(delta, this.animate);
  }

  get flash(): number {
    return this.pendingFlash;
  }

  dispose(): void {
    disposeTree(this.root);
    this.label.element.remove();
  }
}

/** Throws when the browser cannot draw WebGL; the caller keeps the lists and says so. */
export function createAqueductScene(options: AqueductSceneOptions): AqueductScene {
  const { canvas, labelHost, animate, compact = false } = options;
  let palette = paletteOf(options.colors);
  const waterLight = new Color(options.colors.waterLight);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setClearAlpha(0);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.dataset.sceneLabels = 'true';
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.inset = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelHost.appendChild(labelRenderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 80);
  camera.position.set(5.4, 4.2, 8.6);

  scene.add(new HemisphereLight(0xdff7f5, 0x0b3333, 1.1));
  scene.add(new AmbientLight(0xffffff, 0.35));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(5, 9, 6);
  scene.add(sun);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, compact ? COMPACT_TARGET_Y : 1.3, 0.9);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 24;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = animate;
  controls.autoRotateSpeed = 0.45;
  controls.update();
  const stopAutoRotate = (): void => {
    controls.autoRotate = false;
  };
  controls.addEventListener('start', stopAutoRotate);

  const sprite = makeSprite();

  // Ground.
  const groundUniforms = {
    uGround: { value: palette.ground.clone() },
    uLine: { value: palette.line.clone() },
    uTime: { value: 0 },
  };
  const ground = new Mesh(
    new CircleGeometry(16, 96),
    new ShaderMaterial({
      vertexShader: GROUND_VERTEX,
      fragmentShader: GROUND_FRAGMENT,
      uniforms: groundUniforms,
      transparent: true,
      depthWrite: false,
    }),
  );
  ground.rotation.x = -Math.PI * HALF;
  ground.position.y = -PIPE_HEIGHT - 0.01;
  ground.renderOrder = -1;
  scene.add(ground);

  // Tank, on a plinth that reaches the ground.
  const tank = createTankParts({
    waterLight: options.colors.waterLight,
    waterDeep: options.colors.waterDeep,
    line: options.colors.line,
  });
  const plinthMaterial = new MeshStandardMaterial({
    color: palette.pipe,
    roughness: 0.7,
    metalness: 0.2,
    transparent: true,
    opacity: 0.55,
  });
  const plinth = new Mesh(
    new CylinderGeometry(TANK_RADIUS * 1.22, TANK_RADIUS * 1.3, PIPE_HEIGHT, 64),
    plinthMaterial,
  );
  plinth.position.y = -PIPE_HEIGHT * HALF - 0.005;
  // The roof: a see-through lid with an inspection hatch and the vent (an upside-down U).
  const lid = new Mesh(
    new CircleGeometry(TANK_RADIUS, 64),
    new MeshBasicMaterial({
      color: palette.line,
      transparent: true,
      opacity: 0.06,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  lid.rotation.x = -Math.PI * HALF;
  lid.position.y = TANK_HEIGHT;
  const hatch = new Mesh(
    new CylinderGeometry(0.22, 0.22, 0.07, 24),
    new MeshStandardMaterial({ color: palette.pipe, roughness: 0.4, metalness: 0.5 }),
  );
  hatch.position.set(-0.5, TANK_HEIGHT + 0.03, 0.4);
  const ventPath = new CatmullRomCurve3([
    new Vector3(0.55, TANK_HEIGHT, -0.35),
    new Vector3(0.55, TANK_HEIGHT + 0.38, -0.35),
    new Vector3(0.78, TANK_HEIGHT + 0.52, -0.35),
    new Vector3(1.0, TANK_HEIGHT + 0.38, -0.35),
    new Vector3(1.0, TANK_HEIGHT + 0.2, -0.35),
  ]);
  const vent = new Mesh(
    new TubeGeometry(ventPath, 24, 0.05, 10),
    new MeshStandardMaterial({ color: palette.pipe, roughness: 0.4, metalness: 0.5 }),
  );

  // Intake: a pipe from the spring, ending above the tank; water falls from the tip.
  const intakeCurve = new CatmullRomCurve3(INTAKE_PATH);
  const intakeShell = pipeMaterial(palette);
  const intakePipe = new Mesh(new TubeGeometry(intakeCurve, 80, 0.11, 14), intakeShell);
  intakePipe.renderOrder = 1;
  const intakeStream = new Stream(
    INTAKE_PARTICLES,
    sprite,
    waterLight,
    (t, out) => {
      intakeCurve.getPointAt(t, out);
    },
    0.12,
  );
  intakeStream.targetSpeed = INTAKE_SPEED / intakeCurve.getLength();
  intakeStream.targetIntensity = 1;
  let surfaceY = 0;
  const fallStream = new Stream(
    FALL_PARTICLES,
    sprite,
    waterLight,
    (t, out) => {
      const drop = Math.max(0.05, INTAKE_TIP.y - surfaceY);
      out.set(INTAKE_TIP.x, INTAKE_TIP.y - drop * t * t, INTAKE_TIP.z);
    },
    0.13,
  );
  fallStream.targetSpeed = 0.85;
  fallStream.targetIntensity = 1;
  const splashMaterial = new MeshBasicMaterial({
    color: waterLight,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const splash = new Mesh(new RingGeometry(0.1, 0.13, 40), splashMaterial);
  splash.rotation.x = -Math.PI * HALF;

  // Overflow: a side pipe near the rim that runs only when the tank is full.
  const overflow = new Group();
  overflow.rotation.y = OVERFLOW_ANGLE;
  const overflowShell = pipeMaterial(palette);
  const overflowOut = new Mesh(
    new CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, OVERFLOW_OFFSET - PIPE_START + 0.1, 20, 1, true),
    overflowShell,
  );
  overflowOut.rotation.x = Math.PI * HALF;
  overflowOut.position.set(0, OVERFLOW_HEIGHT, (OVERFLOW_OFFSET + PIPE_START) * HALF);
  const overflowDown = new Mesh(
    new CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, OVERFLOW_HEIGHT + PIPE_HEIGHT, 20, 1, true),
    overflowShell,
  );
  overflowDown.position.set(0, (OVERFLOW_HEIGHT - PIPE_HEIGHT) * HALF, OVERFLOW_OFFSET);
  const overflowElbow = new Mesh(new SphereGeometry(PIPE_RADIUS * 1.02, 16, 12), overflowShell);
  overflowElbow.position.set(0, OVERFLOW_HEIGHT, OVERFLOW_OFFSET);
  const overflowStream = new Stream(
    OVERFLOW_PARTICLES,
    sprite,
    waterLight,
    (t, out) => {
      const run = OVERFLOW_OFFSET - PIPE_START;
      const total = run + OVERFLOW_HEIGHT + PIPE_HEIGHT;
      const along = t * total;
      if (along <= run) {
        out.set(0, OVERFLOW_HEIGHT, PIPE_START + along);
      } else {
        const fall = (along - run) / (OVERFLOW_HEIGHT + PIPE_HEIGHT);
        out.set(
          0,
          OVERFLOW_HEIGHT - (OVERFLOW_HEIGHT + PIPE_HEIGHT) * fall * fall,
          OVERFLOW_OFFSET,
        );
      }
    },
    0.12,
  );
  overflow.add(overflowOut, overflowDown, overflowElbow, overflowStream.points);

  // Drain: a short stub at the bottom with a red wheel. It is part of the picture, not a control.
  const drain = new Group();
  drain.rotation.y = -Math.PI * 0.62;
  const drainPipe = new Mesh(
    new CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, 1.1, 18, 1, true),
    pipeMaterial(palette),
  );
  drainPipe.rotation.x = Math.PI * HALF;
  drainPipe.position.set(0, 0.22, 1.45);
  const drainWheel = new Mesh(
    new TorusGeometry(0.2, 0.03, 10, 32),
    new MeshStandardMaterial({
      color: palette.failed,
      roughness: 0.4,
      metalness: 0.3,
      emissive: palette.failed,
      emissiveIntensity: 0.2,
    }),
  );
  drainWheel.rotation.x = Math.PI * HALF;
  drainWheel.position.set(0, 0.55, 1.6);
  const drainStem = new Mesh(
    new CylinderGeometry(0.03, 0.03, 0.32, 10),
    new MeshStandardMaterial({ color: palette.pipe, metalness: 0.5, roughness: 0.4 }),
  );
  drainStem.position.set(0, 0.38, 1.6);
  drain.add(drainPipe, drainWheel, drainStem);

  // Static labels for the parts of the tank, and the rings of the bands.
  const partLabels = {
    intake: makeLabel('part'),
    overflow: makeLabel('part'),
    drain: makeLabel('part'),
    vent: makeLabel('part'),
  };
  partLabels.intake.object.position.set(-5.2, 4.8, -3);
  partLabels.overflow.object.position.set(
    Math.sin(OVERFLOW_ANGLE) * OVERFLOW_OFFSET,
    OVERFLOW_HEIGHT + 0.3,
    Math.cos(OVERFLOW_ANGLE) * OVERFLOW_OFFSET,
  );
  partLabels.drain.object.position.set(
    Math.sin(-Math.PI * 0.62) * 1.6,
    0.95,
    Math.cos(-Math.PI * 0.62) * 1.6,
  );
  partLabels.vent.object.position.set(0.8, TANK_HEIGHT + 0.75, -0.35);
  const tankLabel = makeLabel('tank');
  const ringLabels = new Group();

  const world = new Group();
  world.add(
    plinth,
    tank.group,
    lid,
    hatch,
    vent,
    intakePipe,
    intakeStream.points,
    fallStream.points,
    splash,
    overflow,
    drain,
    ringLabels,
    tankLabel.object,
    partLabels.intake.object,
    partLabels.overflow.object,
    partLabels.drain.object,
    partLabels.vent.object,
  );
  scene.add(world);

  // State.
  const rigs = new Map<string, ValveRig>();
  let layoutKey = '';
  let ringKey = '';
  let levelTarget = 0;
  let level = 0;
  let elapsed = 0;
  let visible = true;
  let frameHandle = 0;
  let lastAt = 0;
  let disposed = false;
  let firstSize = true;
  let hoveredId: string | null = null;
  let highlightedId: string | null = null;
  let renderQueued = false;
  const declutter = new LabelDeclutter();
  let viewWidth = 0;
  let viewHeight = 0;

  const applyHover = (): void => {
    const target = hoveredId ?? highlightedId;
    for (const [id, rig] of rigs) {
      rig.setHover(id === target);
    }
    canvas.style.cursor = hoveredId === null ? '' : 'pointer';
  };

  const layout = (valves: readonly SceneValve[]): void => {
    const count = valves.length;
    const half = Math.min(MAX_HALF_SPAN, Math.max(MIN_HALF_SPAN, SPAN_PER_VALVE * count * HALF));
    valves.forEach((valve, index) => {
      const rig = rigs.get(valve.id);
      if (rig === undefined) {
        return;
      }
      const t = count === 1 ? 0 : (index / (count - 1)) * 2 - 1;
      rig.root.rotation.y = t * half;
      rig.setSlot(index);
    });
  };

  const draw = (): void => {
    renderQueued = false;
    tank.setWaterLevel(level);
    surfaceY = level * TANK_HEIGHT;
    splash.position.set(INTAKE_TIP.x, surfaceY + 0.01, INTAKE_TIP.z);
    const wave = (elapsed * 0.9) % 1;
    splash.scale.setScalar(1 + wave * 3.2);
    splashMaterial.opacity = 0.6 * (1 - wave);
    tankLabel.object.position.set(-TANK_RADIUS - 0.3, TANK_HEIGHT * 0.5 + 0.9, 0);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    declutter.run(
      [
        tankLabel,
        ...[...rigs.values()].map((rig) => rig.label),
        ...(ringLabels.children as CSS2DObject[]).map((object) => ({
          object,
          element: object.element,
        })),
        ...Object.values(partLabels),
      ],
      camera,
      viewWidth,
      viewHeight,
    );
  };

  const requestDraw = (): void => {
    if (!animate && !renderQueued && !disposed) {
      renderQueued = true;
      requestAnimationFrame(draw);
    }
  };

  const tick = (now: number): void => {
    if (disposed) {
      return;
    }
    frameHandle = requestAnimationFrame(tick);
    const delta = Math.min((now - lastAt) / 1000, MAX_DELTA_SECONDS);
    lastAt = now;
    elapsed += delta;
    tank.setTime(elapsed);
    groundUniforms.uTime.value = elapsed;
    level += (levelTarget - level) * (1 - Math.exp(-RISE_RATE * delta));
    if (Math.abs(levelTarget - level) < 0.0004) {
      level = levelTarget;
    }
    const spill = Math.min(
      1,
      Math.max(
        0,
        (level - OVERFLOW_START_FRACTION) / (OVERFLOW_FULL_FRACTION - OVERFLOW_START_FRACTION),
      ),
    );
    overflowStream.targetIntensity = spill;
    overflowStream.targetSpeed =
      (spill * 2.4) / (OVERFLOW_OFFSET - PIPE_START + OVERFLOW_HEIGHT + PIPE_HEIGHT);
    intakeStream.step(delta, true);
    fallStream.step(delta, true);
    overflowStream.step(delta, true);
    for (const rig of rigs.values()) {
      rig.step(delta, elapsed);
    }
    draw();
  };

  const start = (): void => {
    if (animate && frameHandle === 0 && visible && !disposed) {
      lastAt = performance.now();
      frameHandle = requestAnimationFrame(tick);
    }
  };
  const stop = (): void => {
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  };

  // Static drawing (no motion): the streams sit still, the handles jump to their place.
  const settle = (): void => {
    if (animate) {
      return;
    }
    level = levelTarget;
    const spill = level >= OVERFLOW_FULL_FRACTION ? 1 : 0;
    overflowStream.targetIntensity = spill;
    overflowStream.targetSpeed = 0;
    intakeStream.targetSpeed = 0;
    fallStream.targetSpeed = 0;
    for (const stream of [intakeStream, fallStream, overflowStream]) {
      stream.step(1, false);
    }
    for (const rig of rigs.values()) {
      rig.stream.targetSpeed = 0;
      rig.step(1, 0);
    }
    requestDraw();
  };

  // Pointer: hover and click on the valves.
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const pick = (event: PointerEvent): string | null => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      [...rigs.values()].map((rig) => rig.hit),
      false,
    );
    const first: unknown = hits[0]?.object.userData.valveId;
    return typeof first === 'string' ? first : null;
  };
  let downAt: { x: number; y: number } | null = null;
  const onMove = (event: PointerEvent): void => {
    if (event.buttons !== 0) {
      return;
    }
    const id = pick(event);
    if (id !== hoveredId) {
      hoveredId = id;
      applyHover();
      options.onHover(id);
      requestDraw();
    }
  };
  const onDown = (event: PointerEvent): void => {
    downAt = { x: event.clientX, y: event.clientY };
  };
  const onUp = (event: PointerEvent): void => {
    const origin = downAt;
    downAt = null;
    if (origin === null || event.button !== 0) {
      return;
    }
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > CLICK_SLOP_PX) {
      return;
    }
    const id = pick(event);
    if (id !== null) {
      options.onSelect(id);
    }
  };
  const onLeave = (): void => {
    if (hoveredId !== null) {
      hoveredId = null;
      applyHover();
      options.onHover(null);
      requestDraw();
    }
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  controls.addEventListener('change', requestDraw);

  start();

  return {
    update(frame: SceneFrame) {
      levelTarget = Math.min(1, Math.max(0, frame.levelFraction));
      const ids = frame.valves.map((valve) => valve.id).join('|');
      if (ids !== layoutKey) {
        layoutKey = ids;
        const wanted = new Set(frame.valves.map((valve) => valve.id));
        for (const [id, rig] of rigs) {
          if (!wanted.has(id)) {
            world.remove(rig.root);
            rig.dispose();
            rigs.delete(id);
          }
        }
        for (const valve of frame.valves) {
          if (!rigs.has(valve.id)) {
            const rig = new ValveRig(valve, sprite, palette, waterLight, animate);
            rigs.set(valve.id, rig);
            world.add(rig.root);
          }
        }
        layout(frame.valves);
        applyHover();
      }
      for (const valve of frame.valves) {
        rigs.get(valve.id)?.apply(valve, elapsed);
      }

      const key = frame.rings.map((ring) => ring.fraction).join('|');
      if (key !== ringKey) {
        ringKey = key;
        tank.setRings(frame.rings.map((ring) => ring.fraction));
        for (const child of [...ringLabels.children]) {
          const label = child as CSS2DObject;
          label.element.remove();
          ringLabels.remove(label);
        }
        for (const ring of frame.rings) {
          const label = makeLabel('ring');
          label.element.textContent = ring.text;
          label.object.position.set(TANK_RADIUS + 0.2, ring.fraction * TANK_HEIGHT, 0);
          ringLabels.add(label.object);
        }
      }
      setLines(tankLabel.element, [frame.tankTitle, frame.tankDetail]);
      declutter.invalidate();
      partLabels.intake.element.textContent = frame.parts.intake;
      partLabels.overflow.element.textContent = frame.parts.overflow;
      partLabels.drain.element.textContent = frame.parts.drain;
      partLabels.vent.element.textContent = frame.parts.vent;
      settle();
      requestDraw();
    },
    setColors(next: SceneColors) {
      palette = paletteOf(next);
      waterLight.set(next.waterLight);
      tank.setColors({ waterLight: next.waterLight, waterDeep: next.waterDeep, line: next.line });
      groundUniforms.uGround.value.set(next.ground);
      groundUniforms.uLine.value.set(next.line);
      for (const stream of [intakeStream, fallStream, overflowStream]) {
        stream.setColor(waterLight);
      }
      splashMaterial.color.copy(waterLight);
      for (const rig of rigs.values()) {
        rig.setPalette(palette, waterLight);
      }
      requestDraw();
    },
    resize(width: number, height: number) {
      renderer.setSize(width, height, false);
      labelRenderer.setSize(width, height);
      viewWidth = width;
      viewHeight = height;
      declutter.invalidate();
      camera.aspect = width / height;
      if (firstSize) {
        // A narrow screen starts farther away, so the whole scene fits.
        const fit = camera.aspect < WIDE_ASPECT ? Math.min(2.4, WIDE_ASPECT / camera.aspect) : 1;
        const scale = fit * (compact ? COMPACT_DISTANCE : FULL_DISTANCE);
        camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
        firstSize = false;
      }
      camera.updateProjectionMatrix();
      requestDraw();
      if (animate && frameHandle === 0) {
        draw();
      }
    },
    setVisible(next: boolean) {
      visible = next;
      if (next) {
        start();
      } else {
        stop();
      }
    },
    highlight(valveId: string | null) {
      highlightedId = valveId;
      applyHover();
      requestDraw();
    },
    dispose() {
      disposed = true;
      stop();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      controls.removeEventListener('start', stopAutoRotate);
      controls.removeEventListener('change', requestDraw);
      controls.dispose();
      for (const rig of rigs.values()) {
        rig.dispose();
      }
      rigs.clear();
      disposeTree(world);
      tank.dispose();
      sprite.dispose();
      ground.geometry.dispose();
      (ground.material as Material).dispose();
      for (const label of [tankLabel, ...Object.values(partLabels)]) {
        label.element.remove();
      }
      labelRenderer.domElement.remove();
      renderer.dispose();
      // Browsers cap live WebGL contexts; give this one back now instead of at garbage collection.
      renderer.forceContextLoss();
    },
  };
}
