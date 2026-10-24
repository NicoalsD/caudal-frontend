import type { JSX } from 'react';
import { Link, Outlet } from 'react-router';
import { ArrowLeft, CheckCircle2, CloudOff, ListChecks, LockKeyhole } from 'lucide-react';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { BrandLogo } from '../../ui/brand/BrandLogo';
import { cn } from '../../ui/styles/cn';
import styles from './AuthLayout.module.css';
import { MAIN_CONTENT_ID } from './RoleLayout';

/**
 * Sign in and password screens: the form on one side, a panel in the brand's deep teal on the other
 * (hidden on small screens). No animation here; the field screens stay calm (design-theme.md).
 */
export function AuthLayout(): JSX.Element {
  const points = [
    { key: 'panelOffline', Icon: CloudOff },
    { key: 'panelExplained', Icon: ListChecks },
    { key: 'panelApproved', Icon: CheckCircle2 },
  ] as const;

  return (
    <div className={cn(styles.shell)}>
      <a className={cn(styles.skipLink)} href={`#${MAIN_CONTENT_ID}`}>
        {t('app.skipToContent')}
      </a>
      <div className={cn(styles.formSide)}>
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
          <div className={cn(styles.card)}>
            <Outlet />
          </div>
          <p className={cn(styles.secure)}>
            <LockKeyhole aria-hidden="true" />
            {t('auth.secureNote')}
          </p>
        </main>
      </div>
      <aside className={cn(styles.panel)} aria-label={t('auth.tagline')}>
        <div className={cn(styles.panelInner)}>
          <p className={cn(styles.panelTitle)}>{t('auth.panelTitle')}</p>
          <ul className={cn(styles.panelPoints)}>
            {points.map(({ key, Icon }) => (
              <li key={key}>
                <Icon aria-hidden="true" />
                {t(`auth.${key}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className={cn(styles.panelLevel)}>
          <p className={cn(styles.panelTagline)}>{t('auth.tagline')}</p>
        </div>
      </aside>
    </div>
  );
}
