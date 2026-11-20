import { useRef } from 'react';
import type { JSX, KeyboardEvent } from 'react';

import { cn } from '../styles/cn';
import styles from './TextTabs.module.css';

const NOT_FOUND = -1;
const OUT_OF_TAB_ORDER = -1;

export interface TabOption {
  readonly id: string;
  readonly label: string;
}

interface TextTabsProps {
  readonly label: string;
  readonly tabs: readonly TabOption[];
  readonly value: string;
  readonly onChange: (id: string) => void;
  /** Prefix of the ids; the panel uses `tabPanelProps(idPrefix, id)`. */
  readonly idPrefix: string;
  readonly className?: string;
}

/** Ids that link a tab to its panel. */
export function tabPanelProps(
  idPrefix: string,
  id: string,
): { readonly id: string; readonly role: 'tabpanel'; readonly 'aria-labelledby': string } {
  return {
    id: `${idPrefix}-panel-${id}`,
    role: 'tabpanel',
    'aria-labelledby': `${idPrefix}-tab-${id}`,
  };
}

/**
 * Text tabs (All / Purchase / Transfer). Automatic activation: arrows, Home and End move the
 * focus and select, as in the WAI-ARIA tabs pattern. Only the selected tab is in the Tab order.
 */
export function TextTabs({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
  className,
}: TextTabsProps): JSX.Element {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const move = (event: KeyboardEvent, index: number): void => {
    const last = tabs.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = tabs[keys[event.key] ?? NOT_FOUND];
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    onChange(target.id);
    refs.current.get(target.id)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cn(styles.list, className)}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(node) => {
            if (node === null) {
              refs.current.delete(tab.id);
            } else {
              refs.current.set(tab.id, node);
            }
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${tab.id}`}
          aria-selected={tab.id === value}
          aria-controls={`${idPrefix}-panel-${tab.id}`}
          tabIndex={tab.id === value ? 0 : OUT_OF_TAB_ORDER}
          className={cn(styles.tab)}
          onClick={() => {
            onChange(tab.id);
          }}
          onKeyDown={(event) => {
            move(event, index);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
