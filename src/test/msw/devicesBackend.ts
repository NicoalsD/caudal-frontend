import { http, HttpResponse } from 'msw';

import type { components } from '../../services/api/schema';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

type DeviceDto = components['schemas']['Device'];
type RegisterDto = components['schemas']['RegisterDeviceRequest'];
type UpdateDto = components['schemas']['UpdateDeviceRequest'];
type KeyRequestDto = components['schemas']['DeviceKeyRequest'];

const CREATED_STATUS = 201;
const NOT_FOUND_STATUS = 404;
const INVALID_KEY_STATUS = 422;
const CONFLICT_STATUS = 409;
const DEFAULT_PAGE_SIZE = 2;
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const FINGERPRINT_LENGTH = 64;
const FINGERPRINT = 'a'.repeat(FINGERPRINT_LENGTH);

export interface SentRequest {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

export interface DevicesBackendOptions {
  readonly devices?: readonly DeviceDto[];
  readonly pageSize?: number;
}

/** Page of a list by offset-encoded cursors (the real cursor is opaque; the fake is readable). */
function pageOf<T>(items: readonly T[], cursor: string | null, size: number) {
  const start = cursor === null ? 0 : Number(cursor);
  const next = start + size < items.length ? String(start + size) : null;
  return { items: items.slice(start, start + size), next_cursor: next };
}

/**
 * A small stateful fake of the devices (API.md section 16.4 to 16.9). It keeps the requests the
 * screens sent, and the key text is only in those requests: no response ever carries it.
 */
export function createDevicesBackend(options: DevicesBackendOptions = {}) {
  const size = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const devices: DeviceDto[] = [...(options.devices ?? [])];
  const registeredKeys = new Set<string>();
  const requests: SentRequest[] = [];
  let counter = 0;

  const handlers = [
    http.get(apiUrl('/devices'), ({ request }) => {
      const url = new URL(request.url);
      requests.push({ method: 'GET', path: '/devices', body: null });
      return HttpResponse.json(pageOf(devices, url.searchParams.get('cursor'), size));
    }),
    http.post(apiUrl('/devices'), async ({ request }) => {
      const body = (await request.json()) as RegisterDto;
      requests.push({ method: 'POST', path: '/devices', body });
      counter += 1;
      const device: DeviceDto = {
        id: `device-${counter}`,
        kind: body.kind,
        name: body.name,
        status: 'ACTIVE',
        tank_id: body.tank_id ?? null,
        valve_id: body.valve_id ?? null,
        created_at: new Date().toISOString(),
        last_seen_at: null,
        active_key: null,
      };
      devices.unshift(device);
      return HttpResponse.json(device, { status: CREATED_STATUS });
    }),
    http.patch(apiUrl('/devices/:id'), async ({ params, request }) => {
      const body = (await request.json()) as UpdateDto;
      requests.push({ method: 'PATCH', path: `/devices/${String(params.id)}`, body });
      const index = devices.findIndex((device) => device.id === params.id);
      const current = devices[index];
      if (current === undefined) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      const updated: DeviceDto = { ...current, status: body.status };
      devices[index] = updated;
      return HttpResponse.json(updated);
    }),
    http.post(apiUrl('/devices/:id/keys'), async ({ params, request }) => {
      const body = (await request.json()) as KeyRequestDto;
      requests.push({ method: 'POST', path: `/devices/${String(params.id)}/keys`, body });
      if (!KEY_PATTERN.test(body.public_key)) {
        return errorResponse(INVALID_KEY_STATUS, 'INVALID_KEY');
      }
      if (registeredKeys.has(body.public_key)) {
        return errorResponse(CONFLICT_STATUS, 'CONFLICT');
      }
      const index = devices.findIndex((device) => device.id === params.id);
      const current = devices[index];
      if (current === undefined) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      registeredKeys.add(body.public_key);
      const activatedAt = new Date().toISOString();
      devices[index] = {
        ...current,
        active_key: {
          id: `key-${registeredKeys.size}`,
          valid_from: activatedAt,
          valid_until: null,
        },
      };
      return HttpResponse.json(
        {
          key_id: `key-${registeredKeys.size}`,
          fingerprint: FINGERPRINT,
          activated_at: activatedAt,
        },
        { status: CREATED_STATUS },
      );
    }),
  ];

  return { handlers, devices, requests };
}
