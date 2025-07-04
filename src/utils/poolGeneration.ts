import { Team, Pool, Match } from '../types/tournament';

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
  // Start with as many pools of 4 as possible
  let poolsOf4 = Math.floor(totalTeams / 4);
  let remainder = totalTeams % 4;

  // If remainder isn't divisible by 3, convert pools of 4 to pools of 3
  while (remainder % 3 !== 0 && poolsOf4 > 0) {
    poolsOf4 -= 1;
    remainder += 4;
  }

  const poolsOf3 = remainder / 3;

  return { poolsOf4, poolsOf3 };
}

export function generatePoolMatches(pool: Pool, teams: Team[]): Match[] {
  const poolTeams = pool.teamIds.map(id => teams.find(t => t.id === id)).filter(Boolean);
  const matches: Match[] = [];
  
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