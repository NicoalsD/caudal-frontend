import type { JSX } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { strings } from '../../i18n/es';
import { Button } from '../../ui/primitives/Button';
import styles from './UpdatePrompt.module.css';

/**
 * Registers the service worker (registerType 'prompt') and offers the new version without
 * reloading on its own, so a capture in progress is never lost.
 */
export function UpdatePrompt(): JSX.Element {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <div role="status" aria-live="polite">
      {needRefresh ? (
        <section className={styles.prompt} aria-label={strings.pwa.updateAvailable}>
          <p className={styles.message}>{strings.pwa.updateAvailable}</p>
          <div className={styles.actions}>
            <Button variant="primary" onClick={() => void updateServiceWorker(true)}>
              {strings.pwa.update}
            </Button>
            <Button onClick={() => setNeedRefresh(false)}>{strings.pwa.later}</Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
