import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveBlob } from './saveBlob';

const OBJECT_URL = 'blob:http://localhost/acta';
const FILE_NAME = 'acta-2026-10-01-2026-10-07.pdf';
const REVOKE_DELAY_MS = 1000;

describe('saveBlob', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL = vi.fn(() => OBJECT_URL);
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicks a download link to the object URL and revokes that URL after a delay', () => {
    const clicked: { href: string; download: string; connected: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ href: this.href, download: this.download, connected: this.isConnected });
    });

    saveBlob(new Blob(['%PDF'], { type: 'application/pdf' }), FILE_NAME);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicked).toEqual([{ href: OBJECT_URL, download: FILE_NAME, connected: true }]);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(REVOKE_DELAY_MS);

    expect(revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
  });
});
