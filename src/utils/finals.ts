import { Match } from '../types/tournament';

export function countEmptySlots(matches: Match[]): number {
  return matches.reduce((acc, m) => {
    if (!m.team1Id) acc += 1;
    if (!m.team2Id) acc += 1;
    return acc;
  }, 0);
}

export function applyByeLogic(matches: Match[], qualifiedCount: number, expectedQualified: number): Match[] {
  if (qualifiedCount < expectedQualified) {
    return matches.map(match => {
      if (!match.isBye && !(match.team1Id && match.team2Id && match.team1Id === match.team2Id)) {
        return match;
      }
      const hasDuplicateTeams =
        match.team1Id && match.team2Id && match.team1Id === match.team2Id;
      return {
        ...match,
        team1Id: hasDuplicateTeams ? match.team1Id : match.team1Id,
        team2Id: hasDuplicateTeams ? '' : match.team2Id,
        team1Score: undefined,
        team2Score: undefined,
        completed: false,
        isBye: false,
      };
    });
  }

  const remainingSlots = countEmptySlots(matches);

  if (qualifiedCount + remainingSlots >= expectedQualified) {
    return matches.map(match => {
      if (!match.completed) {
        if ((match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id)) {
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
      }
      return match;
    });
  }

  return matches;
}
