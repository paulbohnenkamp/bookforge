import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/config.js';

describe('loadConfig', () => {
  it('uses defaults', () => {
    const config = loadConfig();
    expect(config.logLevel).toBe('info');
    expect(config.debug).toBe(false);
  });

  it('reads supported environment values', () => {
    const config = loadConfig({ BOOKFORGE_LOG_LEVEL: 'debug', BOOKFORGE_DEBUG: 'true' });
    expect(config.logLevel).toBe('debug');
    expect(config.debug).toBe(true);
  });
});
