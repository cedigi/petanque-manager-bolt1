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
} from './poolManagement';
import {
  updateMatchScore as updateMatchScoreLogic,
  updateMatchCourt as updateMatchCourtLogic,
  deleteCurrentRound as deleteCurrentRoundLogic,
  deleteRound as deleteRoundLogic,
} from './matchUpdates';
import {
  createEmptyFinalPhasesB,
  getCurrentBottomTeams,
  initializeCategoryBBracket,
  autoGenerateNextMatches,
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
  deleteRound: (round: number) => void;
  updateMatchScore: (matchId: string, team1Score: number, team2Score: number) => void;
  updateMatchCourt: (matchId: string, court: number) => void;
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
    const updated = deleteCurrentRoundLogic(tournament);
    const auto = autoGenerateNextMatches(updated);
    saveTournament(auto);
  };

  const deleteRound = (round: number): void => {
    if (!tournament) return;
    const updated = deleteRoundLogic(tournament, round);
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
    deleteRound,
    updateMatchScore,
    updateMatchCourt,
    resetTournament,
  };
}

