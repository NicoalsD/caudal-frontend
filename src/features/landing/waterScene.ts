import {
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three';

/**
 * The hero's water: a full-bleed shader of slow teal currents, the ribbons of the CAUDAL logo
 * moving like a stream. It is loaded on demand (LandingPage, dynamic import), so three.js never
 * reaches the app screens nor the service worker precache (vite.config.ts, globIgnores).
 */
export interface WaterScene {
  /** 0 when the hero is at the top, 1 when it has scrolled away: the currents speed up and rise. */
  setProgress(progress: number): void;
  dispose(): void;
}

export interface WaterPalette {
  readonly deep: string;
  readonly mid: string;
  readonly bright: string;
  readonly foam: string;
}

/** Pixel ratio cap: the currents are soft, so a sharper buffer only costs battery. */
const MAX_PIXEL_RATIO = 1.5;
const MS_PER_SECOND = 1000;
/** Clip space spans -1..1: a 2x2 plane covers the canvas exactly. */
const CLIP_SIZE = 2;
const CLIP_EDGE = 1;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/*
 * Domain-warped value noise: two fbm layers bend each other, then the field is folded into soft
 * bands (the ribbons) and coloured along the logo's gradient, from deep teal to foam.
 */
const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uProgress;
  uniform vec2 uResolution;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uBright;
  uniform vec3 uFoam;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vec2(vUv.x * aspect, vUv.y) * 2.2;
    float t = uTime * (0.045 + uProgress * 0.05);

    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));
    vec2 r = vec2(
      fbm(p + 3.0 * q + vec2(1.7 + t * 1.6, 9.2)),
      fbm(p + 3.0 * q + vec2(8.3, 2.8 - t * 1.2))
    );
    float field = fbm(p + 3.4 * r);

    // Ribbons: thin bright crests where the field crosses a few levels.
    float bands = abs(sin((field + r.x * 0.35) * 9.0 - uTime * 0.25));
    float crest = smoothstep(0.92, 1.0, 1.0 - bands) * (0.35 + 0.65 * r.y);

    vec3 color = mix(uDeep, uMid, smoothstep(0.25, 0.75, field));
    color = mix(color, uBright, smoothstep(0.55, 0.95, r.x) * 0.55);
    color += uFoam * crest * 0.22;

    // Light from above, water deepening toward the bottom of the field.
    float depth = smoothstep(1.1, -0.1, vUv.y - uProgress * 0.25);
    color = mix(color, uDeep, depth * 0.55);
    // Vignette so the wordmark always sits on calm water.
    vec2 centered = vUv - vec2(0.5, 0.62);
    color = mix(color, uDeep, smoothstep(0.15, 0.6, 0.5 - length(centered * vec2(1.0, 1.6))) * 0.35);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/** True when this browser can draw WebGL; checked before downloading anything heavy. */
export function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  } catch {
    return false;
  }
}

/**
 * Starts the water in `canvas`. With `still`, it draws one frame and never animates (reduced
 * motion). The loop pauses while the hero is off screen or the tab is hidden.
 */
export function createWaterScene(
  canvas: HTMLCanvasElement,
  palette: WaterPalette,
  still: boolean,
): WaterScene {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uDeep: { value: new Color(palette.deep) },
    uMid: { value: new Color(palette.mid) },
    uBright: { value: new Color(palette.bright) },
    uFoam: { value: new Color(palette.foam) },
  };
  const material = new ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms });
  const geometry = new PlaneGeometry(CLIP_SIZE, CLIP_SIZE);
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-CLIP_EDGE, CLIP_EDGE, CLIP_EDGE, -CLIP_EDGE, 0, CLIP_EDGE);

  const resize = (): void => {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    uniforms.uResolution.value.set(clientWidth, clientHeight);
    renderer.render(scene, camera);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  let frame = 0;
  let visible = true;
  const started = performance.now();
  const tick = (now: number): void => {
    uniforms.uTime.value = (now - started) / MS_PER_SECOND;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  const play = (): void => {
    if (!still && visible && !document.hidden && frame === 0) {
      frame = requestAnimationFrame(tick);
    }
  };
  const pause = (): void => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const onVisibility = (): void => (document.hidden ? pause() : play());
  document.addEventListener('visibilitychange', onVisibility);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) play();
    else pause();
  });
  intersection.observe(canvas);
  play();

  return {
    setProgress(progress) {
      uniforms.uProgress.value = progress;
      if (still) renderer.render(scene, camera);
    },
    dispose() {
      pause();
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
