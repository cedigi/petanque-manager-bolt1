import { Tournament, TournamentType, Player, Team } from '../types/tournament';
import { generateUuid } from '../utils/uuid';

export function createTournamentData(
  type: TournamentType,
  courts: number,
  preferredPoolSize?: 3 | 4,
): Tournament {
  const defaultName = `Tournoi ${new Date().toLocaleDateString()}`;
  const randomByeDelay = (): number => 2 + Math.floor(Math.random() * 3);
  return {
    id: generateUuid(),
    name: defaultName,
    type,
    courts,
    teams: [],
    matches: [],
    matchesB: [],
    pools: [],
    currentRound: 0,
    completed: false,
    createdAt: new Date(),
    securityLevel: 1,
    networkStatus: 'online',
    poolsGenerated: false,
    preferredPoolSize,
    finalsByeDelayA: randomByeDelay(),
    finalsByeDelayB: randomByeDelay(),
  };
}

export function addTeam(tournament: Tournament, players: Player[]): Tournament {
  const teamNumber = tournament.teams.length + 1;
  const teamName =
    tournament.type === 'melee' || tournament.type === 'tete-a-tete'
      ? `${teamNumber} - ${players[0].name}`
      : `Équipe ${teamNumber}`;

  const team: Team = {
    id: generateUuid(),
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

  return { ...tournament, teams: [...tournament.teams, team] };
}

export function removeTeam(tournament: Tournament, teamId: string): Tournament {
  const updatedTeams = tournament.teams.filter(team => team.id !== teamId);
  const renumberedTeams = updatedTeams.map((team, index) => ({
    ...team,
    name:
      tournament.type === 'melee' || tournament.type === 'tete-a-tete'
        ? `${index + 1} - ${team.players[0].name}`
        : `Équipe ${index + 1}`,
  }));

  return { ...tournament, teams: renumberedTeams, pools: [], poolsGenerated: false };
}

export function updateTeam(
  tournament: Tournament,
  teamId: string,
  players: Player[],
  name?: string,
): Tournament {
  const updatedTeams = tournament.teams.map((team, index) => {
    if (team.id !== teamId) return team;

    const newName =
      name ??
      (tournament.type === 'melee' || tournament.type === 'tete-a-tete'
        ? `${index + 1} - ${players[0].name}`
        : team.name);

    return { ...team, players, name: newName };
  });

  return { ...tournament, teams: updatedTeams };
}
