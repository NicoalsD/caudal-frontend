import type { JSX, ReactNode } from 'react';
import { Bot, Droplets, Gauge, Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { formatDecimal } from '../../core/format/decimal';
import { bandLabel } from '../../i18n/bandLabel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import { useAutopilotSettings } from '../../state/hooks/useAutopilot';
import type { LiveAqueduct as LiveAqueductData } from '../../state/hooks/useLiveAqueduct';
import { usePermission } from '../../state/hooks/usePermission';
import { Card } from '../../ui/cards/Card';
import { Chip } from '../../ui/primitives/Chip';
import { cn } from '../../ui/styles/cn';
import { PERMISSION_ASSISTANT } from '../aqueduct/permissions';
import styles from './OperatorHome.module.css';

const PERCENT = 100;

const TREND = {
  DOWN: { icon: TrendingDown, text: 'tankStatus.trendDown' },
  STABLE: { icon: Minus, text: 'tankStatus.trendStable' },
  UP: { icon: TrendingUp, text: 'tankStatus.trendUp' },
} as const;

interface SceneHeroProps {
  /** The 3D scene (or the message that stands in for it). */
  readonly children: ReactNode;
  /** Null while the aqueduct is not ready: the card then shows only what stands in the scene. */
  readonly aqueduct: LiveAqueductData | null;
  readonly label: string;
}

/**
 * The big card of the screen: the 3D scene under a wavy top edge, the tank's name with its level
 * in large type, and pill chips with the level, the zone, the pilot's mode and the trend.
 */
export function SceneHero({ children, aqueduct, label }: SceneHeroProps): JSX.Element {
  return (
    <Card variant="hero" padded={false} as="section" aria-label={label} className={cn(styles.hero)}>
      <div className={cn(styles.heroScene)}>{children}</div>
      {aqueduct === null ? null : <HeroCaption aqueduct={aqueduct} />}
    </Card>
  );
}

function HeroCaption({ aqueduct }: { readonly aqueduct: LiveAqueductData }): JSX.Element {
  const canRead = usePermission(PERMISSION_ASSISTANT);
  const settings = useAutopilotSettings(canRead);
  const { tank, level, status } = aqueduct;
  const percent = Math.round(aqueduct.levelFraction * PERCENT);
  const band = status?.band ?? null;
  const trend = status?.trend?.label ?? null;
  const TrendIcon = trend === null ? Minus : TREND[trend].icon;
  return (
    <div className={cn(styles.heroCaption)}>
      <h2 className={cn(styles.heroTitle)}>
        {level === null
          ? t('home.heroTitleNoLevel', { tank: tank.name })
          : t('home.heroTitle', { tank: tank.name, percent: String(percent) })}
      </h2>
      <ul className={cn(styles.heroChips)}>
        <li>
          <Chip tone="aqua" icon={<Droplets aria-hidden="true" />}>
            {level === null
              ? t('scene.tankNoLevel')
              : t('home.heroLevel', { level: formatDecimal(level) })}
          </Chip>
        </li>
        <li>
          <Chip tone="mint" icon={<Gauge aria-hidden="true" />}>
            {band === null
              ? t('home.heroNoBand')
              : t('home.heroBand', { band: bandLabel(band.code) })}
          </Chip>
        </li>
        {settings.data === undefined ? null : (
          <li>
            <Chip tone="sand" icon={<Bot aria-hidden="true" />}>
              {t('home.heroMode', { mode: t(`autopilot.mode.${lower(settings.data.mode)}`) })}
            </Chip>
          </li>
        )}
        <li>
          <Chip tone="plain" icon={<TrendIcon aria-hidden="true" />}>
            {trend === null ? t('home.heroNoTrend') : t(TREND[trend].text)}
          </Chip>
        </li>
      </ul>
    </div>
  );
}
