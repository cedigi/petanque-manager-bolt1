import { useState, useEffect } from 'react';
import { Tournament, TournamentType, Player, Match } from '../types/tournament';
import { generateMatches } from '../utils/matchmaking';
import {
  createTournamentData,
  addTeam as addTeamLogic,
  removeTeam as removeTeamLogic,
  updateTeam as updateTeamLogic,
} from './teamManagement';
import {
  generateTournamentPools as generateTournamentPoolsLogic,
  generateRound as generateRoundLogic,
  generateNextPoolMatches,
} from './poolManagement';
import {
  updateMatchScore as updateMatchScoreLogic,
  updateMatchCourt as updateMatchCourtLogic,
  deleteCurrentRound as deleteCurrentRoundLogic,
} from './matchUpdates';
import {
  createEmptyFinalPhasesB,
  getCurrentBottomTeams,
  initializeCategoryBBracket,
  autoGenerateNextMatches,
  updateFinalPhasesWithQualified,
  updateCategoryBPhases,
} from './finalsLogic';
import { calculateOptimalPools } from '../utils/poolGeneration';

const STORAGE_KEY = 'petanque-tournament';

export interface UseTournamentReturn {
  tournament: Tournament | null;
  createTournament: (type: TournamentType, courts: number) => void;
  addTeam: (players: Player[]) => void;
  removeTeam: (teamId: string) => void;
  updateTeam: (teamId: string, players: Player[], name?: string) => void;
  generateTournamentPools: () => void;
  generateRound: () => void;
  deleteCurrentRound: () => void;
  updateMatchScore: (matchId: string, team1Score: number, team2Score: number) => void;
  updateMatchCourt: (matchId: string, court: number) => void;
  deleteCurrentRound: () => void;
  resetTournament: () => void;
}

export function useTournament(): UseTournamentReturn {
  const [tournament, setTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.createdAt = new Date(parsed.createdAt);
        if (!parsed.pools) {
          parsed.pools = [];
          parsed.poolsGenerated = false;
        }
        if (!parsed.matchesB) {
          parsed.matchesB = [];
        }
        setTournament(parsed);
      } catch (e) {
        console.warn('Failed to parse saved tournament:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const saveTournament = (t: Tournament): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    setTournament(t);
  };

  const createTournament = (type: TournamentType, courts: number): void => {
    const newTournament = createTournamentData(type, courts);
    saveTournament(newTournament);
  };

  const addTeam = (players: Player[]): void => {
    if (!tournament) return;
    saveTournament(addTeamLogic(tournament, players));
  };

  const removeTeam = (teamId: string): void => {
    if (!tournament) return;
    saveTournament(removeTeamLogic(tournament, teamId));
  };

  const updateTeam = (teamId: string, players: Player[], name?: string): void => {
    if (!tournament) return;
    saveTournament(updateTeamLogic(tournament, teamId, players, name));
  };

  const generateTournamentPools = (): void => {
    if (!tournament) return;
    saveTournament(generateTournamentPoolsLogic(tournament));
  };

  const generateRound = (): void => {
    if (!tournament) return;
    let updated = tournament;
    const isPool =
      tournament.type === 'doublette-poule' || tournament.type === 'triplette-poule';
    if (isPool) {
      updated = generateRoundLogic(tournament);
    } else {
      const newMatches = generateMatches(tournament);
      updated = {
        ...tournament,
        matches: [...tournament.matches, ...newMatches],
        currentRound: tournament.currentRound + 1,
      };
    }

    const t = updated;
    const bottomTeams = getCurrentBottomTeams(t);
    const bottomIds = new Set(bottomTeams.map(bt => bt.id));
    const { poolsOf4, poolsOf3 } = calculateOptimalPools(t.teams.length);
    const expectedQualified = (poolsOf4 + poolsOf3) * 2;
    const bottomCount = t.teams.length - expectedQualified;

    if (bottomTeams.length === t.teams.length || bottomCount <= 1) {
      saveTournament(t);
      return;
    }

    let matchesB = t.matchesB;
    if (matchesB.length === 0) {
      matchesB = createEmptyFinalPhasesB(t.teams.length, t.courts, t.pools.length * 2 + 1);
    }

    matchesB = matchesB.map(match => {
      let changed = false;
      let { team1Id, team2Id } = match;

      if (team1Id && !bottomIds.has(team1Id)) {
        team1Id = '';
        changed = true;
      }
      if (team2Id && !bottomIds.has(team2Id)) {
        team2Id = '';
        changed = true;
      }

      return changed
        ? {
            ...match,
            team1Id,
            team2Id,
            team1Score: undefined,
            team2Score: undefined,
            completed: false,
            isBye: false,
          }
        : match;
    });

    const firstRound = matchesB.filter(m => m.round === 200);
    const bracketSize = 1 << Math.ceil(Math.log2(bottomCount));
    const byesNeeded = bracketSize - bottomCount;

    const sortedTeams = [...bottomTeams];
    let teamIdx = 0;

    for (let i = 0; i < firstRound.length; i++) {
      const match = firstRound[i];
      if (teamIdx < byesNeeded) {
        const team = sortedTeams[teamIdx++];
        firstRound[i] = {
          ...match,
          team1Id: team ? team.id : '',
          team2Id: team ? team.id : '',
          team1Score: 13,
          team2Score: 0,
          completed: true,
          isBye: true,
        } as Match;
      } else {
        const t1 = sortedTeams[teamIdx++];
        const t2 = sortedTeams[teamIdx++];
        firstRound[i] = {
          ...match,
          team1Id: t1 ? t1.id : '',
          team2Id: t2 ? t2.id : '',
          team1Score: undefined,
          team2Score: undefined,
          completed: false,
          isBye: false,
        } as Match;
      }
    }

    const others = matchesB.filter(m => m.round > 200);
    const propagated = initializeCategoryBBracket(
      t,
      firstRound,
      others,
      bottomTeams,
      bottomCount,
    );
    saveTournament({ ...t, matchesB: propagated });
  };

  const deleteCurrentRound = (): void => {
    if (!tournament) return;
    if (tournament.currentRound === 0) return;
    const roundToDelete = tournament.currentRound;
    const remaining = tournament.matches.filter(m => m.round !== roundToDelete);
    saveTournament({ ...tournament, matches: remaining, currentRound: roundToDelete - 1 });
  };

  const updateMatchScore = (matchId: string, team1Score: number, team2Score: number): void => {
    if (!tournament) return;
    const updated = updateMatchScoreLogic(tournament, matchId, team1Score, team2Score);
    const auto = autoGenerateNextMatches(updated);
    saveTournament(auto);
  };

  const updateMatchCourt = (matchId: string, court: number): void => {
    if (!tournament) return;
    saveTournament(updateMatchCourtLogic(tournament, matchId, court));
  };

  const deleteCurrentRound = (): void => {
    if (!tournament) return;
        codex/extract-helper-computeteamstats
    const updated = deleteCurrentRoundLogic(tournament);

    const roundToDelete = tournament.currentRound;
    if (roundToDelete <= 0) return;

    let updated: Tournament = {
      ...tournament,
      matches: tournament.matches.filter(m => m.round !== roundToDelete),
      matchesB: tournament.matchesB.filter(m => m.round !== roundToDelete),
      currentRound: Math.max(0, roundToDelete - 1),
    };

    if (roundToDelete === 1) {
      const newMatches = generateMatches(updated);
      updated = {
        ...updated,
        matches: [...updated.matches, ...newMatches],
        currentRound: 1,
      };
    }

    const allMatches = [...updated.matches, ...updated.matchesB];
    const updatedTeams = updated.teams.map(team => {
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

    updated = { ...updated, teams: updatedTeams };
    const nextMatches = generateNextPoolMatches(updated);
    updated = { ...updated, matches: nextMatches };
    updated = updateFinalPhasesWithQualified(updated);
    updated = updateCategoryBPhases(updated);
        main
    const auto = autoGenerateNextMatches(updated);
    saveTournament(auto);
  };

  const resetTournament = (): void => {
    localStorage.removeItem(STORAGE_KEY);
    setTournament(null);
  };

  return {
    tournament,
    createTournament,
    addTeam,
    removeTeam,
    updateTeam,
    generateTournamentPools,
    generateRound,
    deleteCurrentRound,
    updateMatchScore,
    updateMatchCourt,
    deleteCurrentRound,
    resetTournament,
  };
}

