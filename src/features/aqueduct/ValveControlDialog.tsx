import { useState } from 'react';
import type { JSX } from 'react';
import { Circle, CircleCheck, CircleX, Power, PowerOff } from 'lucide-react';

import { isCommandInFlight, oppositeAction } from '../../core/valves/valveModel';
import type { CommandStatus, ValveAction } from '../../core/valves/valveModel';
import type { LiveValve } from '../../core/scene/sceneModel';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useConstraints } from '../../state/hooks/useConstraints';
import { usePermission } from '../../state/hooks/usePermission';
import { useSendValveCommand } from '../../state/hooks/useValveCommand';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Card } from '../../ui/cards/Card';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { Dialog } from '../../ui/primitives/Dialog';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { PERMISSION_VALVE_COMMAND } from './permissions';
import { valveStateText } from './valveText';

const REASON_CONSTRAINT = 'reason';
const ICON_SIZE = 20;
/** Measures of the valve drawing, in its own 120 by 64 units. */
const PIPE_FULL = 120;
const PIPE_CUT = 52;
const GATE_UP_Y = 4;
const GATE_DOWN_Y = 14;
const GATE_UP_HEIGHT = 20;
const GATE_DOWN_HEIGHT = 38;

interface ValveControlDialogProps {
  /** The valve with its live data, or null when the dialog is closed. */
  readonly valve: LiveValve | null;
  readonly onClose: () => void;
}

/**
 * Opens or closes a valve: the action, the reason (mandatory) and a summary that is the
 * confirmation. After sending it follows the command live: sent, delivered, confirmed or failed.
 * Only people with VALVE_COMMAND_MANUAL get the form; the server checks it again.
 */
export function ValveControlDialog({ valve, onClose }: ValveControlDialogProps): JSX.Element {
  return (
    <Dialog
      open={valve !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={valve === null ? '' : t('valveControl.title', { valve: valve.name })}
      description={
        valve === null
          ? ''
          : t('valveControl.description', {
              sector: valve.sectorName,
              state: valveStateText(valve).toLowerCase(),
            })
      }
    >
      {valve === null ? null : <ControlBody key={valve.id} valve={valve} onClose={onClose} />}
    </Dialog>
  );
}

function ControlBody({
  valve,
  onClose,
}: {
  readonly valve: LiveValve;
  readonly onClose: () => void;
}): JSX.Element {
  const allowed = usePermission(PERMISSION_VALVE_COMMAND);
  const constraints = useConstraints();
  const send = useSendValveCommand();
  const [action, setAction] = useState<ValveAction>(oppositeAction(valve.state) ?? 'OPEN');
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  const back = (
    <div className={cn(styles.actions)}>
      <Button onClick={onClose}>{t('valveControl.back')}</Button>
    </div>
  );

  if (!allowed) {
    return (
      <>
        <p>{t('valveControl.noPermission')}</p>
        {back}
      </>
    );
  }
  if (!valve.isMotorized) {
    return (
      <>
        <p>{t('valveControl.handValve')}</p>
        {back}
      </>
    );
  }
  if (sentId !== null) {
    const status: CommandStatus =
      valve.command?.id === sentId ? valve.command.status : (send.data?.status ?? 'PENDING');
    return (
      <>
        <CommandProgress status={status} />
        {back}
      </>
    );
  }

  const limits = constraints.data?.[REASON_CONSTRAINT];
  const min = limits?.min;
  const max = limits?.max;
  if (min === undefined || max === undefined) {
    return (
      <>
        <p role={constraints.isError ? 'alert' : 'status'}>
          {constraints.isError ? t('valveControl.limitsUnavailable') : t('valveControl.loading')}
        </p>
        {back}
      </>
    );
  }
  const trimmed = reason.trim();
  let problem: string | undefined;
  if (trimmed.length < min) {
    problem = t('valveControl.reasonShort', { min: String(min) });
  } else if (reason.length > max) {
    problem = t('valveControl.reasonLong', { max: String(max) });
  }
  const summaryKey = action === 'OPEN' ? 'valveControl.summaryOpen' : 'valveControl.summaryClose';

  return (
    <form
      noValidate
      className={cn(styles.stack)}
      onSubmit={(event) => {
        event.preventDefault();
        setAttempted(true);
        if (problem !== undefined) {
          return;
        }
        send.mutate(
          { valveId: valve.id, action, reason: trimmed },
          {
            onSuccess: (command) => {
              setSentId(command.id);
            },
          },
        );
      }}
    >
      <div className={cn(styles.beforeAfter)}>
        <ValveGraphic open={valve.state === 'OPEN'} caption={t('valveControl.stateNow')} />
        <ValveGraphic
          open={action === 'OPEN'}
          caption={
            action === 'OPEN' ? t('valveControl.stateAfterOpen') : t('valveControl.stateAfterClose')
          }
          accent
        />
      </div>
      <fieldset className={cn(styles.actionGroup)}>
        <legend>{t('valveControl.actionLegend')}</legend>
        <div className={cn(styles.actionTiles)}>
          {(['OPEN', 'CLOSE'] as const).map((item) => {
            const Icon = item === 'OPEN' ? Power : PowerOff;
            return (
              <label key={item} className={cn(styles.actionOption)}>
                <input
                  type="radio"
                  name="valve-action"
                  value={item}
                  checked={action === item}
                  className={cn(styles.actionInput)}
                  onChange={() => {
                    setAction(item);
                  }}
                />
                <span className={cn(styles.actionFace)}>
                  <Icon aria-hidden="true" />
                  {item === 'OPEN' ? t('valveControl.open') : t('valveControl.close')}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <TextAreaField
        label={t('valveControl.reasonLabel')}
        hint={t('valveControl.reasonHint')}
        error={attempted ? problem : undefined}
        length={reason.length}
        maxLength={max}
        counterText={(length, max) =>
          t('assistant.counter', { length: String(length), max: String(max) })
        }
        value={reason}
        onChange={(event) => {
          setReason(event.currentTarget.value);
        }}
      />
      <Card variant="tinted" tint="aqua" className={cn(styles.summaryCard)}>
        <p className={cn(styles.summary)}>
          {t(summaryKey, { valve: valve.name, sector: valve.sectorName })}
        </p>
      </Card>
      {send.isError ? <FormAlert message={errorText(send.error).message} /> : null}
      <div className={cn(styles.actions)}>
        <Button type="submit" variant="primary" disabled={send.isPending}>
          {send.isPending
            ? t('valveControl.sending')
            : action === 'OPEN'
              ? t('valveControl.confirmOpen')
              : t('valveControl.confirmClose')}
        </Button>
        <Button onClick={onClose}>{t('valveControl.back')}</Button>
      </div>
    </form>
  );
}

/** The four moments of a command, each with an icon and a text, never a color alone. */
function CommandProgress({ status }: { readonly status: CommandStatus }): JSX.Element {
  const failed = status === 'FAILED' || status === 'EXPIRED';
  const delivered = status === 'DELIVERED' || status === 'ACKED';
  const finalLabel = failed
    ? status === 'FAILED'
      ? t('valveControl.stepFailed')
      : t('valveControl.stepExpired')
    : t('valveControl.stepAcked');
  const steps = [
    { key: 'sent', label: t('valveControl.stepSent'), done: true, bad: false },
    {
      key: 'delivered',
      label: t('valveControl.stepDelivered'),
      done: delivered,
      bad: failed && !delivered,
    },
    { key: 'final', label: finalLabel, done: status === 'ACKED', bad: failed },
  ];
  let headline = '';
  if (status === 'ACKED') {
    headline = t('valveControl.doneAcked');
  } else if (status === 'FAILED') {
    headline = t('valveControl.doneFailed');
  } else if (status === 'EXPIRED') {
    headline = t('valveControl.doneExpired');
  }
  return (
    <section className={cn(styles.progress)} aria-label={t('valveControl.progressTitle')}>
      <h3>{t('valveControl.progressTitle')}</h3>
      <ol className={cn(styles.steps)} data-status={status.toLowerCase()}>
        {steps.map((step) => {
          const Icon = step.bad ? CircleX : step.done ? CircleCheck : Circle;
          return (
            <li key={step.key} data-done={step.done} data-bad={step.bad}>
              <Icon aria-hidden="true" size={ICON_SIZE} />
              <span>{step.label}</span>
              {step.done || step.bad ? null : (
                <span className={cn(styles.waiting)}>{t('valveControl.stepWaiting')}</span>
              )}
            </li>
          );
        })}
      </ol>
      <p role="status">{isCommandInFlight(status) ? '' : headline}</p>
    </section>
  );
}

/**
 * A drawing of the valve on its pipe: open, the pipe is whole and the water goes through; closed,
 * the gate cuts it. The caption and the word say it too, so the drawing is only a help.
 */
function ValveGraphic({
  open,
  caption,
  accent = false,
}: {
  readonly open: boolean;
  readonly caption: string;
  readonly accent?: boolean;
}): JSX.Element {
  return (
    <figure className={cn(styles.graphic, accent && styles.graphicAccent)} data-open={open}>
      <svg
        viewBox="0 0 120 64"
        aria-hidden="true"
        focusable="false"
        className={cn(styles.graphicArt)}
      >
        <rect x="0" y="26" width="120" height="14" rx="3" className={cn(styles.pipe)} />
        <rect
          x="0"
          y="29"
          width={open ? PIPE_FULL : PIPE_CUT}
          height="8"
          rx="2"
          className={cn(styles.water)}
        />
        <rect x="46" y="14" width="28" height="38" rx="8" className={cn(styles.valveBody)} />
        <rect
          x="56"
          y={open ? GATE_UP_Y : GATE_DOWN_Y}
          width="8"
          height={open ? GATE_UP_HEIGHT : GATE_DOWN_HEIGHT}
          rx="3"
          className={cn(styles.gate)}
        />
        <circle cx="60" cy="6" r="6" className={cn(styles.wheel)} />
      </svg>
      <figcaption className={cn(styles.graphicCaption)}>
        <Chip
          tone={open ? 'mint' : 'coral'}
          icon={open ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
        >
          {open ? t('valveControl.flowOn') : t('valveControl.flowOff')}
        </Chip>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}
