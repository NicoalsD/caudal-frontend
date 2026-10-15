import type { CSSProperties, JSX, ReactNode } from 'react';
import { CheckCircle2, CloudOff, Copy, Droplets, ShieldCheck, TriangleAlert } from 'lucide-react';

import { strings } from '../../i18n/es';
import { cn } from '../../ui/styles/cn';
import { DEMO_SECTORS } from './demo';
import styles from './DemoScreens.module.css';

const copy = strings.landing;

/** Custom property that carries a 0 to 1 share into the CSS (bar lengths, tank level). */
export function shareStyle(share: number): CSSProperties {
  return { '--share': String(share) } as CSSProperties;
}

/** The "Datos simulados" mark every sample screen carries. */
export function SimulatedTag({ className }: { readonly className?: string }): JSX.Element {
  return <span className={cn(styles.simulated, className)}>{strings.common.simulatedData}</span>;
}

interface FrameProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/** A phone drawn in CSS: dark bezel, screen in the page colors. */
export function PhoneFrame({ children, className }: FrameProps): JSX.Element {
  return (
    <div className={cn(styles.phone, className)}>
      <div className={cn(styles.phoneScreen)}>{children}</div>
    </div>
  );
}

/** A tablet on its stand: the Board works at a bigger screen. */
export function PanelFrame({ children, className }: FrameProps): JSX.Element {
  return (
    <div className={cn(styles.panel, className)}>
      <div className={cn(styles.panelScreen)}>{children}</div>
    </div>
  );
}

function ScreenBar({ title, aside }: { readonly title: string; readonly aside?: ReactNode }) {
  return (
    <div className={cn(styles.screenBar)}>
      <span className={cn(styles.screenBrand)}>{strings.app.name}</span>
      <span className={cn(styles.screenTitle)}>{title}</span>
      {aside}
    </div>
  );
}

/** Screen S08 of the plumber: the reading saved while there is no signal. */
export function OperatorScreen(): JSX.Element {
  return (
    <div className={cn(styles.screen)}>
      <ScreenBar title={copy.operator.title} />
      <p className={cn(styles.syncChip, styles.syncOffline)}>
        <CloudOff aria-hidden="true" />
        {copy.operator.offline}
      </p>
      <div className={cn(styles.gauge)}>
        <span className={cn(styles.gaugeLabel)}>{copy.operator.gaugeLabel}</span>
        <span className={cn(styles.gaugeValue)}>
          {copy.operator.gauge}
          <span className={cn(styles.gaugeUnit)}>{copy.operator.unit}</span>
        </span>
      </div>
      <div className={cn(styles.choiceRow)}>
        <span className={cn(styles.choice, styles.choiceOn)}>
          <Droplets aria-hidden="true" />
          {copy.operator.water}
        </span>
        <span className={cn(styles.choice)}>{copy.operator.damage}</span>
      </div>
      <p className={cn(styles.saved)}>
        <CheckCircle2 aria-hidden="true" />
        {copy.operator.saved}
      </p>
      <span className={cn(styles.fakeButton)}>{copy.operator.action}</span>
      <p className={cn(styles.pending)}>{copy.operator.pending}</p>
    </div>
  );
}

/** The proposal list: each turn with its hours and its reason. */
export function ProposalList({ compact = false }: { readonly compact?: boolean }): JSX.Element {
  return (
    <ul className={cn(styles.proposal, compact && styles.proposalCompact)}>
      {DEMO_SECTORS.map((sector) => (
        <li key={sector.key} className={cn(styles.turn)}>
          <span className={cn(styles.turnName)}>
            {sector.name}
            {sector.priority ? (
              <ShieldCheck className={cn(styles.priorityIcon)} aria-hidden="true" />
            ) : null}
          </span>
          <span className={cn(styles.turnHours)}>{sector.duration}</span>
          <span className={cn(styles.turnBar)} style={shareStyle(sector.share)} />
          <span className={cn(styles.turnReason)}>{sector.reason}</span>
        </li>
      ))}
    </ul>
  );
}

/** Screen S13 of the Board: today's proposal, explained, waiting for a decision. */
export function BoardScreen(): JSX.Element {
  return (
    <div className={cn(styles.screen, styles.screenWide)}>
      <ScreenBar title={copy.board.title} aside={<SimulatedTag />} />
      <div className={cn(styles.boardHead)}>
        <span className={cn(styles.boardDate)}>{copy.board.date}</span>
        <span className={cn(styles.boardAvailable)}>{copy.board.available}</span>
      </div>
      <ProposalList />
      <div className={cn(styles.boardActions)}>
        <span className={cn(styles.fakeButton)}>{copy.board.approve}</span>
        <span className={cn(styles.fakeButton, styles.fakeSecondary)}>{copy.board.modify}</span>
      </div>
    </div>
  );
}

/** The schedule the families see: no names, no phones. */
export function ScheduleList(): JSX.Element {
  return (
    <ul className={cn(styles.schedule)}>
      {DEMO_SECTORS.map((sector) => (
        <li key={sector.key} className={cn(styles.slot)}>
          <span className={cn(styles.slotName)}>{sector.name}</span>
          <span className={cn(styles.slotHours)}>{sector.hours}</span>
        </li>
      ))}
    </ul>
  );
}

/** Screen S04: the public schedule of the day. */
export function FamilyScreen(): JSX.Element {
  return (
    <div className={cn(styles.screen)}>
      <ScreenBar title={copy.family.title} />
      <ScheduleList />
      <span className={cn(styles.fakeButton)}>
        <Copy aria-hidden="true" />
        {copy.family.share}
      </span>
      <span className={cn(styles.fakeButton, styles.fakeSecondary)}>
        <TriangleAlert aria-hidden="true" />
        {copy.family.report}
      </span>
    </div>
  );
}
