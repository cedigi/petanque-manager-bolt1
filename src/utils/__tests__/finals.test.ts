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

  it('places 12 qualified teams from a 21 team tournament and marks four BYEs', () => {
    function makeTeam(id: string, poolId: string) {
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
        poolId,
      } as const;
    }

    const qualifiedTeams = Array.from({ length: 12 }).map((_, i) =>
      makeTeam(`t${i + 1}`, `p${Math.floor(i / 2)}`)
    );

    const firstRound = Array.from({ length: 8 }).map((_, i) => makeMatch(`f${i + 1}`));

    const primary: { matchIndex: number; position: 'team1' | 'team2' }[] = [];
    const secondary: { matchIndex: number; position: 'team1' | 'team2' }[] = [];

    firstRound.forEach((match, idx) => {
      primary.push({ matchIndex: idx, position: 'team1' });
      secondary.push({ matchIndex: idx, position: 'team2' });
    });

    const positions = [...primary, ...secondary];
    const placed = [...firstRound];

    qualifiedTeams.forEach(team => {
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const match = placed[pos.matchIndex];
        const otherId = pos.position === 'team1' ? match.team2Id : match.team1Id;
        if (otherId) {
          const otherTeam = qualifiedTeams.find(t => t.id === otherId);
          if (otherTeam && otherTeam.poolId === team.poolId) {
            continue;
          }
        }
        placed[pos.matchIndex] = {
          ...match,
          [pos.position + 'Id']: team.id,
        } as Match;
        positions.splice(i, 1);
        break;
      }
    });

    const expectedQualified = 12; // from calculateOptimalPools(21)
    const withByes = applyByeLogic(placed, qualifiedTeams.length, expectedQualified, 0);
    const byeMatches = withByes.filter(m => m.isBye);
    expect(byeMatches).toHaveLength(4);
  });

  it('removes empty matches when BYEs can fill remaining slots', () => {
    const matches = [
      makeMatch('m1', 't1', 't2'),
      makeMatch('m2'),
      makeMatch('m3', 't3'),
      makeMatch('m4'),
    ];

    const result = applyByeLogic(matches, 3, 6, 0);
    const empty = result.filter(m => !m.team1Id && !m.team2Id && !m.isBye);
    expect(empty).toHaveLength(0);
    const byeMatches = result.filter(m => m.isBye);
    expect(byeMatches).toHaveLength(3);
  });
});
