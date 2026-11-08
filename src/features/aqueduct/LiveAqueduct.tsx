import { useMemo, useState } from 'react';
import type { JSX, ReactNode } from 'react';

import { t } from '../../i18n/t';
import { useLiveAqueduct } from '../../state/hooks/useLiveAqueduct';
import type { LiveAqueduct as LiveAqueductData } from '../../state/hooks/useLiveAqueduct';
import { usePermission } from '../../state/hooks/usePermission';
import { Button } from '../../ui/primitives/Button';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { AqueductCanvas } from '../../ui/scene/AqueductCanvas';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { PERMISSION_VALVE_COMMAND } from './permissions';
import { toSceneFrame } from './sceneFrame';
import { ValveControlDialog } from './ValveControlDialog';
import { ValveList } from './ValveList';

export interface LiveAqueductParts {
  readonly aqueduct: LiveAqueductData;
  /** The 3D scene with its note when the live valves are lost. */
  readonly scene: JSX.Element;
  /** The accessible list of valves; it opens the same dialog as a click on the scene. */
  readonly valveList: JSX.Element;
}

export type LiveStatus =
  | { readonly status: 'loading' | 'empty' | 'ready' }
  | { readonly status: 'error'; readonly retry: () => void };

interface LiveAqueductProps {
  /**
   * Lays out the parts. It always runs, so the rest of the screen shows even when there is no tank
   * to draw: `parts` is null until the aqueduct is ready, and `live` says why. The dialog of the
   * valves is added after what it returns.
   */
  readonly children: (parts: LiveAqueductParts | null, live: LiveStatus) => ReactNode;
}

/**
 * The live aqueduct: the 3D scene of the tank and its valves, the list that says the same in
 * words, and the dialog that moves a valve. Data comes every 2 seconds from useLiveAqueduct.
 */
export function LiveAqueduct({ children }: LiveAqueductProps): JSX.Element {
  const live = useLiveAqueduct();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const canControl = usePermission(PERMISSION_VALVE_COMMAND);

  const aqueduct = live.status === 'ready' ? live.aqueduct : null;
  const frame = useMemo(() => (aqueduct === null ? null : toSceneFrame(aqueduct)), [aqueduct]);

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
        onHoverValve={setLit}
        fallback={<p>{t('scene.noWebGl')}</p>}
      />
      <p className={cn(styles.sceneHint)}>{t('scene.hint')}</p>
      {aqueduct.valvesAreLive ? null : (
        <p role="status" className={cn(styles.sceneNote)}>
          {t('scene.liveLost')}
        </p>
      )}
    </div>
  );
  const valveList = (
    <ValveList
      valves={aqueduct.valves}
      canControl={canControl}
      onOpen={setSelectedId}
      onFocusValve={setLit}
    />
  );
  return (
    <>
      {children({ aqueduct, scene, valveList }, { status: 'ready' })}
      <ValveControlDialog
        valve={selected}
        onClose={() => {
          setSelectedId(null);
        }}
      />
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
