import { Tournament, Match } from '../types/tournament';
import {
  updateFinalPhasesWithQualified,
  updateCategoryBPhases,
} from './finalsLogic';
import { generateNextPoolMatches } from './poolManagement';

export function updateMatchScore(
  tournament: Tournament,
  matchId: string,
  team1Score: number,
  team2Score: number,
): Tournament {
  let updatedMatches = [...tournament.matches];
  let updatedMatchesB = [...tournament.matchesB];

  const idxA = updatedMatches.findIndex(m => m.id === matchId);
  const idxB = updatedMatchesB.findIndex(m => m.id === matchId);

  if (idxA !== -1) {
    updatedMatches[idxA] = {
      ...updatedMatches[idxA],
      team1Score,
      team2Score,
      completed: true,
      battleIntensity: 50,
      hackingAttempts: 0,
    } as Match;
  } else if (idxB !== -1) {
    updatedMatchesB[idxB] = {
      ...updatedMatchesB[idxB],
      team1Score,
      team2Score,
      completed: true,
      battleIntensity: 50,
      hackingAttempts: 0,
    } as Match;
  } else {
    return tournament;
  }

  const allMatches = [...updatedMatches, ...updatedMatchesB];
  const updatedTeams = tournament.teams.map(team => {
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
      const isTeam1 = match.team1Id === team.id || (match.team1Ids && match.team1Ids.includes(team.id));
      const isTeam2 = match.team2Id === team.id || (match.team2Ids && match.team2Ids.includes(team.id));

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

  let updatedTournament: Tournament = {
    ...tournament,
    matches: updatedMatches,
    matchesB: updatedMatchesB,
    teams: updatedTeams,
  };

  const nextMatches = generateNextPoolMatches(updatedTournament);
  updatedTournament = { ...updatedTournament, matches: nextMatches };
  updatedTournament = updateFinalPhasesWithQualified(updatedTournament);
  updatedTournament = updateCategoryBPhases(updatedTournament);
  return updatedTournament;
}

export function updateMatchCourt(tournament: Tournament, matchId: string, court: number): Tournament {
  const updatedMatches = [...tournament.matches];
  const updatedMatchesB = [...tournament.matchesB];

  const idxA = updatedMatches.findIndex(m => m.id === matchId);
  const idxB = updatedMatchesB.findIndex(m => m.id === matchId);

  if (idxA !== -1) {
    updatedMatches[idxA] = { ...updatedMatches[idxA], court };
  } else if (idxB !== -1) {
    updatedMatchesB[idxB] = { ...updatedMatchesB[idxB], court };
  } else {
    return tournament;
  }

  return { ...tournament, matches: updatedMatches, matchesB: updatedMatchesB };
}

