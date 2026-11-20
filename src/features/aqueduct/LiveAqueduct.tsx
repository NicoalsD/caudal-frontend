import { useMemo, useState } from 'react';
import type { JSX, ReactNode } from 'react';

import { t } from '../../i18n/t';
import { useLiveAqueduct } from '../../state/hooks/useLiveAqueduct';
import type { LiveAqueduct as LiveAqueductData } from '../../state/hooks/useLiveAqueduct';
import { Button } from '../../ui/primitives/Button';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { AqueductCanvas } from '../../ui/scene/AqueductCanvas';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { toSceneFrame } from './sceneFrame';
import { ValveControlDialog } from './ValveControlDialog';

export interface LiveAqueductParts {
  readonly aqueduct: LiveAqueductData;
  /** The 3D scene with its note when the live valves are lost. */
  readonly scene: JSX.Element;
  /** Lights a valve in the scene, as the pointer does (null turns it off). */
  readonly highlight: (valveId: string | null) => void;
  /** Opens the dialog that moves a valve; it does nothing on a look-only scene. */
  readonly openValve: (valveId: string) => void;
}

export type LiveStatus =
  | { readonly status: 'loading' | 'empty' | 'ready' }
  | { readonly status: 'error'; readonly retry: () => void };

interface LiveAqueductProps {
  /** Look only: no dialog, no command, and the list does not open one (the Board's overview). */
  readonly readOnly?: boolean;
  /** False when the screen prints the level over the scene: the tank's own label then hides. */
  readonly tankLabel?: boolean;
  /**
   * Lays out the parts. It always runs, so the rest of the screen shows even when there is no tank
   * to draw: `parts` is null until the aqueduct is ready, and `live` says why. The dialog of the
   * valves is added after what it returns.
   */
  readonly children: (parts: LiveAqueductParts | null, live: LiveStatus) => ReactNode;
}

/**
 * The live aqueduct: the 3D scene of the tank and its valves and the dialog that moves a valve.
 * The regions list (RegionList) says the same in words and opens the same dialog. Data comes every 2 seconds from useLiveAqueduct.
 */
export function LiveAqueduct({
  children,
  readOnly = false,
  tankLabel = true,
}: LiveAqueductProps): JSX.Element {
  const live = useLiveAqueduct();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);

  const aqueduct = live.status === 'ready' ? live.aqueduct : null;
  const frame = useMemo(() => {
    if (aqueduct === null) {
      return null;
    }
    const full = toSceneFrame(aqueduct);
    return tankLabel ? full : { ...full, tankTitle: '', tankDetail: '' };
  }, [aqueduct, tankLabel]);

  if (aqueduct === null || frame === null) {
    return <>{children(null, live.status === 'error' ? live : { status: live.status })}</>;
  }

  const selected = aqueduct.valves.find((valve) => valve.id === selectedId) ?? null;
  const scene = (
    <div className={cn(styles.sceneWrap)}>
      <AqueductCanvas
        frame={frame}
        highlightedValveId={lit}
        onSelectValve={setSelectedId}
        readOnly={readOnly}
        onHoverValve={setLit}
        fallback={<p>{t('scene.noWebGl')}</p>}
      />
      <p className={cn(styles.sceneHint)}>{readOnly ? t('scene.hintReadOnly') : t('scene.hint')}</p>
      {aqueduct.valvesAreLive ? null : (
        <p role="status" className={cn(styles.sceneNote)}>
          {t('scene.liveLost')}
        </p>
      )}
    </div>
  );
  return (
    <>
      {children(
        {
          aqueduct,
          scene,
          highlight: setLit,
          openValve: (valveId) => {
            if (!readOnly) {
              setSelectedId(valveId);
            }
          },
        },
        { status: 'ready' },
      )}
      {readOnly ? null : (
        <ValveControlDialog
          valve={selected}
          onClose={() => {
            setSelectedId(null);
          }}
        />
      )}
    </>
  );
}

/** Why there is no scene: loading, a failure with its retry, or a tank that does not exist. */
export function SceneMessage({ live }: { readonly live: LiveStatus }): JSX.Element | null {
  if (live.status === 'loading') {
    return <LoadingState message={t('scene.loading')} />;
  }
  if (live.status === 'error') {
    return (
      <div className={cn(styles.stack)}>
        <p role="alert">{t('scene.error')}</p>
        <Button onClick={live.retry}>{t('common.retry')}</Button>
      </div>
    );
  }
  return live.status === 'empty' ? <p>{t('scene.empty')}</p> : null;
}
