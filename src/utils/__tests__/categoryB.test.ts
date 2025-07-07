import { applyByeLogic } from '../finals';
import { createCategoryBBracket } from '../bracket';
import { Match } from '../../types/tournament';

describe('category B finals', () => {
  function makeMatch(id: string, team1Id = '', team2Id = ''): Match {
    return {
      id,
      round: 200,
      court: 0,
      team1Id,
      team2Id,
      completed: false,
      isBye: false,
      battleIntensity: 0,
      hackingAttempts: 0,
    } as Match;
  }

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
  });

  it('creates bracket of correct size for nine teams', () => {
    const matches = createCategoryBBracket(9);
    const firstRound = matches.filter(m => m.round === 200);
    expect(firstRound).toHaveLength(8);
  });
});
