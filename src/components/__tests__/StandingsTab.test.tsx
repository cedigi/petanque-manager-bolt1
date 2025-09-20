import * as React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StandingsTab } from '../StandingsTab';
import { computeTeamStats } from '../../hooks/teamStats';
import { Tournament, Team, Player, Match } from '../../types/tournament';

afterEach(() => {
  cleanup();
});

function makePlayer(teamId: string, index: number): Player {
  return {
    id: `${teamId}-player-${index}`,
    name: `${teamId.toUpperCase()} Player ${index}`,
    label: `${teamId.toUpperCase()}-${index}`,
    cyberImplants: [],
    neuralScore: 0,
    combatRating: 0,
    hackingLevel: 0,
    augmentationLevel: 0,
  };
}

function makeTeam(id: string): Team {
  return {
    id,
    name: id,
    players: [makePlayer(id, 1), makePlayer(id, 2)],
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    performance: 0,
    tieBreakDeltas: [],
    teamRating: 0,
    synchroLevel: 0,
  };
}

function createTournament(teams: Team[], matches: Match[], matchesB: Match[] = []): Tournament {
  return {
    id: 'tournament-id',
    name: 'Test Tournament',
    type: 'doublette',
    courts: 4,
    teams,
    matches,
    matchesB,
    pools: [],
    currentRound: 0,
    completed: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    securityLevel: 0,
    networkStatus: 'online',
    poolsGenerated: false,
  };
}

describe('StandingsTab tie-break sorting', () => {
  it('orders tied teams using their first tie-break differential', () => {
    const teams = [
      makeTeam('alpha'),
      makeTeam('beta'),
      makeTeam('gamma'),
      makeTeam('delta'),
    ];

    const matches: Match[] = [
      {
        id: 'm1',
        round: 1,
        court: 1,
        team1Id: 'alpha',
        team2Id: 'gamma',
        team1Score: 13,
        team2Score: 5,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
      {
        id: 'm2',
        round: 1,
        court: 2,
        team1Id: 'beta',
        team2Id: 'delta',
        team1Score: 13,
        team2Score: 7,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
      {
        id: 'm3',
        round: 2,
        court: 1,
        team1Id: 'alpha',
        team2Id: 'delta',
        team1Score: 7,
        team2Score: 13,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
    ];

    const matchesB: Match[] = [
      {
        id: 'm4',
        round: 2,
        court: 2,
        team1Id: 'beta',
        team2Id: 'gamma',
        team1Score: 9,
        team2Score: 13,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
    ];

    const tournament = createTournament(teams, matches, matchesB);
    const teamsWithStats = computeTeamStats(tournament);

    const alpha = teamsWithStats.find(team => team.id === 'alpha');
    const beta = teamsWithStats.find(team => team.id === 'beta');

    expect(alpha?.tieBreakDeltas).toEqual([8, -6]);
    expect(beta?.tieBreakDeltas).toEqual([6, -4]);

    render(<StandingsTab teams={teamsWithStats} />);

    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1);

    expect(dataRows[0]).toHaveTextContent('ALPHA Player 1');
    expect(dataRows[1]).toHaveTextContent('BETA Player 1');
  });

  it('breaks remaining ties using later match differentials', () => {
    const teams = [
      makeTeam('omega'),
      makeTeam('sigma'),
      makeTeam('gamma'),
      makeTeam('delta'),
      makeTeam('epsilon'),
    ];

    const matches: Match[] = [
      {
        id: 'm12',
        round: 2,
        court: 1,
        team1Id: 'omega',
        team2Id: 'delta',
        team1Score: 10,
        team2Score: 13,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
      {
        id: 'm10',
        round: 1,
        court: 1,
        team1Id: 'omega',
        team2Id: 'gamma',
        team1Score: 13,
        team2Score: 8,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
      {
        id: 'm14',
        round: 3,
        court: 1,
        team1Id: 'omega',
        team2Id: 'epsilon',
        team1Score: 13,
        team2Score: 11,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
      {
        id: 'm11',
        round: 1,
        court: 2,
        team1Id: 'sigma',
        team2Id: 'delta',
        team1Score: 13,
        team2Score: 8,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
      {
        id: 'm13',
        round: 2,
        court: 2,
        team1Id: 'sigma',
        team2Id: 'epsilon',
        team1Score: 11,
        team2Score: 13,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
      {
        id: 'm15',
        round: 3,
        court: 2,
        team1Id: 'sigma',
        team2Id: 'gamma',
        team1Score: 13,
        team2Score: 12,
        completed: true,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      },
    ];

    const tournament = createTournament(teams, matches);
    const teamsWithStats = computeTeamStats(tournament);

    const omega = teamsWithStats.find(team => team.id === 'omega');
    const sigma = teamsWithStats.find(team => team.id === 'sigma');

    expect(omega?.tieBreakDeltas).toEqual([5, -3, 2]);
    expect(sigma?.tieBreakDeltas).toEqual([5, -2, 1]);

    render(<StandingsTab teams={teamsWithStats} />);

    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1);

    expect(dataRows[0]).toHaveTextContent('SIGMA Player 1');
    expect(dataRows[1]).toHaveTextContent('OMEGA Player 1');
  });
});
