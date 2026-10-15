import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import styles from './SimulatedDataBanner.module.css';

/** The mark of a demo aqueduct: its data is simulated and must never pass as real. */
export function SimulatedDataBanner(): JSX.Element {
  return <p className={cn(styles.banner)}>{t('common.simulatedData')}</p>;
}
