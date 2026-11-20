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
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { PERMISSION_VALVE_COMMAND } from './permissions';
import { ValveLever } from './ValveLever';
import { valveStateText } from './valveText';

const REASON_CONSTRAINT = 'reason';
const ICON_SIZE = 20;

interface ValveControlDialogProps {
  /** The valve with its live data, or null when the dialog is closed. */
  readonly valve: LiveValve | null;
  readonly onClose: () => void;
}

/**
 * Opens or closes a valve: the reason (mandatory), then the lever, which is the confirmation:
 * dragged to the end it sends the command. A button does the same without dragging. When the
 * valve's state is unknown the person picks the action first. After sending it follows the
 * command live: sent, delivered, confirmed or failed.
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
  const [leverKey, setLeverKey] = useState(0);

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
  const submit = (): void => {
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
        onError: () => {
          // The lever goes back to its place so the person can try again.
          setLeverKey((key) => key + 1);
        },
      },
    );
  };

  return (
    <form
      noValidate
      className={cn(styles.stack)}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {valve.state === 'UNKNOWN' ? (
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
      ) : null}
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
      <ValveLever
        key={`${action}-${String(leverKey)}`}
        action={action}
        valveName={valve.name}
        locked={problem !== undefined}
        busy={send.isPending}
        onLocked={() => {
          setAttempted(true);
        }}
        onThrow={submit}
      />
      {send.isError ? <FormAlert message={errorText(send.error).message} /> : null}
      <div className={cn(styles.actions)}>
        <Button onClick={onClose}>{t('valveControl.back')}</Button>
        <Button type="submit" variant="ghost" disabled={send.isPending}>
          {send.isPending
            ? t('valveControl.sending')
            : action === 'OPEN'
              ? t('valveLever.noSlideOpen')
              : t('valveLever.noSlideClose')}
        </Button>
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
