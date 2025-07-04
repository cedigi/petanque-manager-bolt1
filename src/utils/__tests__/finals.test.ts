import { applyByeLogic } from '../finals';
import { Match } from '../../types/tournament';

describe('applyByeLogic', () => {
  function makeMatch(id: string, team1Id = '', team2Id = ''): Match {
    return {
      id,
      round: 100,
      court: 0,
      team1Id,
      team2Id,
      completed: false,
      isBye: false,
      battleIntensity: 0,
      hackingAttempts: 0,
    };
  }

  it('does not assign BYE when pools still have matches', () => {
    const matches = [
      makeMatch('m1', 't1'),
      makeMatch('m2', 't2'),
      makeMatch('m3'),
      makeMatch('m4'),
    ];

    const result = applyByeLogic(matches, 3, 6, 1);
    expect(result.some(m => m.isBye)).toBe(false);
  });

  it('assigns BYE after pools conclude', () => {
    const matches = [
      makeMatch('m1', 't1', 't4'),
      makeMatch('m2', 't2', 't5'),
      makeMatch('m3', 't3'),
      makeMatch('m4', 't6'),
    ];

    const result = applyByeLogic(matches, 6, 6, 0);
    const byeMatches = result.filter(m => m.isBye);
    expect(byeMatches).toHaveLength(2);
    byeMatches.forEach(m => {
      expect(m.team1Id).toBe(m.team2Id);
      expect(m.completed).toBe(true);
    });
  });

  it('assigns four BYEs for a 21 team tournament', () => {
    const matches = [
      makeMatch('m1', 't1', 't2'),
      makeMatch('m2', 't3', 't4'),
      makeMatch('m3', 't5', 't6'),
      makeMatch('m4', 't7'),
      makeMatch('m5', 't8'),
      makeMatch('m6', 't9', 't10'),
      makeMatch('m7', 't11'),
      makeMatch('m8', 't12'),
    ];

    const result = applyByeLogic(matches, 12, 12, 0);
    const byeMatches = result.filter(m => m.isBye);
    expect(byeMatches).toHaveLength(4);
  });
});
