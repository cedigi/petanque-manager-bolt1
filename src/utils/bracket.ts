import { Pool, Team, Match } from '../types/tournament';

export function getTopTeamsFromPools(pools: Pool[], allTeams: Team[], qualifiersPerPool: number): Team[] {
  const idToTeam = new Map(allTeams.map(t => [t.id, t]));
  const qualifiers: Team[] = [];

  pools.forEach(pool => {
    const poolTeams = pool.teamIds
      .map(id => idToTeam.get(id))
      .filter((t): t is Team => !!t);
    const sorted = poolTeams.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.performance - a.performance;
    });
    qualifiers.push(...sorted.slice(0, qualifiersPerPool));
  });

  return qualifiers;
}

export function createKnockoutBracket(teams: Team[], startingRound = 1): Match[] {
  const bracketTeams = [...teams];
  const matches: Match[] = [];
  let round = startingRound;
  let currentTeams = bracketTeams;

  while (currentTeams.length > 1) {
    const nextRound: Team[] = [];
    for (let i = 0; i < currentTeams.length; i += 2) {
      const t1 = currentTeams[i];
      const t2 = currentTeams[i + 1];
      if (!t2) {
        matches.push({
          id: crypto.randomUUID(),
          round,
          court: 0,
          team1Id: t1.id,
          team2Id: t1.id,
          team1Score: 13,
          team2Score: 7,
          completed: true,
          isBye: true,
          battleIntensity: 0,
          hackingAttempts: 0,
        });
        nextRound.push(t1);
      } else {
        matches.push({
          id: crypto.randomUUID(),
          round,
          court: 0,
          team1Id: t1.id,
          team2Id: t2.id,
          completed: false,
          isBye: false,
          battleIntensity: 0,
          hackingAttempts: 0,
        });
        // Winner unknown yet; placeholder choose t1 for bracket progression
        nextRound.push(t1);
      }
    }
    currentTeams = nextRound;
    round += 1;
  }

  return matches;
}
