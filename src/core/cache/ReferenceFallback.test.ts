import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/DomainError';
import { NetworkError } from '../errors/NetworkError';
import { FakeClock } from '../../test/fakes/FakeClock';
import { ReferenceFallback } from './ReferenceFallback';
import type { CachedReference, ReferenceStore } from './ReferenceStore';

class MemoryReferenceStore implements ReferenceStore {
  readonly entries = new Map<string, CachedReference>();
  saveFails = false;

  load(scope: string, name: string): Promise<CachedReference | null> {
    return Promise.resolve(this.entries.get(`${scope}|${name}`) ?? null);
  }

  save(scope: string, name: string, payload: unknown, fetchedAtMs: number): Promise<void> {
    if (this.saveFails) {
      return Promise.reject(new Error('disk full'));
    }
    this.entries.set(`${scope}|${name}`, { payload, fetchedAtMs });
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.entries.clear();
    return Promise.resolve();
  }
}

const TANKS = [{ id: 't-1', name: 'Tanque principal' }];
const NOW_MS = 500;
const OLD_FETCH_MS = 100;

function setup() {
  const store = new MemoryReferenceStore();
  const clock = new FakeClock(NOW_MS);
  return { store, clock, reference: new ReferenceFallback(store, clock) };
}

describe('ReferenceFallback', () => {
  it('returns the server answer and keeps a copy with its fetch time', async () => {
    const { store, reference } = setup();

    const value = await reference.fetch('a-1', 'tanks', () => Promise.resolve(TANKS));

    expect(value).toEqual(TANKS);
    expect(store.entries.get('a-1|tanks')).toEqual({ payload: TANKS, fetchedAtMs: NOW_MS });
  });

  it('answers with the copy when there is no connection', async () => {
    const { store, reference } = setup();
    store.entries.set('a-1|tanks', { payload: TANKS, fetchedAtMs: OLD_FETCH_MS });

    const value = await reference.fetch('a-1', 'tanks', () => Promise.reject(new NetworkError()));

    expect(value).toEqual(TANKS);
  });

  it('fails without a connection when nothing was kept', async () => {
    const { reference } = setup();

    await expect(
      reference.fetch('a-1', 'tanks', () => Promise.reject(new NetworkError())),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('does not hide a refusal of the server behind an old copy', async () => {
    const { store, reference } = setup();
    store.entries.set('a-1|tanks', { payload: TANKS, fetchedAtMs: OLD_FETCH_MS });

    await expect(
      reference.fetch('a-1', 'tanks', () => Promise.reject(new DomainError('FORBIDDEN', 'no'))),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('returns the answer even when the copy cannot be written', async () => {
    const { store, reference } = setup();
    store.saveFails = true;

    await expect(reference.fetch('a-1', 'tanks', () => Promise.resolve(TANKS))).resolves.toEqual(
      TANKS,
    );
  });
});
