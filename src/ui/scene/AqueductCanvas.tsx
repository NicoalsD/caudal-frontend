import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';

import { cn } from '../styles/cn';
import type { AqueductScene, SceneColors, SceneFrame } from './sceneTypes';
import { DARK_QUERY, hasWebGl, matchesMedia, REDUCED_MOTION_QUERY } from './webgl';
import styles from './AqueductCanvas.module.css';

export interface AqueductCanvasProps {
  readonly frame: SceneFrame;
  readonly onSelectValve: (valveId: string) => void;
  /** A valve lit from outside the canvas (the focused row of the valve list). */
  readonly highlightedValveId?: string | null;
  /** Shown when WebGL is missing or the scene fails to start. */
  readonly fallback: JSX.Element;
  readonly className?: string;
  /** Called when the pointer moves over a valve of the scene. */
  readonly onHoverValve?: (valveId: string | null) => void;
}

function readColors(element: Element): SceneColors {
  const style = getComputedStyle(element);
  const token = (name: string): string => style.getPropertyValue(name).trim();
  return {
    waterLight: token('--color-water-300'),
    waterDeep: token('--color-brand-500'),
    line: token('--color-on-brand'),
    open: token('--scene-open'),
    closed: token('--scene-closed'),
    unknown: token('--scene-unknown'),
    pending: token('--scene-pending'),
    delivered: token('--scene-delivered'),
    failed: token('--scene-failed'),
    pipe: token('--scene-pipe'),
    ground: token('--scene-ground'),
  };
}

/**
 * Hosts the 3D scene of the aqueduct. three.js loads on demand, in its own chunk that the service
 * worker leaves out of the precache; without WebGL, or without the chunk, `fallback` stays. The
 * scene is decoration for the eyes: the same facts are in the accessible list beside it.
 */
export function AqueductCanvas({
  frame,
  onSelectValve,
  highlightedValveId = null,
  fallback,
  className,
  onHoverValve,
}: AqueductCanvasProps): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const select = useRef(onSelectValve);
  const hover = useRef(onHoverValve);
  const [scene, setScene] = useState<AqueductScene | null>(null);
  const [failed, setFailed] = useState(!hasWebGl());

  useEffect(() => {
    select.current = onSelectValve;
    hover.current = onHoverValve;
  });

  useEffect(() => {
    const element = host.current;
    const target = canvas.current;
    if (element === null || target === null || !hasWebGl()) {
      return undefined;
    }
    let cancelled = false;
    let created: AqueductScene | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let visibilityObserver: IntersectionObserver | null = null;
    const dark = window.matchMedia(DARK_QUERY);
    const onThemeChange = (): void => created?.setColors(readColors(element));

    void import('./AqueductScene')
      .then(({ createAqueductScene }) => {
        if (cancelled) {
          return;
        }
        const next = createAqueductScene({
          canvas: target,
          labelHost: element,
          colors: readColors(element),
          animate: !matchesMedia(REDUCED_MOTION_QUERY),
          onSelect: (id) => {
            select.current(id);
          },
          onHover: (id) => {
            hover.current?.(id);
          },
        });
        created = next;
        const fit = (): void => {
          const { width, height } = element.getBoundingClientRect();
          if (width > 0 && height > 0) {
            next.resize(width, height);
          }
        };
        fit();
        resizeObserver = new ResizeObserver(fit);
        resizeObserver.observe(element);
        visibilityObserver = new IntersectionObserver(([entry]) => {
          next.setVisible(entry?.isIntersecting ?? false);
        });
        visibilityObserver.observe(element);
        dark.addEventListener('change', onThemeChange);
        setScene(next);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      dark.removeEventListener('change', onThemeChange);
      created?.dispose();
      setScene(null);
    };
  }, []);

  useEffect(() => {
    scene?.update(frame);
  }, [scene, frame]);

  useEffect(() => {
    scene?.highlight(highlightedValveId);
  }, [scene, highlightedValveId]);

  return (
    <div
      ref={host}
      className={cn(styles.host, className)}
      data-ready={scene !== null}
      data-testid="aqueduct-scene"
    >
      {failed ? null : <canvas ref={canvas} className={cn(styles.canvas)} aria-hidden="true" />}
      {scene === null ? <div className={cn(styles.fallback)}>{fallback}</div> : null}
    </div>
  );
}
