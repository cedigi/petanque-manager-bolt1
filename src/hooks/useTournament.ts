import { useState, useEffect } from 'react';
import { Tournament, TournamentType, Team, Player, Match } from '../types/tournament';
import { generateMatches } from '../utils/matchmaking';
import { generatePools, calculateOptimalPools } from '../utils/poolGeneration';
import { applyByeLogic } from '../utils/finals';

const STORAGE_KEY = 'petanque-tournament';

export function useTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.createdAt = new Date(parsed.createdAt);
      // Ensure pools array exists for backward compatibility
      if (!parsed.pools) {
        parsed.pools = [];
        parsed.poolsGenerated = false;
      }
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
      pools: [],
      currentRound: 0,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
      poolsGenerated: false,
    };
    saveTournament(newTournament);
  };

  const addTeam = (players: Player[]) => {
    if (!tournament) return;

    const teamNumber = tournament.teams.length + 1;
    const teamName =
      tournament.type === 'melee' || tournament.type === 'tete-a-tete'
        ? `${teamNumber} - ${players[0].name}`
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
          ? `${index + 1} - ${team.players[0].name}`
          : `Équipe ${index + 1}`,
    }));

    const updatedTournament = {
      ...tournament,
      teams: renumberedTeams,
      // Reset pools if teams change
      pools: [],
      poolsGenerated: false,
    };
    saveTournament(updatedTournament);
  };

  const generateTournamentPools = () => {
    if (!tournament) return;

    const pools = generatePools(tournament.teams);
    
    // Assign pool IDs to teams
    const updatedTeams = tournament.teams.map(team => {
      const pool = pools.find(p => p.teamIds.includes(team.id));
      return {
        ...team,
        poolId: pool?.id
      };
    });

    // Generate initial matches for each pool
    const allMatches: Match[] = [];
    let courtIndex = 1;
    
    pools.forEach(pool => {
      const poolTeams = pool.teamIds.map(id => tournament.teams.find(t => t.id === id)).filter(Boolean);
      
      if (poolTeams.length === 4) {
        const [team1, team2, team3, team4] = poolTeams;
        
        // Match 1 vs 4
        allMatches.push({
          id: crypto.randomUUID(),
          round: 1,
          court: courtIndex,
          team1Id: team1!.id,
          team2Id: team4!.id,
          completed: false,
          isBye: false,
          poolId: pool.id,
          battleIntensity: Math.floor(Math.random() * 50) + 25,
          hackingAttempts: 0,
        });
        
        courtIndex = (courtIndex % tournament.courts) + 1;
        
        // Match 2 vs 3
        allMatches.push({
          id: crypto.randomUUID(),
          round: 1,
          court: courtIndex,
          team1Id: team2!.id,
          team2Id: team3!.id,
          completed: false,
          isBye: false,
          poolId: pool.id,
          battleIntensity: Math.floor(Math.random() * 50) + 25,
          hackingAttempts: 0,
        });
        
        courtIndex = (courtIndex % tournament.courts) + 1;
      } else if (poolTeams.length === 3) {
        // Pour une poule de 3 : créer un seul match entre 2 équipes
        // La 3ème équipe reçoit un BYE automatique mais n'est PAS encore qualifiée
        const [team1, team2, team3] = poolTeams;
        
        // Match entre les 2 premières équipes
        allMatches.push({
          id: crypto.randomUUID(),
          round: 1,
          court: courtIndex,
          team1Id: team1!.id,
          team2Id: team2!.id,
          completed: false,
          isBye: false,
          poolId: pool.id,
          battleIntensity: Math.floor(Math.random() * 50) + 25,
          hackingAttempts: 0,
        });
        
        courtIndex = (courtIndex % tournament.courts) + 1;
        
        // L'équipe 3 reçoit un BYE automatique (1 victoire) mais doit encore jouer
        allMatches.push({
          id: crypto.randomUUID(),
          round: 1,
          court: 0, // Court 0 = match virtuel
          team1Id: team3!.id,
          team2Id: team3!.id,
          team1Score: 13,
          team2Score: 0,
          completed: true,
          isBye: true,
          poolId: pool.id,
          battleIntensity: 0,
          hackingAttempts: 0,
        });
      }
    });

    // Créer immédiatement les cadres vides des phases finales
    const finalPhasesMatches = createEmptyFinalPhases(tournament.teams.length, tournament.courts);

    const updatedTournament = {
      ...tournament,
      teams: updatedTeams,
      pools,
      matches: [...allMatches, ...finalPhasesMatches],
      poolsGenerated: true,
      currentRound: 1,
    };
    saveTournament(updatedTournament);
  };

  // Nouvelle fonction pour créer les cadres vides des phases finales
  const createEmptyFinalPhases = (totalTeams: number, courts: number) => {
    const matches: Match[] = [];

    // Calculer le nombre d'équipes qualifiées attendues
    const { poolsOf4, poolsOf3 } = calculateOptimalPools(totalTeams);
    const expectedQualified = (poolsOf4 + poolsOf3) * 2;

    // Taille du tableau : puissance de deux immédiatement supérieure
    const bracketSize = 1 << Math.ceil(Math.log2(expectedQualified));

    // Créer les phases nécessaires
    let currentTeamCount = bracketSize;
    let round = 100; // 100+ pour les phases finales
    let courtIndex = 1;

    while (currentTeamCount > 1) {
      const matchesInRound = Math.floor(currentTeamCount / 2);
      
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: crypto.randomUUID(),
          round,
          court: courtIndex,
          team1Id: '', // Vide au début
          team2Id: '', // Vide au début
          completed: false,
          isBye: false,
          battleIntensity: 0,
          hackingAttempts: 0,
        });
        
        courtIndex = (courtIndex % courts) + 1;
      }
      
      currentTeamCount = matchesInRound + (currentTeamCount % 2); // +1 si nombre impair
      round++;
    }
    
    return matches;
  };

  const generateRound = () => {
    if (!tournament) return;

    const isPoolTournament = tournament.type === 'doublette-poule' || tournament.type === 'triplette-poule';
    
    if (isPoolTournament && tournament.pools.length > 0) {
      // Generate second round matches (winners vs winners, losers vs losers)
      const allMatches: Match[] = [...tournament.matches];
      let courtIndex = 1;
      
      tournament.pools.forEach(pool => {
        const poolMatches = tournament.matches.filter(m => m.poolId === pool.id);
        const poolTeams = pool.teamIds.map(id => tournament.teams.find(t => t.id === id)).filter(Boolean);
        
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
          
          // Only generate second round if first round is complete
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
            
            // Generate winners match
            if (!winnersMatchExists) {
              allMatches.push({
                id: crypto.randomUUID(),
                round: 2,
                court: courtIndex,
                team1Id: winner1vs4.id,
                team2Id: winner2vs3.id,
                completed: false,
                isBye: false,
                poolId: pool.id,
                battleIntensity: Math.floor(Math.random() * 50) + 25,
                hackingAttempts: 0,
              });
              
              courtIndex = (courtIndex % tournament.courts) + 1;
            }
            
            // Generate losers match
            if (!losersMatchExists) {
              allMatches.push({
                id: crypto.randomUUID(),
                round: 2,
                court: courtIndex,
                team1Id: loser1vs4.id,
                team2Id: loser2vs3.id,
                completed: false,
                isBye: false,
                poolId: pool.id,
                battleIntensity: Math.floor(Math.random() * 50) + 25,
                hackingAttempts: 0,
              });
              
              courtIndex = (courtIndex % tournament.courts) + 1;
            }
          }
        }
      });

      const updatedTournament = {
        ...tournament,
        matches: allMatches,
      };
      saveTournament(updatedTournament);
    } else {
      // Standard tournament logic
      const newMatches = generateMatches(tournament);
      const updatedTournament = {
        ...tournament,
        matches: [...tournament.matches, ...newMatches],
        currentRound: tournament.currentRound + 1,
      };
      saveTournament(updatedTournament);
    }
  };

  // Fonction pour placer progressivement les équipes qualifiées dans les phases finales - CORRIGÉE
  const updateFinalPhasesWithQualified = (updatedTournament: Tournament) => {
    const isPoolTournament = updatedTournament.type === 'doublette-poule' || updatedTournament.type === 'triplette-poule';
    
    if (!isPoolTournament || updatedTournament.pools.length === 0) {
      return updatedTournament;
    }

    // Obtenir les équipes qualifiées actuelles (avec 2 victoires)
    const qualifiedTeams = getCurrentQualifiedTeams(updatedTournament);

    // Calculer le nombre d'équipes qualifiées attendues comme dans createEmptyFinalPhases
    const totalTeams = updatedTournament.teams.length;
    const { poolsOf4, poolsOf3 } = calculateOptimalPools(totalTeams);
    const expectedQualified = (poolsOf4 + poolsOf3) * 2;
    
    // Obtenir les matchs des phases finales (round >= 100)
    const finalMatches = updatedTournament.matches.filter(m => m.round >= 100);
    const poolMatches = updatedTournament.matches.filter(m => m.poolId);
    
    // Trouver les matchs vides de la première phase finale (round 100)
    const firstRoundFinalMatches = finalMatches.filter(m => m.round === 100);
    
    // Récupérer les équipes déjà placées
    const usedTeams = new Set<string>();
    firstRoundFinalMatches.forEach(match => {
      if (match.team1Id) usedTeams.add(match.team1Id);
      if (match.team2Id) usedTeams.add(match.team2Id);
    });
    
    // Nouvelles équipes à placer (seulement celles avec 2 victoires)
    const newQualifiedTeams = qualifiedTeams.filter(team => !usedTeams.has(team.id));
    
    if (newQualifiedTeams.length === 0) {
      // Pas de nouvelles équipes à placer, mais vérifier les phases suivantes
      return propagateWinnersToNextPhases(updatedTournament);
    }

    // Rassembler les positions disponibles en donnant la priorité à une équipe par match
    const primary: { matchIndex: number; position: 'team1' | 'team2' }[] = [];
    const secondary: { matchIndex: number; position: 'team1' | 'team2' }[] = [];

    firstRoundFinalMatches.forEach((match, matchIndex) => {
      const empty1 = !match.team1Id;
      const empty2 = !match.team2Id;

      if (empty1 && empty2) {
        primary.push({ matchIndex, position: 'team1' });
        secondary.push({ matchIndex, position: 'team2' });
      } else if (empty1 || empty2) {
        const pos = empty1 ? 'team1' : 'team2';
        secondary.push({ matchIndex, position: pos });
      }
    });

    const orderedPositions = [...primary, ...secondary];
    const updatedFinalMatches = [...firstRoundFinalMatches];

    newQualifiedTeams.forEach(team => {
      let placed = false;

      for (let i = 0; i < orderedPositions.length; i++) {
        const pos = orderedPositions[i];
        const match = updatedFinalMatches[pos.matchIndex];
        const otherTeamId = pos.position === 'team1' ? match.team2Id : match.team1Id;

        if (otherTeamId) {
          const otherTeam = updatedTournament.teams.find(t => t.id === otherTeamId);
          if (otherTeam && otherTeam.poolId === team.poolId) {
            continue; // éviter les rencontres de la même poule
          }
        }

        updatedFinalMatches[pos.matchIndex] = {
          ...match,
          [pos.position + 'Id']: team.id,
        } as Match;
        orderedPositions.splice(i, 1); // retirer la position utilisée
        placed = true;
        break;
      }

      if (!placed && orderedPositions.length > 0) {
        const pos = orderedPositions.shift()!;
        const match = updatedFinalMatches[pos.matchIndex];
        updatedFinalMatches[pos.matchIndex] = {
          ...match,
          [pos.position + 'Id']: team.id,
        } as Match;
      }
    });

    // Marquer automatiquement les matchs avec une seule équipe comme BYE
    const pendingPoolMatches = poolMatches.filter(m => !m.completed).length;
    const finalMatchesWithByes = applyByeLogic(
      updatedFinalMatches,
      qualifiedTeams.length,
      expectedQualified,
      pendingPoolMatches
    );
    for (let i = 0; i < updatedFinalMatches.length; i++) {
      updatedFinalMatches[i] = finalMatchesWithByes[i];
    }
    
    // Reconstituer tous les matchs
    const allUpdatedMatches = [
      ...poolMatches,
      ...updatedFinalMatches,
      ...finalMatches.filter(m => m.round > 100) // Garder les autres phases finales
    ];
    
    const result = {
      ...updatedTournament,
      matches: allUpdatedMatches,
    };

    // NOUVEAU : Propager les gagnants vers les phases suivantes
    return propagateWinnersToNextPhases(result);
  };

  // NOUVELLE FONCTION : Propager les gagnants des phases finales vers les phases suivantes
  const propagateWinnersToNextPhases = (tournament: Tournament): Tournament => {
    const finalMatches = tournament.matches.filter(m => m.round >= 100);
    const poolMatches = tournament.matches.filter(m => m.poolId);

    // Grouper les matchs par round
    const matchesByRound: { [round: number]: Match[] } = {};
    finalMatches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });

    const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    let hasChanges = false;
    const updatedMatches = [...finalMatches];

    // Propager les gagnants au fur et à mesure
    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i];
      const nextRound = rounds[i + 1];

      const currentMatches = matchesByRound[currentRound].sort((a, b) => a.court - b.court);
      const nextMatches = matchesByRound[nextRound].sort((a, b) => a.court - b.court);

      currentMatches.forEach((match, idx) => {
        if (!match.completed) return;

        const winnerId = (match.team1Score! > match.team2Score!) ? match.team1Id : match.team2Id;
        const target = nextMatches[Math.floor(idx / 2)];
        const targetIndex = updatedMatches.findIndex(m => m.id === target.id);
        if (targetIndex === -1) return;

        if (idx % 2 === 0) {
          if (updatedMatches[targetIndex].team1Id !== winnerId) {
            updatedMatches[targetIndex] = { ...updatedMatches[targetIndex], team1Id: winnerId };
            hasChanges = true;
          }
        } else {
          if (updatedMatches[targetIndex].team2Id !== winnerId) {
            updatedMatches[targetIndex] = { ...updatedMatches[targetIndex], team2Id: winnerId };
            hasChanges = true;
          }
        }
      });
    }

    if (hasChanges) {
      return {
        ...tournament,
        matches: [...poolMatches, ...updatedMatches]
      };
    }

    return tournament;
  };

  // Fonction pour obtenir les équipes actuellement qualifiées (avec 2 victoires minimum)
  const getCurrentQualifiedTeams = (tournament: Tournament): Team[] => {
    const qualified: Team[] = [];
    
    tournament.pools.forEach(pool => {
      const poolMatches = tournament.matches.filter(m => m.poolId === pool.id && m.completed);
      const poolTeams = pool.teamIds.map(id => tournament.teams.find(t => t.id === id)).filter(Boolean) as Team[];
      
      // Calculer les statistiques de chaque équipe dans la poule
      const teamStats = poolTeams.map(team => {
        const teamMatches = poolMatches.filter(m => 
          !m.isBye && (m.team1Id === team.id || m.team2Id === team.id)
        );

        const byeMatches = poolMatches.filter(m => 
          m.isBye && (m.team1Id === team.id || m.team2Id === team.id) &&
          ((m.team1Id === team.id && (m.team1Score || 0) > (m.team2Score || 0)) ||
           (m.team2Id === team.id && (m.team2Score || 0) > (m.team1Score || 0)))
        );

        let wins = 0;
        let pointsFor = 0;
        let pointsAgainst = 0;

        teamMatches.forEach(match => {
          const isTeam1 = match.team1Id === team.id;
          const teamScore = isTeam1 ? match.team1Score! : match.team2Score!;
          const opponentScore = isTeam1 ? match.team2Score! : match.team1Score!;
          
          pointsFor += teamScore;
          pointsAgainst += opponentScore;
          
          if (teamScore > opponentScore) wins++;
        });

        // Ajouter les victoires BYE
        wins += byeMatches.length;
        byeMatches.forEach(match => {
          const isTeam1 = match.team1Id === team.id;
          const teamScore = isTeam1 ? match.team1Score! : match.team2Score!;
          const opponentScore = isTeam1 ? match.team2Score! : match.team1Score!;
          pointsFor += teamScore;
          pointsAgainst += opponentScore;
        });

        return { 
          team, 
          wins, 
          pointsFor, 
          pointsAgainst, 
          performance: pointsFor - pointsAgainst,
          matches: teamMatches.length + byeMatches.length
        };
      });

      // Trier par victoires puis par performance
      teamStats.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.performance - a.performance;
      });

      // CORRECTION : Logique de qualification stricte - 2 victoires minimum
      if (poolTeams.length === 4) {
        // Pour une poule de 4, seules les équipes avec 2 victoires sont qualifiées
        const teamsWithTwoWins = teamStats.filter(stat => stat.wins >= 2);
        qualified.push(...teamsWithTwoWins.map(stat => stat.team));
      } else if (poolTeams.length === 3) {
        // Pour une poule de 3, seules les équipes avec 2 victoires sont qualifiées
        const teamsWithTwoWins = teamStats.filter(stat => stat.wins >= 2);
        qualified.push(...teamsWithTwoWins.map(stat => stat.team));
      }
    });

    return qualified;
  };

  // Fonction pour générer automatiquement les matchs suivants quand on met à jour un score
  const autoGenerateNextMatches = (updatedTournament: Tournament) => {
    const isPoolTournament = updatedTournament.type === 'doublette-poule' || updatedTournament.type === 'triplette-poule';
    
    if (!isPoolTournament || updatedTournament.pools.length === 0) {
      return updatedTournament;
    }

    const allMatches: Match[] = [...updatedTournament.matches];
    let courtIndex = Math.max(...allMatches.map(m => m.court), 0) + 1;

    updatedTournament.pools.forEach(pool => {
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
              id: crypto.randomUUID(),
              round: 2,
              court: courtIndex,
              team1Id: winner1vs4.id,
              team2Id: winner2vs3.id,
              completed: false,
              isBye: false,
              poolId: pool.id,
              battleIntensity: Math.floor(Math.random() * 50) + 25,
              hackingAttempts: 0,
            });
            
            courtIndex = (courtIndex % updatedTournament.courts) + 1;
          }
          
          // Generate losers match (Petite finale)
          if (!losersMatchExists) {
            allMatches.push({
              id: crypto.randomUUID(),
              round: 2,
              court: courtIndex,
              team1Id: loser1vs4.id,
              team2Id: loser2vs3.id,
              completed: false,
              isBye: false,
              poolId: pool.id,
              battleIntensity: Math.floor(Math.random() * 50) + 25,
              hackingAttempts: 0,
            });
            
            courtIndex = (courtIndex % updatedTournament.courts) + 1;
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
                id: crypto.randomUUID(),
                round: 3,
                court: courtIndex,
                team1Id: teamsWithOneWin[0].team.id,
                team2Id: teamsWithOneWin[1].team.id,
                completed: false,
                isBye: false,
                poolId: pool.id,
                battleIntensity: Math.floor(Math.random() * 50) + 25,
                hackingAttempts: 0,
              });
              
              courtIndex = (courtIndex % updatedTournament.courts) + 1;
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
              id: crypto.randomUUID(),
              round: 2,
              court: courtIndex,
              team1Id: winner.id,
              team2Id: team3!.id,
              completed: false,
              isBye: false,
              poolId: pool.id,
              battleIntensity: Math.floor(Math.random() * 50) + 25,
              hackingAttempts: 0,
            });
            
            courtIndex = (courtIndex % updatedTournament.courts) + 1;
          }
          
          // CORRECTION : Le perdant du premier match reçoit automatiquement un BYE (1 victoire)
          const loserByeExists = allMatches.some(m => 
            m.poolId === pool.id && m.round === 2 && m.isBye &&
            m.team1Id === loser.id && m.team2Id === loser.id
          );
          
          if (!loserByeExists) {
            allMatches.push({
              id: crypto.randomUUID(),
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
                  id: crypto.randomUUID(),
                  round: 3,
                  court: courtIndex,
                  team1Id: teamsWithOneWin[0].team.id,
                  team2Id: teamsWithOneWin[1].team.id,
                  completed: false,
                  isBye: false,
                  poolId: pool.id,
                  battleIntensity: Math.floor(Math.random() * 50) + 25,
                  hackingAttempts: 0,
                });
                
                courtIndex = (courtIndex % updatedTournament.courts) + 1;
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

    let updatedTournament = {
      ...tournament,
      matches: updatedMatches,
      teams: updatedTeams,
    };

    // Générer automatiquement les matchs suivants et mettre à jour les phases finales
    updatedTournament = autoGenerateNextMatches(updatedTournament);

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

  const resetTournament = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTournament(null);
  };

  return {
    tournament,
    createTournament,
    addTeam,
    removeTeam,
    generateTournamentPools,
    generateRound,
    updateMatchScore,
    updateMatchCourt,
    resetTournament,
  };
}