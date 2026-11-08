import { anomaliesHandlers } from './anomalies';
import { authHandlers } from './auth';
import { catalogHandlers } from './catalogs';
import { createDevicesBackend } from '../devicesBackend';
import { evaluationHandlers } from './evaluation';
import { incidentsHandlers } from './incidents';
import { liveHandlers } from './live';
import { scheduleHandlers } from './schedule';
import { metaHandlers } from './meta';
import { networkHandlers } from './network';
import { proposalsHandlers } from './proposals';
import { publicHandlers } from './public';
import { reportsHandlers } from './reports';
import { rulesHandlers } from './rules';
import { statusHandlers } from './status';

/** Default handlers: one file per API area, written from caudal-backend/docs/API.md. */
export const handlers = [
  ...authHandlers,
  ...metaHandlers,
  ...networkHandlers,
  ...rulesHandlers,
  ...statusHandlers,
  ...anomaliesHandlers,
  ...publicHandlers,
  ...catalogHandlers,
  ...incidentsHandlers,
  ...scheduleHandlers,
  ...proposalsHandlers,
  ...evaluationHandlers,
  ...liveHandlers,
  ...reportsHandlers,
  ...createDevicesBackend({ devices: [] }).handlers,
];
