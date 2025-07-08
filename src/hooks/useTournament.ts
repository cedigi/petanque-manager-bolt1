// @ts-nocheck
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
import {
  createEmptyFinalPhasesB,
  getCurrentBottomTeams,
  initializeCategoryBBracket,
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

  // Fonction pour générer automatiquement les matchs suivants quand on met à jour un score
  const autoGenerateNextMatches = (updatedTournament: Tournament): Tournament => {
    const isPoolTournament = updatedTournament.type === 'doublette-poule' || updatedTournament.type === 'triplette-poule';
    
    if (!isPoolTournament || updatedTournament.pools.length === 0) {
      return updatedTournament;
    }

    const allMatches: Match[] = [...updatedTournament.matches];

    updatedTournament.pools.forEach((pool, poolIndex) => {
      const baseCourt = poolIndex * 2 + 1;
      const poolMatches = allMatches.filter(m => m.poolId === pool.id);
      const poolTeams = pool.teamIds.map(id => updatedTournament.teams.find(t => t.id === id)).filter(Boolean);
      
      if (poolTeams.length === 4) {
        const [team1, team2, team3, team4] = poolTeams;
        
        // Find first round matches
        const match1vs4 = poolMatches.find(m => 
          (m.team1Id === team1!.id && m.team2Id === team4!.id) ||
          (m.team1Id === team4!.id && m.team2Id === team1!.id)
        );
        
        const match2vs3 = poolMatches.find(m => 
          (m.team1Id === team2!.id && m.team2Id === team3!.id) ||
          (m.team1Id === team3!.id && m.team2Id === team2!.id)
        );
        
        // Si les deux matchs du premier tour sont terminés, générer les matchs du deuxième tour
        if (match1vs4?.completed && match2vs3?.completed) {
          // Determine winners and losers
          const getWinner = (match: Match, teamA: Team, teamB: Team) => {
            const isTeamAFirst = match.team1Id === teamA.id;
            const teamAScore = isTeamAFirst ? match.team1Score! : match.team2Score!;
            const teamBScore = isTeamAFirst ? match.team2Score! : match.team1Score!;
            return teamAScore > teamBScore ? teamA : teamB;
          };
          
          const getLoser = (match: Match, teamA: Team, teamB: Team) => {
            const isTeamAFirst = match.team1Id === teamA.id;
            const teamAScore = isTeamAFirst ? match.team1Score! : match.team2Score!;
            const teamBScore = isTeamAFirst ? match.team2Score! : match.team1Score!;
            return teamAScore < teamBScore ? teamA : teamB;
          };
          
          const winner1vs4 = getWinner(match1vs4, team1!, team4!);
          const winner2vs3 = getWinner(match2vs3, team2!, team3!);
          const loser1vs4 = getLoser(match1vs4, team1!, team4!);
          const loser2vs3 = getLoser(match2vs3, team2!, team3!);
          
          // Check if winners match already exists
          const winnersMatchExists = allMatches.some(m => 
            m.poolId === pool.id &&
            ((m.team1Id === winner1vs4.id && m.team2Id === winner2vs3.id) ||
             (m.team1Id === winner2vs3.id && m.team2Id === winner1vs4.id))
          );
          
          // Check if losers match already exists
          const losersMatchExists = allMatches.some(m => 
            m.poolId === pool.id &&
            ((m.team1Id === loser1vs4.id && m.team2Id === loser2vs3.id) ||
             (m.team1Id === loser2vs3.id && m.team2Id === loser1vs4.id))
          );
          
          // Generate winners match (Finale)
          if (!winnersMatchExists) {
            allMatches.push({
              id: generateUuid(),
              round: 2,
              court: baseCourt,
              team1Id: winner1vs4.id,
              team2Id: winner2vs3.id,
              completed: false,
              isBye: false,
              poolId: pool.id,
              battleIntensity: Math.floor(Math.random() * 50) + 25,
              hackingAttempts: 0,
            });
          }
          
          // Generate losers match (Petite finale)
          if (!losersMatchExists) {
            allMatches.push({
              id: generateUuid(),
              round: 2,
              court: baseCourt + 1,
              team1Id: loser1vs4.id,
              team2Id: loser2vs3.id,
              completed: false,
              isBye: false,
              poolId: pool.id,
              battleIntensity: Math.floor(Math.random() * 50) + 25,
              hackingAttempts: 0,
            });
          }
        }

        // Vérifier s'il faut un match de barrage
        const allPoolMatches = allMatches.filter(m => m.poolId === pool.id && m.completed);
        if (allPoolMatches.length >= 3) { // Au moins 3 matchs terminés (2 premiers + 1 du deuxième tour)
          // Calculer les statistiques de chaque équipe
          const teamStats = poolTeams.map(team => {
            const teamMatches = allPoolMatches.filter(m => 
              m.team1Id === team!.id || m.team2Id === team!.id
            );

            let wins = 0;
            teamMatches.forEach(match => {
              const isTeam1 = match.team1Id === team!.id;
              const teamScore = isTeam1 ? match.team1Score! : match.team2Score!;
              const opponentScore = isTeam1 ? match.team2Score! : match.team1Score!;
              
              if (teamScore > opponentScore) wins++;
            });

            return { team: team!, wins, matches: teamMatches.length };
          });

          // Vérifier s'il y a exactement 2 équipes avec 1 victoire chacune
          const teamsWithOneWin = teamStats.filter(stat => stat.wins === 1 && stat.matches >= 2);
          
          if (teamsWithOneWin.length === 2) {
            // Vérifier si le match de barrage n'existe pas déjà
            const barrageExists = allMatches.some(m => 
              m.poolId === pool.id &&
              ((m.team1Id === teamsWithOneWin[0].team.id && m.team2Id === teamsWithOneWin[1].team.id) ||
               (m.team1Id === teamsWithOneWin[1].team.id && m.team2Id === teamsWithOneWin[0].team.id)) &&
              m.round === 3
            );

            if (!barrageExists) {
              allMatches.push({
                id: generateUuid(),
                round: 3,
                court: baseCourt,
                team1Id: teamsWithOneWin[0].team.id,
                team2Id: teamsWithOneWin[1].team.id,
                completed: false,
                isBye: false,
                poolId: pool.id,
                battleIntensity: Math.floor(Math.random() * 50) + 25,
                hackingAttempts: 0,
              });
            }
          }
        }
      } else if (poolTeams.length === 3) {
        // LOGIQUE CORRIGÉE pour les poules de 3 équipes
        const [team1, team2, team3] = poolTeams;
        
        // Trouver le match du premier tour (entre team1 et team2)
        const firstRoundMatch = poolMatches.find(m => 
          m.round === 1 && !m.isBye &&
          ((m.team1Id === team1!.id && m.team2Id === team2!.id) ||
           (m.team1Id === team2!.id && m.team2Id === team1!.id))
        );
        
        // Si le premier match est terminé, générer les matchs de phase 2
        if (firstRoundMatch?.completed) {
          const getWinner = (match: Match, teamA: Team, teamB: Team) => {
            const isTeamAFirst = match.team1Id === teamA.id;
            const teamAScore = isTeamAFirst ? match.team1Score! : match.team2Score!;
            const teamBScore = isTeamAFirst ? match.team2Score! : match.team1Score!;
            return teamAScore > teamBScore ? teamA : teamB;
          };
          
          const getLoser = (match: Match, teamA: Team, teamB: Team) => {
            const isTeamAFirst = match.team1Id === teamA.id;
            const teamAScore = isTeamAFirst ? match.team1Score! : match.team2Score!;
            const teamBScore = isTeamAFirst ? match.team2Score! : match.team1Score!;
            return teamAScore < teamBScore ? teamA : teamB;
          };
          
          const winner = getWinner(firstRoundMatch, team1!, team2!);
          const loser = getLoser(firstRoundMatch, team1!, team2!);
          
          // Match gagnant vs team3 (qui était qualifiée d'office)
          const winnersMatchExists = allMatches.some(m => 
            m.poolId === pool.id && m.round === 2 &&
            ((m.team1Id === winner.id && m.team2Id === team3!.id) ||
             (m.team1Id === team3!.id && m.team2Id === winner.id))
          );
          
          if (!winnersMatchExists) {
            allMatches.push({
              id: generateUuid(),
              round: 2,
              court: baseCourt,
              team1Id: winner.id,
              team2Id: team3!.id,
              completed: false,
              isBye: false,
              poolId: pool.id,
              battleIntensity: Math.floor(Math.random() * 50) + 25,
              hackingAttempts: 0,
            });
          }
          
          // CORRECTION : Le perdant du premier match reçoit automatiquement un BYE (1 victoire)
          const loserByeExists = allMatches.some(m => 
            m.poolId === pool.id && m.round === 2 && m.isBye &&
            m.team1Id === loser.id && m.team2Id === loser.id
          );
          
          if (!loserByeExists) {
            allMatches.push({
              id: generateUuid(),
              round: 2,
              court: 0, // Court 0 = match virtuel
              team1Id: loser.id,
              team2Id: loser.id,
              team1Score: 13,
              team2Score: 0,
              completed: true,
              isBye: true,
              poolId: pool.id,
              battleIntensity: 0,
              hackingAttempts: 0,
            });
          }

          // NOUVEAU : Vérifier s'il faut un barrage dans une poule de 3
          // Si le match final (winner vs team3) est terminé, calculer les statistiques
          const finalMatch = allMatches.find(m => 
            m.poolId === pool.id && m.round === 2 && !m.isBye &&
            ((m.team1Id === winner.id && m.team2Id === team3!.id) ||
             (m.team1Id === team3!.id && m.team2Id === winner.id))
          );

          if (finalMatch?.completed) {
            // Calculer les statistiques de chaque équipe
            const getTeamStats = (team: Team) => {
              const teamMatches = allMatches.filter(m => 
                m.poolId === pool.id && m.completed && !m.isBye && 
                (m.team1Id === team.id || m.team2Id === team.id)
              );

              // CORRECTION : Compter aussi les victoires BYE
              const byeMatches = allMatches.filter(m => 
                m.poolId === pool.id && m.completed && m.isBye && 
                (m.team1Id === team.id || m.team2Id === team.id) &&
                ((m.team1Id === team.id && (m.team1Score || 0) > (m.team2Score || 0)) ||
                 (m.team2Id === team.id && (m.team2Score || 0) > (m.team1Score || 0)))
              );

              let wins = 0;
              teamMatches.forEach(match => {
                const isTeam1 = match.team1Id === team.id;
                const teamScore = isTeam1 ? match.team1Score! : match.team2Score!;
                const opponentScore = isTeam1 ? match.team2Score! : match.team1Score!;
                
                if (teamScore > opponentScore) wins++;
              });

              // Ajouter les victoires BYE
              wins += byeMatches.length;

              return { wins, matches: teamMatches.length + byeMatches.length };
            };

            const team1Stats = getTeamStats(team1!);
            const team2Stats = getTeamStats(team2!);
            const team3Stats = getTeamStats(team3!);

            // Trouver les équipes avec exactement 1 victoire
            const allStats = [
              { team: team1!, ...team1Stats },
              { team: team2!, ...team2Stats },
              { team: team3!, ...team3Stats }
            ];

            const teamsWithOneWin = allStats.filter(stat => stat.wins === 1);

            // S'il y a exactement 2 équipes avec 1 victoire, créer un barrage
            if (teamsWithOneWin.length === 2) {
              const barrageExists = allMatches.some(m => 
                m.poolId === pool.id && m.round === 3 &&
                ((m.team1Id === teamsWithOneWin[0].team.id && m.team2Id === teamsWithOneWin[1].team.id) ||
                 (m.team1Id === teamsWithOneWin[1].team.id && m.team2Id === teamsWithOneWin[0].team.id))
              );

              if (!barrageExists) {
                allMatches.push({
                  id: generateUuid(),
                  round: 3,
                  court: baseCourt,
                  team1Id: teamsWithOneWin[0].team.id,
                  team2Id: teamsWithOneWin[1].team.id,
                  completed: false,
                  isBye: false,
                  poolId: pool.id,
                  battleIntensity: Math.floor(Math.random() * 50) + 25,
                  hackingAttempts: 0,
                });
              }
            }
          }
        }
      }
    });

    let result = {
      ...updatedTournament,
      matches: allMatches,
    };

    // Mettre à jour les phases finales avec les nouvelles équipes qualifiées
    result = updateFinalPhasesWithQualified(result);

    return result;
  };

  const updateMatchScore = (matchId: string, team1Score: number, team2Score: number): void => {
    if (!tournament) return;
    saveTournament(updateMatchScoreLogic(tournament, matchId, team1Score, team2Score));
  };

  const updateMatchCourt = (matchId: string, court: number): void => {
    if (!tournament) return;
    saveTournament(updateMatchCourtLogic(tournament, matchId, court));
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
    updateMatchScore,
    updateMatchCourt,
    resetTournament,
  };
}

