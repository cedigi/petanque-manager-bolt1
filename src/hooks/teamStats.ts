import { Tournament, Match, Team } from '../types/tournament';

export function computeTeamStats(tournament: Tournament, matches?: Match[]): Team[] {
  const allMatches = matches ?? [...tournament.matches, ...tournament.matchesB];

  return tournament.teams.map(team => {
    const teamMatches = allMatches.filter(
      match =>
        match.completed &&
        (match.team1Id === team.id ||
          match.team2Id === team.id ||
          (match.team1Ids && match.team1Ids.includes(team.id)) ||
          (match.team2Ids && match.team2Ids.includes(team.id)))
    );

    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;

    teamMatches.forEach(match => {
      if (match.isBye && (match.team1Id === team.id || match.team2Id === team.id)) {
        wins += 1;
        pointsFor += 13;
        pointsAgainst += 7;
        return;
      }
      const isTeam1 =
        match.team1Id === team.id || (match.team1Ids && match.team1Ids.includes(team.id));
      const isTeam2 =
        match.team2Id === team.id || (match.team2Ids && match.team2Ids.includes(team.id));

      if (isTeam1) {
        pointsFor += match.team1Score || 0;
        pointsAgainst += match.team2Score || 0;
        if ((match.team1Score || 0) > (match.team2Score || 0)) {
          wins += 1;
        } else {
          losses += 1;
        }
      } else if (isTeam2) {
        pointsFor += match.team2Score || 0;
        pointsAgainst += match.team1Score || 0;
        if ((match.team2Score || 0) > (match.team1Score || 0)) {
          wins += 1;
        } else {
          losses += 1;
        }
      }
    });

    return {
      ...team,
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      performance: pointsFor - pointsAgainst,
    };
  });
}
