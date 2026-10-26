import { t } from '../../i18n/t';
import type { SummaryScope } from '../../services/api/views';

/** The name of what a summary covers, as the people of the Board and the entities read it. */
export function summaryScopeText(scope: SummaryScope): string {
  return scope === 'MONTHLY_SUMMARY' ? t('entities.scopes.monthly') : t('entities.scopes.minutes');
}
