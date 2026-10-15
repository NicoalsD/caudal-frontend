import { authHandlers } from './auth';
import { metaHandlers } from './meta';
import { networkHandlers } from './network';
import { rulesHandlers } from './rules';
import { statusHandlers } from './status';

/** Default handlers: one file per API area, written from caudal-backend/docs/API.md. */
export const handlers = [
  ...authHandlers,
  ...metaHandlers,
  ...networkHandlers,
  ...rulesHandlers,
  ...statusHandlers,
];
