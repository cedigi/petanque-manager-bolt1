import { generatePools, generatePoolMatches } from '../poolGeneration';
import { Team } from '../../types/tournament';

function makeTeams(count: number): Team[] {
  const players: any[] = [];
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
});

describe('generatePoolMatches', () => {
  it('schedules round robin matches for a pool of four', () => {
    const teams = makeTeams(4);
    const pool = { id: 'A', name: 'A', teamIds: teams.map(t => t.id), matches: [] };
    const matches = generatePoolMatches(pool, teams);
    expect(matches).toHaveLength(6); // 4 choose 2
    const pairings = new Set(matches.map(m => [m.team1Id, m.team2Id].sort().join('-')));
    expect(pairings.size).toBe(6);
  });

  it('schedules round robin matches for a pool of three', () => {
    const teams = makeTeams(3);
    const pool = { id: 'A', name: 'A', teamIds: teams.map(t => t.id), matches: [] };
    const matches = generatePoolMatches(pool, teams);
    expect(matches).toHaveLength(3); // 3 choose 2
    const pairings = new Set(matches.map(m => [m.team1Id, m.team2Id].sort().join('-')));
    expect(pairings.size).toBe(3);
  });
});
