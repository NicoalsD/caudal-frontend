/**
 * Status of a damage report (Reglas-de-negocio.md section 15). The names are the API's; the words
 * people read come from es.ts, and the icon from the feature layer.
 */
export const REPORT_STATUSES = [
  'REPORTED',
  'VERIFYING',
  'CONFIRMED',
  'RESOLVED',
  'DISMISSED',
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Whether an unknown value from the API is one of the five statuses. */
export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === 'string' && (REPORT_STATUSES as readonly string[]).includes(value);
}

/** Tone of a status for the screen: how far the report got, never a color alone. */
export type ReportTone = 'received' | 'inProgress' | 'confirmed' | 'closed';

const TONE_BY_STATUS: Readonly<Record<ReportStatus, ReportTone>> = {
  REPORTED: 'received',
  VERIFYING: 'inProgress',
  CONFIRMED: 'confirmed',
  RESOLVED: 'closed',
  DISMISSED: 'closed',
};

export function reportStatusTone(status: ReportStatus): ReportTone {
  return TONE_BY_STATUS[status];
}
