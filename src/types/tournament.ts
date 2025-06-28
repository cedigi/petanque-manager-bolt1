export type TournamentType = 'tete-a-tete' | 'doublette' | 'triplette' | 'quadrette' | 'melee';

export interface Player {
  id: string;
  name: string;
  label?: string; // For quadrette (A, B, C, D)
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  performance: number; // Point differential
}

export interface Match {
  id: string;
  round: number;
  court: number;
  team1Id: string;
  team2Id: string;
  /**
   * When matches are generated for formats that group players on the fly
   * (such as "mêlée"), the player identifiers for each side are stored in
   * these arrays. They remain optional so that standard formats using
   * permanent teams can continue relying on `team1Id` and `team2Id` only.
   */
  team1Ids?: string[];
  team2Ids?: string[];
  team1Score?: number;
  team2Score?: number;
  completed: boolean;
  isBye: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  courts: number;
  teams: Team[];
  matches: Match[];
  currentRound: number;
  completed: boolean;
  createdAt: Date;
}
