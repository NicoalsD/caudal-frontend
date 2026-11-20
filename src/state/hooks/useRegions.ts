import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import type {
  CreateSectorInput,
  CreateValveInput,
  UpdateSectorInput,
} from '../../services/api/endpoints/NetworkApi';
import type { SectorView, ValveView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';
import { NETWORK_SCOPE } from './useSectors';

export interface UpdateSectorChange {
  readonly id: string;
  readonly input: UpdateSectorInput;
}

export interface CreateValveChange {
  readonly sectorId: string;
  readonly input: CreateValveInput;
}

/** The edits of the network (NETWORK_MANAGE). Each one reads sectors and valves again. */
export function useRegionActions(): {
  readonly createSector: UseMutationResult<SectorView, Error, CreateSectorInput>;
  readonly updateSector: UseMutationResult<SectorView, Error, UpdateSectorChange>;
  readonly createValve: UseMutationResult<ValveView, Error, CreateValveChange>;
} {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  const client = useQueryClient();
  const refresh = async (): Promise<void> => {
    await client.invalidateQueries({ queryKey: aqueductKey(aqueductId, NETWORK_SCOPE) });
  };
  const createSector = useMutation({
    mutationFn: (input: CreateSectorInput) => api.network.createSector(input),
    onSuccess: refresh,
  });
  const updateSector = useMutation({
    mutationFn: (change: UpdateSectorChange) => api.network.updateSector(change.id, change.input),
    onSuccess: refresh,
  });
  const createValve = useMutation({
    mutationFn: (change: CreateValveChange) =>
      api.network.createValve(change.sectorId, change.input),
    onSuccess: refresh,
  });
  return { createSector, updateSector, createValve };
}
