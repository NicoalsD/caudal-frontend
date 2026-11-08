import { Inbox } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

import { t } from '../../i18n/t';
import { Skeleton } from '../primitives/Skeleton';
import { TableScroll } from '../primitives/TableScroll';
import { cn } from '../styles/cn';
import styles from './DataTable.module.css';

export interface DataColumn<Row> {
  readonly id: string;
  readonly header: string;
  /** Renders the cell. Put the primary identifier (avatar + name) in the first column. */
  readonly cell: (row: Row) => ReactNode;
  readonly align?: 'start' | 'end';
  /** Hides the column below the tablet width so a phone keeps the essentials. */
  readonly hideOnNarrow?: boolean;
}

export interface TableEmpty {
  readonly title?: string;
  readonly description?: string;
  /** An action that fills the table ("Registrar la primera lectura"). */
  readonly action?: ReactNode;
}

interface DataTableProps<Row> {
  /** Names the table for assistive technology; shown only if `showCaption`. */
  readonly caption: string;
  readonly showCaption?: boolean;
  readonly columns: readonly DataColumn<Row>[];
  readonly rows: readonly Row[];
  readonly getRowKey: (row: Row) => string;
  readonly loading?: boolean;
  readonly empty?: TableEmpty;
  readonly className?: string;
}

const SKELETON_ROWS = 4;

/**
 * Airy table: tall rows, quiet header, no vertical rules. It scrolls sideways inside a focusable
 * region on narrow screens and shows an empty state or loading rows instead of an empty body.
 */
export function DataTable<Row>({
  caption,
  showCaption = false,
  columns,
  rows,
  getRowKey,
  loading = false,
  empty = {},
  className,
}: DataTableProps<Row>): JSX.Element {
  if (!loading && rows.length === 0) {
    return (
      <div className={cn(styles.empty, className)}>
        <Inbox aria-hidden="true" className={cn(styles.emptyIcon)} />
        <p className={cn(styles.emptyTitle)}>{empty.title ?? t('ui.tableEmptyTitle')}</p>
        <p className={cn(styles.emptyText)}>{empty.description ?? t('ui.tableEmptyDescription')}</p>
        {empty.action}
      </div>
    );
  }
  return (
    <TableScroll label={caption} className={cn(styles.scroll, className)}>
      <table className={cn(styles.table)} aria-busy={loading}>
        <caption className={cn(showCaption ? styles.caption : styles.sr)}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  styles.th,
                  column.align === 'end' && styles.end,
                  column.hideOnNarrow === true && styles.narrow,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: SKELETON_ROWS }, (_unused, row) => (
                <tr key={row} className={cn(styles.row)}>
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(styles.td, column.hideOnNarrow === true && styles.narrow)}
                    >
                      <Skeleton />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={getRowKey(row)} className={cn(styles.row)}>
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        styles.td,
                        column.align === 'end' && styles.end,
                        column.hideOnNarrow === true && styles.narrow,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
