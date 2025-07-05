import { generateUuid } from '../uuid';

describe('generateUuid', () => {
  it('produces unique values', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateUuid()));
    expect(ids.size).toBe(10);
  });
});
