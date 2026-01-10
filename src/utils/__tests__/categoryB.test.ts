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
    const result = applyByeLogic(matches, 6, 6);
    const byeMatches = result.filter(m => m.isBye);
    expect(byeMatches).toHaveLength(2);
  });

  it('creates bracket of correct size for nine teams', () => {
    const matches = createCategoryBBracket(9);
    const firstRound = matches.filter(m => m.round === 200);
    expect(firstRound).toHaveLength(8);
  });

  it('creates 15 BYEs for the 35 team scenario', () => {
    function makeTeam(id: string) {
      return {
        id,
        name: id,
        players: [],
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        performance: 0,
        teamRating: 0,
        synchroLevel: 0,
      } as const;
    }

    const teams = Array.from({ length: 17 }).map((_, i) => makeTeam(`t${i + 1}`));
    const bracket = createCategoryBBracket(teams.length);
    const firstRound = bracket.filter(m => m.round === 200);

    const bracketSize = 1 << Math.ceil(Math.log2(teams.length));
    const byesNeeded = bracketSize - teams.length;

    let teamIdx = 0;
    for (let i = 0; i < firstRound.length; i++) {
      if (i < byesNeeded) {
        const t = teams[teamIdx++];
        firstRound[i] = {
          ...firstRound[i],
          team1Id: t.id,
          team2Id: t.id,
          completed: true,
          isBye: true,
        } as Match;
      } else {
        const t1 = teams[teamIdx++];
        const t2 = teams[teamIdx++];
        firstRound[i] = {
          ...firstRound[i],
          team1Id: t1.id,
          team2Id: t2.id,
          completed: false,
          isBye: false,
        } as Match;
      }
    }

    const placed = applyByeLogic(firstRound, teams.length, teams.length);
    const byeMatches = placed.filter(m => m.isBye);
    expect(placed).toHaveLength(16);
    expect(byeMatches).toHaveLength(15);
    expect(placed.filter(m => !m.isBye)).toHaveLength(1);
  });
});
