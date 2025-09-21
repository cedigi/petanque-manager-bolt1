const STORAGE_KEY = 'petanque-manager.hardware-hash';

const originalFetch = global.fetch;

describe('licenseApi hardware hash integrity', () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).electronAPI;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).__VITE_ENV__;
    global.fetch = originalFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('replaces tampered localStorage values using the bridge before license requests', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'tampered-value');
    const getHardwareHash = jest.fn().mockResolvedValue('authentic-hash');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI = { getHardwareHash };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__VITE_ENV__ = {
      VITE_LICENSE_STATUS_URL: 'https://example.test/license-status'
    } satisfies Partial<ImportMetaEnv>;

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: jest.fn().mockResolvedValue({})
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { fetchLicenseStatus } = await import('../licenseApi');
    await fetchLicenseStatus();

    expect(getHardwareHash).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const requestBody = JSON.parse((requestInit?.body as string) ?? '{}');
    expect(requestBody.hardwareHash).toBe('authentic-hash');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('authentic-hash');
  });

  it('getStoredHardwareHash validates cached value against the bridge', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'fake-value');
    const getHardwareHash = jest.fn().mockResolvedValue('real-hash');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI = { getHardwareHash };

    const { getStoredHardwareHash } = await import('../licenseApi');
    const result = await getStoredHardwareHash();

    expect(result).toBe('real-hash');
    expect(getHardwareHash).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('real-hash');
  });

  it('falls back to persisted value when the bridge is unavailable', async () => {
    const persistedHash = 'persisted-hash';
    window.localStorage.setItem(STORAGE_KEY, persistedHash);
    const getHardwareHash = jest.fn().mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI = { getHardwareHash };

    const { getStoredHardwareHash } = await import('../licenseApi');
    const result = await getStoredHardwareHash();

    expect(result).toBe(persistedHash);
    expect(getHardwareHash).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(persistedHash);
  });
});
