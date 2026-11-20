import { useState } from 'react';
import type { JSX } from 'react';

import {
  OPERATOR_ABSENCE_MINUTES_LIMITS,
  RESERVE_FLOOR_PCT_LIMITS,
  settingsErrors,
} from '../../core/autopilot/autopilotModel';
import type { AutopilotMode } from '../../core/autopilot/autopilotModel';
import { errorText } from '../../i18n/errorText';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { AutopilotSettingsView } from '../../services/api/views';
import {
  useAutopilotSettings,
  useRunAutopilot,
  useUpdateAutopilotSettings,
} from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import { PERMISSION_ASSISTANT, PERMISSION_AUTOPILOT } from '../aqueduct/permissions';
import { ModeCards } from './ModeCards';
import { Card } from '../../ui/cards/Card';
import styles from './Autopilot.module.css';

/**
 * The settings of the pilot (mode, minutes without human action, reserve floor) and the button
 * that runs a cycle now. Only AUTOPILOT_CONFIGURE changes them; everyone with ASSISTANT_USE reads.
 */
export function AutopilotSettingsForm(): JSX.Element | null {
  const canRead = usePermission(PERMISSION_ASSISTANT);
  const canConfigure = usePermission(PERMISSION_AUTOPILOT);
  const settings = useAutopilotSettings(canRead);
  if (!canRead) {
    return null;
  }
  let body: JSX.Element;
  if (settings.isPending) {
    body = <LoadingState message={t('autopilot.loading')} />;
  } else if (settings.isError) {
    body = <FormAlert message={t('autopilot.error')} />;
  } else {
    // The settings are asked again every 2 seconds; the form restarts only when they were saved.
    body = (
      <SettingsFields
        key={settings.data.updatedAt?.date.getTime() ?? 'default'}
        saved={settings.data}
        canConfigure={canConfigure}
      />
    );
  }
  return (
    <Card as="section" aria-labelledby="autopilot-settings-title" className={cn(styles.section)}>
      <h2 id="autopilot-settings-title" className={cn(styles.sectionTitle)}>
        {t('settings.title')}
      </h2>
      {body}
    </Card>
  );
}

function SettingsFields({
  saved,
  canConfigure,
}: {
  readonly saved: AutopilotSettingsView;
  readonly canConfigure: boolean;
}): JSX.Element {
  const [mode, setMode] = useState<AutopilotMode>(saved.mode);
  const [absence, setAbsence] = useState(String(saved.operatorAbsenceMinutes));
  const [floor, setFloor] = useState(String(saved.reserveFloorPct));
  const [submitted, setSubmitted] = useState(false);
  const update = useUpdateAutopilotSettings();
  const run = useRunAutopilot();

  const absenceNumber = absence.trim() === '' ? Number.NaN : Number(absence);
  const floorNumber = floor.trim() === '' ? Number.NaN : Number(floor);
  const errors = settingsErrors({
    operatorAbsenceMinutes: absenceNumber,
    reserveFloorPct: floorNumber,
  });
  const absenceError =
    submitted && errors.includes('absence')
      ? t('settings.absenceInvalid', {
          min: String(OPERATOR_ABSENCE_MINUTES_LIMITS.min),
          max: String(OPERATOR_ABSENCE_MINUTES_LIMITS.max),
        })
      : undefined;
  const floorError =
    submitted && errors.includes('floor')
      ? t('settings.floorInvalid', {
          min: String(RESERVE_FLOOR_PCT_LIMITS.min),
          max: String(RESERVE_FLOOR_PCT_LIMITS.max),
        })
      : undefined;

  return (
    <div className={cn(styles.stack)}>
      <form
        noValidate
        className={cn(styles.form)}
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (errors.length === 0 && canConfigure) {
            update.mutate({
              mode,
              operatorAbsenceMinutes: absenceNumber,
              reserveFloorPct: floorNumber,
            });
          }
        }}
      >
        <ModeCards
          selected={mode}
          disabled={!canConfigure}
          helpOf={(code) =>
            code === 'AUTOMATIC'
              ? t('autopilot.modeHelp.automatic', { minutes: absence, floor })
              : t(`autopilot.modeHelp.${lower(code)}`)
          }
          onChange={setMode}
        />
        <TextField
          label={t('settings.absenceLabel')}
          hint={t('settings.absenceHint', {
            min: String(OPERATOR_ABSENCE_MINUTES_LIMITS.min),
            max: String(OPERATOR_ABSENCE_MINUTES_LIMITS.max),
          })}
          error={absenceError}
          inputMode="numeric"
          disabled={!canConfigure}
          value={absence}
          onChange={(event) => {
            setAbsence(event.currentTarget.value);
          }}
        />
        <TextField
          label={t('settings.floorLabel')}
          hint={t('settings.floorHint', {
            min: String(RESERVE_FLOOR_PCT_LIMITS.min),
            max: String(RESERVE_FLOOR_PCT_LIMITS.max),
          })}
          error={floorError}
          inputMode="decimal"
          disabled={!canConfigure}
          value={floor}
          onChange={(event) => {
            setFloor(event.currentTarget.value);
          }}
        />
        {canConfigure ? (
          <div className={cn(styles.actions)}>
            <Button type="submit" variant="primary" disabled={update.isPending}>
              {update.isPending ? t('autopilot.saving') : t('settings.save')}
            </Button>
          </div>
        ) : (
          <p className={cn(styles.quiet)}>{t('settings.readOnly')}</p>
        )}
        {update.isError ? (
          <FormAlert message={t('settings.saveError')} detail={errorText(update.error).message} />
        ) : null}
        {update.isSuccess ? <p role="status">{t('settings.saved')}</p> : null}
      </form>
      {canConfigure ? (
        <div className={cn(styles.stack)}>
          <p className={cn(styles.quiet)}>{t('settings.runHint')}</p>
          <div className={cn(styles.actions)}>
            <Button
              variant="secondary"
              disabled={run.isPending}
              onClick={() => {
                run.mutate();
              }}
            >
              {run.isPending ? t('settings.running') : t('settings.runNow')}
            </Button>
          </div>
          {run.isError ? (
            <FormAlert message={t('settings.runError')} detail={errorText(run.error).message} />
          ) : null}
          {run.isSuccess ? (
            <p role="status">
              {run.data.length === 0
                ? t('settings.ranNone')
                : t('settings.ranCount', { count: String(run.data.length) })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
