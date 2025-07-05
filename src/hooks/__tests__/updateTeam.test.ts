import { renderHook, act } from '@testing-library/react';
import { useTournament } from '../useTournament';
import { Tournament, Team, Player } from '../../types/tournament';

describe('updateTeam', () => {
  it('updates player names and team name', () => {
    const makePlayer = (id: string, name: string): Player => ({
      id,
      name,
      cyberImplants: [],
      neuralScore: 100,
      combatRating: 100,
      hackingLevel: 1,
      augmentationLevel: 0,
    });

    const team: Team = {
      id: 't1',
      name: 'Équipe 1',
      players: [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')],
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      performance: 0,
      teamRating: 0,
      synchroLevel: 0,
    };

    const initial: Tournament = {
      id: 'tour',
      name: 'Test',
      type: 'doublette',
      courts: 2,
      teams: [team],
      matches: [],
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
      const newPlayers = [
        { ...team.players[0], name: 'Charlie' },
        { ...team.players[1], name: 'Dana' },
      ];
      result.current.updateTeam('t1', newPlayers, 'Team X');
    });

    const updated = result.current.tournament!.teams[0];
    expect(updated.name).toBe('Team X');
    expect(updated.players[0].name).toBe('Charlie');
    expect(updated.players[1].name).toBe('Dana');

    const stored = JSON.parse(localStorage.getItem('petanque-tournament')!);
    expect(stored.teams[0].players[0].name).toBe('Charlie');
  });
});
