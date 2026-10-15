import { describe, expect, it } from 'vitest';

import { ApiError } from '../../http/errors';
import { FakeHttpClient, okResponse } from '../../../test/fakes/FakeHttpClient';
import { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { ScheduleApi } from './ScheduleApi';

const NOT_FOUND_STATUS = 404;
const SERVICE_DAY = '2026-10-10';
const PROPOSAL_ID = '0190f3a2-8888-7000-8000-000000000001';
const ITEM_ID = '0190f3a2-9999-7000-8000-000000000001';
const SECTOR_ID = '0190f3a2-4444-7000-8000-000000000001';

const PUBLISHED = {
  service_date: SERVICE_DAY,
  proposal_id: PROPOSAL_ID,
  published_at: '2026-10-09T18:00:00-05:00',
  items: [
    {
      id: ITEM_ID,
      sector_id: SECTOR_ID,
      sequence: 1,
      start_at: `${SERVICE_DAY}T06:00:00-05:00`,
      end_at: `${SERVICE_DAY}T14:00:00-05:00`,
      origin: 'GENERATED',
      reasons: [],
    },
  ],
};

describe('ScheduleApi.getPublished', () => {
  it('reads the published schedule of the day and maps its shifts', async () => {
    const http = new FakeHttpClient(okResponse(PUBLISHED));

    const view = await new ScheduleApi(http, new ApiDtoAdapter()).getPublished(SERVICE_DAY);

    expect(http.requests[0]).toMatchObject({
      method: 'GET',
      path: `/days/${SERVICE_DAY}/schedule`,
    });
    expect(view?.proposalId).toBe(PROPOSAL_ID);
    expect(view?.publishedAt.date).toEqual(new Date('2026-10-09T23:00:00.000Z'));
    expect(view?.items).toEqual([
      expect.objectContaining({ id: ITEM_ID, sectorId: SECTOR_ID, sequence: 1 }),
    ]);
  });

  it('answers null when the day has no published schedule (404)', async () => {
    const http = new FakeHttpClient(
      new ApiError(NOT_FOUND_STATUS, 'NOT_FOUND', 'No hay horario.', {}, null),
    );

    const view = await new ScheduleApi(http, new ApiDtoAdapter()).getPublished(SERVICE_DAY);

    expect(view).toBeNull();
  });
});
