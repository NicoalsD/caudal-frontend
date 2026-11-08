import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  TorusGeometry,
} from 'three';
import type { Material } from 'three';

/** Colors of the scene. They come from the design tokens; the scene has no color of its own. */
export interface TankSceneColors {
  readonly waterLight: string;
  readonly waterDeep: string;
  readonly line: string;
}

export const TANK_RADIUS = 1;
export const TANK_HEIGHT = 3;
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
const HALF = 0.5;

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

/**
 * The glass cylinder with its water, rings and range strip. Both the single tank gauge and the
 * whole aqueduct scene draw it, so the water looks the same everywhere. The caller owns the clock
 * (`setTime`) and the renderer.
 */
export interface TankParts {
  readonly group: Group;
  /** Height of the water, 0 (empty) to 1 (full). */
  setWaterLevel(fraction: number): void;
  setRange(range: { readonly low: number; readonly high: number } | null): void;
  setRings(fractions: readonly number[]): void;
  setColors(colors: TankSceneColors): void;
  setTime(seconds: number): void;
  dispose(): void;
}

export function createTankParts(colors: TankSceneColors): TankParts {
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

  const range = new Mesh(
    new CylinderGeometry(RANGE_RADIUS, RANGE_RADIUS, 1, RADIAL_SEGMENTS, 1, true),
    new MeshBasicMaterial({
      color: line.value,
      transparent: true,
      opacity: RANGE_OPACITY,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  range.visible = false;
  range.renderOrder = 3;

  const group = new Group();
  group.add(
    floor,
    waterWall,
    surface,
    glass,
    makeRing(rimGeometry, rimMaterial, 0),
    makeRing(rimGeometry, rimMaterial, TANK_HEIGHT),
    rings,
    range,
  );

  return {
    group,
    setWaterLevel(fraction) {
      const height = Math.max(fraction * TANK_HEIGHT, MIN_WATER_HEIGHT);
      waterWall.scale.y = height;
      waterWall.position.y = height * HALF;
      surface.position.y = height;
    },
    setRange(next) {
      range.visible = next !== null;
      if (next !== null) {
        const height = Math.max((next.high - next.low) * TANK_HEIGHT, MIN_WATER_HEIGHT);
        range.scale.y = height;
        range.position.y = next.low * TANK_HEIGHT + height * HALF;
      }
    },
    setRings(fractions) {
      rings.clear();
      for (const fraction of fractions) {
        rings.add(makeRing(ringGeometry, ringMaterial, fraction * TANK_HEIGHT));
      }
    },
    setColors(next) {
      light.value.set(next.waterLight);
      deep.value.set(next.waterDeep);
      line.value.set(next.line);
    },
    setTime(seconds) {
      time.value = seconds;
    },
    dispose() {
      group.traverse((node) => {
        if (node instanceof Mesh) {
          (node.geometry as CylinderGeometry).dispose();
          (node.material as Material).dispose();
        }
      });
      ringGeometry.dispose();
      ringMaterial.dispose();
    },
  };
}
