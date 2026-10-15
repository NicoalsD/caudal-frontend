import type { DeviceKind, DeviceStatus } from '../../../core/devices/deviceModel';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { DevicePageView, DeviceView, RotatedDeviceKeyView } from '../views';

type DevicePageDto = components['schemas']['DevicePage'];
type DeviceDto = components['schemas']['Device'];
type RegisterDeviceDto = components['schemas']['RegisterDeviceRequest'];
type UpdateDeviceDto = components['schemas']['UpdateDeviceRequest'];
type DeviceKeyRequestDto = components['schemas']['DeviceKeyRequest'];
type DeviceKeyCreatedDto = components['schemas']['DeviceKeyCreated'];

/** Input of POST /devices (API.md 16.4). The key is registered afterwards, in its own request. */
export interface RegisterDeviceInput {
  readonly kind: DeviceKind;
  readonly name: string;
  readonly tankId?: string;
  readonly valveId?: string;
}

/**
 * Registered devices, their status and their keys (API.md section 16). Every route needs
 * DEVICE_MANAGE; the server checks it on every call.
 */
export class DevicesApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /devices: one page, newest first. Pass the previous `nextCursor` to continue. */
  async listDevices(cursor?: string): Promise<DevicePageView> {
    const response = await this.http.request<DevicePageDto>({
      method: 'GET',
      path: '/devices',
      ...(cursor === undefined ? {} : { query: { cursor } }),
    });
    return this.adapter.toDevicePage(response.body);
  }

  /** POST /devices (201). The device has no key until one is registered. */
  async registerDevice(input: RegisterDeviceInput): Promise<DeviceView> {
    const body: RegisterDeviceDto = {
      kind: input.kind,
      name: input.name,
      ...(input.tankId === undefined ? {} : { tank_id: input.tankId }),
      ...(input.valveId === undefined ? {} : { valve_id: input.valveId }),
    };
    const response = await this.http.request<DeviceDto>({
      method: 'POST',
      path: '/devices',
      body,
    });
    return this.adapter.toDevice(response.body);
  }

  /** PATCH /devices/{id}: suspends, retires or activates the device. */
  async updateDeviceStatus(id: string, status: DeviceStatus): Promise<DeviceView> {
    const body: UpdateDeviceDto = { status };
    const response = await this.http.request<DeviceDto>({
      method: 'PATCH',
      path: `/devices/${encodeURIComponent(id)}`,
      body,
    });
    return this.adapter.toDevice(response.body);
  }

  /**
   * POST /devices/{id}/keys (201): registers a public key. The text goes to the server only; the
   * caller must not keep it after the request.
   */
  async rotateDeviceKey(id: string, publicKey: string): Promise<RotatedDeviceKeyView> {
    const body: DeviceKeyRequestDto = { public_key: publicKey };
    const response = await this.http.request<DeviceKeyCreatedDto>({
      method: 'POST',
      path: `/devices/${encodeURIComponent(id)}/keys`,
      body,
    });
    return this.adapter.toRotatedDeviceKey(response.body);
  }

  /** DELETE /devices/{id}/keys/{keyId} (204): revokes a key now. */
  async revokeDeviceKey(id: string, keyId: string): Promise<void> {
    await this.http.request<undefined>({
      method: 'DELETE',
      path: `/devices/${encodeURIComponent(id)}/keys/${encodeURIComponent(keyId)}`,
    });
  }
}
