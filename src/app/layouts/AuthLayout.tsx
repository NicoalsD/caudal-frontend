import type { JSX } from 'react';
import { Link, Outlet } from 'react-router';
import { ArrowLeft, CheckCircle2, CloudOff, ListChecks, LockKeyhole } from 'lucide-react';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { BrandLogo } from '../../ui/brand/BrandLogo';
import { Card } from '../../ui/cards/Card';
import { Chip } from '../../ui/primitives/Chip';
import { cn } from '../../ui/styles/cn';
import styles from './AuthLayout.module.css';
import { MAIN_CONTENT_ID } from './RoleLayout';

const POINTS = [
  { key: 'panelOffline', Icon: CloudOff },
  { key: 'panelExplained', Icon: ListChecks },
  { key: 'panelApproved', Icon: CheckCircle2 },
] as const;

/** Soft lines of water behind the card; pure decoration, hidden from assistive technology. */
function Waves(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn(styles.waves)}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
    >
      <path d="M0 150 C 60 110, 120 190, 200 150 S 340 110, 400 150" />
      <path d="M0 172 C 60 132, 120 212, 200 172 S 340 132, 400 172" />
      <path d="M0 194 C 60 154, 120 234, 200 194 S 340 154, 400 194" />
      <path d="M0 128 C 70 88, 130 168, 210 128 S 340 88, 400 128" />
    </svg>
  );
}

/**
 * Sign in and password screens: one card centered on the tinted canvas, with the logo above and
 * soft lines of water behind. The field screens stay calm: nothing here moves.
 */
export function AuthLayout(): JSX.Element {
  return (
    <div className={cn(styles.shell)}>
      <Waves />
      <a className={cn(styles.skipLink)} href={`#${MAIN_CONTENT_ID}`}>
        {t('app.skipToContent')}
      </a>
      <header className={cn(styles.header)}>
        <Link to={ROUTE_PATHS.root} className={cn(styles.brand)} aria-label={t('app.name')}>
          <BrandLogo />
        </Link>
        <Link to={ROUTE_PATHS.root} className={cn(styles.back)}>
          <ArrowLeft aria-hidden="true" />
          {t('auth.backToHome')}
        </Link>
      </header>
      <main id={MAIN_CONTENT_ID} className={cn(styles.main)}>
        <Card padded={false} className={cn(styles.card)}>
          <Outlet />
          <p className={cn(styles.secure)}>
            <LockKeyhole aria-hidden="true" />
            {t('auth.secureNote')}
          </p>
        </Card>
        <aside className={cn(styles.points)} aria-label={t('auth.tagline')}>
          <p className={cn(styles.tagline)}>{t('auth.tagline')}</p>
          <ul className={cn(styles.chips)}>
            {POINTS.map(({ key, Icon }) => (
              <li key={key}>
                <Chip tone="aqua" icon={<Icon aria-hidden="true" />}>
                  {t(`auth.${key}`)}
                </Chip>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}
