import { Tournament, Match, Team } from '../types/tournament';

export function computeTeamStats(tournament: Tournament, matches?: Match[]): Team[] {
  const combinedMatches = matches ?? [...tournament.matches, ...tournament.matchesB];
  const matchesWithIndex = combinedMatches.map((match, insertionIndex) => ({
    match,
    insertionIndex,
  }));

  return tournament.teams.map(team => {
    const teamMatches = matchesWithIndex.filter(({ match }) =>
      match.completed &&
      (match.team1Id === team.id ||
        match.team2Id === team.id ||
        (match.team1Ids && match.team1Ids.includes(team.id)) ||
        (match.team2Ids && match.team2Ids.includes(team.id)))
    );

    teamMatches.sort((a, b) => {
      if (a.match.round !== b.match.round) {
        return a.match.round - b.match.round;
      }
      return a.insertionIndex - b.insertionIndex;
    });

    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    const tieBreakDeltas: number[] = [];

    teamMatches.forEach(({ match }) => {
      const isTeam1 =
        match.team1Id === team.id || (match.team1Ids && match.team1Ids.includes(team.id));
      const isTeam2 =
        match.team2Id === team.id || (match.team2Ids && match.team2Ids.includes(team.id));

      if (match.isBye && (isTeam1 || isTeam2)) {
        wins += 1;
        pointsFor += 13;
        pointsAgainst += 7;
        tieBreakDeltas.push(13 - 7);
        return;
      }

      if (isTeam1 || isTeam2) {
        const teamScore = isTeam1 ? match.team1Score ?? 0 : match.team2Score ?? 0;
        const opponentScore = isTeam1 ? match.team2Score ?? 0 : match.team1Score ?? 0;

        pointsFor += teamScore;
        pointsAgainst += opponentScore;
        if (teamScore > opponentScore) {
          wins += 1;
        } else {
          losses += 1;
        }
        tieBreakDeltas.push(teamScore - opponentScore);
      }
    });

    return {
      ...team,
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      performance: pointsFor - pointsAgainst,
      tieBreakDeltas,
    };
  });
}
