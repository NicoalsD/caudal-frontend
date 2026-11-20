import { useEffect, useId, useRef, useState } from 'react';
import type { JSX } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { Bot, Cpu, MessageCircle, Send, X } from 'lucide-react';

import { QUESTION_MAX_LENGTH } from '../../core/autopilot/autopilotModel';
import { isNearLimit } from '../../core/format/counter';
import { errorText } from '../../i18n/errorText';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { AnswerSource } from '../../core/autopilot/autopilotModel';
import { useAskAssistant } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { cn } from '../../ui/styles/cn';
import styles from './AssistantDrawer.module.css';
import { PERMISSION_ASSISTANT } from './permissions';

type MessageBody =
  | { readonly role: 'person'; readonly text: string }
  | { readonly role: 'assistant'; readonly text: string; readonly source: AnswerSource }
  | { readonly role: 'error'; readonly text: string };

type Message = MessageBody & { readonly id: number };

/** The questions offered while the conversation is empty, as keys of es.ts. */
const SUGGESTIONS = [
  'chat.suggestion.enough',
  'chat.suggestion.region',
  'chat.suggestion.week',
] as const;

/**
 * "Pregúntale a Caudal": a button that stays at the corner of the screen and opens a tall side
 * panel with the whole conversation. Each answer says whether the language model or the fallback
 * rules wrote it. The conversation lives only while the screen is open.
 */
export function AssistantDrawer(): JSX.Element | null {
  const allowed = usePermission(PERMISSION_ASSISTANT);
  const [open, setOpen] = useState(false);
  if (!allowed) {
    return null;
  }
  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Trigger asChild>
        <button type="button" className={cn(styles.trigger)}>
          <MessageCircle aria-hidden="true" />
          {t('chat.open')}
        </button>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={cn(styles.overlay)} />
        <RadixDialog.Content className={cn(styles.sheet)}>
          <Conversation />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function Conversation(): JSX.Element {
  const ask = useAskAssistant();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const fieldId = useId();
  const tooLong = question.length > QUESTION_MAX_LENGTH;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, ask.isPending]);

  const send = (text: string): void => {
    const trimmed = text.trim();
    if (trimmed === '' || trimmed.length > QUESTION_MAX_LENGTH || ask.isPending) {
      return;
    }
    const add = (message: MessageBody): void => {
      nextId.current += 1;
      const id = nextId.current;
      setMessages((list) => [...list, { ...message, id }]);
    };
    add({ role: 'person', text: trimmed });
    setQuestion('');
    ask.mutate(trimmed, {
      onSuccess: (answer) => {
        add({ role: 'assistant', text: answer.answer, source: answer.source });
      },
      onError: (error) => {
        add({ role: 'error', text: `${t('chat.error')} ${errorText(error).message}` });
      },
    });
  };

  return (
    <div className={cn(styles.layout)}>
      <header className={cn(styles.head)}>
        <div>
          <RadixDialog.Title className={cn(styles.title)}>{t('chat.title')}</RadixDialog.Title>
          <RadixDialog.Description className={cn(styles.description)}>
            {t('chat.description')}
          </RadixDialog.Description>
        </div>
        <RadixDialog.Close asChild>
          <button type="button" className={cn(styles.close)} aria-label={t('chat.close')}>
            <X aria-hidden="true" />
          </button>
        </RadixDialog.Close>
      </header>

      <div className={cn(styles.thread)} role="log" aria-live="polite" aria-label={t('chat.log')}>
        {messages.length === 0 ? (
          <div className={cn(styles.empty)}>
            <p className={cn(styles.emptyText)}>{t('chat.empty')}</p>
            <ul className={cn(styles.suggestions)}>
              {SUGGESTIONS.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className={cn(styles.suggestion)}
                    onClick={() => {
                      send(t(key));
                    }}
                  >
                    {t(key)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message) => <Bubble key={message.id} message={message} />)
        )}
        {ask.isPending ? <p className={cn(styles.thinking)}>{t('assistant.asking')}</p> : null}
        <div ref={endRef} />
      </div>

      <form
        noValidate
        className={cn(styles.composer)}
        onSubmit={(event) => {
          event.preventDefault();
          send(question);
        }}
      >
        <label htmlFor={fieldId} className={cn(styles.visuallyHidden)}>
          {t('assistant.askLabel')}
        </label>
        <textarea
          id={fieldId}
          className={cn(styles.field)}
          rows={2}
          value={question}
          placeholder={t('chat.placeholder')}
          aria-invalid={tooLong ? true : undefined}
          onChange={(event) => {
            setQuestion(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send(question);
            }
          }}
        />
        <button
          type="submit"
          className={cn(styles.send)}
          disabled={ask.isPending || question.trim() === '' || tooLong}
          aria-label={t('assistant.askSubmit')}
        >
          <Send aria-hidden="true" />
        </button>
        {isNearLimit(question.length, QUESTION_MAX_LENGTH) ? (
          <p className={cn(styles.counter)} role={tooLong ? 'alert' : undefined}>
            {tooLong
              ? t('assistant.tooLong')
              : t('assistant.counter', {
                  length: String(question.length),
                  max: String(QUESTION_MAX_LENGTH),
                })}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function Bubble({ message }: { readonly message: Message }): JSX.Element {
  if (message.role === 'person') {
    return <p className={cn(styles.bubble, styles.person)}>{message.text}</p>;
  }
  if (message.role === 'error') {
    return (
      <p className={cn(styles.bubble, styles.error)} role="alert">
        {message.text}
      </p>
    );
  }
  const SourceIcon = message.source === 'LLM' ? Bot : Cpu;
  return (
    <div className={cn(styles.bubble, styles.answer)}>
      <p className={cn(styles.answerText)}>{message.text}</p>
      <p className={cn(styles.source)}>
        <SourceIcon aria-hidden="true" />
        {t(`assistant.source.${lower(message.source)}`)}
      </p>
    </div>
  );
}
