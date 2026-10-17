import type { JSX } from 'react';
import { Outlet } from 'react-router';

import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import styles from './Layout.module.css';
import { MAIN_CONTENT_ID } from './RoleLayout';

/** Layout without session bar, for the public page, login and session screens. */
export function PublicLayout(): JSX.Element {
  return (
    <>
      <a className={cn(styles.skipLink)} href={`#${MAIN_CONTENT_ID}`}>
        {t('app.skipToContent')}
      </a>
      <header className={cn(styles.header)}>
        <p className={cn(styles.brand)}>{t('app.name')}</p>
      </header>
      <main id={MAIN_CONTENT_ID} className={cn(styles.main)}>
        <Outlet />
      </main>
    </>
  );
}
