import { Pool, Team, Match } from '../types/tournament';
import { generateUuid } from './uuid';

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
  // First round - assign BYE to as many teams as needed
  let teamIndex = 0;
  const firstRound: Match[] = [];

  for (let i = 0; i < byesNeeded; i++) {
    const t1 = teams[teamIndex++];
    firstRound.push({
      id: generateUuid(),
      round,
      court: 0,
      team1Id: t1.id,
      team2Id: t1.id,
      team1Score: 13,
      team2Score: 0,
      completed: true,
      isBye: true,
      battleIntensity: 0,
      hackingAttempts: 0,
    });
  }

  for (; teamIndex < teams.length; teamIndex += 2) {
    const t1 = teams[teamIndex];
    const t2 = teams[teamIndex + 1];
    firstRound.push({
      id: generateUuid(),
      round,
      court: 0,
      team1Id: t1.id,
      team2Id: t2.id,
      completed: false,
      isBye: false,
      battleIntensity: 0,
      hackingAttempts: 0,
    });
  }

  matches.push(...firstRound);
  round += 1;

  let previousRound = firstRound;

  while (previousRound.length > 1) {
    const nextMatches: Match[] = [];
    for (let i = 0; i < previousRound.length; i += 2) {
      const m1 = previousRound[i];
      const m2 = previousRound[i + 1];
      const winner1 =
        m1.completed && (m1.team1Score ?? 0) >= (m1.team2Score ?? 0)
          ? m1.team1Id
          : m1.completed
            ? m1.team2Id
            : '';
      const winner2 =
        m2.completed && (m2.team1Score ?? 0) >= (m2.team2Score ?? 0)
          ? m2.team1Id
          : m2.completed
            ? m2.team2Id
            : '';

      nextMatches.push({
        id: generateUuid(),
        round,
        court: 0,
        team1Id: winner1,
        team2Id: winner2,
        completed: false,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      });
    }
    matches.push(...nextMatches);
    previousRound = nextMatches;
    round += 1;
  }

  return matches;
}

// Generate empty bracket for Category B finals starting at round >=200
export function createCategoryBBracket(teamCount: number, startingRound = 200): Match[] {
  const matches: Match[] = [];
  if (teamCount <= 1) return matches;

  const bracketSize = 1 << Math.ceil(Math.log2(teamCount));
  let current = bracketSize;
  let round = startingRound;

  while (current > 1) {
    const matchesInRound = Math.floor(current / 2);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: generateUuid(),
        round,
        court: 0,
        team1Id: '',
        team2Id: '',
        completed: false,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      });
    }
    current = matchesInRound + (current % 2);
    round += 1;
  }

  return matches;
}
