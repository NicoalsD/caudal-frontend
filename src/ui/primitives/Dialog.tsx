import * as RadixDialog from '@radix-ui/react-dialog';
import type { JSX, ReactNode } from 'react';

import { cn } from '../styles/cn';
import styles from './Dialog.module.css';

interface DialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  /** The control that opens the dialog: the focus goes back to it when the dialog closes. */
  readonly trigger: ReactNode;
  /** Chooses the first control that gets the focus (for example Cancelar in a destructive action). */
  readonly onOpenAutoFocus?: (event: Event) => void;
}

/**
 * Modal dialog over Radix: it traps the focus, closes with Escape, gives the screen reader its
 * title and description, and returns the focus to the button that opened it.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  onOpenAutoFocus,
}: DialogProps): JSX.Element {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={cn(styles.overlay)} />
        <RadixDialog.Content className={cn(styles.content)} onOpenAutoFocus={onOpenAutoFocus}>
          <RadixDialog.Title className={cn(styles.title)}>{title}</RadixDialog.Title>
          <RadixDialog.Description className={cn(styles.description)}>
            {description}
          </RadixDialog.Description>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
