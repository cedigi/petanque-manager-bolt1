import { renderHook, act } from '@testing-library/react';
import { useTournament } from '../useTournament';
import { Tournament, Team, Player, Match } from '../../types/tournament';

beforeEach(() => {
  localStorage.clear();
});

describe('deleteRound', () => {
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

  it('removes matches of given round and updates currentRound', () => {
    const match1: Match = {
      id: 'm1',
      round: 1,
      court: 1,
      team1Id: 'A',
      team2Id: 'B',
      team1Score: 13,
      team2Score: 7,
      completed: true,
      isBye: false,
      battleIntensity: 0,
      hackingAttempts: 0,
    };
    const match2: Match = {
      id: 'm2',
      round: 2,
      court: 1,
      team1Id: 'A',
      team2Id: 'B',
      completed: false,
      isBye: false,
      battleIntensity: 0,
      hackingAttempts: 0,
    };
    const initial: Tournament = {
      id: 't1',
      name: 'Test',
      type: 'doublette',
      courts: 1,
      teams: [makeTeam('A'), makeTeam('B')],
      matches: [match1, match2],
      matchesB: [],
      pools: [],
      currentRound: 2,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
      poolsGenerated: false,
    };

    localStorage.setItem('petanque-tournament', JSON.stringify(initial));
    const { result } = renderHook(() => useTournament());

    act(() => {
      result.current.deleteRound(1);
    });

    const t = result.current.tournament!;
    expect(t.currentRound).toBe(2);
    expect(t.matches.find(m => m.id === 'm1')).toBeUndefined();
    expect(t.matches.find(m => m.id === 'm2')).toBeDefined();
  });

  it('deleting last round decrements currentRound', () => {
    const match1: Match = {
      id: 'm1',
      round: 1,
      court: 1,
      team1Id: 'A',
      team2Id: 'B',
      completed: true,
      isBye: false,
      battleIntensity: 0,
      hackingAttempts: 0,
    };
    const initial: Tournament = {
      id: 't1',
      name: 'Test',
      type: 'doublette',
      courts: 1,
      teams: [makeTeam('A'), makeTeam('B')],
      matches: [match1],
      matchesB: [],
      pools: [],
      currentRound: 1,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
      poolsGenerated: false,
    };

    localStorage.setItem('petanque-tournament', JSON.stringify(initial));
    const { result } = renderHook(() => useTournament());

    act(() => {
      result.current.deleteRound(1);
    });

    const t = result.current.tournament!;
    expect(t.currentRound).toBe(0);
    expect(t.matches).toHaveLength(0);
  });
});

