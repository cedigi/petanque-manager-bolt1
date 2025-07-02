import { useState, useEffect } from 'react';
import { Tournament, TournamentType, Team, Player, Pool } from '../types/tournament';
import { generateMatches } from '../utils/matchmaking';
import { getTopTeamsFromPools, createKnockoutBracket } from '../utils/bracket';

const STORAGE_KEY = 'petanque-tournament';

export function useTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.createdAt = new Date(parsed.createdAt);
      if (!parsed.pools) parsed.pools = [];
      setTournament(parsed);
    }
  }, []);

  const saveTournament = (tournament: Tournament) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
    setTournament(tournament);
  };

  const createTournament = (
    type: TournamentType,
    courts: number,
    pools?: number,
    teamsPerPool?: number,
  ) => {
    const defaultName = `Tournoi ${new Date().toLocaleDateString()}`;
    const newTournament: Tournament = {
      id: crypto.randomUUID(),
      name: defaultName,
      type,
      courts,
      pools,
      teamsPerPool,
      teams: [],
      pools: [],
      matches: [],
      poolStandings: {},
      currentRound: 0,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
      stage: 'pool',
    };
    const autoTypes: TournamentType[] = ['doublette-poule', 'triplette-poule'];
    const finalTournament =
      autoTypes.includes(type)
        ? (createPoolsAutomatically(newTournament) as Tournament)
        : newTournament;
    saveTournament(finalTournament);
  };

  const createPools = (numPools: number) => {
    if (!tournament) return;

    const shuffled = [...tournament.teams].sort(() => Math.random() - 0.5);
    const pools: Pool[] = Array.from({ length: numPools }, (_, i) => ({
      id: String.fromCharCode(65 + i),
      teamIds: [],
    }));

    for (let i = 0; i < shuffled.length; i++) {
      pools[i % numPools].teamIds.push(shuffled[i].id);
    }

    const updatedTournament = { ...tournament, pools };
    saveTournament(updatedTournament);
  };

  const createPoolsAutomatically = (target?: Tournament) => {
    const base = target ?? tournament;
    if (!base) return;

    const shuffled = [...base.teams].sort(() => Math.random() - 0.5);
    if (shuffled.length === 0) return target ? target : undefined;

    let numPools = Math.ceil(shuffled.length / 4);
    if (shuffled.length / numPools < 3) {
      numPools = Math.ceil(shuffled.length / 3);
    }

    const baseSize = Math.floor(shuffled.length / numPools);
    let remainder = shuffled.length % numPools;

    const pools: Pool[] = [];
    const updatedTeams: Team[] = [];
    let index = 0;
    for (let i = 0; i < numPools; i++) {
      const size = baseSize + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      const poolTeams = shuffled.slice(index, index + size);
      const id = String.fromCharCode(65 + i);
      pools.push({ id, teamIds: poolTeams.map(t => t.id) });
      updatedTeams.push(
        ...poolTeams.map(t => ({ ...t, pool: id, poolId: id })),
      );
      index += size;
    }

    const poolStandings = pools.reduce<Record<string, Team[]>>((acc, pool) => {
      acc[pool.id] = updatedTeams.filter(t => t.pool === pool.id);
      return acc;
    }, {});

    const updatedTournament = {
      ...base,
      teams: updatedTeams,
      pools,
      poolStandings,
    };
    if (target) {
      return updatedTournament;
    }
    saveTournament(updatedTournament);
  };

  const startKnockout = (qualifiersPerPool: number) => {
    if (!tournament || !tournament.pools) return;

    const qualifiers = getTopTeamsFromPools(
      tournament.pools,
      tournament.teams,
      qualifiersPerPool
    ).map(team => ({
      ...team,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      performance: 0,
    }));

    const matches = createKnockoutBracket(qualifiers, 1);

    const updatedTournament = {
      ...tournament,
      teams: qualifiers,
      matches,
      currentRound: 1,
      stage: 'knockout',
    };
    saveTournament(updatedTournament);
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

    // Compute standings by pool using updated team stats
    const poolStandings = updatedTeams.reduce<Record<string, Team[]>>((acc, t) => {
      const pool = t.pool ?? 'A';
      if (!acc[pool]) acc[pool] = [];
      acc[pool].push(t);
      return acc;
    }, {});

    Object.keys(poolStandings).forEach(pool => {
      poolStandings[pool].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const diffA = a.pointsFor - a.pointsAgainst;
        const diffB = b.pointsFor - b.pointsAgainst;
        return diffB - diffA;
      });
    });

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
      teams: updatedTeams,
      poolStandings,
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

    const poolStandings = updatedTeams.reduce<Record<string, Team[]>>((acc, t) => {
      const pool = t.pool ?? 'A';
      if (!acc[pool]) acc[pool] = [];
      acc[pool].push(t);
      return acc;
    }, {});
    Object.keys(poolStandings).forEach(pool => {
      poolStandings[pool].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const diffA = a.pointsFor - a.pointsAgainst;
        const diffB = b.pointsFor - b.pointsAgainst;
        return diffB - diffA;
      });
    });

    const updatedTournament = {
      ...tournament,
      matches: remainingMatches,
      teams: updatedTeams,
      poolStandings,
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
    createPools,
    createPoolsAutomatically,
    startKnockout,
    resetTournament,
  };
}