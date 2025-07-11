import { generateMatches } from '../matchmaking';
import { Tournament, Team, Player } from '../../types/tournament';

function makePlayer(id: string, label: string): Player {
  return {
    id,
    name: `${id}`,
    label,
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
    players: [
      makePlayer(`${id}-A`, 'A'),
      makePlayer(`${id}-B`, 'B'),
      makePlayer(`${id}-C`, 'C'),
      makePlayer(`${id}-D`, 'D'),
    ],
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
    type: 'quadrette',
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


describe('generateQuadretteMatches', () => {
  it('creates triplette and tête-à-tête matches between different teams in round one', () => {
    const teams = [makeTeam('T1'), makeTeam('T2')];
    const tournament = baseTournament(teams);

    const matches = generateMatches(tournament);
    expect(matches).toHaveLength(2);
    expect(matches.every(m => m.team1Id !== m.team2Id)).toBe(true);
    const triplette = matches.find(m => m.team1Ids && m.team1Ids.length === 3);
    const tete = matches.find(m => m.team1Ids && m.team1Ids.length === 1);
    expect(triplette).toBeDefined();
    expect(triplette!.team2Ids).toHaveLength(3);
    expect(tete).toBeDefined();
    expect(tete!.team2Ids).toHaveLength(1);
  });

  it('avoids pairing the same teams more than once', () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C'), makeTeam('D')];
    const tournament = baseTournament(teams);

    for (let i = 0; i < 3; i++) {
      const newMatches = generateMatches(tournament);
      tournament.matches.push(...newMatches);
      tournament.currentRound += 1;
    }

    const pairs = new Set(
      tournament.matches.map(m => [m.team1Id, m.team2Id].sort().join('-'))
    );
    expect(pairs.size * 2).toBe(tournament.matches.length);
  });

  it('returns no matches after round seven', () => {
    const teams = [makeTeam('A'), makeTeam('B')];
    const tournament = baseTournament(teams);
    tournament.currentRound = 7;
    const matches = generateMatches(tournament);
    expect(matches).toHaveLength(0);
  });
});
