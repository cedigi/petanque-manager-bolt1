import { useState, useEffect } from 'react';
import { Tournament, TournamentType, Team, Player } from '../types/tournament';
import { generateMatches } from '../utils/matchmaking';

const STORAGE_KEY = 'petanque-tournament';

export function useTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.createdAt = new Date(parsed.createdAt);
      setTournament(parsed);
    }
  }, []);

  const saveTournament = (tournament: Tournament) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
    setTournament(tournament);
  };

  const createTournament = (type: TournamentType, courts: number) => {
    const defaultName = `Tournoi ${new Date().toLocaleDateString()}`;
    const newTournament: Tournament = {
      id: crypto.randomUUID(),
      name: defaultName,
      type,
      courts,
      teams: [],
      matches: [],
      currentRound: 0,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
    };
    saveTournament(newTournament);
  };

  const addTeam = (players: Player[]) => {
    if (!tournament) return;

    const teamNumber = tournament.teams.length + 1;
    const teamName =
      tournament.type === 'melee' || tournament.type === 'tete-a-tete'
        ? `${teamNumber}: ${players[0].name}`
        : `Équipe ${teamNumber}`;

    const team: Team = {
      id: crypto.randomUUID(),
      name: teamName,
      players,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      performance: 0,
      teamRating: 100,
      synchroLevel: 100,
    };

    const updatedTournament = {
      ...tournament,
      teams: [...tournament.teams, team],
    };
    saveTournament(updatedTournament);
  };

  const removeTeam = (teamId: string) => {
    if (!tournament) return;

    const updatedTeams = tournament.teams.filter(team => team.id !== teamId);
    // Renumber teams
    const renumberedTeams = updatedTeams.map((team, index) => ({
      ...team,
      name:
        tournament.type === 'melee' || tournament.type === 'tete-a-tete'
          ? `${index + 1}: ${team.players[0].name}`
          : `Équipe ${index + 1}`,
    }));

    const updatedTournament = {
      ...tournament,
      teams: renumberedTeams,
    };
    saveTournament(updatedTournament);
  };

  const generateRound = () => {
    if (!tournament) return;

    const newMatches = generateMatches(tournament);
    const updatedTournament = {
      ...tournament,
      matches: [...tournament.matches, ...newMatches],
      currentRound: tournament.currentRound + 1,
    };
    saveTournament(updatedTournament);
  };

  const updateMatchScore = (matchId: string, team1Score: number, team2Score: number) => {
    if (!tournament) return;

    const updatedMatches = tournament.matches.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          team1Score,
          team2Score,
          completed: true,
          battleIntensity: 50,
          hackingAttempts: 0,
        };
      }
      return match;
    });

    // Update team statistics
    const updatedTeams = tournament.teams.map(team => {
      const teamMatches = updatedMatches.filter(
        match =>
          match.completed &&
          (
            match.team1Id === team.id ||
            match.team2Id === team.id ||
            (match.team1Ids && match.team1Ids.includes(team.id)) ||
            (match.team2Ids && match.team2Ids.includes(team.id))
          )
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

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
      teams: updatedTeams,
    };
    saveTournament(updatedTournament);
  };

  const updateMatchCourt = (matchId: string, court: number) => {
    if (!tournament) return;

    const updatedMatches = tournament.matches.map(match => {
      if (match.id === matchId) {
        return { ...match, court };
      }
      return match;
    });

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
    };
    saveTournament(updatedTournament);
  };

  const deleteRound = (round: number) => {
    if (!tournament) return;

    const remainingMatches = tournament.matches.filter(
      match => match.round !== round
    );

    const updatedTeams = tournament.teams.map(team => {
      const teamMatches = remainingMatches.filter(
        match =>
          match.completed &&
          (
            match.team1Id === team.id ||
            match.team2Id === team.id ||
            (match.team1Ids && match.team1Ids.includes(team.id)) ||
            (match.team2Ids && match.team2Ids.includes(team.id))
          )
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

    const remainingRounds = remainingMatches.map(m => m.round);
    const currentRound = remainingRounds.length ? Math.max(...remainingRounds) : 0;

    const updatedTournament = {
      ...tournament,
      matches: remainingMatches,
      teams: updatedTeams,
      currentRound,
    };
    saveTournament(updatedTournament);
  };

  const updateTeam = (teamId: string, players: Player[]) => {
    if (!tournament) return;

    const updatedTeams = tournament.teams.map((team, idx) => {
      if (team.id === teamId) {
        const name =
          tournament.type === 'melee' || tournament.type === 'tete-a-tete'
            ? `${idx + 1}: ${players[0].name}`
            : team.name;
        return { ...team, name, players };
      }
      return team;
    });

    const updatedTournament = {
      ...tournament,
      teams: updatedTeams,
    };
    saveTournament(updatedTournament);
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
    generateRound,
    updateMatchScore,
    updateMatchCourt,
    deleteRound,
    updateTeam,
    resetTournament,
  };
}