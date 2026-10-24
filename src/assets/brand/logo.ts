/**
 * Official CAUDAL logo files (style tile, CAUDAL.pdf). Empty until the team hands over the final
 * artwork: while `LOGO` is null the brand renders as a typeset wordmark in Barlow ExtraBold. To
 * plug the logo in, drop `caudal-logo-<width>.webp` files next to this module (transparent
 * background, 320 and 640 px wide), import them here and fill the object below.
 */
export interface LogoAsset {
  readonly src: string;
  readonly srcSet: string;
  readonly width: number;
  readonly height: number;
}

export const LOGO: LogoAsset | null = null;
