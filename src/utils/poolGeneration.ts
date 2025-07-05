import { Team, Pool, Match } from '../types/tournament';
import { generateUuid } from './uuid';

export function generatePools(teams: Team[]): Pool[] {
  const totalTeams = teams.length;
  
  if (totalTeams < 4) {
    return [];
  }

  // Calculer le nombre optimal de poules de 4 et de 3
  const { poolsOf4, poolsOf3 } = calculateOptimalPools(totalTeams);
  
  // Mélanger les équipes aléatoirement
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  
  const pools: Pool[] = [];
  let teamIndex = 0;

  // Créer les poules de 4
  for (let i = 0; i < poolsOf4; i++) {
    const poolTeams = shuffledTeams.slice(teamIndex, teamIndex + 4);
    pools.push({
      id: generateUuid(),
      name: `Poule ${i + 1}`,
      teamIds: poolTeams.map(t => t.id),
      matches: []
    });
    teamIndex += 4;
  }

  // Créer les poules de 3
  for (let i = 0; i < poolsOf3; i++) {
    const poolTeams = shuffledTeams.slice(teamIndex, teamIndex + 3);
    pools.push({
      id: generateUuid(),
      name: `Poule ${poolsOf4 + i + 1}`,
      teamIds: poolTeams.map(t => t.id),
      matches: []
    });
    teamIndex += 3;
  }

  return pools;
}

export function calculateOptimalPools(totalTeams: number): {
  poolsOf4: number;
  poolsOf3: number;
} {
  // Try to maximise pools of 4 while ensuring the remainder can form pools of 3
  let poolsOf4 = Math.floor(totalTeams / 4);
  let poolsOf3 = 0;

  while (poolsOf4 >= 0) {
    const remaining = totalTeams - poolsOf4 * 4;
    if (remaining % 3 === 0) {
      poolsOf3 = remaining / 3;
      break;
    }
    poolsOf4 -= 1;
  }

  // If we could not find a valid combination, return zero to signal invalid
  if (poolsOf4 < 0) {
    poolsOf4 = 0;
    poolsOf3 = 0;
  }

  return { poolsOf4, poolsOf3 };
}

export function generatePoolMatches(pool: Pool, teams: Team[]): Match[] {
  const poolTeams = pool.teamIds.map(id => teams.find(t => t.id === id)).filter(Boolean);
  const matches: Match[] = [];
  
  // Générer tous les matchs possibles dans la poule (round robin)
  for (let i = 0; i < poolTeams.length; i++) {
    for (let j = i + 1; j < poolTeams.length; j++) {
      matches.push({
        id: generateUuid(),
        round: 1,
        court: 1,
        team1Id: poolTeams[i]!.id,
        team2Id: poolTeams[j]!.id,
        completed: false,
        isBye: false,
        poolId: pool.id,
        battleIntensity: Math.floor(Math.random() * 50) + 25,
        hackingAttempts: 0,
      });
    }
  }
  
  return matches;
}