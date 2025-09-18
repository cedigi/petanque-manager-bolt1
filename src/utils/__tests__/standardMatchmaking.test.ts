import { generateMatches } from '../matchmaking';
import { Tournament, Team, Player, Match } from '../../types/tournament';

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

describe('generateStandardMatches advanced rounds', () => {
  it('prioritizes wins over performance for later-round pairings', () => {
    const teamA = makeTeam('A');
    teamA.wins = 2;
    teamA.losses = 0;
    teamA.pointsFor = 26;
    teamA.pointsAgainst = 12;
    teamA.performance = 10;

    const teamB = makeTeam('B');
    teamB.wins = 2;
    teamB.losses = 0;
    teamB.pointsFor = 24;
    teamB.pointsAgainst = 20;
    teamB.performance = 5;

    const teamC = makeTeam('C');
    teamC.wins = 1;
    teamC.losses = 1;
    teamC.pointsFor = 30;
    teamC.pointsAgainst = 25;
    teamC.performance = 15;

    const teamD = makeTeam('D');
    teamD.wins = 0;
    teamD.losses = 2;
    teamD.pointsFor = 12;
    teamD.pointsAgainst = 26;
    teamD.performance = -5;

    const teamE = makeTeam('E');
    teamE.wins = 1;
    teamE.losses = 1;
    teamE.pointsFor = 22;
    teamE.pointsAgainst = 24;
    teamE.performance = 6;

    const teamF = makeTeam('F');
    teamF.wins = 0;
    teamF.losses = 2;
    teamF.pointsFor = 18;
    teamF.pointsAgainst = 30;
    teamF.performance = -8;

    const teams = [teamA, teamB, teamC, teamD, teamE, teamF];

    const previousMatches: Match[] = [
      {
        id: 'm1',
        round: 1,
        court: 1,
        team1Id: 'A',
        team2Id: 'C',
        team1Score: 13,
        team2Score: 7,
        completed: true,
        isBye: false,
        battleIntensity: 42,
        hackingAttempts: 0,
      },
      {
        id: 'm2',
        round: 1,
        court: 2,
        team1Id: 'B',
        team2Id: 'D',
        team1Score: 13,
        team2Score: 9,
        completed: true,
        isBye: false,
        battleIntensity: 43,
        hackingAttempts: 0,
      },
      {
        id: 'm3',
        round: 1,
        court: 3,
        team1Id: 'E',
        team2Id: 'F',
        team1Score: 13,
        team2Score: 12,
        completed: true,
        isBye: false,
        battleIntensity: 44,
        hackingAttempts: 0,
      },
      {
        id: 'm4',
        round: 2,
        court: 1,
        team1Id: 'A',
        team2Id: 'E',
        team1Score: 13,
        team2Score: 8,
        completed: true,
        isBye: false,
        battleIntensity: 45,
        hackingAttempts: 0,
      },
      {
        id: 'm5',
        round: 2,
        court: 2,
        team1Id: 'B',
        team2Id: 'F',
        team1Score: 13,
        team2Score: 7,
        completed: true,
        isBye: false,
        battleIntensity: 46,
        hackingAttempts: 0,
      },
      {
        id: 'm6',
        round: 2,
        court: 3,
        team1Id: 'C',
        team2Id: 'D',
        team1Score: 13,
        team2Score: 10,
        completed: true,
        isBye: false,
        battleIntensity: 47,
        hackingAttempts: 0,
      },
    ];

    const tournament: Tournament = {
      ...baseTournament(teams),
      currentRound: 2,
      matches: previousMatches,
    };

    const matches = generateMatches(tournament);

    expect(matches).toHaveLength(3);
    expect(matches.every(match => !match.isBye)).toBe(true);

    const hasMatch = (id1: string, id2: string) =>
      matches.some(
        match =>
          !match.isBye &&
          ((match.team1Id === id1 && match.team2Id === id2) || (match.team1Id === id2 && match.team2Id === id1))
      );

    expect(hasMatch('A', 'B')).toBe(true);
    expect(hasMatch('C', 'A')).toBe(false);
    expect(hasMatch('C', 'B')).toBe(false);

    const cMatch = matches.find(match => match.team1Id === 'C' || match.team2Id === 'C');
    expect(cMatch).toBeDefined();
    expect([cMatch!.team1Id, cMatch!.team2Id].sort()).toEqual(['C', 'E']);
  });
});
