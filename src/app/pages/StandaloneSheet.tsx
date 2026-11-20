import type { JSX, ReactNode } from 'react';

import { BrandLogo } from '../../ui/brand/BrandLogo';
import { cn } from '../../ui/styles/cn';
import styles from '../layouts/Layout.module.css';
import { MAIN_CONTENT_ID } from '../layouts/RoleLayout';

/**
 * The public sheet without a router outlet, for pages drawn above every layout: the 403 of a role
 * guard and the error boundary. They get the same canvas, brand bar and white sheet as the rest.
 */
export function StandaloneSheet({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <div className={cn(styles.page)}>
      <header className={cn(styles.header)}>
        <p className={cn(styles.brand)}>
          <BrandLogo tone="onBrand" />
        </p>
      </header>
      <main id={MAIN_CONTENT_ID} className={cn(styles.main)}>
        {children}
      </main>
    </div>
  );
}
