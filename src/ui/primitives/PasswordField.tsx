import { useId, useState } from 'react';
import type { ComponentPropsWithRef, JSX, KeyboardEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import styles from './PasswordField.module.css';

type InputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'id' | 'type' | 'aria-invalid' | 'aria-describedby' | 'children'
>;

interface PasswordFieldProps extends InputProps {
  readonly label: string;
  readonly error?: string | undefined;
  /** Id of other content that describes the field, for example a checklist of requirements. */
  readonly describedBy?: string | undefined;
}

/**
 * Password input with a show and hide button and a caps lock notice. The value is never copied
 * anywhere: the button only switches the input type, and the notice reads the keyboard state, not
 * the text.
 */
export function PasswordField({
  label,
  error,
  describedBy: extraDescription,
  className,
  onKeyUp,
  onBlur,
  ...input
}: PasswordFieldProps): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const capsId = `${id}-caps`;
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const describedBy = [
    extraDescription ?? null,
    capsLock ? capsId : null,
    error === undefined ? null : errorId,
  ]
    .filter((value): value is string => value !== null)
    .join(' ');

  const readCapsLock = (event: KeyboardEvent<HTMLInputElement>): void => {
    setCapsLock(event.getModifierState('CapsLock'));
    onKeyUp?.(event);
  };

  return (
    <div className={cn(styles.field)}>
      <label className={cn(styles.label)} htmlFor={id}>
        {label}
      </label>
      <div className={cn(styles.control)}>
        <input
          {...input}
          id={id}
          type={visible ? 'text' : 'password'}
          className={cn(styles.input, className)}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy === '' ? undefined : describedBy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyUp={readCapsLock}
          onBlur={(event) => {
            setCapsLock(false);
            onBlur?.(event);
          }}
        />
        <button
          type="button"
          className={cn(styles.toggle)}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {capsLock ? (
        <p id={capsId} className={cn(styles.caps)}>
          {t('auth.capsLockOn')}
        </p>
      ) : null}
      {error === undefined ? null : (
        <p id={errorId} role="alert" className={cn(styles.error)}>
          {error}
        </p>
      )}
    </div>
  );
}
