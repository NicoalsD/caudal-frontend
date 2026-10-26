/** File name of an acta's PDF when it is saved, for example acta-2026-10-01-2026-10-07.pdf. */
export function minutesPdfFileName(periodFrom: string, periodTo: string): string {
  return `acta-${periodFrom}-${periodTo}.pdf`;
}
