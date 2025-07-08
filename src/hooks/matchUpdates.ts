import { Tournament, Match } from '../types/tournament';
import {
  updateFinalPhasesWithQualified,
  updateCategoryBPhases,
} from './finalsLogic';
import { generateNextPoolMatches } from './poolManagement';
import { computeTeamStats } from './teamStats';

export function updateMatchScore(
  tournament: Tournament,
  matchId: string,
  team1Score: number,
  team2Score: number,
): Tournament {
  const updatedMatches = [...tournament.matches];
  const updatedMatchesB = [...tournament.matchesB];

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
  const updatedTeams = computeTeamStats(
    { ...tournament, matches: updatedMatches, matchesB: updatedMatchesB },
    allMatches,
  );

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

export function deleteCurrentRound(tournament: Tournament): Tournament {
  const roundToDelete = tournament.currentRound;
  const updatedMatches = tournament.matches.filter(m => m.round !== roundToDelete);
  const updatedMatchesB = tournament.matchesB.filter(m => m.round !== roundToDelete);

  const allMatches = [...updatedMatches, ...updatedMatchesB];
  const updatedTeams = computeTeamStats(
    { ...tournament, matches: updatedMatches, matchesB: updatedMatchesB },
    allMatches,
  );

  let updatedTournament: Tournament = {
    ...tournament,
    matches: updatedMatches,
    matchesB: updatedMatchesB,
    teams: updatedTeams,
    currentRound: Math.max(0, tournament.currentRound - 1),
  };

  const nextMatches = generateNextPoolMatches(updatedTournament);
  updatedTournament = { ...updatedTournament, matches: nextMatches };
  updatedTournament = updateFinalPhasesWithQualified(updatedTournament);
  updatedTournament = updateCategoryBPhases(updatedTournament);
  return updatedTournament;
}

export function deleteRound(tournament: Tournament, round: number): Tournament {
  const updatedMatches = tournament.matches.filter(m => m.round !== round);
  const updatedMatchesB = tournament.matchesB.filter(m => m.round !== round);

  const allMatches = [...updatedMatches, ...updatedMatchesB];
  const updatedTeams = computeTeamStats(
    { ...tournament, matches: updatedMatches, matchesB: updatedMatchesB },
    allMatches,
  );

  const mainRounds = updatedMatches.filter(m => m.round < 100).map(m => m.round);
  const maxRound = mainRounds.length > 0 ? Math.max(...mainRounds) : 0;

  let updatedTournament: Tournament = {
    ...tournament,
    matches: updatedMatches,
    matchesB: updatedMatchesB,
    teams: updatedTeams,
    currentRound: maxRound,
  };

  const nextMatches = generateNextPoolMatches(updatedTournament);
  updatedTournament = { ...updatedTournament, matches: nextMatches };
  updatedTournament = updateFinalPhasesWithQualified(updatedTournament);
  updatedTournament = updateCategoryBPhases(updatedTournament);
  return updatedTournament;
}

