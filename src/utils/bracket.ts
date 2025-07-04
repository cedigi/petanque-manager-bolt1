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
  const matches: Match[] = [];
  if (teams.length === 0) return matches;

  // Determine the next power of two to know how many BYEs are needed
  const bracketSize = 1 << Math.ceil(Math.log2(teams.length));
  const byesNeeded = bracketSize - teams.length;

  let round = startingRound;
  const nextRound: Team[] = [];

  // First round - assign BYE to as many teams as needed
  let teamIndex = 0;
  for (let i = 0; i < byesNeeded; i++) {
    const t1 = teams[teamIndex++];
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
  }

  for (; teamIndex < teams.length; teamIndex += 2) {
    const t1 = teams[teamIndex];
    const t2 = teams[teamIndex + 1];
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
    nextRound.push(t1);
  }

  round += 1;
  let currentTeams = nextRound;

  while (currentTeams.length > 1) {
    const followingRound: Team[] = [];
    for (let i = 0; i < currentTeams.length; i += 2) {
      const t1 = currentTeams[i];
      const t2 = currentTeams[i + 1];
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
      followingRound.push(t1);
    }
    currentTeams = followingRound;
    round += 1;
  }

  return matches;
}
