import { useEffect, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Eye,
  GitBranch,
  HelpCircle,
  History,
  ListChecks,
  ScrollText,
} from 'lucide-react';

import { ROUTE_PATHS } from '../../core/session/routes';
import { strings } from '../../i18n/es';
import { BrandLogo } from '../../ui/brand/BrandLogo';
import { cn } from '../../ui/styles/cn';
import { AppScreen } from './AppScreen';
import type { AppShot } from './AppScreen';
import { PhoneFrame, SimulatedTag } from './Frames';
import { FlowShowcase } from './FlowShowcase';
import { ForecastFigure } from './ForecastFigure';
import styles from './Landing.module.css';
import { DOCS_URL, PHOTO_URLS, REPOSITORY_URLS, SECTION_IDS } from './links';
import { CLOSING_PHOTO, HERO_PHOTO } from './photos';
import { OfflineBand } from './OfflineBand';
import { useHeroWater } from './useHeroWater';
import { useReveal } from './useReveal';

const copy = strings.landing;
const MAIN_ID = 'contenido';
/** Scroll distance after which the bar draws its level line. */
const SCROLLED_AFTER_PX = 8;

/** A block that rises into place the first time it is seen. */
function Reveal({
  children,
  className,
  as: Tag = 'div',
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly as?: 'div' | 'header';
}): JSX.Element {
  const [ref, seen] = useReveal<HTMLDivElement>();
  return (
    <Tag ref={ref} className={cn(styles.reveal, className)} data-seen={seen}>
      {children}
    </Tag>
  );
}

function ExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className={cn(styles.visuallyHidden)}> {copy.project.opensInNewTab}</span>
    </a>
  );
}

function LandingNav(): JSX.Element {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = (): void => setScrolled(window.scrollY > SCROLLED_AFTER_PX);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const anchors = [
    [SECTION_IDS.flow, copy.nav.flow],
    [SECTION_IDS.offline, copy.nav.offline],
    [SECTION_IDS.board, copy.nav.board],
    [SECTION_IDS.forecast, copy.nav.forecast],
    [SECTION_IDS.project, copy.nav.project],
  ] as const;

  return (
    <header className={cn(styles.navBar)} data-scrolled={scrolled}>
      <div className={cn(styles.navInner)}>
        <Link to={ROUTE_PATHS.root} className={cn(styles.navBrand)} aria-label={copy.nav.home}>
          <BrandLogo tone="onBrand" />
        </Link>
        <nav aria-label={copy.nav.label} className={cn(styles.navLinks)}>
          <ul>
            {anchors.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={cn(styles.navActions)}>
          <Link to={ROUTE_PATHS.login} className={cn(styles.button, styles.buttonSmall)}>
            {copy.nav.signIn}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** The three real screens of the first viewport: the plumber, the Board and the families. */
const HERO_DEVICES = [
  {
    key: 'operator',
    shot: 'operatorOffline',
    caption: copy.operator.caption,
    alt: copy.hero.operatorShot,
  },
  { key: 'board', shot: 'boardProposal', caption: copy.board.caption, alt: copy.hero.boardShot },
  {
    key: 'family',
    shot: 'publicSchedule',
    caption: copy.family.caption,
    alt: copy.hero.familyShot,
  },
] as const satisfies readonly { key: string; shot: AppShot; caption: string; alt: string }[];

/**
 * First viewport: the brand's deep teal field with moving water (three.js, loaded on demand), the
 * wordmark filling up to its level, and below it the land of Guaitarilla with three real screens of
 * the app rising out of the water as the visitor scrolls (GSAP).
 */
function Hero(): JSX.Element {
  const { heroRef, canvasRef } = useHeroWater();
  return (
    <section ref={heroRef} className={cn(styles.hero)} aria-labelledby="landing-title">
      <canvas ref={canvasRef} className={cn(styles.water)} aria-hidden="true" />
      <div className={cn(styles.heroText)}>
        <h1 id="landing-title" className={cn(styles.wordmark)}>
          <span className={cn(styles.visuallyHidden)}>{copy.hero.title}</span>
          <span className={cn(styles.wordmarkDry)} aria-hidden="true">
            {copy.hero.title}
          </span>
          <span className={cn(styles.wordmarkWet)} aria-hidden="true">
            {copy.hero.title}
          </span>
        </h1>
        <p className={cn(styles.tagline)}>{copy.hero.tagline}</p>
        <p className={cn(styles.place)}>{copy.hero.place}</p>
        <div className={cn(styles.heroActions)}>
          <Link to={ROUTE_PATHS.login} className={cn(styles.button)}>
            {copy.hero.primary}
          </Link>
          <a href={`#${SECTION_IDS.flow}`} className={cn(styles.button, styles.buttonSecondary)}>
            {copy.hero.secondary}
          </a>
        </div>
      </div>

      <div className={cn(styles.land)}>
        <img
          data-hero-photo
          className={cn(styles.landPhoto)}
          src={HERO_PHOTO.src}
          srcSet={HERO_PHOTO.srcSet}
          sizes="100vw"
          width={HERO_PHOTO.width}
          height={HERO_PHOTO.height}
          alt={copy.hero.photoAlt}
          fetchPriority="high"
          decoding="async"
        />
        <ul className={cn(styles.devices)} aria-label={copy.hero.devicesLabel}>
          {HERO_DEVICES.map(({ key, shot, caption, alt }) => (
            <li key={key} className={cn(styles.device)} data-device={key}>
              <PhoneFrame className={cn(styles.devicePhone)}>
                <AppScreen shot={shot} alt={alt} eager />
              </PhoneFrame>
              <span className={cn(styles.deviceCaption)}>{caption}</span>
            </li>
          ))}
        </ul>
        <SimulatedTag className={cn(styles.heroTag)} />
      </div>
    </section>
  );
}

function FlowSection(): JSX.Element {
  return (
    <section
      id={SECTION_IDS.flow}
      className={cn(styles.section, styles.flow)}
      aria-labelledby={`${SECTION_IDS.flow}-title`}
    >
      <Reveal className={cn(styles.flowText)}>
        <h2 id={`${SECTION_IDS.flow}-title`} className={cn(styles.statement)}>
          {copy.flow.title}
        </h2>
        <p className={cn(styles.lead)}>{copy.flow.body}</p>
        <Link to={ROUTE_PATHS.login} className={cn(styles.textLink)}>
          {copy.hero.primary}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Reveal>
      <FlowShowcase />
    </section>
  );
}

function DecideSection(): JSX.Element {
  const points = [
    { key: 'versioned', Icon: History },
    { key: 'explained', Icon: ListChecks },
    { key: 'traced', Icon: ScrollText },
  ] as const;
  const versions = ['third', 'second', 'first'] as const;

  return (
    <section
      id={SECTION_IDS.board}
      className={cn(styles.section, styles.decide)}
      aria-labelledby={`${SECTION_IDS.board}-title`}
    >
      <Reveal className={cn(styles.decideText)}>
        <h2 id={`${SECTION_IDS.board}-title`} className={cn(styles.statement)}>
          {copy.decide.title}
        </h2>
        <p className={cn(styles.lead)}>{copy.decide.body}</p>
        <ul className={cn(styles.points)}>
          {points.map(({ key, Icon }) => (
            <li key={key}>
              <Icon aria-hidden="true" />
              <div>
                <h3>{copy.decide.points[key].title}</h3>
                <p>{copy.decide.points[key].body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal className={cn(styles.ledger)}>
        <div className={cn(styles.ledgerHead)}>
          <h3>{copy.decide.historyTitle}</h3>
          <SimulatedTag />
        </div>
        <ol className={cn(styles.versions)}>
          {versions.map((version, index) => (
            <li key={version} className={cn(styles.version, index === 0 && styles.versionActive)}>
              <span className={cn(styles.versionNode)} aria-hidden="true">
                <GitBranch />
              </span>
              <div className={cn(styles.versionBody)}>
                <p className={cn(styles.versionHead)}>
                  <strong>{copy.decide.versions[version].label}</strong>
                  <span className={cn(styles.versionState)}>
                    {copy.decide.versions[version].state}
                  </span>
                </p>
                <p className={cn(styles.versionReason)}>
                  {copy.decide.reasonPrefix} {copy.decide.versions[version].reason}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

function ForecastSection(): JSX.Element {
  return (
    <section
      id={SECTION_IDS.forecast}
      className={cn(styles.section, styles.forecast)}
      aria-labelledby={`${SECTION_IDS.forecast}-title`}
    >
      <Reveal className={cn(styles.forecastText)}>
        <h2 id={`${SECTION_IDS.forecast}-title`} className={cn(styles.quote)}>
          {copy.forecast.title}
        </h2>
        <p className={cn(styles.lead)}>{copy.forecast.body}</p>
      </Reveal>
      <ForecastFigure />
    </section>
  );
}

function HonestySection(): JSX.Element {
  const kinds = [
    { key: 'observed', Icon: Eye },
    { key: 'estimated', Icon: Calculator },
    { key: 'inferred', Icon: HelpCircle },
    { key: 'confirmed', Icon: CheckCircle2 },
  ] as const;
  const [ref, seen] = useReveal<HTMLUListElement>();

  return (
    <section className={cn(styles.section, styles.honesty)} aria-labelledby="honesty-title">
      <Reveal className={cn(styles.centerText)}>
        <h2 id="honesty-title" className={cn(styles.statement)}>
          {copy.honesty.title}
        </h2>
        <p className={cn(styles.lead)}>{copy.honesty.body}</p>
      </Reveal>
      <ul ref={ref} className={cn(styles.kinds)} data-seen={seen}>
        {kinds.map(({ key, Icon }) => (
          <li key={key} className={cn(styles.kind)}>
            <span className={cn(styles.chip, styles[`chip-${key}`])}>
              <Icon aria-hidden="true" />
              {copy.honesty.kinds[key].label}
            </span>
            <p>{copy.honesty.kinds[key].body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectSection(): JSX.Element {
  const patterns = ['facade', 'decorator', 'command', 'observer', 'builder', 'composite'] as const;
  const repos = ['backend', 'frontend', 'ia', 'simulator'] as const;
  const team = ['diaz', 'salazar', 'mora'] as const;

  return (
    <section
      id={SECTION_IDS.project}
      className={cn(styles.section, styles.project)}
      aria-labelledby={`${SECTION_IDS.project}-title`}
    >
      <Reveal className={cn(styles.projectText)}>
        <h2 id={`${SECTION_IDS.project}-title`} className={cn(styles.statement)}>
          {copy.project.title}
        </h2>
        <p className={cn(styles.lead)}>{copy.project.body}</p>
      </Reveal>
      <div className={cn(styles.patterns)}>
        <h3>{copy.project.patternsTitle}</h3>
        <dl>
          {patterns.map((pattern) => (
            <div key={pattern}>
              <dt>{copy.project.patterns[pattern].name}</dt>
              <dd>{copy.project.patterns[pattern].where}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className={cn(styles.repos)}>
        <h3 className={cn(styles.visuallyHidden)}>{copy.project.reposTitle}</h3>
        <ul>
          {repos.map((repo) => (
            <li key={repo}>
              <ExternalLink href={REPOSITORY_URLS[repo]}>
                <span className={cn(styles.repoName)}>{copy.project.repos[repo].name}</span>
                <span className={cn(styles.repoStack)}>{copy.project.repos[repo].stack}</span>
              </ExternalLink>
            </li>
          ))}
        </ul>
      </div>
      <div className={cn(styles.team)}>
        <h3>{copy.project.teamTitle}</h3>
        <ul>
          {team.map((member) => (
            <li key={member}>
              <strong>{copy.project.team[member].name}</strong>
              <span>{copy.project.team[member].role}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Closing(): JSX.Element {
  return (
    <section className={cn(styles.closing)} aria-labelledby="closing-title">
      <img
        className={cn(styles.closingPhoto)}
        src={CLOSING_PHOTO.src}
        srcSet={CLOSING_PHOTO.srcSet}
        sizes="100vw"
        width={CLOSING_PHOTO.width}
        height={CLOSING_PHOTO.height}
        alt={copy.hero.closingPhotoAlt}
        loading="lazy"
        decoding="async"
      />
      <Reveal className={cn(styles.centerText, styles.closingCard)}>
        <h2 id="closing-title" className={cn(styles.closingTitle)}>
          {copy.closing.title}
        </h2>
        <p className={cn(styles.lead)}>{copy.closing.body}</p>
        <Link to={ROUTE_PATHS.login} className={cn(styles.button, styles.buttonLarge)}>
          {copy.closing.primary}
        </Link>
        <p className={cn(styles.note)}>{copy.closing.note}</p>
      </Reveal>
    </section>
  );
}

function LandingFooter(): JSX.Element {
  return (
    <footer className={cn(styles.footer)}>
      <div className={cn(styles.footerInner)}>
        <p className={cn(styles.footerBrand)}>
          <BrandLogo />
          <span className={cn(styles.footerTagline)}>{copy.hero.tagline}</span>
        </p>
        <ul className={cn(styles.footerLinks)}>
          <li>
            <Link to={ROUTE_PATHS.login}>{copy.footer.signIn}</Link>
          </li>
          <li>
            <ExternalLink href={DOCS_URL}>{copy.footer.docs}</ExternalLink>
          </li>
          <li>
            <ExternalLink href={REPOSITORY_URLS.frontend}>
              {copy.project.repos.frontend.name}
            </ExternalLink>
          </li>
        </ul>
        <div className={cn(styles.footerCredits)}>
          <h2>{copy.credits.title}</h2>
          <ul>
            {(['galeras', 'azufral'] as const).map((photo) => (
              <li key={photo}>
                {copy.credits[photo]}{' '}
                <ExternalLink href={PHOTO_URLS[photo]}>{copy.credits.source}</ExternalLink>
              </li>
            ))}
          </ul>
        </div>
        <p className={cn(styles.footerRights)}>{copy.footer.rights}</p>
      </div>
    </footer>
  );
}

/**
 * Presentation page at "/" for visitors without a session (PRODUCT.md, landing audiences). It is
 * static on purpose: no call to the API, so it loads even when the API sleeps, and every sample
 * screen carries the "Datos simulados" mark. The only action leads to the sign in.
 */
export function LandingPage(): JSX.Element {
  return (
    <div className={cn(styles.page)}>
      <title>{copy.meta.title}</title>
      <meta name="description" content={copy.meta.description} />
      <a className={cn(styles.skipLink)} href={`#${MAIN_ID}`}>
        {strings.app.skipToContent}
      </a>
      <LandingNav />
      <main id={MAIN_ID} tabIndex={-1} className={cn(styles.main)}>
        <Hero />
        <FlowSection />
        <OfflineBand />
        <DecideSection />
        <ForecastSection />
        <HonestySection />
        <ProjectSection />
        <Closing />
      </main>
      <LandingFooter />
    </div>
  );
}
