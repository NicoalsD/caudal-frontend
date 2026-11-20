import { useId, useState } from 'react';
import type { JSX } from 'react';
import { Droplets, MapPin, Move, Pencil, Plus, Wrench } from 'lucide-react';

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
import { Card } from '../../ui/cards/Card';
import type { Tint } from '../../ui/cards/Card';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { Dialog } from '../../ui/primitives/Dialog';
import { IconButton } from '../../ui/primitives/IconButton';
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
      <div className={cn(styles.layout)}>
        <section aria-labelledby="regions-tree-title" className={cn(styles.treeColumn)}>
          <h2 id="regions-tree-title" className={cn(styles.cardTitle)}>
            {t('regions.treeTitle')}
          </h2>
          {tree.length === 0 ? (
            <p>{t('regions.empty')}</p>
          ) : (
            <ul className={cn(styles.tree)}>
              {tree.map((node, position) => (
                <TreeRow
                  key={node.sector.id}
                  node={node}
                  depth={0}
                  tint={REGION_TINTS[position % REGION_TINTS.length] ?? 'mint'}
                  sectors={sectors}
                  valves={valves}
                  canManage={canManage}
                />
              ))}
            </ul>
          )}
        </section>
        {canManage ? (
          <Card
            variant="tinted"
            tint="hero"
            as="section"
            className={cn(styles.createCard)}
            aria-labelledby="regions-create-title"
          >
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
          </Card>
        ) : null}
      </div>
    </div>
  );
}

/** Pastel of each region, in turn; the sectors inside are white cards on top of it. */
const REGION_TINTS: readonly Tint[] = ['mint', 'aqua', 'sand', 'lavender'];

function TreeRow({
  node,
  depth,
  tint,
  sectors,
  valves,
  canManage,
}: {
  readonly node: RegionTreeNode;
  readonly depth: number;
  readonly tint: Tint;
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
  const nameId = useId();
  const KindIcon = isRegion ? MapPin : Droplets;

  return (
    <li className={cn(styles.item, !sector.isActive && styles.inactive)}>
      <Card
        variant={isRegion ? 'tinted' : 'plain'}
        tint={tint}
        interactive
        className={cn(styles.regionCard)}
      >
        <div className={cn(styles.row)}>
          <span className={cn(styles.kindIcon)}>
            <KindIcon aria-hidden="true" />
          </span>
          <div className={cn(styles.rowInfo)}>
            <span id={nameId} className={cn(styles.name)}>
              {`${sector.name} (${sector.code})`}
            </span>
            <span className={cn(styles.chips)}>
              <Chip tone={isRegion ? 'plain' : 'aqua'}>
                {isRegion ? t('regions.kindRegion') : t('regions.kindSector')}
              </Chip>
              {sector.isActive ? null : <Chip tone="sand">{t('regions.inactive')}</Chip>}
            </span>
            <span className={cn(styles.meta)}>
              {valveNames.length === 0
                ? t('regions.noValves')
                : t('regions.valves', { names: valveNames.join(', ') })}
            </span>
          </div>
          {canManage ? (
            <div className={cn(styles.rowActions)} role="group" aria-labelledby={nameId}>
              <IconButton
                label={t('regions.rename')}
                tone={isRegion ? 'plain' : 'soft'}
                onClick={() => {
                  setMode('rename');
                }}
              >
                <Pencil aria-hidden="true" />
              </IconButton>
              <IconButton
                label={t('regions.move')}
                tone={isRegion ? 'plain' : 'soft'}
                onClick={() => {
                  setMode('move');
                }}
              >
                <Move aria-hidden="true" />
              </IconButton>
              <IconButton
                label={t('regions.addChild')}
                tone={isRegion ? 'plain' : 'soft'}
                onClick={() => {
                  setMode('child');
                }}
              >
                <Plus aria-hidden="true" />
              </IconButton>
              <IconButton
                label={t('regions.addValve')}
                tone={isRegion ? 'plain' : 'soft'}
                onClick={() => {
                  setMode('valve');
                }}
              >
                <Wrench aria-hidden="true" />
              </IconButton>
            </div>
          ) : null}
        </div>
        {node.children.length === 0 ? null : (
          <ul className={cn(styles.tree, styles.nested)}>
            {node.children.map((child) => (
              <TreeRow
                key={child.sector.id}
                node={child}
                depth={depth + 1}
                tint={tint}
                sectors={sectors}
                valves={valves}
                canManage={canManage}
              />
            ))}
          </ul>
        )}
      </Card>
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) {
            close();
          }
        }}
        title={dialogTitle(mode, sector.name)}
        description={t('regions.dialogHint')}
      >
        {mode === 'rename' ? (
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
        ) : null}
        {mode === 'valve' ? (
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
        ) : null}
      </Dialog>
    </li>
  );
}

function dialogTitle(mode: EditMode | null, name: string): string {
  switch (mode) {
    case 'rename':
      return t('regions.renameTitle', { name });
    case 'move':
      return t('regions.moveTitle', { name });
    case 'child':
      return t('regions.childTitle', { name });
    case 'valve':
      return t('regions.valveTitle', { name });
    case null:
      return '';
  }
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
