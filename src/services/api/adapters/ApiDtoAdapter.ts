import type { ConstraintsMap, FieldConstraint } from '../../../core/forms/FieldConstraint';
import { formatDecimal } from '../../../core/format/decimal';
import {
  formatDateTime,
  formatTime,
  parseInstant,
  toBogotaDateKey,
} from '../../../core/format/time';
import { DEFAULT_DISPLAY_FRACTION_DIGITS } from '../../../core/policy/clientPolicy';
import type { components } from '../schema';
import type { Membership } from '../../../core/session/memberships';
import { isBandCode } from '../../../core/rules/ruleSetParts';
import type {
  Gauge,
  OperatingWindow,
  RuleBand,
  SectorSetting,
  ValveOrder,
} from '../../../core/rules/ruleSetParts';
import { isReportStatus } from '../../../core/incidents/reportStatus';
import { isRole } from '../../../core/session/roles';
import type {
  AuthUserView,
  DecimalView,
  HealthView,
  LoginView,
  MeView,
  CatalogOptionView,
  DamageReportReceiptView,
  IncidentPageView,
  IncidentView,
  PublicDamageReportView,
  PublicScheduleView,
  RefreshView,
  RuleSetSummaryView,
  RuleSetView,
  SectorView,
  TankView,
  ValveView,
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
type MembershipDto = components['schemas']['Membership'];
type RuleSetDto = components['schemas']['RuleSet'];
type RuleSetSummaryDto = components['schemas']['RuleSetSummary'];
type RuleBandDto = components['schemas']['RuleBand'];
type RuleSectorSettingDto = components['schemas']['RuleSectorSetting'];
type RuleValveOrderDto = components['schemas']['RuleValveOrder'];
type RuleOperatingWindowDto = components['schemas']['RuleOperatingWindow'];
type RuleGaugeDto = components['schemas']['RuleGauge'];
type SectorDto = components['schemas']['Sector'];
type PublicScheduleDto = components['schemas']['PublicSchedule'];
type CatalogItemDto = components['schemas']['CatalogItem'];
type PublicDamageReportDto = components['schemas']['PublicDamageReportStatus'];
type IncidentDto = components['schemas']['Incident'];
type IncidentPageDto = components['schemas']['IncidentPage'];
type DamageReportCreatedDto = components['schemas']['DamageReportCreated'];
type TankDto = components['schemas']['Tank'];
type ValveDto = components['schemas']['Valve'];

const TIME_OF_DAY = /^(?<hours>\d{2}):(?<minutes>\d{2})(?::\d{2})?$/;

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
    // fromEntries defines own properties, so a field named "__proto__" cannot change the prototype.
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
      memberships: dto.memberships.map((membership) => this.toMembership(membership)),
    };
  }

  toRuleSet(dto: RuleSetDto): RuleSetView {
    return {
      id: dto.id,
      version: dto.version,
      status: dto.status,
      validFrom: this.toOptionalTimestamp('valid_from', dto.valid_from),
      validTo: this.toOptionalTimestamp('valid_to', dto.valid_to),
      basedOnRuleSetId: dto.based_on_rule_set_id ?? null,
      changeReason: dto.change_reason ?? null,
      lockVersion: dto.lock_version ?? null,
      reserveLevel: dto.reserve_level,
      reservePolicy: dto.reserve_policy,
      maxDailyServiceHours: dto.max_daily_service_hours,
      minShiftHours: dto.min_shift_hours,
      maxShiftHours: dto.max_shift_hours,
      allocationStrategy: dto.allocation_strategy,
      duplicateWindowMinutes: dto.duplicate_window_minutes,
      maxLevelChangePerHour: dto.max_level_change_per_hour,
      staleReadingHours: dto.stale_reading_hours,
      maxBackdateDays: dto.max_backdate_days,
      forecastHorizonDays: dto.forecast_horizon_days,
      forecastContextDays: dto.forecast_context_days,
      trendThresholdPerDay: dto.trend_threshold_per_day,
      bands: dto.bands.map((band) => this.toRuleBand(band)),
      sectors: dto.sectors.map((sector) => this.toSectorSetting(sector)),
      valveOrder: dto.valve_order.map((valve) => this.toValveOrder(valve)),
      operatingWindows: dto.operating_windows.map((window) => this.toOperatingWindow(window)),
      gauge: this.toGauge(dto.gauge),
    };
  }

  toCatalogOption(dto: CatalogItemDto): CatalogOptionView {
    return { code: dto.code, label: dto.label_es };
  }

  toIncident(dto: IncidentDto): IncidentView {
    if (!isReportStatus(dto.status)) {
      throw new InvalidDtoError('status');
    }
    return {
      id: dto.id,
      categoryCode: dto.category_code,
      sectorId: dto.sector_id ?? null,
      description: dto.description,
      locationHint: dto.location_hint ?? null,
      status: dto.status,
      reportedAt: this.toTimestamp('reported_at', dto.reported_at),
    };
  }

  toIncidentPage(dto: IncidentPageDto): IncidentPageView {
    return {
      items: dto.items.map((item) => this.toIncident(item)),
      nextCursor: dto.next_cursor ?? null,
    };
  }

  toPublicDamageReport(dto: PublicDamageReportDto): PublicDamageReportView {
    if (!isReportStatus(dto.status)) {
      throw new InvalidDtoError('status');
    }
    return {
      status: dto.status,
      reportedAt: this.toTimestamp('reported_at', dto.reported_at),
      updatedAt: this.toTimestamp('updated_at', dto.updated_at),
    };
  }

  toDamageReportReceipt(dto: DamageReportCreatedDto): DamageReportReceiptView {
    return { trackingCode: dto.tracking_code, status: dto.status, message: dto.message };
  }

  /** Keeps the aqueduct name and demo flag, the service day and the sector turns; nothing else. */
  toPublicSchedule(dto: PublicScheduleDto): PublicScheduleView {
    return {
      aqueductName: dto.aqueduct.name,
      isDemo: dto.aqueduct.is_demo,
      serviceDate: dto.service_date,
      publishedAt: this.toTimestamp('publication.published_at', dto.publication.published_at),
      items: dto.items.map((item) => ({
        sectorName: item.sector_name,
        startTime: formatTime(item.start_at),
        endTime: formatTime(item.end_at),
      })),
    };
  }

  toSector(dto: SectorDto): SectorView {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name,
      parentSectorId: dto.parent_sector_id ?? null,
      householdsCount: dto.households_count,
      isActive: dto.is_active,
    };
  }

  toTank(dto: TankDto): TankView {
    if (
      ![dto.gauge_min, dto.gauge_max, dto.gauge_step].every(Number.isFinite) ||
      dto.gauge_max <= dto.gauge_min
    ) {
      throw new InvalidDtoError('tank.gauge');
    }
    return {
      id: dto.id,
      name: dto.name,
      gaugeMin: dto.gauge_min,
      gaugeMax: dto.gauge_max,
      gaugeStep: dto.gauge_step,
      capacityLiters: dto.capacity_liters ?? null,
      isActive: dto.is_active,
    };
  }

  toValve(dto: ValveDto): ValveView {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name,
      locationHint: dto.location_hint ?? null,
      isMotorized: dto.is_motorized,
      failSafePosition: dto.fail_safe_position,
      isActive: dto.is_active,
    };
  }

  toRuleSetSummary(dto: RuleSetSummaryDto): RuleSetSummaryView {
    return {
      id: dto.id,
      version: dto.version,
      status: dto.status,
      validFrom: this.toOptionalTimestamp('valid_from', dto.valid_from),
      validTo: this.toOptionalTimestamp('valid_to', dto.valid_to),
      activatedAt: this.toOptionalTimestamp('activated_at', dto.activated_at),
    };
  }

  private toRuleBand(dto: RuleBandDto): RuleBand {
    if (!isBandCode(dto.band)) {
      throw new InvalidDtoError('bands.band');
    }
    return {
      band: dto.band,
      minLevel: dto.min_level,
      maxLevel: dto.max_level,
      dailyServiceHours: dto.daily_service_hours,
      priorityOnly: dto.priority_only,
    };
  }

  private toSectorSetting(dto: RuleSectorSettingDto): SectorSetting {
    return {
      sectorId: dto.sector_id,
      isIncluded: dto.is_included,
      isPriority: dto.is_priority,
      priorityRank: dto.priority_rank ?? null,
    };
  }

  private toValveOrder(dto: RuleValveOrderDto): ValveOrder {
    return { valveId: dto.valve_id, sequenceOrder: dto.sequence_order };
  }

  private toOperatingWindow(dto: RuleOperatingWindowDto): OperatingWindow {
    return {
      dayOfWeek: dto.day_of_week ?? null,
      start: this.toTimeOfDay('operating_windows.start_time', dto.start_time),
      end: this.toTimeOfDay('operating_windows.end_time', dto.end_time),
    };
  }

  /** Accepts "05:00" and "05:00:00" (a database time) and keeps "05:00". */
  private toTimeOfDay(field: string, raw: string): string {
    const match = TIME_OF_DAY.exec(raw);
    if (match === null) {
      throw new InvalidDtoError(field);
    }
    return `${match.groups?.hours ?? ''}:${match.groups?.minutes ?? ''}`;
  }

  private toGauge(dto: RuleGaugeDto): Gauge {
    if (
      ![dto.min, dto.max, dto.step].every(Number.isFinite) ||
      dto.max <= dto.min ||
      dto.step <= 0
    ) {
      throw new InvalidDtoError('gauge');
    }
    return { min: dto.min, max: dto.max, step: dto.step };
  }

  private toOptionalTimestamp(field: string, iso: string | null | undefined): TimestampView | null {
    return iso === undefined || iso === null ? null : this.toTimestamp(field, iso);
  }

  private toMembership(dto: MembershipDto): Membership {
    if (!isRole(dto.role)) {
      throw new InvalidDtoError('memberships.role');
    }
    return {
      aqueductId: dto.aqueduct_id,
      role: dto.role,
      validFromMs: this.toOptionalInstantMs('memberships.valid_from', dto.valid_from),
      validToMs: this.toOptionalInstantMs('memberships.valid_to', dto.valid_to),
    };
  }

  private toOptionalInstantMs(field: string, iso: string | null | undefined): number | null {
    if (iso === undefined || iso === null) {
      return null;
    }
    return this.toTimestamp(field, iso).date.getTime();
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
