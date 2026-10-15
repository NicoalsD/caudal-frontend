import type {
  Gauge,
  OperatingWindow,
  RuleBand,
  RuleSetStatus,
  SectorSetting,
  ValveOrder,
} from '../../core/rules/ruleSetParts';
import type { Membership } from '../../core/session/memberships';
import type { ReportStatus } from '../../core/incidents/reportStatus';
import type { ProposalStatus } from '../../core/proposal/proposalDay';
import type { Role } from '../../core/session/roles';

/** View models returned by CaudalApi. Components never see the server DTOs. */

export interface HealthView {
  readonly isUp: boolean;
}

/** An instant ready for the screen. */
export interface TimestampView {
  readonly date: Date;
  /** Text in America/Bogota, for example "9 de oct de 2026, 8:00 a. m.". */
  readonly text: string;
  /** Calendar day in America/Bogota as YYYY-MM-DD, to group by service day. */
  readonly dayKey: string;
}

/** A decimal ready for the screen. */
export interface DecimalView {
  /** The number for calculations (dot in JSON, a plain number here). */
  readonly value: number;
  /** Text with decimal comma, for example "2,1". */
  readonly text: string;
}

/** The person who signed in. Everything here may be shown; none of it is a secret. */
export interface AuthUserView {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly role: Role;
  readonly aqueductId: string;
  readonly mustChangePassword: boolean;
}

/** Answer of a sign in. The access token is for the in-memory TokenStore only. */
export interface LoginView {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
  readonly user: AuthUserView;
}

/** A new access token after POST /auth/refresh. */
export interface RefreshView {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
}

/** Who the server says is signed in (GET /auth/me). Permissions are for showing actions only. */
export interface MeView {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly mustChangePassword: boolean;
  readonly permissions: readonly string[];
  readonly memberships: readonly Membership[];
}

/** A version of the Junta's rules, complete (GET /rule-sets/current and /rule-sets/{id}). */
export interface RuleSetView {
  readonly id: string;
  readonly version: number;
  readonly status: RuleSetStatus;
  readonly validFrom: TimestampView | null;
  readonly validTo: TimestampView | null;
  readonly basedOnRuleSetId: string | null;
  readonly changeReason: string | null;
  readonly lockVersion: number | null;
  readonly reserveLevel: number;
  readonly reservePolicy: 'NONE' | 'REDUCE_TO_CRITICAL_BAND' | 'PRIORITY_ONLY';
  readonly maxDailyServiceHours: number;
  readonly minShiftHours: number;
  readonly maxShiftHours: number;
  readonly allocationStrategy: 'PRIORITY_THEN_LONGEST_WAIT' | 'EQUAL_SPLIT';
  readonly duplicateWindowMinutes: number;
  readonly maxLevelChangePerHour: number;
  readonly staleReadingHours: number;
  readonly maxBackdateDays: number;
  readonly forecastHorizonDays: number;
  readonly forecastContextDays: number;
  readonly trendThresholdPerDay: number;
  readonly bands: readonly RuleBand[];
  readonly sectors: readonly SectorSetting[];
  readonly valveOrder: readonly ValveOrder[];
  readonly operatingWindows: readonly OperatingWindow[];
  readonly gauge: Gauge;
}

/** A row of the versions list (GET /rule-sets). */
export interface RuleSetSummaryView {
  readonly id: string;
  readonly version: number;
  readonly status: RuleSetStatus;
  readonly validFrom: TimestampView | null;
  readonly validTo: TimestampView | null;
  readonly activatedAt: TimestampView | null;
}

/** A sector of the network. It never carries names or phones of families. */
export interface SectorView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly parentSectorId: string | null;
  readonly householdsCount: number;
  readonly isActive: boolean;
}

export interface TankView {
  readonly id: string;
  readonly name: string;
  readonly gaugeMin: number;
  readonly gaugeMax: number;
  readonly gaugeStep: number;
  readonly capacityLiters: number | null;
  readonly isActive: boolean;
}

export interface ValveView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly locationHint: string | null;
  readonly isMotorized: boolean;
  readonly failSafePosition: 'KEEP' | 'OPEN' | 'CLOSED';
  readonly isActive: boolean;
}

/** One sector's turn in the public schedule. Only the sector name and the hours are kept. */
export interface PublicScheduleItemView {
  readonly sectorName: string;
  /** Start hour in 12 h format, America/Bogota, for example "6:00 a. m.". */
  readonly startTime: string;
  readonly endTime: string;
}

/** The published schedule of one aqueduct for one service day (API.md 15.1). No personal data. */
export interface PublicScheduleView {
  readonly aqueductName: string;
  readonly isDemo: boolean;
  /** Service day as YYYY-MM-DD in America/Bogota; shown without a time zone shift. */
  readonly serviceDate: string;
  readonly publishedAt: TimestampView;
  readonly items: readonly PublicScheduleItemView[];
}

/** One option of a catalog (GET /catalogs/{catalog}), with its text in Spanish. */
export interface CatalogOptionView {
  readonly code: string;
  readonly label: string;
}

/** What the person gets back after a damage report: the code is shown once (API.md 15.4). */
export interface DamageReportReceiptView {
  readonly trackingCode: string;
  readonly status: string;
  readonly message: string;
}

/** What the person typed, before it becomes the request body. */
export interface DamageReportInput {
  readonly categoryCode: string;
  readonly description: string;
  /** Empty when the person left it blank: then the field is not sent. */
  readonly locationHint: string;
  /** The honeypot field: always sent, empty for people. */
  readonly website: string;
  /** ISO instant when the form was opened (the server checks the minimum filling time). */
  readonly formStartedAt: string;
}

/** The status of a damage report for the person who has its code (API.md 15.5). No personal data. */
export interface PublicDamageReportView {
  readonly status: ReportStatus;
  readonly reportedAt: TimestampView;
  readonly updatedAt: TimestampView;
}

/** A damage report as the Board sees it (API.md 12.1). The reporter's data never leaves the server. */
export interface IncidentView {
  readonly id: string;
  readonly categoryCode: string;
  readonly sectorId: string | null;
  readonly description: string;
  readonly locationHint: string | null;
  readonly status: ReportStatus;
  readonly reportedAt: TimestampView;
}

/** One page of incidents. `nextCursor` is null when there are no more (API.md 1.5). */
export interface IncidentPageView {
  readonly items: readonly IncidentView[];
  readonly nextCursor: string | null;
}

/** A proposal without its shifts, as the Board's list shows it (API.md 10.2). */
export interface ScheduleProposalSummaryView {
  readonly id: string;
  /** Calendar day of service as YYYY-MM-DD (no zone). */
  readonly serviceDate: string;
  readonly status: ProposalStatus;
  readonly generatedAt: TimestampView;
  readonly availableHours: DecimalView;
  readonly tankBand: string | null;
  readonly tankLevel: DecimalView | null;
  readonly lockVersion: number;
}

/** One page of proposals; `nextCursor` is null when there are no more (API.md 1.5). */
export interface ScheduleProposalPageView {
  readonly items: readonly ScheduleProposalSummaryView[];
  readonly nextCursor: string | null;
}
