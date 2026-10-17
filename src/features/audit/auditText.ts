import { codeToKey } from '../../core/errors/ErrorCodeMapper';
import { strings } from '../../i18n/es';

type Texts = Readonly<Record<string, string>>;

/** Upper-case codes the audit log can show, in the order of the filter list. */
export const KNOWN_ACTION_CODES: readonly string[] = [
  'RULESET_ACTIVATED',
  'SCHEDULE_PUBLISHED',
  'RETENTION_POLICY_CHANGED',
  'CREATE_USER',
  'UPDATE_USER',
  'GRANT_MEMBERSHIP',
  'REVOKE_MEMBERSHIP',
  'ISSUE_RESET_GRANT',
  'RESET_PASSWORD',
  'CHANGE_PASSWORD',
  'CREATE_SUMMARY_SHARE',
  'REVOKE_SUMMARY_SHARE',
  'GENERATE_MINUTES',
  'FINALIZE_MINUTES',
  'GENERATE_PROPOSAL',
  'APPROVE_PROPOSAL',
  'MODIFY_PROPOSAL',
  'REJECT_PROPOSAL',
  'CREATE_READING',
  'CORRECT_READING',
  'RECORD_EXECUTION',
  'CLOSE_DAY',
  'CREATE_INCIDENT',
  'UPDATE_INCIDENT_STATUS',
];

/** Plain-language text of an audit action; the raw code when the catalog does not know it. */
export function actionLabel(code: string): string {
  return lookup(strings.audit.actions, code);
}

export function securityTypeLabel(code: string): string {
  return lookup(strings.audit.securityTypes, code);
}

export function severityLabel(code: string): string {
  return lookup(strings.audit.severities, code);
}

export function actorTypeLabel(code: string): string {
  return lookup(strings.audit.actorTypes, code);
}

/** Looks the code up by its camelCase key (ERROR_CODE becomes errorCode in es.ts). */
function lookup(texts: unknown, code: string): string {
  const table = texts as Texts;
  return table[codeToKey(code)] ?? code;
}
