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

function baseTournament(teams: Team[]): Tournament {
  return {
    id: 't',
    name: 'Test',
    type: 'doublette',
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

describe('generateStandardMatches first round', () => {
  it('pairs all teams exactly once for even counts', () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C'), makeTeam('D')];
    const tournament = baseTournament(teams);
    const matches = generateMatches(tournament);
    expect(matches).toHaveLength(2);
    const ids = new Set<string>();
    matches.forEach(m => {
      ids.add(m.team1Id);
      if (!m.isBye) ids.add(m.team2Id);
    });
    expect(Array.from(ids).sort()).toEqual(teams.map(t => t.id).sort());
  });

  it('assigns one team a BYE when the count is odd', () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C')];
    const tournament = baseTournament(teams);
    const matches = generateMatches(tournament);
    expect(matches).toHaveLength(2); // 1 match + 1 bye
    const bye = matches.find(m => m.isBye);
    expect(bye).toBeDefined();
    const ids = new Set<string>();
    matches.forEach(m => {
      ids.add(m.team1Id);
      if (!m.isBye) ids.add(m.team2Id);
    });
    expect(Array.from(ids).sort()).toEqual(teams.map(t => t.id).sort());
  });

  it('avoids pairing consecutive teams when possible', () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C'), makeTeam('D')];
    const tournament = baseTournament(teams);

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.4);

    const matches = generateMatches(tournament);
    randomSpy.mockRestore();

    const baseOrder = teams.map(t => t.id);
    const hasSequential = matches.some(m => {
      if (m.isBye) return false;
      const diff = Math.abs(
        baseOrder.indexOf(m.team1Id) - baseOrder.indexOf(m.team2Id)
      );
      return diff === 1;
    });
    expect(hasSequential).toBe(false);
  });
});
