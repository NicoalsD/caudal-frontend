import type { NetworkNode, NetworkNodeKind } from './NetworkNode';

abstract class BaseNode implements NetworkNode {
  abstract readonly kind: NetworkNodeKind;

  constructor(
    readonly id: string,
    readonly name: string,
    readonly isActive: boolean,
  ) {}

  children(): readonly NetworkNode[] {
    return [];
  }

  valveCount(): number {
    return 0;
  }

  activeValveCount(): number {
    return 0;
  }

  sectorCount(): number {
    return 0;
  }

  householdCount(): number {
    return 0;
  }
}

/** Leaf: a valve of a sector. */
export class ValveNode extends BaseNode {
  readonly kind = 'valve' as const;

  constructor(
    id: string,
    name: string,
    isActive: boolean,
    readonly code: string,
    readonly locationHint: string | null,
    readonly isMotorized: boolean,
    readonly failSafePosition: 'KEEP' | 'OPEN' | 'CLOSED',
  ) {
    super(id, name, isActive);
  }

  override valveCount(): number {
    return 1;
  }

  override activeValveCount(): number {
    return this.isActive ? 1 : 0;
  }
}

/** Leaf: a tank with the range of its gauge. */
export class TankNode extends BaseNode {
  readonly kind = 'tank' as const;

  constructor(
    id: string,
    name: string,
    isActive: boolean,
    readonly gaugeMin: number,
    readonly gaugeMax: number,
    readonly capacityLiters: number | null,
  ) {
    super(id, name, isActive);
  }
}

/** Composite: a sector holds sub-sectors and valves, and adds up what is below it. */
export class SectorNode extends BaseNode {
  readonly kind = 'sector' as const;
  private readonly subSectors: SectorNode[] = [];
  private readonly valves: ValveNode[] = [];

  constructor(
    id: string,
    name: string,
    isActive: boolean,
    readonly code: string,
    private readonly ownHouseholds: number,
  ) {
    super(id, name, isActive);
  }

  addSector(sector: SectorNode): void {
    this.subSectors.push(sector);
  }

  addValve(valve: ValveNode): void {
    this.valves.push(valve);
  }

  override children(): readonly NetworkNode[] {
    return [...this.valves, ...this.subSectors];
  }

  override valveCount(): number {
    return (
      this.valves.length + this.subSectors.reduce((sum, sector) => sum + sector.valveCount(), 0)
    );
  }

  override activeValveCount(): number {
    return (
      this.valves.filter((valve) => valve.isActive).length +
      this.subSectors.reduce((sum, sector) => sum + sector.activeValveCount(), 0)
    );
  }

  override sectorCount(): number {
    return 1 + this.subSectors.reduce((sum, sector) => sum + sector.sectorCount(), 0);
  }

  override householdCount(): number {
    return (
      this.ownHouseholds + this.subSectors.reduce((sum, sector) => sum + sector.householdCount(), 0)
    );
  }

  /** Households of this sector alone, without its sub-sectors. */
  directHouseholds(): number {
    return this.ownHouseholds;
  }
}

/** Composite: the root holds the tanks and the top-level sectors. */
export class NetworkRoot extends BaseNode {
  readonly kind = 'network' as const;

  constructor(
    private readonly tanks: readonly TankNode[],
    private readonly sectors: readonly SectorNode[],
  ) {
    super('network', 'network', true);
  }

  override children(): readonly NetworkNode[] {
    return [...this.tanks, ...this.sectors];
  }

  tankNodes(): readonly TankNode[] {
    return this.tanks;
  }

  sectorNodes(): readonly SectorNode[] {
    return this.sectors;
  }

  override valveCount(): number {
    return this.sectors.reduce((sum, sector) => sum + sector.valveCount(), 0);
  }

  override activeValveCount(): number {
    return this.sectors.reduce((sum, sector) => sum + sector.activeValveCount(), 0);
  }

  override sectorCount(): number {
    return this.sectors.reduce((sum, sector) => sum + sector.sectorCount(), 0);
  }

  override householdCount(): number {
    return this.sectors.reduce((sum, sector) => sum + sector.householdCount(), 0);
  }

  tankCount(): number {
    return this.tanks.length;
  }
}
