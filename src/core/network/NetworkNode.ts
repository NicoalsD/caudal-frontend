/** What a node of the network is, for screens that draw each kind differently. */
export type NetworkNodeKind = 'network' | 'tank' | 'sector' | 'valve';

/**
 * Component of the Composite pattern: the whole network, a sector (which holds sub-sectors and
 * valves) and the leaves (tanks and valves) answer the same questions, so a screen can ask "how
 * many valves are active" of the whole network or of one sector with the same call.
 *
 * @pattern P08 Composite
 */
export interface NetworkNode {
  readonly kind: NetworkNodeKind;
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  /** Direct children, in the order they are shown. Leaves have none. */
  children(): readonly NetworkNode[];
  /** Valves in this node and below. */
  valveCount(): number;
  /** Valves in this node and below that are active. */
  activeValveCount(): number;
  /** Sectors in this node and below (a sector counts itself). */
  sectorCount(): number;
  /** Households served by this node and below. Only counts, never names or phones. */
  householdCount(): number;
}
