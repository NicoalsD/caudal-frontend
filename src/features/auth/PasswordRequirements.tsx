import type { JSX } from 'react';

import type { PasswordRequirement } from '../../core/forms/passwordRequirements';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import styles from './PasswordRequirements.module.css';

interface PasswordRequirementsProps {
  readonly id: string;
  readonly requirements: readonly PasswordRequirement[];
  readonly min: number;
  readonly max: number;
}

/** Live checklist. State is written in words, never only in color. */
export function PasswordRequirements({
  id,
  requirements,
  min,
  max,
}: PasswordRequirementsProps): JSX.Element {
  const label = (key: PasswordRequirement['key']): string => {
    switch (key) {
      case 'length':
        return t('auth.requirementLength', { min: String(min), max: String(max) });
      case 'notUsername':
        return t('auth.requirementNotUsername');
      case 'differentFromCurrent':
        return t('auth.requirementDifferent');
    }
  };

  return (
    <div id={id} className={cn(styles.requirements)}>
      <p className={cn(styles.title)}>{t('auth.requirementsTitle')}</p>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.key} className={cn(requirement.met && styles.met)}>
            {label(requirement.key)}
            {': '}
            {requirement.met ? t('auth.requirementMet') : t('auth.requirementPending')}
          </li>
        ))}
      </ul>
      <p className={cn(styles.note)}>{t('auth.serverRules')}</p>
    </div>
  );
}
