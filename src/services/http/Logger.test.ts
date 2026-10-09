import { describe, expect, it, vi } from 'vitest';

import { ConsoleLogger, NoopLogger } from './Logger';

describe('loggers', () => {
  it('ConsoleLogger writes events to the console', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    new ConsoleLogger().info('event.a', { status: 1 });
    new ConsoleLogger().warn('event.b', { code: 'X' });

    expect(info).toHaveBeenCalledWith('event.a', { status: 1 });
    expect(warn).toHaveBeenCalledWith('event.b', { code: 'X' });
  });

  it('NoopLogger writes nothing', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    new NoopLogger().info();
    new NoopLogger().warn();

    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
