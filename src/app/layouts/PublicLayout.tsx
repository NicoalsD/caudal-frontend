import type { JSX } from 'react';
import { Outlet } from 'react-router';

import { strings } from '../../i18n/es';
import { MAIN_CONTENT_ID } from './RoleLayout';

/** Layout without session bar, for the public page, login and session screens. */
export function PublicLayout(): JSX.Element {
  return (
    <>
      <a href={`#${MAIN_CONTENT_ID}`}>{strings.app.skipToContent}</a>
      <header>
        <p>{strings.app.name}</p>
      </header>
      <main id={MAIN_CONTENT_ID}>
        <Outlet />
      </main>
    </>
  );
}
