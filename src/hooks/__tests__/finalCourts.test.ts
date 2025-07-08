import { createEmptyFinalPhases, createEmptyFinalPhasesB } from '../finalsLogic';

describe('final phase court assignment', () => {
  it('assigns sequential courts in category A finals', () => {
    const start = 5;
    const matches = createEmptyFinalPhases(20, 8, start);
    const courts = matches.map(m => m.court);
    expect(courts).toEqual(Array.from({ length: courts.length }, (_, i) => start + i));
  });

  it('assigns sequential courts in category B finals', () => {
    const start = 30;
    const matches = createEmptyFinalPhasesB(20, 8, start);
    const courts = matches.map(m => m.court);
    expect(courts).toEqual(Array.from({ length: courts.length }, (_, i) => start + i));
  });
});
