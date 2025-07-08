import { renderHook, act } from '@testing-library/react';
import { useTournament } from '../useTournament';
import { Tournament, Team, Player, Match } from '../../types/tournament';

beforeEach(() => {
  localStorage.clear();
});

describe('barrage generation in pool of four', () => {
  it('creates round 3 match when two teams have one win each', () => {
    const team = (id: string): Team => ({
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
      poolId: 'p1',
    });

    const initial: Tournament = {
      id: 't1',
      name: 'Test',
      type: 'doublette-poule',
      courts: 2,
      teams: [team('A'), team('B'), team('C'), team('D')],
      matches: [
        {
          id: 'm1',
          round: 1,
          court: 1,
          team1Id: 'A',
          team2Id: 'D',
          completed: false,
          isBye: false,
          battleIntensity: 0,
          hackingAttempts: 0,
          poolId: 'p1',
        } as Match,
        {
          id: 'm2',
          round: 1,
          court: 2,
          team1Id: 'B',
          team2Id: 'C',
          completed: false,
          isBye: false,
          battleIntensity: 0,
          hackingAttempts: 0,
          poolId: 'p1',
        } as Match,
      ],
      pools: [{ id: 'p1', name: 'Poule 1', teamIds: ['A', 'B', 'C', 'D'], matches: [] }],
      matchesB: [],
      currentRound: 1,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
      poolsGenerated: true,
    };

    localStorage.setItem('petanque-tournament', JSON.stringify(initial));
    const { result } = renderHook(() => useTournament());

    const match1 = result.current.tournament!.matches.find(m => m.id === 'm1')!;
    const match2 = result.current.tournament!.matches.find(m => m.id === 'm2')!;

    act(() => {
      result.current.updateMatchScore(match1.id, 13, 7); // A beats D
    });
    act(() => {
      result.current.updateMatchScore(match2.id, 13, 7); // B beats C
    });

    const winnersMatch = result.current.tournament!.matches.find(
      m =>
        m.round === 2 &&
        ((m.team1Id === 'A' && m.team2Id === 'B') ||
          (m.team1Id === 'B' && m.team2Id === 'A')),
    )!;

    const losersMatch = result.current.tournament!.matches.find(
      m =>
        m.round === 2 &&
        ((m.team1Id === 'C' && m.team2Id === 'D') ||
          (m.team1Id === 'D' && m.team2Id === 'C')),
    )!;

    act(() => {
      result.current.updateMatchScore(winnersMatch.id, 7, 13); // B beats A
    });
    act(() => {
      result.current.updateMatchScore(losersMatch.id, 8, 13); // C beats D
    });



    const barrage = result.current.tournament!.matches.find(
      m =>
        m.round === 3 &&
        ((m.team1Id === 'A' && m.team2Id === 'C') ||
          (m.team1Id === 'C' && m.team2Id === 'A')),
    );

    expect(barrage).toBeDefined();
    expect(barrage?.isBye).toBe(false);
  });
});

