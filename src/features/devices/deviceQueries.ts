import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseInfiniteQueryResult, UseMutationResult } from '@tanstack/react-query';

import { collectValves } from '../../core/devices/attachments';
import type { ValveOption } from '../../core/devices/attachments';
import type { DeviceStatus } from '../../core/devices/deviceModel';
import type { RegisterDeviceInput } from '../../services/api/endpoints/DevicesApi';
import type {
  DevicePageView,
  DeviceView,
  RotatedDeviceKeyView,
  TankView,
} from '../../services/api/views';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useNetwork } from '../../state/hooks/useNetwork';
import { useTanks } from '../../state/hooks/useTanks';
import { aqueductKey } from '../../state/queryKeys';

const DEVICES_SCOPE = 'devices';

/**
 * Key mutations hand a public key to the server: the cache must not keep their variables (gcTime 0),
 * the same rule as the one-time codes of the users screen.
 */
const NO_CACHE_MS = 0;

/** GET /devices, page by page. */
export function useDevices(): UseInfiniteQueryResult<{
  readonly pages: readonly DevicePageView[];
}> {
  const api = useCaudalApi();
  const key = aqueductKey(useAqueductId(), DEVICES_SCOPE);
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => api.devices.listDevices(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}

export interface Attachments {
  readonly isPending: boolean;
  readonly tanks: readonly TankView[];
  readonly valves: readonly ValveOption[];
}

/** The tanks and valves a device can be attached to. Empty lists while they load or fail. */
export function useAttachments(): Attachments {
  const tanks = useTanks();
  const network = useNetwork();
  const ready = network.status === 'ready' ? network.root : null;
  return {
    isPending: tanks.isPending || network.status === 'loading',
    tanks: tanks.data ?? [],
    valves: ready === null ? [] : collectValves(ready),
  };
}

export interface RegisterDeviceRequest extends RegisterDeviceInput {
  /** Sent once to POST /devices/{id}/keys. It is not kept anywhere after the request. */
  readonly publicKey: string;
}

/** The device exists, but its key was not stored: the person registers the key again. */
export class DeviceKeyFailedError extends Error {
  constructor(override readonly cause: unknown) {
    super('The device was registered but its key was not stored');
    this.name = 'DeviceKeyFailedError';
  }
}

/**
 * Registers the device (POST /devices) and then its key (POST /devices/{id}/keys). The two calls
 * are not one transaction: if the second fails, the device stays and the error says so.
 */
export function useRegisterDevice(): UseMutationResult<DeviceView, Error, RegisterDeviceRequest> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = aqueductKey(useAqueductId(), DEVICES_SCOPE);
  return useMutation({
    mutationFn: async ({ publicKey, ...input }) => {
      const device = await api.devices.registerDevice(input);
      try {
        await api.devices.rotateDeviceKey(device.id, publicKey);
      } catch (error) {
        throw new DeviceKeyFailedError(error);
      }
      return device;
    },
    gcTime: NO_CACHE_MS,
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}

export interface DeviceStatusChange {
  readonly id: string;
  readonly status: DeviceStatus;
}

/** PATCH /devices/{id}: the list is read again afterwards. */
export function useChangeDeviceStatus(): UseMutationResult<DeviceView, Error, DeviceStatusChange> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = aqueductKey(useAqueductId(), DEVICES_SCOPE);
  return useMutation({
    mutationFn: (change) => api.devices.updateDeviceStatus(change.id, change.status),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}

export interface DeviceKeyRotation {
  readonly id: string;
  readonly publicKey: string;
}

/** POST /devices/{id}/keys. The key text is only in the request. */
export function useRotateDeviceKey(): UseMutationResult<
  RotatedDeviceKeyView,
  Error,
  DeviceKeyRotation
> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = aqueductKey(useAqueductId(), DEVICES_SCOPE);
  return useMutation({
    mutationFn: (rotation) => api.devices.rotateDeviceKey(rotation.id, rotation.publicKey),
    gcTime: NO_CACHE_MS,
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}
