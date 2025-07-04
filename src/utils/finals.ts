import { Match } from '../types/tournament';

export function countEmptySlots(matches: Match[]): number {
  return matches.reduce((acc, m) => {
    if (!m.team1Id) acc += 1;
    if (!m.team2Id) acc += 1;
    return acc;
  }, 0);
}

export function applyByeLogic(matches: Match[], qualifiedCount: number, expectedQualified: number, pendingPoolMatches: number): Match[] {
  const remainingSlots = countEmptySlots(matches);

  if (pendingPoolMatches === 0 && qualifiedCount + remainingSlots >= expectedQualified) {
    return matches.map(match => {
      if (!match.completed && ((match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id))) {
        const solo = match.team1Id || match.team2Id || '';
        return {
          ...match,
          team1Id: solo,
          team2Id: solo,
          team1Score: 13,
          team2Score: 0,
          completed: true,
          isBye: true,
        };
      }
      return match;
    });
  }

  return matches;
}
