import { useState, useEffect } from 'react';
import { Tournament, TournamentType, Player } from '../types/tournament';
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
} from './matchUpdates';

const STORAGE_KEY = 'petanque-tournament';

export function useTournament() {
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

  const saveTournament = (t: Tournament) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    setTournament(t);
  };

  const createTournament = (type: TournamentType, courts: number) => {
    const newTournament = createTournamentData(type, courts);
    saveTournament(newTournament);
  };

  const addTeam = (players: Player[]) => {
    if (!tournament) return;
    saveTournament(addTeamLogic(tournament, players));
  };

  const removeTeam = (teamId: string) => {
    if (!tournament) return;
    saveTournament(removeTeamLogic(tournament, teamId));
  };

  const updateTeam = (teamId: string, players: Player[], name?: string) => {
    if (!tournament) return;
    saveTournament(updateTeamLogic(tournament, teamId, players, name));
  };

  const generateTournamentPools = () => {
    if (!tournament) return;
    saveTournament(generateTournamentPoolsLogic(tournament));
  };

  const generateRound = () => {
    if (!tournament) return;
    const isPool =
      tournament.type === 'doublette-poule' || tournament.type === 'triplette-poule';
    if (isPool) {
      saveTournament(generateRoundLogic(tournament));
    } else {
      const newMatches = generateMatches(tournament);
      saveTournament({
        ...tournament,
        matches: [...tournament.matches, ...newMatches],
        currentRound: tournament.currentRound + 1,
      });
    }
  };

  const updateMatchScore = (matchId: string, team1Score: number, team2Score: number) => {
    if (!tournament) return;
    saveTournament(updateMatchScoreLogic(tournament, matchId, team1Score, team2Score));
  };

  const updateMatchCourt = (matchId: string, court: number) => {
    if (!tournament) return;
    saveTournament(updateMatchCourtLogic(tournament, matchId, court));
  };

  const resetTournament = () => {
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
    updateMatchScore,
    updateMatchCourt,
    resetTournament,
  };
}

