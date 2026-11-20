import { Bot, Check, Hand, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { JSX } from 'react';

import { AUTOPILOT_MODES } from '../../core/autopilot/autopilotModel';
import type { AutopilotMode } from '../../core/autopilot/autopilotModel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import styles from './Autopilot.module.css';

const LOOK: Readonly<Record<AutopilotMode, { icon: LucideIcon; tint: string }>> = {
  MANUAL: { icon: Hand, tint: styles.tintSand ?? '' },
  ASSISTED: { icon: UserCheck, tint: styles.tintAqua ?? '' },
  AUTOMATIC: { icon: Bot, tint: styles.tintMint ?? '' },
};

interface ModeCardsProps {
  readonly selected: AutopilotMode;
  readonly disabled: boolean;
  /** The text of each mode's help; the automatic one needs the minutes and the floor. */
  readonly helpOf: (mode: AutopilotMode) => string;
  readonly onChange: (mode: AutopilotMode) => void;
}

/**
 * The three modes of the pilot as pastel cards that are native radios: arrows move between them,
 * the chosen one has a thick border and a check, never only a color.
 */
export function ModeCards({ selected, disabled, helpOf, onChange }: ModeCardsProps): JSX.Element {
  return (
    <fieldset className={cn(styles.modes)} disabled={disabled}>
      <legend className={cn(styles.legend)}>{t('settings.mode')}</legend>
      <div className={cn(styles.modeGrid)}>
        {AUTOPILOT_MODES.map((code) => {
          const { icon: Icon, tint } = LOOK[code];
          return (
            <label key={code} className={cn(styles.mode, tint, code === selected && styles.chosen)}>
              <input
                type="radio"
                name="autopilot-mode"
                value={code}
                checked={code === selected}
                className={cn(styles.modeInput)}
                onChange={() => {
                  onChange(code);
                }}
              />
              <span className={cn(styles.modeIcon)} aria-hidden="true">
                <Icon />
              </span>
              <span className={cn(styles.modeText)}>
                <strong>{t(`autopilot.mode.${lower(code)}`)}</strong>
                <span>{helpOf(code)}</span>
              </span>
              <Check aria-hidden="true" className={cn(styles.modeCheck)} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
