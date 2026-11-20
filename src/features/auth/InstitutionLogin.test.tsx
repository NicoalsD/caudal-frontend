import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { institutionLoginPath, ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { STATUS } from '../../test/constants';
import { TEST_PASSWORD, TEST_USERS } from '../../test/factories/auth';
import {
  buildInstitutionDirectory,
  OTHER_INSTITUTION,
  TEST_INSTITUTION,
} from '../../test/factories/institutions';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';
import { signInThroughSteps } from '../../test/signInForm';
import { REMEMBERED_INSTITUTION_KEY } from '../../services/preferences/rememberedInstitutionPreference';

/** The first directory call fails; the retry button then gets the list. */
const FAILED_DIRECTORY_CALLS = 1;

const TWO_INSTITUTIONS = buildInstitutionDirectory([TEST_INSTITUTION, OTHER_INSTITUTION]);

function serveDirectory(body: ReturnType<typeof buildInstitutionDirectory>): void {
  server.use(http.get(apiUrl('/public/institutions'), () => HttpResponse.json(body)));
}

const choiceHeading = () =>
  screen.findByRole('heading', { level: 1, name: t('auth.institution.title') });
const credentialsHeading = () =>
  screen.findByRole('heading', { level: 1, name: t('screens.login') });

describe('institution step of the sign in', () => {
  it('keeps the only institution already chosen and continues to its credentials', async () => {
    const { router } = renderApp(ROUTE_PATHS.login);
    const user = userEvent.setup();

    const option = await screen.findByRole('radio', { name: TEST_INSTITUTION.name });
    expect(option).toBeChecked();
    await user.click(screen.getByRole('button', { name: t('auth.institution.continue') }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(institutionLoginPath(TEST_INSTITUTION.slug));
    });
    expect(await screen.findByLabelText(t('auth.username'))).toBeInTheDocument();
    expect(screen.getByText(TEST_INSTITUTION.name)).toBeInTheDocument();
  });

  it('searches the list by name, ignoring accents, and chooses from the result', async () => {
    serveDirectory(TWO_INSTITUTIONS);
    const { router } = renderApp(ROUTE_PATHS.login);
    const user = userEvent.setup();

    await screen.findByRole('radio', { name: TEST_INSTITUTION.name });
    await user.type(
      screen.getByRole('searchbox', { name: t('auth.institution.searchLabel') }),
      'ejido',
    );

    const list = screen.getByRole('group', { name: t('auth.institution.listLabel') });
    expect(within(list).getAllByRole('radio')).toHaveLength(1);
    await user.click(within(list).getByRole('radio', { name: OTHER_INSTITUTION.name }));
    await user.click(screen.getByRole('button', { name: t('auth.institution.continue') }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(institutionLoginPath(OTHER_INSTITUTION.slug));
    });
  });

  it('shows a notice when the search matches nothing and keeps the list empty of choices', async () => {
    serveDirectory(TWO_INSTITUTIONS);
    renderApp(ROUTE_PATHS.login);
    const user = userEvent.setup();

    await user.type(
      await screen.findByRole('searchbox', { name: t('auth.institution.searchLabel') }),
      'zzzz',
    );

    expect(screen.getByText(t('auth.institution.noMatch'))).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('auth.institution.continue') })).toBeDisabled();
  });

  it('says so when the directory is empty', async () => {
    serveDirectory(buildInstitutionDirectory([]));
    renderApp(ROUTE_PATHS.login);

    expect(await screen.findByText(t('auth.institution.empty'))).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the directory error with a retry that loads the list again', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/public/institutions'), () => {
        calls += 1;
        // A 4xx is not retried by the query policy, so the screen shows the error at once.
        return calls <= FAILED_DIRECTORY_CALLS
          ? errorResponse(STATUS.badRequest, 'VALIDATION_ERROR')
          : HttpResponse.json(TWO_INSTITUTIONS);
      }),
    );
    renderApp(ROUTE_PATHS.login);
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(t('auth.institution.loadError'));
    await user.click(screen.getByRole('button', { name: t('auth.institution.retry') }));

    expect(await screen.findByRole('radio', { name: OTHER_INSTITUTION.name })).toBeInTheDocument();
    expect(calls).toBe(FAILED_DIRECTORY_CALLS + 1);
  });

  it('moves the focus to the heading of the new step', async () => {
    renderApp(ROUTE_PATHS.login);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('auth.institution.continue') }));

    expect(await credentialsHeading()).toHaveFocus();
  });

  it('opens the credentials step straight from /i/{slug}/login', async () => {
    renderApp(institutionLoginPath(TEST_INSTITUTION.slug));

    expect(await screen.findByLabelText(t('auth.username'))).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByText(TEST_INSTITUTION.name)).toBeInTheDocument();
  });

  it('sends a link to an unknown institution back to the choice with a notice', async () => {
    const { router } = renderApp(institutionLoginPath('no-existe'));

    expect(await screen.findByText(t('auth.institution.unknownSlug'))).toBeInTheDocument();
    await choiceHeading();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
    });
  });

  it('changes the institution from the credentials step and keeps the next target', async () => {
    serveDirectory(TWO_INSTITUTIONS);
    const next = encodeURIComponent(ROUTE_PATHS.board.rules);
    const { router } = renderApp(`${institutionLoginPath(TEST_INSTITUTION.slug)}?next=${next}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('auth.institution.change') }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
    });
    expect(router.state.location.search).toBe(`?next=${next}`);
    expect(await choiceHeading()).toBeInTheDocument();
  });

  it('remembers the chosen slug only after it is confirmed, never the password', async () => {
    const { router } = renderApp(ROUTE_PATHS.login);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: t('auth.institution.continue') }));
    await screen.findByLabelText(t('auth.username'));

    expect(localStorage.getItem(REMEMBERED_INSTITUTION_KEY)).toBe(TEST_INSTITUTION.slug);
    await signInThroughSteps(user, TEST_USERS.operator.username, TEST_PASSWORD);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.home);
    });
  });

  it('answers a wrong password in the chosen institution with the generic 401 text', async () => {
    serveDirectory(TWO_INSTITUTIONS);
    renderApp(institutionLoginPath(OTHER_INSTITUTION.slug));
    const user = userEvent.setup();

    await signInThroughSteps(user, TEST_USERS.admin.username, TEST_PASSWORD);

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.invalidCredentials'));
  });
});
