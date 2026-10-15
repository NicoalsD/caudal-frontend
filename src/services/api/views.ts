import type { BatchItemAnswer } from '../../core/commands/batchOutcome';
import type { ReadingImportRow } from '../../core/imports/readingImport';
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

/** One option of a server catalog (GET /catalogs/{catalog}), already in Spanish. */
export interface CatalogItemView {
  readonly code: string;
  readonly label: string;
  readonly sortOrder: number;
}

/** What the plumber typed, ready to send (POST /readings). */
export interface ReadingInput {
  /** Client UUID: the server uses it to recognize a repeated send (API.md 1.6). */
  readonly id: string;
  readonly tankId: string;
  readonly gaugeValue: number;
  readonly waterAppearanceCode: string;
  readonly damageNoticed: boolean;
  /** Empty when there is no note. */
  readonly note: string;
  readonly observedAt: Date;
}

/** A batch of queued readings sent together (POST /readings/batch, API.md 7.2). */
export interface ReadingBatchInput {
  /** Fresh client UUID for each send attempt: a changed batch never reuses an id. */
  readonly syncBatchId: string;
  readonly readings: readonly ReadingInput[];
}

/** The server's answer to a batch: one answer per reading, in the order it was sent. */
export interface ReadingBatchResultView {
  readonly syncBatchId: string;
  readonly idempotentReplay: boolean;
  readonly answers: readonly BatchItemAnswer[];
}

/** A correction the person asks for on a saved reading (API.md 7.5). */
export interface ReadingCorrectionInput {
  readonly correctedGaugeValue: number;
  /** 10 to 500 characters, mandatory. */
  readonly reason: string;
}

/** The correction as stored. The original reading is never changed or removed. */
export interface ReadingCorrectionView {
  readonly id: string;
  readonly readingId: string;
  readonly correctedGaugeValue: DecimalView;
  readonly reason: string;
  readonly createdAt: TimestampView;
  /** The value the reading has now: the last correction, or the original value. */
  readonly effectiveGaugeValue: DecimalView;
}

/** The server's answer to a reading: what it stored and what it noticed. */
export interface ReadingResultView {
  readonly id: string;
  readonly gaugeValue: DecimalView;
  readonly observedAt: TimestampView;
  readonly validationStatus: string;
  /** Codes of the issues the validation chain found (the reading is kept but flagged). */
  readonly issueCodes: readonly string[];
  /** True when the server already had this reading (same id and content). */
  readonly isReplay: boolean;
}

export type TrendLabel = 'DOWN' | 'STABLE' | 'UP';

/** One day of a forecast: the likely level (p50) and its range (p10 to p90). */
export interface ForecastPointView {
  /** Calendar day as YYYY-MM-DD. */
  readonly targetDate: string;
  readonly p10: number;
  readonly p50: number;
  readonly p90: number;
}

/** A forecast run: from the AI model or, when it fails, the simple estimate that replaces it. */
export interface ForecastView {
  readonly runId: string | null;
  /** True when the simple estimate replaced the AI model (API.md 8.3). */
  readonly isFallback: boolean;
  /** IA_TIMEOUT, CIRCUIT_OPEN, IA_ERROR, INSUFFICIENT_HISTORY or null. */
  readonly fallbackReason: string | null;
  readonly modelName: string | null;
  readonly createdAt: TimestampView | null;
  readonly points: readonly ForecastPointView[];
}

/** The current state of a tank (GET /tanks/{id}/status). */
export interface TankStatusView {
  /** The last effective reading, or null when there is none yet. */
  readonly level: {
    readonly value: DecimalView;
    readonly observedAt: TimestampView;
    readonly hoursAgo: number;
  } | null;
  readonly trend: {
    readonly slopePerDay: number;
    /** A known label, or null when the server sent one this client does not know. */
    readonly label: TrendLabel | null;
    /** Server text, the fallback for an unknown label. */
    readonly labelEs: string | null;
  };
  readonly stale: { readonly isStale: boolean; readonly staleAfterHours: number };
  readonly band: {
    readonly code: string;
    /** Hours of service per day of that band, when the server sends them. */
    readonly serviceHours: number | null;
  } | null;
  readonly forecast: ForecastView | null;
  readonly openAnomalies: number;
}

/** One batch of simulated readings (API.md 17.1). The file hash lets the server spot a repeat. */
export interface ReadingImportInput {
  readonly aqueductId: string;
  readonly scenarioName: string;
  readonly seed: number;
  readonly simulatorVersion: string;
  /** 64 lowercase hexadecimal characters. */
  readonly fileSha256: string;
  readonly rows: readonly ReadingImportRow[];
}

export interface ReadingImportRejectionView {
  /** Position in the batch sent, from 1. */
  readonly row: number;
  readonly code: string;
}

/** What the server kept from one batch. */
export interface ReadingImportResultView {
  readonly importBatchId: string;
  readonly rowsReceived: number;
  readonly rowsAccepted: number;
  readonly rowsRejected: number;
  readonly rejections: readonly ReadingImportRejectionView[];
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

/** The kinds of anomaly the server detects (API.md 9). They are suspicions until someone confirms. */
export type AnomalyKind =
  'POSSIBLE_LEAK' | 'SENSOR_FAULT' | 'STALE_DATA' | 'SUSPECTED_DUPLICATE' | 'ABNORMAL_DROP';

export type AnomalyStatus = 'OPEN' | 'CONFIRMED' | 'DISMISSED';

/** An anomaly as the Board sees it (GET /anomalies). */
export interface AnomalyView {
  readonly id: string;
  readonly kind: AnomalyKind;
  readonly status: AnomalyStatus;
  readonly detectedAt: TimestampView;
  /** The level the anomaly points at, when the server's evidence carries one. */
  readonly gaugeValue: DecimalView | null;
  readonly resolutionNote: string | null;
}

export interface AnomalyPageView {
  readonly items: readonly AnomalyView[];
  readonly nextCursor: string | null;
}
