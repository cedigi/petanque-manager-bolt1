import { Team, Pool, Match } from '../types/tournament';
import { generateUuid } from './uuid';

export function generatePools(teams: Team[], preferredPoolSize: 3 | 4 = 4): Pool[] {
  const totalTeams = teams.length;

  const minimumTeams = preferredPoolSize === 3 ? 3 : 4;
  if (totalTeams < minimumTeams) {
    return [];
  }

  // Calculer le nombre optimal de poules selon la préférence
  const { poolsOf4, poolsOf3, poolsOf2 } = calculateOptimalPools(
    totalTeams,
    preferredPoolSize,
  );

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

  // Créer les poules de 2 (uniquement pour la préférence poules de 3)
  for (let i = 0; i < poolsOf2; i++) {
    const poolTeams = shuffledTeams.slice(teamIndex, teamIndex + 2);
    pools.push({
      id: generateUuid(),
      name: `Poule ${poolsOf4 + poolsOf3 + i + 1}`,
      teamIds: poolTeams.map(t => t.id),
      matches: []
    });
    teamIndex += 2;
  }

  return pools;
}

export function calculateOptimalPools(
  totalTeams: number,
  preferredPoolSize: 3 | 4 = 4,
): {
  poolsOf4: number;
  poolsOf3: number;
  poolsOf2: number;
} {
  if (preferredPoolSize === 3) {
    if (totalTeams < 3) {
      return { poolsOf4: 0, poolsOf3: 0, poolsOf2: 0 };
    }

    const maxPoolsOf3 = Math.floor(totalTeams / 3);

    for (let poolsOf3 = maxPoolsOf3; poolsOf3 >= 0; poolsOf3--) {
      const remainingTeams = totalTeams - poolsOf3 * 3;

      if (remainingTeams === 0) {
        return { poolsOf4: 0, poolsOf3, poolsOf2: 0 };
      }

      if (remainingTeams >= 4 && remainingTeams % 4 === 0) {
        return { poolsOf4: remainingTeams / 4, poolsOf3, poolsOf2: 0 };
      }
    }

    return { poolsOf4: 0, poolsOf3: 0, poolsOf2: 0 };
  }

  // Préférence pour les poules de 4 (comportement d'origine)
  let poolsOf4 = Math.floor(totalTeams / 4);
  let poolsOf3 = 0;
  const poolsOf2 = 0;

  while (poolsOf4 >= 0) {
    const remaining = totalTeams - poolsOf4 * 4;
    if (remaining % 3 === 0) {
      poolsOf3 = remaining / 3;
      break;
    }
    poolsOf4 -= 1;
  }

  if (poolsOf4 < 0) {
    poolsOf4 = 0;
    poolsOf3 = 0;
  }

  return { poolsOf4, poolsOf3, poolsOf2 };
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