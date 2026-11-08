import * as RadixDialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';

import { t } from '../../../i18n/t';
import { cn } from '../../../ui/styles/cn';
import type { NavItem } from '../RoleLayout';
import styles from './CommandPalette.module.css';

interface CommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly items: readonly NavItem[];
}

/** Lowercase, no accents: "Línea" and "linea" match each other. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es');
}

/**
 * Simple command palette: a combobox that filters the screens of the person's role and opens one
 * with Enter or a click. Up and Down move the active option without leaving the input.
 */
function PaletteBody({ onOpenChange, items }: Omit<CommandPaletteProps, 'open'>): JSX.Element {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const needle = fold(query.trim());
    return items.filter((item) => fold(item.label).includes(needle));
  }, [items, query]);
  const current = Math.min(active, Math.max(results.length - 1, 0));

  const choose = (item: NavItem | undefined): void => {
    if (item === undefined) {
      return;
    }
    onOpenChange(false);
    void navigate(item.to);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[current]);
    }
  };
  const optionId = (index: number): string => `${listId}-${String(index)}`;

  return (
    <>
      <RadixDialog.Title className={cn(styles.sr)}>{t('shell.searchTitle')}</RadixDialog.Title>
      <RadixDialog.Description className={cn(styles.sr)}>
        {t('shell.searchDescription')}
      </RadixDialog.Description>
      <div className={cn(styles.field)}>
        <Search aria-hidden="true" className={cn(styles.icon)} />
        <input
          type="text"
          role="combobox"
          aria-label={t('shell.searchLabel')}
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          {...(results.length > 0 ? { 'aria-activedescendant': optionId(current) } : {})}
          autoComplete="off"
          placeholder={t('shell.searchPlaceholder')}
          value={query}
          className={cn(styles.input)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={t('shell.searchResults')}
        className={cn(styles.list)}
      >
        {results.map((item, index) => {
          const Icon = item.icon;
          return (
            // Options are picked with the input's keyboard handling; the click is for the mouse.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={item.to}
              id={optionId(index)}
              role="option"
              aria-selected={index === current}
              className={cn(styles.option)}
              onMouseMove={() => {
                setActive(index);
              }}
              onClick={() => {
                choose(item);
              }}
            >
              {Icon !== undefined && <Icon aria-hidden="true" className={cn(styles.optionIcon)} />}
              <span>{item.label}</span>
              {item.group !== undefined && <span className={cn(styles.group)}>{item.group}</span>}
            </li>
          );
        })}
      </ul>
      {results.length === 0 && <p className={cn(styles.empty)}>{t('shell.searchEmpty')}</p>}
    </>
  );
}

/** Dialog shell; the body mounts only while open, so each opening starts with an empty search. */
export function CommandPalette({ open, onOpenChange, items }: CommandPaletteProps): JSX.Element {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={cn(styles.overlay)} />
        <RadixDialog.Content className={cn(styles.content)}>
          <PaletteBody onOpenChange={onOpenChange} items={items} />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
