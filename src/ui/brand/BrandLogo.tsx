import type { JSX } from 'react';

import { LOGO } from '../../assets/brand/logo';
import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import styles from './BrandLogo.module.css';

interface BrandLogoProps {
  /** `onBrand` sits on the deep teal fields (app header, login panel, landing). */
  readonly tone?: 'onBrand' | 'onPage';
  readonly size?: 'compact' | 'large';
  readonly className?: string;
}

/**
 * The CAUDAL brand. Shows the official logo when its files exist (assets/brand/logo.ts) and a
 * typeset wordmark until then, so every screen already reserves the logo's place.
 */
export function BrandLogo({
  tone = 'onPage',
  size = 'compact',
  className,
}: BrandLogoProps): JSX.Element {
  if (LOGO !== null) {
    return (
      <img
        className={cn(styles.image, styles[size], className)}
        src={LOGO.src}
        srcSet={LOGO.srcSet}
        width={LOGO.width}
        height={LOGO.height}
        alt={t('app.name')}
        decoding="async"
      />
    );
  }
  return (
    <span className={cn(styles.wordmark, styles[tone], styles[size], className)}>
      {t('app.brandWordmark')}
    </span>
  );
}
