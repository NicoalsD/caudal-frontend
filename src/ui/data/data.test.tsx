/* eslint-disable no-restricted-syntax -- sample strings of test fixtures, not product copy */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { AreaTrend } from './AreaTrend';
import { ChartCard } from './ChartCard';
import { DataTable } from './DataTable';

interface Row {
  readonly id: string;
  readonly name: string;
}
const COLUMNS = [{ id: 'name', header: 'Nombre', cell: (row: Row) => row.name }];

describe('DataTable', () => {
  it('renders a captioned table with column headers', () => {
    render(
      <DataTable
        caption="Lecturas"
        columns={COLUMNS}
        rows={[{ id: '1', name: 'Tanque' }]}
        getRowKey={(row) => row.id}
      />,
    );

    const table = screen.getByRole('table', { name: 'Lecturas' });
    expect(within(table).getByRole('columnheader', { name: 'Nombre' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'Tanque' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Lecturas' })).toHaveAttribute('tabindex', '0');
  });

  it('shows an empty state instead of an empty table', () => {
    render(
      <DataTable caption="Lecturas" columns={COLUMNS} rows={[]} getRowKey={(row) => row.id} />,
    );

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(t('ui.tableEmptyTitle'))).toBeVisible();
  });

  it('marks the table busy while loading', () => {
    render(
      <DataTable
        caption="Lecturas"
        columns={COLUMNS}
        rows={[]}
        getRowKey={(row) => row.id}
        loading
      />,
    );

    expect(screen.getByRole('table', { name: 'Lecturas' })).toHaveAttribute('aria-busy', 'true');
  });
});

describe('AreaTrend', () => {
  it('describes the chart in text', () => {
    render(
      <AreaTrend
        title="Nivel del tanque"
        width={400}
        data={[
          { label: 'lun', value: 1 },
          { label: 'mar', value: 3 },
        ]}
        formatValue={(value) => `${String(value)} m`}
      />,
    );

    expect(screen.getByRole('img', { name: /Nivel del tanque.*2 puntos.*1 m.*3 m/ })).toBeVisible();
  });

  it('says there is no data for an empty series', () => {
    render(<AreaTrend title="Nivel" width={400} data={[]} formatValue={String} />);

    expect(screen.getByRole('img', { name: t('ui.chartNoData') })).toBeVisible();
  });
});

describe('ChartCard', () => {
  function Demo() {
    const [range, setRange] = useState('7d');
    return (
      <ChartCard
        title="Nivel"
        value="2,4 m"
        ranges={[
          { id: '1d', label: '1D' },
          { id: '7d', label: '7D' },
        ]}
        range={range}
        onRangeChange={setRange}
      >
        <p>{range}</p>
      </ChartCard>
    );
  }

  it('is a named region with a range selector', async () => {
    const user = userEvent.setup();
    render(<Demo />);

    expect(screen.getByRole('region', { name: 'Nivel' })).toBeVisible();
    expect(screen.getByRole('tablist', { name: t('ui.rangeLabel') })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: '1D' }));
    expect(screen.getByRole('tab', { name: '1D' })).toHaveAttribute('aria-selected', 'true');
  });
});
