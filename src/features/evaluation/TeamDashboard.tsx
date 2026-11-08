import { useState } from 'react';
import type { JSX } from 'react';
import { Bot, Radio } from 'lucide-react';

import { describeLastSeen } from '../../core/devices/lastSeen';
import type { DeviceKind, DeviceStatus } from '../../core/devices/deviceModel';
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
import { Card } from '../../ui/cards/Card';
import { StatTile } from '../../ui/cards/StatTile';
import { BarChart, SERIES_COLOR } from '../../ui/charts/BarChart';
import { DataTable } from '../../ui/data/DataTable';
import type { DataColumn } from '../../ui/data/DataTable';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Chip } from '../../ui/primitives/Chip';
import { TextTabs, tabPanelProps } from '../../ui/primitives/TextTabs';
import { cn } from '../../ui/styles/cn';

import styles from './TeamDashboard.module.css';

const PERCENT = 100;
const NO_ITEMS = 0;

interface DeviceRow {
  readonly id: string;
  readonly name: string;
  readonly kind: DeviceKind;
  readonly status: DeviceStatus;
  readonly lastSeen: ReturnType<typeof describeLastSeen>;
  readonly silent: boolean;
}

/** The devices with the verdict "responds / does not respond"; null when the person may not read them. */
function useDeviceRows(): {
  readonly allowed: boolean;
  readonly query: ReturnType<typeof useDevices>;
  readonly rows: readonly DeviceRow[];
} {
  const allowed = usePermission('DEVICE_MANAGE');
  const devices = useDevices();
  const [nowMs] = useState(() => Date.now());
  const rules = useCurrentRuleSet();
  const silentAfterHours = rules.data?.staleReadingHours ?? null;
  const rows = (devices.data?.pages ?? [])
    .flatMap((page) => page.items)
    .map((device) => {
      const lastSeen = describeLastSeen(device.lastSeenAt?.date.getTime() ?? null, nowMs);
      const silent =
        device.status === 'ACTIVE' &&
        (lastSeen.kind === 'never' ||
          (lastSeen.kind === 'hours' &&
            silentAfterHours !== null &&
            lastSeen.hours > silentAfterHours));
      return {
        id: device.id,
        name: device.name,
        kind: device.kind,
        status: device.status,
        lastSeen,
        silent,
      };
    });
  return { allowed, query: devices, rows };
}

/**
 * The two pastel tiles of the team that do not come from the evaluation: how many active devices
 * respond, and how many of the pilot's decisions the language model wrote. Each appears only for
 * whoever may read its data.
 */
export function TeamTiles(): JSX.Element {
  return (
    <>
      <DevicesTile />
      <SourcesTile />
    </>
  );
}

function DevicesTile(): JSX.Element | null {
  const { allowed, query, rows } = useDeviceRows();
  if (!allowed) {
    return null;
  }
  const active = rows.filter((row) => row.status === 'ACTIVE');
  const online = active.filter((row) => !row.silent).length;
  return (
    <StatTile
      icon={Radio}
      tint="mint"
      label={t('evaluation.tileDevices')}
      value={
        query.isSuccess ? `${String(online)} / ${String(active.length)}` : t('evaluation.tileNone')
      }
      delta={
        query.isSuccess && active.length > NO_ITEMS
          ? {
              text: t('evaluation.tileDevicesOf', {
                online: String(online),
                total: String(active.length),
              }),
              trend: online === active.length ? 'up' : 'down',
              tone: online === active.length ? 'good' : 'warn',
            }
          : undefined
      }
    />
  );
}

function useSources(allowed: boolean): {
  readonly llm: number;
  readonly rules: number;
  readonly isError: boolean;
} {
  const today = useServiceToday();
  const days = lastDays(today, DEFAULT_REPORT_DAYS);
  const period = days === null ? null : reportInstants(days.from, days.to);
  const report = useReport(period, allowed);
  const share = llmShare(report.data?.decisions ?? []);
  return { ...share, isError: report.isError };
}

function SourcesTile(): JSX.Element | null {
  const allowed = usePermission('REPORT_VIEW');
  const share = useSources(allowed);
  if (!allowed) {
    return null;
  }
  const total = share.llm + share.rules;
  return (
    <StatTile
      icon={Bot}
      tint="sand"
      label={t('evaluation.tileLlm')}
      value={
        total === NO_ITEMS
          ? t('evaluation.tileNone')
          : `${String(Math.round((share.llm / total) * PERCENT))} %`
      }
      delta={
        total === NO_ITEMS
          ? undefined
          : {
              text: t('evaluation.tileLlmOf', {
                llm: String(share.llm),
                rules: String(share.rules),
              }),
              trend: 'flat',
              tone: 'neutral',
            }
      }
    />
  );
}

/**
 * What the project team reads besides the model's evaluation: the health of the devices in a clean
 * table, where the pilot's decisions came from (language model or fallback rules) and the open
 * anomalies by kind, as a chart or as figures. Each block appears only for whoever may read it.
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
  const { allowed, query, rows } = useDeviceRows();
  if (!allowed) {
    return null;
  }
  const columns: DataColumn<DeviceRow>[] = [
    {
      id: 'name',
      header: t('teamDashboard.devices.name'),
      cell: (row) => <strong>{row.name}</strong>,
    },
    {
      id: 'kind',
      header: t('teamDashboard.devices.kind'),
      cell: (row) => kindText(row.kind),
      hideOnNarrow: true,
    },
    {
      id: 'status',
      header: t('teamDashboard.devices.status'),
      cell: (row) => statusText(row.status),
      hideOnNarrow: true,
    },
    {
      id: 'seen',
      header: t('teamDashboard.devices.lastSeen'),
      cell: (row) =>
        row.lastSeen.kind === 'never'
          ? t('teamDashboard.devices.never')
          : row.lastSeen.kind === 'recent'
            ? t('teamDashboard.devices.recent')
            : t('teamDashboard.devices.hoursAgo', { hours: String(row.lastSeen.hours) }),
    },
    {
      id: 'health',
      header: t('teamDashboard.devices.health'),
      align: 'end',
      cell: (row) =>
        row.silent ? (
          <Chip tone="coral">{t('teamDashboard.devices.silent')}</Chip>
        ) : (
          <Chip tone="mint">{t('teamDashboard.devices.ok')}</Chip>
        ),
    },
  ];
  return (
    <Card as="section" className={cn(styles.wide)} aria-labelledby="team-devices-title">
      <h2 id="team-devices-title" className={cn(styles.title)}>
        {t('teamDashboard.devices.title')}
      </h2>
      <p className={cn(styles.quiet)}>{t('teamDashboard.devices.gap')}</p>
      {query.isError ? (
        <p role="alert">{t('teamDashboard.devices.error')}</p>
      ) : query.isPending ? (
        <LoadingState message={t('devices.loading')} />
      ) : (
        <DataTable
          caption={t('teamDashboard.devices.tableCaption')}
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          empty={{ title: t('devices.empty') }}
        />
      )}
    </Card>
  );
}

function DecisionSources(): JSX.Element | null {
  const allowed = usePermission('REPORT_VIEW');
  const share = useSources(allowed);
  if (!allowed) {
    return null;
  }
  return (
    <Card as="section" aria-labelledby="team-sources-title">
      <h2 id="team-sources-title" className={cn(styles.title)}>
        {t('teamDashboard.sources.title', { days: String(DEFAULT_REPORT_DAYS) })}
      </h2>
      {share.isError ? (
        <p role="alert">{t('teamDashboard.sources.error')}</p>
      ) : (
        <BarChart
          label={t('teamDashboard.sources.chart')}
          rows={
            share.llm + share.rules === NO_ITEMS
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
    </Card>
  );
}

type AnomalyTab = 'chart' | 'table';
const ANOMALY_TABS_ID = 'team-anomalies';

interface KindCount {
  readonly kind: string;
  readonly total: number;
}

function AnomaliesByKind(): JSX.Element {
  const anomalies = useOpenAnomalies();
  const [tab, setTab] = useState<AnomalyTab>('chart');
  const counts = new Map<string, number>();
  for (const item of anomalies.data?.items ?? []) {
    counts.set(item.kind, (counts.get(item.kind) ?? NO_ITEMS) + 1);
  }
  const rows: KindCount[] = [...counts].map(([kind, total]) => ({ kind, total }));
  const sum = rows.reduce((acc, row) => acc + row.total, NO_ITEMS);
  const columns: DataColumn<KindCount>[] = [
    {
      id: 'kind',
      header: t('teamDashboard.anomalies.kind'),
      cell: (row) => anomalyKindText(row.kind as Parameters<typeof anomalyKindText>[0]),
    },
    {
      id: 'count',
      header: t('teamDashboard.anomalies.count'),
      align: 'end',
      cell: (row) => String(row.total),
    },
    {
      id: 'share',
      header: t('teamDashboard.anomalies.share'),
      align: 'end',
      cell: (row) => `${String(Math.round((row.total / sum) * PERCENT))} %`,
    },
  ];
  return (
    <Card as="section" aria-labelledby="team-anomalies-title">
      <div className={cn(styles.head)}>
        <h2 id="team-anomalies-title" className={cn(styles.title)}>
          {t('teamDashboard.anomalies.title')}
        </h2>
        <TextTabs
          label={t('teamDashboard.anomalies.tabsLabel')}
          idPrefix={ANOMALY_TABS_ID}
          value={tab}
          onChange={(next) => {
            setTab(next as AnomalyTab);
          }}
          tabs={[
            { id: 'chart', label: t('teamDashboard.anomalies.tabChart') },
            { id: 'table', label: t('teamDashboard.anomalies.tabTable') },
          ]}
        />
      </div>
      {anomalies.isError ? (
        <p role="alert">{t('teamDashboard.anomalies.error')}</p>
      ) : tab === 'chart' ? (
        <div {...tabPanelProps(ANOMALY_TABS_ID, 'chart')}>
          <BarChart
            label={t('teamDashboard.anomalies.chart')}
            rows={rows.map((row) => ({
              name: anomalyKindText(row.kind as Parameters<typeof anomalyKindText>[0]),
              values: { total: row.total },
            }))}
            series={[
              {
                key: 'total',
                label: t('teamDashboard.anomalies.series'),
                token: SERIES_COLOR.paramo,
              },
            ]}
          />
        </div>
      ) : (
        <div {...tabPanelProps(ANOMALY_TABS_ID, 'table')}>
          <DataTable
            caption={t('teamDashboard.anomalies.tableCaption')}
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.kind}
          />
        </div>
      )}
    </Card>
  );
}
