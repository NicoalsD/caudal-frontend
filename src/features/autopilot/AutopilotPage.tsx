import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import { AutopilotSettingsForm } from './AutopilotSettingsForm';
import { DecisionHistory } from './DecisionHistory';
import styles from './Autopilot.module.css';

/** Screen of the pilot: its settings, the button that runs a cycle now, and the decision history. */
export function AutopilotPage(): JSX.Element {
  return (
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.autopilot')}</ScreenTitle>
      <div className={cn(styles.columns)}>
        <AutopilotSettingsForm />
        <DecisionHistory headingId="autopilot-history-title" />
      </div>
    </div>
  );
}
