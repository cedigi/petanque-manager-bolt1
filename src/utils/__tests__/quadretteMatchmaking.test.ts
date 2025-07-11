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

        codex/shuffle-team-list-before-pairing
  it('randomizes first round pairings so sequential teams are not always matched', () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C'), makeTeam('D')];
    const tournament = baseTournament(teams);

    const values = [0.4, 0.6, 0.3, 0.9, 0.2, 0.8, 0.1, 0.7];
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockImplementation(() => values.shift() ?? 0.5);

    const matches = generateMatches(tournament);
    randomSpy.mockRestore();

    const baseOrder = teams.map(t => t.id);
    const pairs = Array.from(
      new Set(matches.map(m => [m.team1Id, m.team2Id].sort().join('-')))
    );

    const hasSequential = pairs.some(p => {
      const [t1, t2] = p.split('-');
      const diff = Math.abs(baseOrder.indexOf(t1) - baseOrder.indexOf(t2));
      return diff === 1;
    });
    expect(hasSequential).toBe(false);

  it('can pair a team with different opponents for triplette and tête-à-tête', () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C'), makeTeam('D')];
    const tournament = baseTournament(teams);

    const seq = [0, 0, 0, 0.75, 0.75, 0.75, 0.1, 0.2, 0.3, 0.4];
    let idx = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => seq[idx++] ?? 0);

    const matches = generateMatches(tournament);

    const triplette = matches.filter(m => m.team1Ids && m.team1Ids.length === 3);
    const tete = matches.filter(m => m.team1Ids && m.team1Ids.length === 1);

    const tripMap: Record<string, string> = {};
    triplette.forEach(m => {
      tripMap[m.team1Id] = m.team2Id;
      tripMap[m.team2Id] = m.team1Id;
    });

    const teteMap: Record<string, string> = {};
    tete.forEach(m => {
      teteMap[m.team1Id] = m.team2Id;
      teteMap[m.team2Id] = m.team1Id;
    });

    const hasDifferent = Object.keys(tripMap).some(id => tripMap[id] !== teteMap[id]);
    expect(hasDifferent).toBe(true);
        main
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

  it('includes every team in each generated round', () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C'), makeTeam('D')];
    const tournament = baseTournament(teams);

    for (let i = 0; i < 5; i++) {
      const roundMatches = generateMatches(tournament);
      const ids = new Set<string>();
      roundMatches.forEach(m => {
        ids.add(m.team1Id);
        ids.add(m.team2Id);
      });
      expect(Array.from(ids).sort()).toEqual(teams.map(t => t.id).sort());
      tournament.matches.push(...roundMatches);
      tournament.currentRound += 1;
    }
  });

  it('returns no matches after round seven', () => {
    const teams = [makeTeam('A'), makeTeam('B')];
    const tournament = baseTournament(teams);
    tournament.currentRound = 7;
    const matches = generateMatches(tournament);
    expect(matches).toHaveLength(0);
  });

  it('generates matches for multiple rounds covering all teams', () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C'), makeTeam('D')];
    const tournament = baseTournament(teams);

    const patternsPerRound = 2; // schedule defines two match patterns per round
    const roundsToPlay = 3;

    for (let r = 0; r < roundsToPlay; r++) {
      const newMatches = generateMatches(tournament);

      // number of matches should equal (team count / 2) * patternsPerRound
      expect(newMatches).toHaveLength((teams.length / 2) * patternsPerRound);

      // every team should appear in the round's matches
      teams.forEach(team => {
        const involved = newMatches.some(
          m => m.team1Id === team.id || m.team2Id === team.id
        );
        expect(involved).toBe(true);
      });

      tournament.matches.push(...newMatches);
      tournament.currentRound += 1;
    }
  });
});
