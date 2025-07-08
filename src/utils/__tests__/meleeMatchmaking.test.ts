import { generateMatches } from '../matchmaking';
import { Tournament, Team, Player } from '../../types/tournament';

function makePlayer(id: string): Player {
  return {
    id,
    name: `Player ${id}`,
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
    players: [makePlayer(id)],
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    performance: 0,
    teamRating: 0,
    synchroLevel: 0,
  };
}

describe('generateMeleeMatches edge cases', () => {
  function baseTournament(teams: Team[]): Tournament {
    return {
      id: 't',
      name: 'Test',
      type: 'melee',
      courts: 1,
      teams,
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
  }

  it('pairs two remaining players against each other', () => {
    const teams = [makeTeam('A'), makeTeam('B')];
    const tournament = baseTournament(teams);
    const matches = generateMatches(tournament);
    expect(matches).toHaveLength(1);
    const ids = [matches[0].team1Id, matches[0].team2Id].sort();
    expect(ids).toEqual(['A', 'B']);
  });

  it('creates a bye for a final triplette', () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C')];
    const tournament = baseTournament(teams);
    const matches = generateMatches(tournament);
    expect(matches).toHaveLength(1);
    const match = matches[0];
    expect(match.isBye).toBe(true);
    expect(match.team1Ids?.sort()).toEqual(['A', 'B', 'C'].sort());
  });
});
