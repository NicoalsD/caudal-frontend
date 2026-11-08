import type { JSX } from 'react';

import { isPlumberInControl, nextControlMode } from '../../core/autopilot/autopilotModel';
import { errorText } from '../../i18n/errorText';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import { useAutopilotSettings, useUpdateAutopilotSettings } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { PERMISSION_ASSISTANT, PERMISSION_AUTOPILOT } from './permissions';

/**
 * The mode of the autopilot and the button that takes control or gives it back. Changing the mode
 * (PUT /autopilot/settings) needs AUTOPILOT_CONFIGURE; without it the mode is shown and the
 * screen says who can change it.
 */
export function AutopilotModeControl(): JSX.Element | null {
  const canRead = usePermission(PERMISSION_ASSISTANT);
  const canConfigure = usePermission(PERMISSION_AUTOPILOT);
  const settings = useAutopilotSettings(canRead);
  const update = useUpdateAutopilotSettings();

  if (!canRead) {
    return null;
  }
  let body: JSX.Element;
  if (settings.isPending) {
    body = <LoadingState message={t('autopilot.loading')} />;
  } else if (settings.isError) {
    body = <FormAlert message={t('autopilot.error')} />;
  } else {
    const current = settings.data;
    const next = nextControlMode(current.mode);
    body = (
      <>
        <p className={cn(styles.modeName)}>
          {t('autopilot.currentMode', { mode: t(`autopilot.mode.${lower(current.mode)}`) })}
        </p>
        <p className={cn(styles.meta)}>
          {current.mode === 'AUTOMATIC'
            ? t('autopilot.modeHelp.automatic', {
                minutes: String(current.operatorAbsenceMinutes),
                floor: String(current.reserveFloorPct),
              })
            : t(`autopilot.modeHelp.${lower(current.mode)}`)}
        </p>
        {canConfigure ? (
          <Button
            variant={isPlumberInControl(current.mode) ? 'secondary' : 'primary'}
            disabled={update.isPending}
            onClick={() => {
              update.mutate({
                mode: next,
                operatorAbsenceMinutes: current.operatorAbsenceMinutes,
                reserveFloorPct: current.reserveFloorPct,
              });
            }}
          >
            {update.isPending
              ? t('autopilot.saving')
              : isPlumberInControl(current.mode)
                ? t('autopilot.giveBack')
                : t('autopilot.takeControl')}
          </Button>
        ) : (
          <p className={cn(styles.meta)}>{t('autopilot.readOnly')}</p>
        )}
        {update.isError ? <FormAlert message={errorText(update.error).message} /> : null}
        {update.isSuccess ? (
          <p role="status">
            {t('autopilot.changed', { mode: t(`autopilot.mode.${lower(update.data.mode)}`) })}
          </p>
        ) : null}
      </>
    );
  }
  return (
    <section className={cn(styles.modeBox)} aria-labelledby="autopilot-title">
      <h3 id="autopilot-title">{t('autopilot.title')}</h3>
      {body}
    </section>
  );
}
