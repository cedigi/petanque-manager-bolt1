import { Team, Pool } from '../types/tournament';

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
      id: crypto.randomUUID(),
      name: `Poule ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
      teamIds: poolTeams.map(t => t.id),
      matches: []
    });
    teamIndex += 4;
  }

  // Créer les poules de 3
  for (let i = 0; i < poolsOf3; i++) {
    const poolTeams = shuffledTeams.slice(teamIndex, teamIndex + 3);
    pools.push({
      id: crypto.randomUUID(),
      name: `Poule ${String.fromCharCode(65 + poolsOf4 + i)}`,
      teamIds: poolTeams.map(t => t.id),
      matches: []
    });
    teamIndex += 3;
  }

  return pools;
}

function calculateOptimalPools(totalTeams: number): { poolsOf4: number; poolsOf3: number } {
  // Priorité aux poules de 4, avec des poules de 3 si nécessaire
  
  if (totalTeams % 4 === 0) {
    // Divisible par 4 : que des poules de 4
    return { poolsOf4: totalTeams / 4, poolsOf3: 0 };
  }
  
  if (totalTeams % 4 === 1) {
    // Reste 1 : on fait 2 poules de 3 et le reste en poules de 4
    if (totalTeams >= 9) {
      return { poolsOf4: Math.floor((totalTeams - 6) / 4), poolsOf3: 2 };
    } else {
      // Pas assez d'équipes pour 2 poules de 3, on fait tout en poules de 3
      return { poolsOf4: 0, poolsOf3: Math.ceil(totalTeams / 3) };
    }
  }
  
  if (totalTeams % 4 === 2) {
    // Reste 2 : on fait 2 poules de 3 et le reste en poules de 4
    if (totalTeams >= 10) {
      return { poolsOf4: Math.floor((totalTeams - 6) / 4), poolsOf3: 2 };
    } else {
      return { poolsOf4: 0, poolsOf3: Math.ceil(totalTeams / 3) };
    }
  }
  
  if (totalTeams % 4 === 3) {
    // Reste 3 : on fait 1 poule de 3 et le reste en poules de 4
    return { poolsOf4: Math.floor((totalTeams - 3) / 4), poolsOf3: 1 };
  }
  
  return { poolsOf4: 0, poolsOf3: 0 };
}

export function generatePoolMatches(pool: Pool, teams: Team[]): any[] {
  const poolTeams = pool.teamIds.map(id => teams.find(t => t.id === id)).filter(Boolean);
  const matches: any[] = [];
  
  // Générer tous les matchs possibles dans la poule (round robin)
  for (let i = 0; i < poolTeams.length; i++) {
    for (let j = i + 1; j < poolTeams.length; j++) {
      matches.push({
        id: crypto.randomUUID(),
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