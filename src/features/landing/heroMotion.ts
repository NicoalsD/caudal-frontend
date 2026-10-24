import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The landing's one authored scroll moment (design-theme.md, landing): while the hero scrolls
 * away, the three phones rise out of the water at different speeds, the photo drifts and the
 * shader's currents quicken. Loaded on demand, never on the app screens.
 */
export interface HeroMotionTargets {
  readonly hero: HTMLElement;
  readonly photo: HTMLElement | null;
  readonly devices: readonly HTMLElement[];
  readonly onProgress: (progress: number) => void;
}

/** How far each phone travels, in px, across the hero's scroll (front phone moves least). */
const SIDE_TRAVEL_PX = -90;
const FRONT_TRAVEL_PX = -40;
const FAR_TRAVEL_PX = -120;
const DEVICE_TRAVEL: readonly number[] = [SIDE_TRAVEL_PX, FRONT_TRAVEL_PX, FAR_TRAVEL_PX];
const DEFAULT_TRAVEL = SIDE_TRAVEL_PX;
const PHOTO_TRAVEL_PERCENT = 10;

export function startHeroMotion({
  hero,
  photo,
  devices,
  onProgress,
}: HeroMotionTargets): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const context = gsap.context(() => {
    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
        onUpdate: (self) => onProgress(self.progress),
      },
    });
    devices.forEach((device, index) => {
      timeline.to(device, { y: DEVICE_TRAVEL[index] ?? DEFAULT_TRAVEL }, 0);
    });
    if (photo !== null) {
      timeline.to(photo, { yPercent: PHOTO_TRAVEL_PERCENT }, 0);
    }
  }, hero);
  return () => context.revert();
}
