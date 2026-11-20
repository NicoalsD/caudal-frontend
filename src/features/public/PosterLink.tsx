import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { cn } from '../../ui/styles/cn';
import styles from './PublicSchedule.module.css';

interface PosterLinkProps {
  readonly aqueductSlug: string;
}

/** Link to the poster PDF of the day. The browser downloads it; nothing is fetched here. */
export function PosterLink({ aqueductSlug }: PosterLinkProps): JSX.Element {
  const api = useCaudalApi();
  return (
    <a className={cn(styles.action)} href={api.public.posterPdfUrl(aqueductSlug)} download>
      {t('publicSchedule.share.poster')}
    </a>
  );
}
