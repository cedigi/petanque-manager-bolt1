import { renderHook, act } from '@testing-library/react';
import { useTournament } from '../useTournament';
import { Tournament, Team, Player, Pool, Match } from '../../types/tournament';

describe('generateRound handles fewer bottom teams than bracket size', () => {
  it('does not throw when bottomTeams length is less than bracket size', () => {
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

    const teams: Team[] = Array.from({ length: 12 }, (_, i) => makeTeam(`T${i + 1}`));
    const pools: Pool[] = [];

    for (let i = 0; i < 3; i++) {
      const ids = teams.slice(i * 4, i * 4 + 4).map(t => t.id);
      pools.push({ id: `p${i + 1}`, name: `Poule ${i + 1}`, teamIds: ids, matches: [] });
    }

    pools.forEach(pool => {
      pool.teamIds.forEach(id => {
        const t = teams.find(tm => tm.id === id)!;
        t.poolId = pool.id;
      });
    });

    const matches: Match[] = [];
    let mId = 0;
    teams.slice(0, 11).forEach(team => {
      for (let i = 0; i < 2; i++) {
        matches.push({
          id: `m${mId++}`,
          round: 1,
          court: 0,
          team1Id: team.id,
          team2Id: team.id,
          team1Score: 13,
          team2Score: 0,
          completed: true,
          isBye: true,
          poolId: team.poolId,
          battleIntensity: 0,
          hackingAttempts: 0,
        } as Match);
      }
    });

    const tournament: Tournament = {
      id: 'tour',
      name: 'Test',
      type: 'doublette-poule',
      courts: 6,
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

    expect(() => {
      act(() => {
        result.current.generateRound();
      });
    }).not.toThrow();

    const firstRound = result.current.tournament!.matchesB.filter(m => m.round === 200);
    expect(firstRound).toHaveLength(4);
  });
});
