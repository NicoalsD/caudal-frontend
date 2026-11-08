import { useState } from 'react';
import type { JSX } from 'react';

import { describeLastSeen } from '../../core/devices/lastSeen';
import { llmShare } from '../../core/reports/reportModel';
import { lastDays, reportInstants, DEFAULT_REPORT_DAYS } from '../../core/reports/reportPeriod';
import { anomalyKindText } from '../../i18n/anomalyKindText';
import { kindText, statusText } from '../../i18n/deviceText';
import { t } from '../../i18n/t';
import { useDevices } from '../../state/hooks/useDevices';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useOpenAnomalies } from '../../state/hooks/useAnomalies';
import { usePermission } from '../../state/hooks/usePermission';
import { useReport } from '../../state/hooks/useReports';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { BarChart, SERIES_COLOR } from '../../ui/charts/BarChart';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { TableScroll } from '../../ui/primitives/TableScroll';
import { cn } from '../../ui/styles/cn';

import styles from './TeamDashboard.module.css';

/**
 * What the project team reads besides the model's evaluation: the health of the devices, how many
 * of the pilot's decisions came from the fallback rules instead of the language model, and the
 * open anomalies by kind. Each block appears only for whoever may read its data.
 */
export function TeamDashboard(): JSX.Element {
  return (
    <div className={cn(styles.grid)}>
      <DeviceHealth />
      <DecisionSources />
      <AnomaliesByKind />
    </div>
  );
}

function DeviceHealth(): JSX.Element | null {
  const allowed = usePermission('DEVICE_MANAGE');
  const devices = useDevices();
  const [nowMs] = useState(() => Date.now());
  const rules = useCurrentRuleSet();
  if (!allowed) {
    return null;
  }
  const items = (devices.data?.pages ?? []).flatMap((page) => page.items);
  const silentAfterHours = rules.data?.staleReadingHours ?? null;
  return (
    <section className={cn(styles.card, styles.wide)} aria-labelledby="team-devices-title">
      <h2 id="team-devices-title" className={cn(styles.title)}>
        {t('teamDashboard.devices.title')}
      </h2>
      <p className={cn(styles.quiet)}>{t('teamDashboard.devices.gap')}</p>
      {devices.isPending ? (
        <LoadingState message={t('devices.loading')} />
      ) : devices.isError ? (
        <p role="alert">{t('teamDashboard.devices.error')}</p>
      ) : items.length === 0 ? (
        <p>{t('devices.empty')}</p>
      ) : (
        <TableScroll label={t('teamDashboard.devices.title')}>
          <table className={cn(styles.table)}>
            <thead>
              <tr>
                <th scope="col">{t('teamDashboard.devices.name')}</th>
                <th scope="col">{t('teamDashboard.devices.kind')}</th>
                <th scope="col">{t('teamDashboard.devices.status')}</th>
                <th scope="col">{t('teamDashboard.devices.lastSeen')}</th>
                <th scope="col">{t('teamDashboard.devices.health')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((device) => {
                const seen = describeLastSeen(device.lastSeenAt?.date.getTime() ?? null, nowMs);
                const silent =
                  device.status === 'ACTIVE' &&
                  (seen.kind === 'never' ||
                    (seen.kind === 'hours' &&
                      silentAfterHours !== null &&
                      seen.hours > silentAfterHours));
                return (
                  <tr key={device.id}>
                    <th scope="row">{device.name}</th>
                    <td>{kindText(device.kind)}</td>
                    <td>{statusText(device.status)}</td>
                    <td>
                      {seen.kind === 'never'
                        ? t('teamDashboard.devices.never')
                        : seen.kind === 'recent'
                          ? t('teamDashboard.devices.recent')
                          : t('teamDashboard.devices.hoursAgo', { hours: String(seen.hours) })}
                    </td>
                    <td>
                      {silent ? t('teamDashboard.devices.silent') : t('teamDashboard.devices.ok')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      )}
    </section>
  );
}

function DecisionSources(): JSX.Element | null {
  const allowed = usePermission('REPORT_VIEW');
  const today = useServiceToday();
  const days = lastDays(today, DEFAULT_REPORT_DAYS);
  const period = days === null ? null : reportInstants(days.from, days.to);
  const report = useReport(period, allowed);
  if (!allowed) {
    return null;
  }
  const share = llmShare(report.data?.decisions ?? []);
  return (
    <section className={cn(styles.card)} aria-labelledby="team-sources-title">
      <h2 id="team-sources-title" className={cn(styles.title)}>
        {t('teamDashboard.sources.title', { days: String(DEFAULT_REPORT_DAYS) })}
      </h2>
      {report.isError ? (
        <p role="alert">{t('teamDashboard.sources.error')}</p>
      ) : (
        <BarChart
          label={t('teamDashboard.sources.chart')}
          rows={
            share.llm + share.rules === 0
              ? []
              : [
                  {
                    name: t('teamDashboard.sources.row'),
                    values: { llm: share.llm, rules: share.rules },
                  },
                ]
          }
          series={[
            { key: 'llm', label: t('assistant.source.llm'), token: SERIES_COLOR.water },
            { key: 'rules', label: t('assistant.source.rules'), token: SERIES_COLOR.ochre },
          ]}
          stacked
        />
      )}
    </section>
  );
}

function AnomaliesByKind(): JSX.Element {
  const anomalies = useOpenAnomalies();
  const counts = new Map<string, number>();
  for (const item of anomalies.data?.items ?? []) {
    counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  }
  return (
    <section className={cn(styles.card)} aria-labelledby="team-anomalies-title">
      <h2 id="team-anomalies-title" className={cn(styles.title)}>
        {t('teamDashboard.anomalies.title')}
      </h2>
      {anomalies.isError ? (
        <p role="alert">{t('teamDashboard.anomalies.error')}</p>
      ) : (
        <BarChart
          label={t('teamDashboard.anomalies.chart')}
          rows={[...counts].map(([kind, total]) => ({
            name: anomalyKindText(kind as Parameters<typeof anomalyKindText>[0]),
            values: { total },
          }))}
          series={[
            {
              key: 'total',
              label: t('teamDashboard.anomalies.series'),
              token: SERIES_COLOR.paramo,
            },
          ]}
        />
      )}
    </section>
  );
}
