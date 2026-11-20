/** What the 3D scene draws. The scene knows nothing of the API: features fill these in. */

export type SceneValveState = 'OPEN' | 'CLOSED' | 'UNKNOWN';
export type SceneCommandStatus = 'PENDING' | 'DELIVERED' | 'ACKED' | 'FAILED' | 'EXPIRED';

export interface SceneValve {
  readonly id: string;
  /** A motorized valve gets a handwheel with an actuator; a manual one gets a lever. */
  readonly motorized: boolean;
  readonly state: SceneValveState;
  readonly command: SceneCommandStatus | null;
  /** Share of the full flow that passes, 0 to 1. Speed of the particles in its pipe. */
  readonly flow: number;
  /** First line of the label: the sector. */
  readonly title: string;
  /** Second line: the state (and the command in course). */
  readonly stateText: string;
  /** Third line: the flow. */
  readonly flowText: string;
}

export interface SceneRing {
  readonly fraction: number;
  readonly text: string;
}

export interface SceneFrame {
  /** Height of the water, 0 to 1. */
  readonly levelFraction: number;
  /** Empty hides the tank's label (the screen shows the level elsewhere). */
  readonly tankTitle: string;
  readonly tankDetail: string;
  readonly rings: readonly SceneRing[];
  readonly valves: readonly SceneValve[];
  readonly parts: {
    readonly intake: string;
    readonly overflow: string;
    readonly drain: string;
    readonly vent: string;
  };
}

/** Colors from the design tokens (--scene-* and the water tokens). */
export interface SceneColors {
  readonly waterLight: string;
  readonly waterDeep: string;
  readonly line: string;
  readonly open: string;
  readonly closed: string;
  readonly unknown: string;
  readonly pending: string;
  readonly delivered: string;
  readonly failed: string;
  readonly pipe: string;
  readonly ground: string;
}

export interface AqueductSceneOptions {
  readonly canvas: HTMLCanvasElement;
  /** Element that holds the text labels (CSS2DRenderer); it is placed over the canvas. */
  readonly labelHost: HTMLElement;
  readonly colors: SceneColors;
  /** Without motion nothing animates: each change is drawn once, at once. */
  readonly animate: boolean;
  /** The small look-only scene: the camera starts closer. */
  readonly compact?: boolean;
  readonly onSelect: (valveId: string) => void;
  readonly onHover: (valveId: string | null) => void;
}

export interface AqueductScene {
  update(frame: SceneFrame): void;
  setColors(colors: SceneColors): void;
  resize(width: number, height: number): void;
  setVisible(visible: boolean): void;
  /** Lights a valve as if the pointer were on it (the list of valves does this on focus). */
  highlight(valveId: string | null): void;
  dispose(): void;
}
