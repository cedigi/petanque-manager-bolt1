import { renderHook, act } from '@testing-library/react';
import { useTournament } from '../useTournament';
import { Tournament, Team, Player } from '../../types/tournament';

describe('createEmptyFinalPhases edge case', () => {
  it('does not create final phase matches when less than two teams qualify', () => {
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
    });

    const initial: Tournament = {
      id: 't1',
      name: 'Test',
      type: 'doublette-poule',
      courts: 2,
      teams: [team('A'), team('B')],
      matches: [],
      matchesB: [],
      pools: [],
      currentRound: 0,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
      poolsGenerated: false,
    };

    localStorage.setItem('petanque-tournament', JSON.stringify(initial));

    const { result } = renderHook(() => useTournament());

    act(() => {
      result.current.generateTournamentPools();
    });

    const finals = result.current.tournament!.matches.filter(m => m.round >= 100);
    expect(finals).toHaveLength(0);
  });
});
