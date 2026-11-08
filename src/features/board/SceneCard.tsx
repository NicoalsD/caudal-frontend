import { useState } from 'react';
import type { JSX } from 'react';
import { Bot, Droplets, Maximize2, Power } from 'lucide-react';

import { formatDecimal } from '../../core/format/decimal';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import { useAutopilotSettings } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { Card } from '../../ui/cards/Card';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { Dialog } from '../../ui/primitives/Dialog';
import { cn } from '../../ui/styles/cn';
import { LiveAqueduct, SceneMessage } from '../aqueduct/LiveAqueduct';
import type { LiveStatus, LiveAqueductParts } from '../aqueduct/LiveAqueduct';
import { PERMISSION_ASSISTANT } from '../aqueduct/permissions';
import styles from './BoardPanel.module.css';

const LEVEL_DIGITS = 2;
const TITLE_ID = 'board-scene-title';

/**
 * The 3D aqueduct on a hero card with a wave for its top edge, for looking only: no valve dialog
 * can open from here. Chips under the scene say the level, the open valves and the pilot's mode.
 */
export function SceneCard({
  parts,
  live,
}: {
  readonly parts: LiveAqueductParts | null;
  readonly live: LiveStatus;
}): JSX.Element {
  const [big, setBig] = useState(false);
  const canSeePilot = usePermission(PERMISSION_ASSISTANT);
  const settings = useAutopilotSettings(canSeePilot);
  const level = parts?.aqueduct.level ?? null;
  const open = parts?.aqueduct.valves.filter((valve) => valve.state === 'OPEN').length ?? 0;
  return (
    <Card variant="hero" as="section" aria-labelledby={TITLE_ID} className={cn(styles.scene)}>
      <h2 id={TITLE_ID} className={cn(styles.heroTitle)}>
        {t('board.scene.title')}
      </h2>
      <div className={cn(styles.sceneBox)}>
        {parts === null ? <SceneMessage live={live} /> : parts.scene}
      </div>
      <div className={cn(styles.chips)}>
        {parts === null ? null : (
          <>
            <Chip tone="aqua" icon={<Droplets aria-hidden="true" />}>
              {level === null
                ? t('board.scene.noLevel')
                : t('board.scene.level', { level: formatDecimal(level, LEVEL_DIGITS) })}
            </Chip>
            <Chip tone="mint" icon={<Power aria-hidden="true" />}>
              {open === 1
                ? t('board.scene.openedOne')
                : t('board.scene.opened', { count: String(open) })}
            </Chip>
          </>
        )}
        {settings.isSuccess ? (
          <Chip tone="lavender" icon={<Bot aria-hidden="true" />}>
            {t('board.scene.mode', { mode: t(`autopilot.mode.${lower(settings.data.mode)}`) })}
          </Chip>
        ) : null}
        {parts === null ? null : (
          <Button
            className={cn(styles.sceneOpen)}
            onClick={() => {
              setBig(true);
            }}
          >
            <Maximize2 aria-hidden="true" />
            {t('board.scene.open')}
          </Button>
        )}
      </div>
      <Dialog
        open={big}
        onOpenChange={setBig}
        title={t('board.scene.title')}
        description={t('board.scene.description')}
      >
        <div className={cn(styles.bigScene)}>
          {big ? (
            <LiveAqueduct readOnly>
              {(innerParts, innerLive) =>
                innerParts === null ? <SceneMessage live={innerLive} /> : innerParts.scene
              }
            </LiveAqueduct>
          ) : null}
        </div>
      </Dialog>
    </Card>
  );
}
