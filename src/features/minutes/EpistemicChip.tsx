import type { JSX } from 'react';
import { Calculator, CheckCircle2, Eye, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { EpistemicSection } from '../../core/minutes/minutesPeriod';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import styles from './Minutes.module.css';

const ICON_SIZE = 16;

/** Icon, words and style of each section (design-theme.md 2.7): never color alone. */
const SECTION_LOOK = {
  observed: { icon: Eye, label: 'minutes.sectionObserved', style: styles.observed },
  estimated: { icon: Calculator, label: 'minutes.sectionEstimated', style: styles.estimated },
  inferred: { icon: HelpCircle, label: 'minutes.sectionInferred', style: styles.inferred },
  confirmed: { icon: CheckCircle2, label: 'minutes.sectionConfirmed', style: styles.confirmed },
} as const satisfies Record<
  EpistemicSection,
  { readonly icon: LucideIcon; readonly label: string; readonly style: string | undefined }
>;

/** The name of a section as a chip: icon, text and color. Inferred has a dashed border. */
export function EpistemicChip({ section }: { readonly section: EpistemicSection }): JSX.Element {
  const look = SECTION_LOOK[section];
  const Icon = look.icon;
  return (
    <span className={cn(styles.chip, look.style)}>
      <Icon aria-hidden="true" size={ICON_SIZE} />
      <span>{t(look.label)}</span>
    </span>
  );
}
