import { authHandlers } from './auth';
import { catalogHandlers } from './catalogs';
import { metaHandlers } from './meta';
import { networkHandlers } from './network';
import { publicHandlers } from './public';
import { rulesHandlers } from './rules';

/** Default handlers: one file per API area, written from caudal-backend/docs/API.md. */
export const handlers = [
  ...authHandlers,
  ...metaHandlers,
  ...networkHandlers,
  ...rulesHandlers,
  ...publicHandlers,
  ...catalogHandlers,
];
