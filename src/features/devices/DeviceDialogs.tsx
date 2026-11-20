import { useRef, useState } from 'react';
import type { JSX, ReactNode, SelectHTMLAttributes } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import { FormSchemaBuilder } from '../../core/forms/FormSchemaBuilder';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { DEVICE_KINDS, attachmentFor, isDeviceKind } from '../../core/devices/deviceModel';
import type { DeviceKind, DeviceStatus } from '../../core/devices/deviceModel';
import { isValidPublicKey } from '../../core/devices/publicKey';
import type { ValveOption } from '../../core/devices/attachments';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import type { DeviceView, TankView } from '../../services/api/views';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import { formResolver } from '../../ui/primitives/formResolver';
import { FormFields } from '../../ui/primitives/FormFields';
import { RadioGroupField } from '../../ui/primitives/RadioGroupField';
import { TextField } from '../../ui/primitives/TextField';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { cn } from '../../ui/styles/cn';
import styles from './Devices.module.css';
import { kindText, keyErrorMessage } from './deviceText';
import {
  DeviceKeyFailedError,
  useChangeDeviceStatus,
  useRegisterDevice,
  useRotateDeviceKey,
} from './deviceQueries';
import type { RegisterDeviceRequest } from './deviceQueries';

const NAME_FIELD = 'name';
const KIND_FIELD = 'kind';
const TANK_FIELD = 'tank_id';
const VALVE_FIELD = 'valve_id';
const PUBLIC_KEY_FIELD = 'public_key';
const PLACE_NAME_CONSTRAINT = 'place_name';

const registerFormBuild = (constraints: ConstraintsMap, messages: ValidationMessageFactory) =>
  new FormSchemaBuilder(constraints, messages)
    .text(NAME_FIELD, { constraint: PLACE_NAME_CONSTRAINT })
    .requiredChoice(KIND_FIELD)
    .build();

interface RegisterValues {
  readonly name: string;
  readonly kind: string;
  readonly tank_id: string;
  readonly valve_id: string;
  readonly public_key: string;
}

interface RegisterOutput {
  readonly name: string;
  readonly kind: string;
}

interface RegisterDeviceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly tanks: readonly TankView[];
  readonly valves: readonly ValveOption[];
  /** Called with the text to show on the screen once the dialog has closed. */
  readonly onDone: (message: string) => void;
}

/**
 * Registers a sensor or a valve motor and its public key. The key is sent once and cleared from the
 * form after the request, whatever the answer.
 */
export function RegisterDeviceDialog(props: RegisterDeviceDialogProps): JSX.Element {
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      trigger={props.trigger}
      title={t('devices.registerTitle')}
      description={t('devices.registerDescription')}
    >
      <RegisterFormGate {...props} />
    </Dialog>
  );
}

function RegisterFormGate(props: RegisterDeviceDialogProps): JSX.Element {
  const form = useFormSchema(registerFormBuild);
  if (form.status === 'loading') {
    return <LoadingState message={t('auth.loadingForm')} />;
  }
  if (form.status !== 'ready') {
    return (
      <ErrorState title={t('devices.registerTitle')} message={t('connection.constraintsMissing')} />
    );
  }
  return <RegisterForm {...props} schema={form.schema} />;
}

function RegisterForm({
  tanks,
  valves,
  onDone,
  onOpenChange,
  schema,
}: RegisterDeviceDialogProps & {
  readonly schema: ReturnType<typeof registerFormBuild>;
}): JSX.Element {
  const register = useRegisterDevice();
  const [failure, setFailure] = useState<string | null>(null);
  const {
    register: field,
    handleSubmit,
    getValues,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues, unknown, RegisterOutput>({
    resolver: formResolver<RegisterValues, RegisterOutput>(schema),
    mode: 'onSubmit',
    defaultValues: { name: '', kind: '', tank_id: '', valve_id: '', public_key: '' },
  });
  const kindValue = useWatch({ control, name: KIND_FIELD });
  const attachment = isDeviceKind(kindValue) ? attachmentFor(kindValue) : 'none';

  const submit = handleSubmit(async (values) => {
    const raw = getValues();
    const publicKey = raw.public_key.trim();
    setFailure(null);
    if (!isValidPublicKey(publicKey)) {
      setError(PUBLIC_KEY_FIELD, { type: 'validate', message: t('devices.publicKeyInvalid') });
      return;
    }
    if (attachment === 'tank' && raw.tank_id === '') {
      setError(TANK_FIELD, { type: 'required', message: t('devices.tankRequired') });
      return;
    }
    if (attachment === 'valve' && raw.valve_id === '') {
      setError(VALVE_FIELD, { type: 'required', message: t('devices.valveRequired') });
      return;
    }
    const request: RegisterDeviceRequest = {
      kind: values.kind as DeviceKind,
      name: values.name,
      publicKey,
      ...(attachment === 'tank' ? { tankId: raw.tank_id } : {}),
      ...(attachment === 'valve' ? { valveId: raw.valve_id } : {}),
    };
    try {
      await register.mutateAsync(request);
      onDone(t('devices.registered'));
      onOpenChange(false);
    } catch (error) {
      if (error instanceof DeviceKeyFailedError) {
        onDone(t('devices.keyFailed'));
        onOpenChange(false);
      } else {
        setFailure(keyErrorMessage(error));
      }
    } finally {
      setValue(PUBLIC_KEY_FIELD, '');
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failure === null ? null : <FormAlert message={failure} />}
        <TextField
          label={t('devices.nameLabel')}
          autoComplete="off"
          error={errors.name?.message}
          {...field(NAME_FIELD)}
        />
        <RadioGroupField
          legend={t('devices.kindLegend')}
          options={DEVICE_KINDS.map((kind) => ({ value: kind, label: kindText(kind) }))}
          error={errors.kind?.message}
          {...field(KIND_FIELD)}
        />
        {attachment === 'tank' ? (
          <SelectField
            label={t('devices.tankLabel')}
            placeholder={t('devices.pickTank')}
            options={tanks.map((tank) => ({ id: tank.id, name: tank.name }))}
            error={errors.tank_id?.message}
            {...field(TANK_FIELD)}
          />
        ) : null}
        {attachment === 'valve' ? (
          <SelectField
            label={t('devices.valveLabel')}
            placeholder={t('devices.pickValve')}
            options={valves}
            error={errors.valve_id?.message}
            {...field(VALVE_FIELD)}
          />
        ) : null}
        <TextField
          label={t('devices.publicKeyLabel')}
          hint={t('devices.publicKeyHint')}
          autoComplete="off"
          spellCheck={false}
          error={errors.public_key?.message}
          {...field(PUBLIC_KEY_FIELD)}
        />
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary">
            {isSubmitting ? t('devices.submittingRegister') : t('devices.submitRegister')}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </FormFields>
    </form>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label: string;
  readonly placeholder: string;
  readonly options: readonly { readonly id: string; readonly name: string }[];
  readonly error?: string | undefined;
}

/** A native select with its label and error; the choice is the id of the tank or valve. */
function SelectField({
  label,
  placeholder,
  options,
  error,
  ...select
}: SelectFieldProps): JSX.Element {
  const errorId = `${String(select.name)}-error`;
  return (
    <div className={cn(styles.field)}>
      <label>
        <span>{label}</span>
        <select
          className={cn(styles.select)}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={error === undefined ? undefined : errorId}
          {...select}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      {error === undefined ? null : (
        <p id={errorId} className={cn(styles.error)}>
          {error}
        </p>
      )}
    </div>
  );
}

interface RotateKeyDialogProps {
  readonly device: DeviceView;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDone: (message: string) => void;
}

/** Registers a new public key for a device. The old one stays valid for its grace period. */
export function RotateKeyDialog({
  device,
  open,
  onOpenChange,
  onDone,
}: RotateKeyDialogProps): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('devices.rotateTitle')}
      description={t('devices.rotateDescription')}
    >
      <RotateKeyForm device={device} onDone={onDone} onOpenChange={onOpenChange} />
    </Dialog>
  );
}

function RotateKeyForm({
  device,
  onDone,
  onOpenChange,
}: Omit<RotateKeyDialogProps, 'open'>): JSX.Element {
  const rotate = useRotateDeviceKey();
  const [failure, setFailure] = useState<string | null>(null);
  const {
    register: field,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<{ public_key: string }>({ defaultValues: { public_key: '' } });

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    const publicKey = values.public_key.trim();
    if (!isValidPublicKey(publicKey)) {
      setError(PUBLIC_KEY_FIELD, { type: 'validate', message: t('devices.publicKeyInvalid') });
      return;
    }
    try {
      await rotate.mutateAsync({ id: device.id, publicKey });
      onDone(t('devices.keyRegistered'));
      onOpenChange(false);
    } catch (error) {
      setFailure(keyErrorMessage(error));
    } finally {
      setValue(PUBLIC_KEY_FIELD, '');
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failure === null ? null : <FormAlert message={failure} />}
        <TextField
          label={t('devices.publicKeyLabel')}
          hint={t('devices.publicKeyHint')}
          autoComplete="off"
          spellCheck={false}
          error={errors.public_key?.message}
          {...field(PUBLIC_KEY_FIELD)}
        />
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary">
            {isSubmitting ? t('devices.submittingRotate') : t('devices.submitRotate')}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </FormFields>
    </form>
  );
}

interface StatusConfirmDialogProps {
  readonly device: DeviceView;
  /** The status the device moves to. Suspend and retire ask first; activation does not. */
  readonly target: DeviceStatus;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDone: (message: string) => void;
}

/** Asks before suspending or retiring a device. Cancel has the focus when it opens. */
export function StatusConfirmDialog({
  device,
  target,
  open,
  onOpenChange,
  onDone,
}: StatusConfirmDialogProps): JSX.Element {
  const change = useChangeDeviceStatus();
  const [failure, setFailure] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isRetire = target === 'RETIRED';
  const title = isRetire
    ? t('devices.confirmRetireTitle', { name: device.name })
    : t('devices.confirmSuspendTitle', { name: device.name });

  const confirm = async (): Promise<void> => {
    setFailure(null);
    try {
      await change.mutateAsync({ id: device.id, status: target });
      onDone(t('devices.statusSaved'));
      onOpenChange(false);
    } catch (error) {
      setFailure(errorText(error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={isRetire ? t('devices.confirmRetireBody') : t('devices.confirmSuspendBody')}
      initialFocusRef={cancelRef}
    >
      {failure === null ? null : <FormAlert message={failure} />}
      <div className={cn(styles.actions)}>
        <Button variant="primary" disabled={change.isPending} onClick={() => void confirm()}>
          {isRetire ? t('devices.confirmRetire') : t('devices.confirmSuspend')}
        </Button>
        <Button
          ref={cancelRef}
          onClick={() => {
            onOpenChange(false);
          }}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </Dialog>
  );
}
