import { renderHook, act } from '@testing-library/react';
import { useTournament } from '../useTournament';
import { Tournament, Team, Player, Match } from '../../types/tournament';

beforeEach(() => {
  localStorage.clear();
});

describe('deleteCurrentRound', () => {
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

  it('removes matches of current round and decrements counter', () => {
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
      result.current.deleteCurrentRound();
    });

    const t = result.current.tournament!;
    expect(t.currentRound).toBe(1);
    expect(t.matches.find(m => m.id === 'm2')).toBeUndefined();
    expect(t.matches.find(m => m.id === 'm1')).toBeDefined();
    const teamA = t.teams.find(tm => tm.id === 'A')!;
    expect(teamA.wins).toBe(1);
    expect(teamA.pointsFor).toBe(13);
  });

  it('regenerates first round and resets stats when deleting round 1', () => {
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
      result.current.deleteCurrentRound();
    });

    const t = result.current.tournament!;
    expect(t.currentRound).toBe(0);
    expect(t.matches).toHaveLength(0);
    const teamA = t.teams.find(tm => tm.id === 'A')!;
    expect(teamA.wins).toBe(0);
    expect(teamA.pointsFor).toBe(0);
  });
});
