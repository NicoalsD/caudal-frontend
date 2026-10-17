import type { JSX } from 'react';

import boardApproveDark from '../../assets/landing/screens/board-approve-dark.webp';
import boardApproveLight from '../../assets/landing/screens/board-approve-light.webp';
import boardProposalDark from '../../assets/landing/screens/board-proposal-dark.webp';
import boardProposalLight from '../../assets/landing/screens/board-proposal-light.webp';
import boardTankDark from '../../assets/landing/screens/board-tank-dark.webp';
import boardTankLight from '../../assets/landing/screens/board-tank-light.webp';
import operatorOfflineDark from '../../assets/landing/screens/operator-offline-dark.webp';
import operatorOfflineLight from '../../assets/landing/screens/operator-offline-light.webp';
import operatorPendingDark from '../../assets/landing/screens/operator-pending-dark.webp';
import operatorPendingLight from '../../assets/landing/screens/operator-pending-light.webp';
import operatorReadingDark from '../../assets/landing/screens/operator-reading-dark.webp';
import operatorReadingLight from '../../assets/landing/screens/operator-reading-light.webp';
import publicScheduleDark from '../../assets/landing/screens/public-schedule-dark.webp';
import publicScheduleLight from '../../assets/landing/screens/public-schedule-light.webp';
import { cn } from '../../ui/styles/cn';
import styles from './AppScreen.module.css';

/**
 * Screens of the real app, captured with Playwright against the mocked API (pnpm capture:screens).
 * Each one exists in the light and the dark theme; the browser picks the one of the system theme.
 */
const SHOTS = {
  operatorReading: { light: operatorReadingLight, dark: operatorReadingDark },
  operatorOffline: { light: operatorOfflineLight, dark: operatorOfflineDark },
  operatorPending: { light: operatorPendingLight, dark: operatorPendingDark },
  boardTank: { light: boardTankLight, dark: boardTankDark },
  boardProposal: { light: boardProposalLight, dark: boardProposalDark },
  boardApprove: { light: boardApproveLight, dark: boardApproveDark },
  publicSchedule: { light: publicScheduleLight, dark: publicScheduleDark },
} as const;

export type AppShot = keyof typeof SHOTS;

/** Size of the captures: a 390 x 844 phone at twice its density. */
const SHOT_WIDTH = 780;
const SHOT_HEIGHT = 1688;

interface AppScreenProps {
  readonly shot: AppShot;
  readonly alt: string;
  /** Only the screens of the first viewport load right away. */
  readonly eager?: boolean;
  readonly className?: string;
}

export function AppScreen({ shot, alt, eager = false, className }: AppScreenProps): JSX.Element {
  const source = SHOTS[shot];
  return (
    <picture className={cn(styles.picture, className)}>
      <source srcSet={source.dark} media="(prefers-color-scheme: dark)" />
      <img
        className={cn(styles.image)}
        src={source.light}
        alt={alt}
        width={SHOT_WIDTH}
        height={SHOT_HEIGHT}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}
