import type { JSX } from 'react';
import { Bot, Hand, Sparkles } from 'lucide-react';

import { isPlumberInControl, nextControlMode } from '../../core/autopilot/autopilotModel';
import { errorText } from '../../i18n/errorText';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import { useAutopilotSettings, useUpdateAutopilotSettings } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Card } from '../../ui/cards/Card';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { PERMISSION_ASSISTANT, PERMISSION_AUTOPILOT } from './permissions';

const MODE_ICON = { MANUAL: Hand, ASSISTED: Bot, AUTOMATIC: Sparkles } as const;

/**
 * The mode of the autopilot and the button that takes control or gives it back. Changing the mode
 * (PUT /autopilot/settings) needs AUTOPILOT_CONFIGURE; without it the mode is shown and the
 * screen says who can change it.
 */
export function AutopilotModeControl({
  compact = false,
}: {
  /** One line on a dark band: the mode and the button, without the help text or the card. */
  readonly compact?: boolean;
} = {}): JSX.Element | null {
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
    const ModeIcon = MODE_ICON[current.mode];
    const toggle = (): void => {
      update.mutate({
        mode: next,
        operatorAbsenceMinutes: current.operatorAbsenceMinutes,
        reserveFloorPct: current.reserveFloorPct,
      });
    };
    const toggleText = update.isPending
      ? t('autopilot.saving')
      : isPlumberInControl(current.mode)
        ? t('autopilot.giveBack')
        : t('autopilot.takeControl');
    if (compact) {
      return (
        <section className={cn(styles.modeInline)} aria-labelledby="autopilot-inline-title">
          <h2 id="autopilot-inline-title" className={cn(styles.visuallyHidden)}>
            {t('autopilot.title')}
          </h2>
          <p className={cn(styles.modeInlineName)}>
            <ModeIcon aria-hidden="true" />
            {t('autopilot.currentMode', { mode: t(`autopilot.mode.${lower(current.mode)}`) })}
          </p>
          {canConfigure ? (
            <Button
              variant="ghost"
              className={cn(styles.modeInlineButton)}
              disabled={update.isPending}
              onClick={toggle}
            >
              {toggleText}
            </Button>
          ) : (
            <p className={cn(styles.modeInlineMeta)}>{t('autopilot.readOnly')}</p>
          )}
          {update.isError ? (
            <p role="alert" className={cn(styles.modeInlineMeta)}>
              {errorText(update.error).message}
            </p>
          ) : null}
        </section>
      );
    }
    body = (
      <>
        <div className={cn(styles.modeHead)}>
          <span className={cn(styles.modeIcon)}>
            <ModeIcon aria-hidden="true" />
          </span>
          <div>
            <p className={cn(styles.meta)}>{t('autopilot.modeCaption')}</p>
            <p className={cn(styles.modeName)}>
              {t('autopilot.currentMode', { mode: t(`autopilot.mode.${lower(current.mode)}`) })}
            </p>
          </div>
        </div>
        <p className={cn(styles.modeHelp)}>
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
            onClick={toggle}
          >
            {toggleText}
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
  if (compact) {
    return (
      <p className={cn(styles.modeInlineMeta)}>
        {settings.isError ? t('autopilot.error') : t('autopilot.loading')}
      </p>
    );
  }
  return (
    <Card
      variant="tinted"
      tint="cream"
      as="section"
      aria-labelledby="autopilot-title"
      className={cn(styles.modeBox)}
    >
      <h3 id="autopilot-title" className={cn(styles.sectionTitle)}>
        {t('autopilot.title')}
      </h3>
      {body}
    </Card>
  );
}
