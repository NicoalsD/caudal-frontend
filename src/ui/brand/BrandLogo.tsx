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

const PRINT_QUERY = 'print';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * The official CAUDAL logo. White on the deep brand field and in the dark theme, turquoise on
 * light surfaces, and black when the page is printed.
 */
export function BrandLogo({
  tone = 'onPage',
  size = 'compact',
  className,
}: BrandLogoProps): JSX.Element {
  const main = tone === 'onBrand' ? LOGO.light : LOGO.color;
  return (
    <picture>
      <source media={PRINT_QUERY} srcSet={LOGO.dark.srcSet} />
      {tone === 'onPage' ? <source media={DARK_QUERY} srcSet={LOGO.light.srcSet} /> : null}
      <img
        className={cn(styles.image, styles[size], className)}
        src={main.src}
        srcSet={main.srcSet}
        width={LOGO.width}
        height={LOGO.height}
        alt={t('app.name')}
        decoding="async"
      />
    </picture>
  );
}
