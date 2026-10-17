import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import type { DraftFormOutput, DraftFormValues } from '../../core/rules/draftForm';
import { assignPriorityRanks } from '../../core/rules/sectorOrder';
import { t } from '../../i18n/t';
import type { SectorView } from '../../services/api/views';
import { Button } from '../../ui/primitives/Button';
import { CheckboxField } from '../../ui/primitives/CheckboxField';
import { cn } from '../../ui/styles/cn';
import styles from './Rules.module.css';

interface SectorsEditorProps {
  readonly sectors: readonly SectorView[];
}

type Direction = 'up' | 'down';

/**
 * The sector settings of the draft: who receives shifts, who is priority and in what order.
 * Order is changed with Subir / Bajar buttons (the accessible alternative to dragging). The rank
 * of each priority sector is its place among the priority ones; it is computed when saving.
 */
export function SectorsEditor({ sectors }: SectorsEditorProps): JSX.Element {
  const { control, register } = useFormContext<DraftFormValues, unknown, DraftFormOutput>();
  const { fields, move } = useFieldArray({ control, name: 'sectors' });
  const rows = useWatch({ control, name: 'sectors' });
  const [announcement, setAnnouncement] = useState('');
  const pendingFocus = useRef<{ index: number; direction: Direction } | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const names = new Map(sectors.map((sector) => [sector.id, sector]));

  const ranks = assignPriorityRanks(
    rows.map((row) => ({
      sectorId: row.sector_id,
      isIncluded: row.is_included,
      isPriority: row.is_priority,
    })),
  );

  // After a move the button that was pressed may sit in another place (or be disabled at the end).
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) {
      return;
    }
    pendingFocus.current = null;
    const wanted = buttons.current.get(`${target.index}:${target.direction}`);
    const fallback = buttons.current.get(
      `${target.index}:${target.direction === 'up' ? 'down' : 'up'}`,
    );
    (wanted !== undefined && !wanted.disabled ? wanted : fallback)?.focus();
  }, [fields]);

  const nameOf = (id: string): string => names.get(id)?.name ?? t('rules.sectorUnknown');

  const shift = (index: number, direction: Direction): void => {
    const target = direction === 'up' ? index - 1 : index + 1;
    move(index, target);
    pendingFocus.current = { index: target, direction };
    const id = rows[index]?.sector_id ?? '';
    setAnnouncement(
      t('rules.sectorMoved', {
        name: nameOf(id),
        position: String(target + 1),
        total: String(rows.length),
      }),
    );
  };

  return (
    <section className={cn(styles.section)} aria-labelledby="rules-edit-sectors-title">
      <h2 id="rules-edit-sectors-title">{t('rules.sectorsTitle')}</h2>
      <p className={cn(styles.note)}>{t('rules.sectorsIntro')}</p>
      {fields.length === 0 ? <p>{t('rules.noSectors')}</p> : null}
      <ol className={cn(styles.sectorList)}>
        {fields.map((field, index) => {
          const name = nameOf(field.sector_id);
          const rank = ranks[index]?.priorityRank ?? null;
          return (
            <li key={field.id} className={cn(styles.sectorItem)}>
              <p className={cn(styles.sectorName)}>
                {name}
                {names.get(field.sector_id) === undefined
                  ? null
                  : ` (${t('rules.sectorHouseholds', { count: String(names.get(field.sector_id)?.householdsCount ?? 0) })})`}
              </p>
              <p className={cn(styles.note)}>
                {rank === null
                  ? t('rules.sectorNotPriority')
                  : t('rules.sectorPriorityRank', { rank: String(rank) })}
              </p>
              <div className={cn(styles.sectorControls)}>
                <CheckboxField
                  label={`${name}: ${t('rules.sectorIncluded')}`}
                  {...register(`sectors.${index}.is_included`)}
                />
                <CheckboxField
                  label={`${name}: ${t('rules.sectorPriority')}`}
                  {...register(`sectors.${index}.is_priority`)}
                />
                <Button
                  ref={(element) => {
                    if (element === null) {
                      buttons.current.delete(`${index}:up`);
                    } else {
                      buttons.current.set(`${index}:up`, element);
                    }
                  }}
                  disabled={index === 0}
                  onClick={() => {
                    shift(index, 'up');
                  }}
                >
                  {`${t('rules.moveUp')}: ${name}`}
                </Button>
                <Button
                  ref={(element) => {
                    if (element === null) {
                      buttons.current.delete(`${index}:down`);
                    } else {
                      buttons.current.set(`${index}:down`, element);
                    }
                  }}
                  disabled={index === fields.length - 1}
                  onClick={() => {
                    shift(index, 'down');
                  }}
                >
                  {`${t('rules.moveDown')}: ${name}`}
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <p role="status" className={cn(styles.note)}>
        {announcement}
      </p>
    </section>
  );
}
