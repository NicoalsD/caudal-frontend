import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Material } from 'three';

/** Colors of the scene. They come from the design tokens; the scene has no color of its own. */
export interface TankSceneColors {
  readonly waterLight: string;
  readonly waterDeep: string;
  readonly line: string;
}

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

const TANK_RADIUS = 1;
const TANK_HEIGHT = 3;
const WATER_RADIUS = 0.975;
const MIN_WATER_HEIGHT = 0.001;
const RADIAL_SEGMENTS = 128;
const SURFACE_SEGMENTS = 160;
const RING_TUBE = 0.007;
const RIM_TUBE = 0.012;
const RING_RADIAL_SEGMENTS = 8;
const RING_RADIUS = 1.004;
const RING_OPACITY = 0.55;
const RIM_OPACITY = 0.9;
const FLOOR_OPACITY = 0.1;
const RANGE_RADIUS = 1.012;
const RANGE_OPACITY = 0.28;

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

const COLOR_SPACE_CHUNK = '#include <colorspace_fragment>';

const WALL_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-view.xyz);
    vHeight = uv.y;
    gl_Position = projectionMatrix * view;
  }
`;

const WATER_WALL_FRAGMENT = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uDeep;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
    float edge = pow(1.0 - facing, 2.2);
    vec3 color = mix(uDeep * 0.62, uDeep * 1.08, smoothstep(0.0, 1.0, vHeight));
    color = mix(color, uDeep * 0.5, edge * 0.7);
    float shimmer = sin(vNormal.x * 9.0 + uTime * 0.5) * sin(vHeight * 7.0 - uTime * 0.35);
    color += uLight * shimmer * 0.018;
    gl_FragColor = vec4(color, 0.97);
    ${COLOR_SPACE_CHUNK}
  }
`;

const SURFACE_VERTEX = /* glsl */ `
  varying vec2 vPlane;
  void main() {
    vPlane = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SURFACE_FRAGMENT = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uDeep;
  uniform vec3 uLine;
  uniform float uTime;
  uniform float uRadius;
  varying vec2 vPlane;
  float height(vec2 p) {
    return sin(length(p - vec2(0.35, 0.2)) * 15.0 - uTime * 1.1) * 0.5
      + sin(p.x * 8.0 + p.y * 5.0 + uTime * 0.7) * 0.3
      + sin(p.y * 11.0 - p.x * 3.0 - uTime * 0.9) * 0.2;
  }
  void main() {
    float step = 0.012;
    float base = height(vPlane);
    vec2 slope = vec2(height(vPlane + vec2(step, 0.0)) - base, height(vPlane + vec2(0.0, step)) - base);
    float light = clamp(0.5 + (slope.x - slope.y) * 1.6, 0.0, 1.0);
    vec3 color = mix(uDeep, uLight, 0.3 + light * 0.6);
    color += uLine * pow(light, 5.0) * 0.28;
    float distanceToEdge = uRadius - length(vPlane);
    color = mix(uLine, color, smoothstep(0.0, 0.025, distanceToEdge));
    gl_FragColor = vec4(color, 1.0);
    ${COLOR_SPACE_CHUNK}
  }
`;

const GLASS_FRAGMENT = /* glsl */ `
  uniform vec3 uLine;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float edge = pow(1.0 - facing, 2.6);
    float streak = smoothstep(0.82, 0.9, vNormal.x * -0.9 + 0.1) * 0.12;
    gl_FragColor = vec4(uLine, 0.03 + edge * 0.42 + streak);
    ${COLOR_SPACE_CHUNK}
  }
`;

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

  const light = { value: new Color(colors.waterLight) };
  const deep = { value: new Color(colors.waterDeep) };
  const line = { value: new Color(colors.line) };
  const time = { value: 0 };

  const waterWall = new Mesh(
    new CylinderGeometry(WATER_RADIUS, WATER_RADIUS, 1, RADIAL_SEGMENTS, 1, true),
    new ShaderMaterial({
      vertexShader: WALL_VERTEX,
      fragmentShader: WATER_WALL_FRAGMENT,
      uniforms: { uLight: light, uDeep: deep, uTime: time },
      transparent: true,
    }),
  );
  const surface = new Mesh(
    new CircleGeometry(WATER_RADIUS, SURFACE_SEGMENTS),
    new ShaderMaterial({
      vertexShader: SURFACE_VERTEX,
      fragmentShader: SURFACE_FRAGMENT,
      uniforms: {
        uLight: light,
        uDeep: deep,
        uLine: line,
        uTime: time,
        uRadius: { value: WATER_RADIUS },
      },
    }),
  );
  surface.rotation.x = -Math.PI * HALF;

  const glass = new Mesh(
    new CylinderGeometry(TANK_RADIUS, TANK_RADIUS, TANK_HEIGHT, RADIAL_SEGMENTS, 1, true),
    new ShaderMaterial({
      vertexShader: WALL_VERTEX,
      fragmentShader: GLASS_FRAGMENT,
      uniforms: { uLine: line },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  glass.position.y = TANK_HEIGHT * HALF;
  glass.renderOrder = 2;

  const floor = new Mesh(
    new CircleGeometry(TANK_RADIUS, SURFACE_SEGMENTS),
    new MeshBasicMaterial({ color: line.value, transparent: true, opacity: FLOOR_OPACITY }),
  );
  floor.rotation.x = -Math.PI * HALF;

  const ringMaterial = new MeshBasicMaterial({
    color: line.value,
    transparent: true,
    opacity: RING_OPACITY,
    depthWrite: false,
  });
  const rimMaterial = new MeshBasicMaterial({
    color: line.value,
    transparent: true,
    opacity: RIM_OPACITY,
    depthWrite: false,
  });
  const rimGeometry = new TorusGeometry(
    TANK_RADIUS,
    RIM_TUBE,
    RING_RADIAL_SEGMENTS,
    SURFACE_SEGMENTS,
  );
  const ringGeometry = new TorusGeometry(
    RING_RADIUS,
    RING_TUBE,
    RING_RADIAL_SEGMENTS,
    SURFACE_SEGMENTS,
  );
  const makeRing = (geometry: TorusGeometry, material: Material, y: number): Mesh => {
    const ring = new Mesh(geometry, material);
    ring.rotation.x = Math.PI * HALF;
    ring.position.y = y;
    ring.renderOrder = 3;
    return ring;
  };
  const rings = new Group();

  const rangeMaterial = new MeshBasicMaterial({
    color: line.value,
    transparent: true,
    opacity: RANGE_OPACITY,
    depthWrite: false,
    side: DoubleSide,
  });
  const range = new Mesh(
    new CylinderGeometry(RANGE_RADIUS, RANGE_RADIUS, 1, RADIAL_SEGMENTS, 1, true),
    rangeMaterial,
  );
  range.visible = false;
  range.renderOrder = 3;

  scene.add(
    floor,
    waterWall,
    surface,
    glass,
    makeRing(rimGeometry, rimMaterial, 0),
    makeRing(rimGeometry, rimMaterial, TANK_HEIGHT),
    rings,
    range,
  );

  let currentLevel = 0;
  let targetLevel = 0;
  let elapsed = 0;
  let visible = true;
  let frame = 0;
  let lastFrameAt = 0;
  let disposed = false;

  const placeWater = (): void => {
    const height = Math.max(currentLevel * TANK_HEIGHT, MIN_WATER_HEIGHT);
    waterWall.scale.y = height;
    waterWall.position.y = height * HALF;
    surface.position.y = height;
  };

  const draw = (): void => {
    placeWater();
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
    time.value = elapsed;
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
      range.visible = next !== null;
      if (next !== null) {
        const height = Math.max((next.high - next.low) * TANK_HEIGHT, MIN_WATER_HEIGHT);
        range.scale.y = height;
        range.position.y = next.low * TANK_HEIGHT + height * HALF;
      }
      if (!animate) {
        draw();
      }
    },
    setRings(fractions) {
      rings.clear();
      for (const fraction of fractions) {
        rings.add(makeRing(ringGeometry, ringMaterial, fraction * TANK_HEIGHT));
      }
      if (!animate) {
        draw();
      }
    },
    setColors(next) {
      light.value.set(next.waterLight);
      deep.value.set(next.waterDeep);
      line.value.set(next.line);
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
      scene.traverse((node) => {
        if (node instanceof Mesh) {
          (node.geometry as CylinderGeometry).dispose();
          (node.material as Material).dispose();
        }
      });
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
    },
  };
}
