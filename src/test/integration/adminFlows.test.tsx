import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { formatDayKey } from '../../core/format/time';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { PERMISSIONS_BY_ROLE, TEST_AQUEDUCT_ID } from '../factories/auth';
import { buildSessionUser } from '../factories/session';
import { createAdminBackend } from '../msw/adminBackend';
import { server } from '../msw/server';
import { renderApp } from '../renderApp';

/** Admin screens end to end over MSW: accounts, entities, the audit log (F095). */

const ACTIVATION_CODE = 'ABCD-EFGH-JKMN';
const AUDIT_PERMISSION = 'AUDIT_VIEW';
const HASH_LENGTH = 64;
const HASH_HEX = 'a'.repeat(HASH_LENGTH);
const CHAIN_HEX = 'b'.repeat(HASH_LENGTH);
const FIRST_PAGE_SIZE = 2;
const SECOND_PAGE_SIZE = 4;
const LAST_QUERY = -1;
const SUPPORT_ENTITY_ID = 'user-entity';

const admin = () =>
  buildSessionUser({
    role: 'BOARD_ADMIN',
    aqueductId: TEST_AQUEDUCT_ID,
    permissions: [...PERMISSIONS_BY_ROLE.BOARD_ADMIN],
  });

const boardMember = () =>
  buildSessionUser({ role: 'BOARD_MEMBER', permissions: [...PERMISSIONS_BY_ROLE.BOARD_MEMBER] });

const team = () =>
  buildSessionUser({
    role: 'PROJECT_TEAM',
    aqueductId: TEST_AQUEDUCT_ID,
    permissions: [...PERMISSIONS_BY_ROLE.PROJECT_TEAM, AUDIT_PERMISSION],
  });

const entityMembership = () => ({
  id: 'membership-entity',
  user_id: SUPPORT_ENTITY_ID,
  aqueduct_id: TEST_AQUEDUCT_ID,
  role_code: 'SUPPORT_ENTITY' as const,
  valid_from: '2026-01-01T00:00:00-05:00',
  valid_to: null,
  granted_by: 'user-admin',
});

const entityUser = () => ({
  id: SUPPORT_ENTITY_ID,
  username: 'entidad.prueba',
  full_name: 'Entidad Prueba',
  status: 'ACTIVE' as const,
  locked_until: null,
  must_change_password: false,
  last_login_at: null,
});

describe('user administration (F089)', () => {
  it('creates an account and shows its activation code exactly once', async () => {
    const backend = createAdminBackend({ aqueductId: TEST_AQUEDUCT_ID });
    server.use(...backend.handlers);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.users, { user: admin() });

    await user.click(await screen.findByRole('button', { name: t('users.create') }));
    const dialog = await screen.findByRole('dialog', { name: t('users.createTitle') });
    await user.type(
      within(dialog).getByRole('textbox', { name: t('users.usernameLabel') }),
      'operador.nuevo',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: t('users.fullNameLabel') }),
      'Persona Nueva',
    );
    await user.click(within(dialog).getByRole('radio', { name: t('users.roles.operator') }));
    await user.click(within(dialog).getByRole('button', { name: t('users.submitCreate') }));

    const codeDialog = await screen.findByRole('dialog', { name: t('users.codeTitle') });
    expect(within(codeDialog).getByText(t('users.codeWarning'))).toBeInTheDocument();
    expect(screen.getAllByText(ACTIVATION_CODE)).toHaveLength(1);

    await user.click(within(codeDialog).getByRole('button', { name: t('users.codeDone') }));
    await waitFor(() => {
      expect(screen.queryByText(ACTIVATION_CODE)).not.toBeInTheDocument();
    });
    expect(backend.users.map((account) => account.username)).toContain('operador.nuevo');
  });

  it('keeps a board member out of the user administration', async () => {
    server.use(...createAdminBackend({ aqueductId: TEST_AQUEDUCT_ID }).handlers);
    renderApp(ROUTE_PATHS.board.users, { user: boardMember() });

    expect(await screen.findByText(t('errors.forbiddenTitle'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('users.create') })).not.toBeInTheDocument();
  });
});

describe('summary authorizations (F090 and F091)', () => {
  it('authorizes a summary for an entity and then revokes it', async () => {
    const backend = createAdminBackend({
      aqueductId: TEST_AQUEDUCT_ID,
      users: [entityUser()],
      memberships: [entityMembership()],
    });
    server.use(...backend.handlers);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.entities, { user: admin() });

    await user.click(await screen.findByRole('button', { name: t('entities.create') }));
    const dialog = await screen.findByRole('dialog', { name: t('entities.createTitle') });
    await user.click(await within(dialog).findByRole('radio', { name: /Entidad Prueba/ }));
    await user.click(within(dialog).getByRole('radio', { name: t('entities.scopes.monthly') }));
    fireEvent.change(within(dialog).getByLabelText(t('entities.periodFromLabel')), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(within(dialog).getByLabelText(t('entities.periodToLabel')), {
      target: { value: '2026-10-31' },
    });
    fireEvent.change(within(dialog).getByLabelText(t('entities.expiresLabel')), {
      target: { value: '2026-11-30T23:59' },
    });
    await user.type(
      within(dialog).getByRole('textbox', { name: t('entities.reasonLabel') }),
      'Informe para la alcaldía municipal.',
    );
    await user.click(within(dialog).getByRole('button', { name: t('entities.submitCreate') }));

    expect(
      await screen.findByText(
        t('entities.period', {
          from: formatDayKey('2026-10-01'),
          to: formatDayKey('2026-10-31'),
        }),
      ),
    ).toBeInTheDocument();
    expect(backend.summaries).toHaveLength(1);

    await user.click(await screen.findByRole('button', { name: t('entities.revoke') }));
    const confirm = await screen.findByRole('dialog', { name: t('entities.revokeTitle') });
    expect(within(confirm).getByText(t('entities.revokeDescription'))).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: t('entities.submitRevoke') }));

    expect(await screen.findByText(t('entities.empty'))).toBeInTheDocument();
    expect(backend.summaries).toHaveLength(0);
  });

  it('shows the entity only what the server authorized, with the four counts', async () => {
    server.use(
      ...createAdminBackend({
        aqueductId: TEST_AQUEDUCT_ID,
        summaries: [
          {
            summary_share_id: 'share-1',
            scope: 'MONTHLY_SUMMARY',
            period_from: '2026-10-01',
            period_to: '2026-10-31',
            content: { observed: 12, estimated: 3, inferred: 1, confirmed: 2 },
          },
        ],
      }).handlers,
    );
    renderApp(ROUTE_PATHS.entity.summaries, {
      user: buildSessionUser({ role: 'SUPPORT_ENTITY', permissions: ['SUMMARY_VIEW'] }),
    });

    expect(await screen.findByText(t('entities.scopes.monthly'))).toBeInTheDocument();
    const chips = screen.getByRole('list', { name: t('entitySummaries.sectionsLabel') });
    expect(chips.querySelector('[data-section="observed"]')).toHaveTextContent('12');
    expect(chips.querySelector('[data-section="confirmed"]')).toHaveTextContent('2');
  });

  it('tells the entity when nothing has been authorized', async () => {
    server.use(...createAdminBackend({ aqueductId: TEST_AQUEDUCT_ID, summaries: [] }).handlers);
    renderApp(ROUTE_PATHS.entity.summaries, {
      user: buildSessionUser({ role: 'SUPPORT_ENTITY', permissions: ['SUMMARY_VIEW'] }),
    });

    expect(await screen.findByText('Aún no tienes resúmenes autorizados.')).toBeInTheDocument();
  });
});

describe('audit log (F093)', () => {
  const entries = [
    'RULESET_ACTIVATED',
    'CREATE_USER',
    'REVOKE_SUMMARY_SHARE',
    'CLOSE_DAY',
    'CORRECT_READING',
  ].map((action, index) => ({
    id: index + 1,
    occurred_at: '2026-10-09T15:40:00-05:00',
    actor_type: 'USER' as const,
    actor_id: null,
    action,
    entity_type: 'user',
    entity_id: `entity-${index + 1}`,
    before_state: null,
    after_state: null,
    prev_hash: HASH_HEX,
    row_hash: CHAIN_HEX,
  }));

  it('pages with "Ver más" until the last entry, showing plain action names', async () => {
    server.use(
      ...createAdminBackend({ aqueductId: TEST_AQUEDUCT_ID, auditEntries: entries }).handlers,
    );
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.audit, { user: team() });

    await screen.findByRole('heading', { level: 3, name: 'Se creó un usuario' });
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(FIRST_PAGE_SIZE);

    await user.click(screen.getByRole('button', { name: t('audit.loadMore') }));
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(SECOND_PAGE_SIZE);
    });

    await user.click(screen.getByRole('button', { name: t('audit.loadMore') }));
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(entries.length);
    });
    expect(screen.queryByRole('button', { name: t('audit.loadMore') })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Cerró el día' })).toBeInTheDocument();
  });

  it('filters by action and sends the filter to the server', async () => {
    const backend = createAdminBackend({ aqueductId: TEST_AQUEDUCT_ID, auditEntries: entries });
    server.use(...backend.handlers);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.audit, { user: team() });

    await screen.findByRole('heading', { level: 3, name: 'Se creó un usuario' });
    await user.selectOptions(screen.getByLabelText(t('audit.action')), 'RULESET_ACTIVATED');

    await waitFor(() => {
      expect(backend.queries.at(LAST_QUERY)?.params.action).toBe('RULESET_ACTIVATED');
    });
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Se activó una versión de reglas' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });
});
