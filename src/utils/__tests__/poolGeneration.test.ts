import { generatePools, generatePoolMatches, calculateOptimalPools } from '../poolGeneration';
import { Team, Player } from '../../types/tournament';

function makeTeams(count: number): Team[] {
  const players: Player[] = [];
  return Array.from({ length: count }).map((_, i) => ({
    id: `t${i + 1}`,
    name: `Team ${i + 1}`,
    players,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    performance: 0,
    teamRating: 0,
    synchroLevel: 0,
  }));
}

describe('generatePools', () => {
  it('creates pools of four for doublette-poule', () => {
    const teams = makeTeams(8);
    const pools = generatePools(teams);
    expect(pools).toHaveLength(2);
    pools.forEach(p => expect(p.teamIds).toHaveLength(4));
  });

  it('handles mix of pool sizes for triplette-poule', () => {
    const teams = makeTeams(10);
    const pools = generatePools(teams);
    const sizes = pools.map(p => p.teamIds.length).sort();
    expect(sizes).toEqual([3,3,4]);
  });

  it('distributes 21 teams into six pools', () => {
    const teams = makeTeams(21);
    const pools = generatePools(teams);
    const sizes = pools.map(p => p.teamIds.length).sort();
    expect(pools).toHaveLength(6);
    expect(sizes).toEqual([3,3,3,4,4,4]);
  });

  it('returns an empty array for invalid team counts', () => {
    const teams = makeTeams(5);
    const pools = generatePools(teams);
    expect(pools).toEqual([]);
  });

  it('creates pools of three when requested', () => {
    const teams = makeTeams(9);
    const pools = generatePools(teams, 3);
    const sizes = pools.map(p => p.teamIds.length);
    expect(sizes).toEqual([3, 3, 3]);
  });

  it('falls back to a pool of four when needed for preference three', () => {
    const teams = makeTeams(10);
    const pools = generatePools(teams, 3);
    const sizes = pools.map(p => p.teamIds.length).sort();
    expect(sizes).toEqual([3, 3, 4]);
  });

  it('creates pools of four when teams modulo three equals two', () => {
    const teams = makeTeams(8);
    const pools = generatePools(teams, 3);
    const sizes = pools.map(p => p.teamIds.length).sort();
    expect(sizes).toEqual([4, 4]);
  });

  it('can create two pools of four to avoid pools of two', () => {
    const teams = makeTeams(11);
    const pools = generatePools(teams, 3);
    const sizes = pools.map(p => p.teamIds.length).sort();
    expect(sizes).toEqual([3, 4, 4]);
  });
});

describe('calculateOptimalPools', () => {
  it('returns zero pools when the team count cannot be split with preference four', () => {
    expect(calculateOptimalPools(5)).toEqual({ poolsOf4: 0, poolsOf3: 0, poolsOf2: 0 });
    expect(calculateOptimalPools(2)).toEqual({ poolsOf4: 0, poolsOf3: 0, poolsOf2: 0 });
  });

  it('computes mix for preference three with remainder two', () => {
    expect(calculateOptimalPools(8, 3)).toEqual({ poolsOf4: 2, poolsOf3: 0, poolsOf2: 0 });
    expect(calculateOptimalPools(11, 3)).toEqual({ poolsOf4: 2, poolsOf3: 1, poolsOf2: 0 });
  });

  it('computes mix for preference three with remainder one', () => {
    expect(calculateOptimalPools(7, 3)).toEqual({ poolsOf4: 1, poolsOf3: 1, poolsOf2: 0 });
  });
});

describe('generatePoolMatches', () => {
  it('schedules round robin matches for a pool of four', () => {
    const teams = makeTeams(4);
    const pool = { id: '1', name: 'Poule 1', teamIds: teams.map(t => t.id), matches: [] };
    const matches = generatePoolMatches(pool, teams);
    expect(matches).toHaveLength(6); // 4 choose 2
    const pairings = new Set(matches.map(m => [m.team1Id, m.team2Id].sort().join('-')));
    expect(pairings.size).toBe(6);
  });

  it('schedules round robin matches for a pool of three', () => {
    const teams = makeTeams(3);
    const pool = { id: '1', name: 'Poule 1', teamIds: teams.map(t => t.id), matches: [] };
    const matches = generatePoolMatches(pool, teams);
    expect(matches).toHaveLength(3); // 3 choose 2
    const pairings = new Set(matches.map(m => [m.team1Id, m.team2Id].sort().join('-')));
    expect(pairings.size).toBe(3);
  });
});
