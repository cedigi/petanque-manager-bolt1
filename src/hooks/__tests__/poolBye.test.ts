import { renderHook, act } from '@testing-library/react';
import { useTournament } from '../useTournament';
import { Tournament, Team, Player, Match } from '../../types/tournament';

describe('pool BYE creation', () => {
  it('creates BYE for first match loser in pool of three', () => {
    const teamTemplate = (id: string): Team => ({
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
      teams: [teamTemplate('A'), teamTemplate('B'), teamTemplate('C')],
      matches: [
        {
          id: 'm1',
          round: 1,
          court: 1,
          team1Id: 'A',
          team2Id: 'B',
          completed: false,
          isBye: false,
          battleIntensity: 0,
          hackingAttempts: 0,
          poolId: 'p1',
        } as Match,
        {
          id: 'bye1',
          round: 1,
          court: 0,
          team1Id: 'C',
          team2Id: 'C',
          team1Score: 13,
          team2Score: 0,
          completed: true,
          isBye: true,
          battleIntensity: 0,
          hackingAttempts: 0,
          poolId: 'p1',
        } as Match,
      ],
      pools: [{ id: 'p1', name: 'Poule 1', teamIds: ['A', 'B', 'C'], matches: [] }],
      currentRound: 1,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
      poolsGenerated: true,
    };

    localStorage.setItem('petanque-tournament', JSON.stringify(initial));

    const { result } = renderHook(() => useTournament());

    const match = result.current.tournament!.matches.find(m => m.id === 'm1')!;

    act(() => {
      result.current.updateMatchScore(match.id, 13, 7);
    });

    const bye = result.current.tournament!.matches.find(
      m => m.isBye && m.round === 2 && m.team1Id === 'B' && m.team2Id === 'B'
    );
    expect(bye).toBeDefined();
    expect(bye?.isBye).toBe(true);
  });
});
