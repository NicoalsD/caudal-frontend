import type { ConstraintsMap, FieldConstraint } from '../../../core/forms/FieldConstraint';
import { formatDecimal } from '../../../core/format/decimal';
import { formatDateTime, parseInstant, toBogotaDateKey } from '../../../core/format/time';
import { DEFAULT_DISPLAY_FRACTION_DIGITS } from '../../../core/policy/clientPolicy';
import type { components } from '../schema';
import { isRole } from '../../../core/session/roles';
import type {
  AuthUserView,
  DecimalView,
  HealthView,
  LoginView,
  MeView,
  RefreshView,
  TimestampView,
} from '../views';
import { InvalidDtoError } from './InvalidDtoError';

type HealthDto = components['schemas']['HealthResponse'];
type ConstraintsDto = components['schemas']['ConstraintsResponse'];
type FieldConstraintDto = components['schemas']['FieldConstraint'];
type AuthUserDto = components['schemas']['AuthUser'];
type LoginDto = components['schemas']['LoginResponse'];
type RefreshDto = components['schemas']['RefreshResponse'];
type MeDto = components['schemas']['MeResponse'];

/**
 * Adapter between the server contract and the view models (api-integration.md section 5).
 * It is the only place that knows DTO field names (snake_case); views are camelCase.
 *
 * - Fields not used by a view are not copied.
 * - Instants become a Date plus text in America/Bogota.
 * - JSON numbers (dot) become a number plus text with decimal comma.
 *
 * @pattern P06 Adapter
 */
export class ApiDtoAdapter {
  toHealth(dto: HealthDto): HealthView {
    return { isUp: dto.status === 'UP' };
  }

  /** `max_lines` becomes `maxLines`; only the limits that arrived are present. */
  toConstraints(dto: ConstraintsDto): ConstraintsMap {
    return Object.fromEntries(
      Object.entries(dto).map(([field, limits]) => [field, this.toFieldConstraint(limits)]),
    );
  }

  toAuthUser(dto: AuthUserDto): AuthUserView {
    if (!isRole(dto.role)) {
      throw new InvalidDtoError('user.role');
    }
    return {
      id: dto.id,
      username: dto.username,
      fullName: dto.full_name,
      role: dto.role,
      aqueductId: dto.aqueduct_id,
      mustChangePassword: dto.must_change_password,
    };
  }

  toLogin(dto: LoginDto): LoginView {
    const refresh = this.toRefresh(dto);
    return { ...refresh, user: this.toAuthUser(dto.user) };
  }

  toRefresh(dto: RefreshDto): RefreshView {
    if (!Number.isFinite(dto.expires_in) || dto.expires_in <= 0 || dto.access_token === '') {
      throw new InvalidDtoError('expires_in');
    }
    return { accessToken: dto.access_token, expiresInSeconds: dto.expires_in };
  }

  toMe(dto: MeDto): MeView {
    return {
      id: dto.id,
      username: dto.username,
      fullName: dto.full_name,
      mustChangePassword: dto.must_change_password,
      permissions: [...dto.permissions],
    };
  }

  /** Converts an ISO-8601 instant from the API into a view with its Bogota text. */
  toTimestamp(field: string, iso: string): TimestampView {
    try {
      return { date: parseInstant(iso), text: formatDateTime(iso), dayKey: toBogotaDateKey(iso) };
    } catch (cause) {
      throw new InvalidDtoError(field, { cause });
    }
  }

  /** Converts a JSON number into a view with the decimal comma used on screen. */
  toDecimal(
    field: string,
    value: number,
    fractionDigits: number = DEFAULT_DISPLAY_FRACTION_DIGITS,
  ): DecimalView {
    if (!Number.isFinite(value)) {
      throw new InvalidDtoError(field);
    }
    return { value, text: formatDecimal(value, fractionDigits) };
  }

  private toFieldConstraint(dto: FieldConstraintDto): FieldConstraint {
    return {
      ...(dto.min === undefined ? {} : { min: dto.min }),
      ...(dto.max === undefined ? {} : { max: dto.max }),
      ...(dto.pattern === undefined ? {} : { pattern: dto.pattern }),
      ...(dto.max_lines === undefined ? {} : { maxLines: dto.max_lines }),
    };
  }
}
