import { generateMatches } from '../src/utils/matchmaking.ts';
import { Tournament, Team } from '../src/types/tournament';

function createTeam(id: string, poolId: string): Team {
  return {
    id,
    name: id,
    poolId,
    players: [],
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    performance: 0,
    teamRating: 0,
    synchroLevel: 0,
  } as Team;
}

const teams: Team[] = [
  createTeam('A1', 'A'),
  createTeam('A2', 'A'),
  createTeam('A3', 'A'),
  createTeam('A4', 'A'),
];

const tournament: Tournament = {
  id: 't1',
  name: 'Test',
  type: 'doublette-poule',
  courts: 2,
  teams,
  pools: [{ id: 'A', teamIds: teams.map(t => t.id) }],
  matches: [],
  currentRound: 0,
  completed: false,
  createdAt: new Date(),
  securityLevel: 0,
  networkStatus: 'online',
};

for (let day = 1; day <= 3; day++) {
  const newMatches = generateMatches(tournament);
  console.log(`Day ${day}`);
  newMatches.forEach(m => console.log(`  ${m.team1Id} vs ${m.team2Id} (pool ${m.poolId})`));
  tournament.matches.push(...newMatches);
  tournament.currentRound++;
}

const pairs = new Set(tournament.matches
  .filter(m => !m.isBye)
  .map(m => [m.team1Id, m.team2Id].sort().join('-')));

console.log('Unique pairings:', pairs);
