/** View models returned by CaudalApi. Components never see the server DTOs. */

export interface HealthView {
  readonly isUp: boolean;
}
