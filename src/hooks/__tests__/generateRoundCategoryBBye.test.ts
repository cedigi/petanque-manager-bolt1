import { renderHook, act } from '@testing-library/react';
import { useTournament } from '../useTournament';
import { Tournament, Team, Player, Pool, Match } from '../../types/tournament';

beforeEach(() => {
  localStorage.clear();
});

describe('generateRound Category B BYE creation for 35 teams', () => {
  it('creates 16 matches with 15 BYEs in first round', () => {
    const makeTeam = (id: string): Team => ({
      id,
      name: id,
      players: [] as Player[],
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      performance: 0,
      teamRating: 0,
      synchroLevel: 0,
      poolId: '',
    });

    const teams: Team[] = Array.from({ length: 35 }, (_, i) => makeTeam(`T${i + 1}`));
    const pools: Pool[] = [];

    for (let i = 0; i < 8; i++) {
      const ids = teams.slice(i * 4, i * 4 + 4).map(t => t.id);
      pools.push({ id: `p${i + 1}`, name: `Poule ${i + 1}`, teamIds: ids, matches: [] });
    }
    pools.push({ id: 'p9', name: 'Poule 9', teamIds: teams.slice(32).map(t => t.id), matches: [] });

    pools.forEach(pool => {
      pool.teamIds.forEach(id => {
        const t = teams.find(tm => tm.id === id)!;
        t.poolId = pool.id;
      });
    });

    const matches: Match[] = [];
    let mId = 0;
    pools.forEach(pool => {
      const [t1, t2] = pool.teamIds;
      [t1, t2].forEach(id => {
        for (let i = 0; i < 2; i++) {
          matches.push({
            id: `m${mId++}`,
            round: 1,
            court: 0,
            team1Id: id,
            team2Id: id,
            team1Score: 13,
            team2Score: 0,
            completed: true,
            isBye: true,
            poolId: pool.id,
            battleIntensity: 0,
            hackingAttempts: 0,
          } as Match);
        }
      });
    });

    const tournament: Tournament = {
      id: 'tour',
      name: 'Test',
      type: 'doublette-poule',
      courts: 8,
      teams,
      matches,
      matchesB: [],
      pools,
      currentRound: 1,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
      poolsGenerated: true,
    };

    localStorage.setItem('petanque-tournament', JSON.stringify(tournament));
    const { result } = renderHook(() => useTournament());

    act(() => {
      result.current.generateRound();
    });

    const firstRound = result.current.tournament!.matchesB.filter(m => m.round === 200);
    const byeMatches = firstRound.filter(m => m.isBye);

    expect(firstRound).toHaveLength(16);
    expect(byeMatches).toHaveLength(15);
  });
});
