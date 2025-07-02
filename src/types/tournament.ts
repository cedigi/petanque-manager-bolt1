export type TournamentType = 'tete-a-tete' | 'doublette' | 'triplette' | 'quadrette' | 'melee';

export interface CyberImplant {
  id: string;
  name: string;
  type: 'neural' | 'ocular' | 'motor' | 'tactical';
  level: number;
  boost: number;
  description: string;
  color: string;
}

export interface Player {
  id: string;
  name: string;
  label?: string;
  cyberImplants: CyberImplant[];
  neuralScore: number;
  combatRating: number;
  hackingLevel: number;
  augmentationLevel: number;
}

export interface Team {
  id: string;
  name: string;
  /** Pool identifier (e.g. "A", "B" ...) */
  pool?: string;
  players: Player[];
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  performance: number;
  teamRating: number;
  synchroLevel: number;
}

export interface Match {
  id: string;
  round: number;
  court: number;
  team1Id: string;
  team2Id: string;
  team1Ids?: string[];
  team2Ids?: string[];
  team1Score?: number;
  team2Score?: number;
  completed: boolean;
  isBye: boolean;
  battleIntensity: number;
  hackingAttempts: number;
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  courts: number;
  teams: Team[];
  matches: Match[];
  /** Standings grouped by pool */
  poolStandings?: Record<string, Team[]>;
  currentRound: number;
  completed: boolean;
  createdAt: Date;
  securityLevel: number;
  networkStatus: 'online' | 'offline' | 'compromised';
}