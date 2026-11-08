import { useId, useState } from 'react';
import type { JSX } from 'react';

import { buildRegionTree, parentOptions } from '../../core/network/regionTree';
import type { RegionSector, RegionTreeNode } from '../../core/network/regionTree';
import { SectorNode, ValveNode } from '../../core/network/nodes';
import type { NetworkNode } from '../../core/network/NetworkNode';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useNetwork } from '../../state/hooks/useNetwork';
import { useSectors } from '../../state/hooks/useSectors';
import { usePermission } from '../../state/hooks/usePermission';
import { useRegionActions } from '../../state/hooks/useRegions';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { RenameForm, SectorForm, ValveForm } from './RegionForms';
import styles from './Regions.module.css';

const NETWORK_MANAGE = 'NETWORK_MANAGE';
/** The "no parent" option of the move menu: the sector becomes a region. */
const NO_PARENT = '';

type EditMode = 'rename' | 'move' | 'child' | 'valve';

function collectValveNames(nodes: readonly NetworkNode[], into: Map<string, string[]>): void {
  for (const node of nodes) {
    if (node instanceof SectorNode) {
      into.set(
        node.id,
        node.children().flatMap((child) => (child instanceof ValveNode ? [child.name] : [])),
      );
      collectValveNames(node.children(), into);
    }
  }
}

/**
 * The editor of regions: a plain tree (no dragging) where a region is a sector with no parent.
 * Create a region, add a sector under any node, rename, move to another parent with a menu, and
 * assign a new valve to a sector. Needs NETWORK_MANAGE; the server decides.
 */
export function RegionsPage(): JSX.Element {
  const sectorsQuery = useSectors();
  const network = useNetwork();
  const canManage = usePermission(NETWORK_MANAGE);
  const actions = useRegionActions();

  if (sectorsQuery.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.regions')}</ScreenTitle>
        <LoadingState message={t('network.loading')} />
      </>
    );
  }
  if (sectorsQuery.isError) {
    return (
      <ErrorState
        title={t('screens.regions')}
        message={errorText(sectorsQuery.error).message}
        action={
          <Button
            onClick={() => {
              void sectorsQuery.refetch();
            }}
          >
            {t('network.retry')}
          </Button>
        }
      />
    );
  }

  const sectors: RegionSector[] = sectorsQuery.data.map((sector) => ({
    id: sector.id,
    code: sector.code,
    name: sector.name,
    parentSectorId: sector.parentSectorId,
    isActive: sector.isActive,
  }));
  const valves = new Map<string, string[]>();
  if (network.status === 'ready') {
    collectValveNames(network.root.sectorNodes(), valves);
  }
  const tree = buildRegionTree(sectors);

  return (
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.regions')}</ScreenTitle>
      <p className={cn(styles.intro)}>{t('regions.intro')}</p>
      {canManage ? (
        <section className={cn(styles.card)} aria-labelledby="regions-create-title">
          <h2 id="regions-create-title" className={cn(styles.cardTitle)}>
            {t('regions.createTitle')}
          </h2>
          <SectorForm
            legend={t('regions.createTitle')}
            submitLabel={t('regions.createSubmit')}
            busyLabel={t('regions.saving')}
            error={actions.createSector.isError ? actions.createSector.error : null}
            onSubmit={(values) =>
              actions.createSector.mutateAsync({ code: values.code, name: values.name })
            }
            onCancel={() => {
              actions.createSector.reset();
            }}
          />
        </section>
      ) : null}
      <section aria-labelledby="regions-tree-title">
        <h2 id="regions-tree-title" className={cn(styles.cardTitle)}>
          {t('regions.treeTitle')}
        </h2>
        {tree.length === 0 ? (
          <p>{t('regions.empty')}</p>
        ) : (
          <ul className={cn(styles.tree)}>
            {tree.map((node) => (
              <TreeRow
                key={node.sector.id}
                node={node}
                depth={0}
                sectors={sectors}
                valves={valves}
                canManage={canManage}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  sectors,
  valves,
  canManage,
}: {
  readonly node: RegionTreeNode;
  readonly depth: number;
  readonly sectors: readonly RegionSector[];
  readonly valves: ReadonlyMap<string, readonly string[]>;
  readonly canManage: boolean;
}): JSX.Element {
  const { sector } = node;
  const [mode, setMode] = useState<EditMode | null>(null);
  const actions = useRegionActions();
  const isRegion = depth === 0;
  const valveNames = valves.get(sector.id) ?? [];
  const close = (): void => {
    setMode(null);
  };
  const toggle = (next: EditMode): void => {
    setMode((current) => (current === next ? null : next));
  };
  const nameId = useId();

  return (
    <li className={cn(styles.item, !sector.isActive && styles.inactive)}>
      <div className={cn(styles.row)}>
        <div className={cn(styles.rowInfo)}>
          <span id={nameId} className={cn(styles.name)}>
            {`${sector.name} (${sector.code})`}
          </span>
          <span className={cn(styles.kind)}>
            {isRegion ? t('regions.kindRegion') : t('regions.kindSector')}
          </span>
          <span className={cn(styles.meta)}>
            {valveNames.length === 0
              ? t('regions.noValves')
              : t('regions.valves', { names: valveNames.join(', ') })}
          </span>
        </div>
        {canManage ? (
          <div className={cn(styles.rowActions)} role="group" aria-labelledby={nameId}>
            <Button
              aria-expanded={mode === 'rename'}
              onClick={() => {
                toggle('rename');
              }}
            >
              {t('regions.rename')}
            </Button>
            <Button
              aria-expanded={mode === 'move'}
              onClick={() => {
                toggle('move');
              }}
            >
              {t('regions.move')}
            </Button>
            <Button
              aria-expanded={mode === 'child'}
              onClick={() => {
                toggle('child');
              }}
            >
              {t('regions.addChild')}
            </Button>
            <Button
              aria-expanded={mode === 'valve'}
              onClick={() => {
                toggle('valve');
              }}
            >
              {t('regions.addValve')}
            </Button>
          </div>
        ) : null}
      </div>
      {mode === 'rename' ? (
        <div className={cn(styles.panel)}>
          <RenameForm
            legend={t('regions.renameTitle', { name: sector.name })}
            initialName={sector.name}
            submitLabel={t('regions.renameSubmit')}
            busyLabel={t('regions.saving')}
            error={actions.updateSector.isError ? actions.updateSector.error : null}
            onSubmit={async (values) => {
              await actions.updateSector.mutateAsync({
                id: sector.id,
                input: { name: values.name },
              });
              close();
            }}
            onCancel={close}
          />
        </div>
      ) : null}
      {mode === 'move' ? (
        <MovePanel
          sector={sector}
          sectors={sectors}
          error={actions.updateSector.isError ? actions.updateSector.error : null}
          busy={actions.updateSector.isPending}
          onMove={async (parentId) => {
            await actions.updateSector.mutateAsync({
              id: sector.id,
              input: parentId === NO_PARENT ? { isRegion: true } : { parentSectorId: parentId },
            });
            close();
          }}
          onCancel={close}
        />
      ) : null}
      {mode === 'child' ? (
        <div className={cn(styles.panel)}>
          <SectorForm
            legend={t('regions.childTitle', { name: sector.name })}
            submitLabel={t('regions.childSubmit')}
            busyLabel={t('regions.saving')}
            error={actions.createSector.isError ? actions.createSector.error : null}
            onSubmit={async (values) => {
              await actions.createSector.mutateAsync({
                code: values.code,
                name: values.name,
                parentSectorId: sector.id,
              });
              close();
            }}
            onCancel={close}
          />
        </div>
      ) : null}
      {mode === 'valve' ? (
        <div className={cn(styles.panel)}>
          <ValveForm
            legend={t('regions.valveTitle', { name: sector.name })}
            submitLabel={t('regions.valveSubmit')}
            busyLabel={t('regions.saving')}
            error={actions.createValve.isError ? actions.createValve.error : null}
            onSubmit={async (values) => {
              await actions.createValve.mutateAsync({
                sectorId: sector.id,
                input: {
                  code: values.code,
                  name: values.name,
                  isMotorized: values.is_motorized,
                },
              });
              close();
            }}
            onCancel={close}
          />
        </div>
      ) : null}
      {node.children.length === 0 ? null : (
        <ul className={cn(styles.tree)}>
          {node.children.map((child) => (
            <TreeRow
              key={child.sector.id}
              node={child}
              depth={depth + 1}
              sectors={sectors}
              valves={valves}
              canManage={canManage}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function MovePanel({
  sector,
  sectors,
  error,
  busy,
  onMove,
  onCancel,
}: {
  readonly sector: RegionSector;
  readonly sectors: readonly RegionSector[];
  readonly error: unknown;
  readonly busy: boolean;
  readonly onMove: (parentId: string) => Promise<void>;
  readonly onCancel: () => void;
}): JSX.Element {
  const selectId = useId();
  const [parentId, setParentId] = useState(sector.parentSectorId ?? NO_PARENT);
  const options = parentOptions(sector, sectors);
  return (
    <form
      className={cn(styles.panel)}
      aria-label={t('regions.moveTitle', { name: sector.name })}
      onSubmit={(event) => {
        event.preventDefault();
        void onMove(parentId).catch(() => undefined);
      }}
    >
      {error === null ? null : <FormAlert message={errorText(error).message} />}
      <div className={cn(styles.selectField)}>
        <label htmlFor={selectId}>{t('regions.parentLabel')}</label>
        <select
          id={selectId}
          value={parentId}
          onChange={(event) => {
            setParentId(event.target.value);
          }}
        >
          <option value={NO_PARENT}>{t('regions.noParent')}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {`${option.name} (${option.code})`}
            </option>
          ))}
        </select>
      </div>
      <div className={cn(styles.actions)}>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? t('regions.saving') : t('regions.moveSubmit')}
        </Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}
