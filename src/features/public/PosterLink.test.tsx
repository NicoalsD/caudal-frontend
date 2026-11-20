import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { renderApp } from '../../test/renderApp';

describe('PosterLink on the public schedule', () => {
  it('offers the poster as a PDF download from the API base', async () => {
    renderApp('/a/guaitarilla');

    const link = await screen.findByRole('link', { name: t('publicSchedule.share.poster') });

    expect(link).toHaveAttribute(
      'href',
      'http://api.caudal.test/api/v1/public/guaitarilla/schedule/poster.pdf',
    );
    expect(link).toHaveAttribute('download');
  });
});
