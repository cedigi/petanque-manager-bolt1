import { renderHook, act } from '@testing-library/react';
import { useTournament } from '../useTournament';
import { Tournament, Team, Player } from '../../types/tournament';

beforeEach(() => {
  localStorage.clear();
});

describe('generateRound increments currentRound', () => {
  it('increments currentRound for pool tournaments', () => {
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
    });

    const initial: Tournament = {
      id: 't1',
      name: 'Test',
      type: 'doublette-poule',
      courts: 2,
      teams: [makeTeam('A'), makeTeam('B'), makeTeam('C'), makeTeam('D')],
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

    expect(result.current.tournament!.currentRound).toBe(1);

    act(() => {
      result.current.generateRound();
    });

    expect(result.current.tournament!.currentRound).toBe(2);
  });
});
