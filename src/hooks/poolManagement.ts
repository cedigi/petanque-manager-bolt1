import { Tournament, Team, Match } from '../types/tournament';
import { generatePools, calculateOptimalPools } from '../utils/poolGeneration';
import { generateUuid } from '../utils/uuid';
import { createEmptyFinalPhases, createEmptyFinalPhasesB } from './finalsLogic';

export function generateTournamentPools(tournament: Tournament): Tournament {
  const pools = generatePools(tournament.teams);

  const updatedTeams = tournament.teams.map(team => {
    const pool = pools.find(p => p.teamIds.includes(team.id));
    return { ...team, poolId: pool?.id };
  });

  const allMatches: Match[] = [];

  pools.forEach((pool, index) => {
    const baseCourt = index * 2 + 1;
    const poolTeams = pool.teamIds
      .map(id => tournament.teams.find(t => t.id === id))
      .filter(Boolean);

    if (poolTeams.length === 4) {
      const [team1, team2, team3, team4] = poolTeams as Team[];

      allMatches.push({
        id: generateUuid(),
        round: 1,
        court: baseCourt,
        team1Id: team1.id,
        team2Id: team4.id,
        completed: false,
        isBye: false,
        poolId: pool.id,
        battleIntensity: Math.floor(Math.random() * 50) + 25,
        hackingAttempts: 0,
      });

      allMatches.push({
        id: generateUuid(),
        round: 1,
        court: baseCourt + 1,
        team1Id: team2.id,
        team2Id: team3.id,
        completed: false,
        isBye: false,
        poolId: pool.id,
        battleIntensity: Math.floor(Math.random() * 50) + 25,
        hackingAttempts: 0,
      });
    } else if (poolTeams.length === 3) {
      const [team1, team2, team3] = poolTeams as Team[];

      allMatches.push({
        id: generateUuid(),
        round: 1,
        court: baseCourt,
        team1Id: team1.id,
        team2Id: team2.id,
        completed: false,
        isBye: false,
        poolId: pool.id,
        battleIntensity: Math.floor(Math.random() * 50) + 25,
        hackingAttempts: 0,
      });

      allMatches.push({
        id: generateUuid(),
        round: 1,
        court: 0,
        team1Id: team3.id,
        team2Id: team3.id,
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

  const finalPhasesStart = pools.length * 2 + 1;
  const finals = createEmptyFinalPhases(tournament.teams.length, tournament.courts, finalPhasesStart);
  const finalsB = createEmptyFinalPhasesB(tournament.teams.length, tournament.courts, finalPhasesStart);

  return {
    ...tournament,
    teams: updatedTeams,
    pools,
    matches: [...allMatches, ...finals],
    matchesB: finalsB,
    poolsGenerated: true,
    currentRound: 1,
  };
}

export function generateRound(tournament: Tournament): Tournament {
  const isPool = tournament.type === 'doublette-poule' || tournament.type === 'triplette-poule';
  if (!isPool || tournament.pools.length === 0) return tournament;

  const allMatches: Match[] = [...tournament.matches];

  tournament.pools.forEach((pool, poolIndex) => {
    const baseCourt = poolIndex * 2 + 1;
    const poolMatches = tournament.matches.filter(m => m.poolId === pool.id);
    const poolTeams = pool.teamIds
      .map(id => tournament.teams.find(t => t.id === id))
      .filter(Boolean) as Team[];

    if (poolTeams.length === 4) {
      const [team1, team2, team3, team4] = poolTeams;

      const match1vs4 = poolMatches.find(m =>
        (m.team1Id === team1.id && m.team2Id === team4.id) ||
        (m.team1Id === team4.id && m.team2Id === team1.id)
      );
      const match2vs3 = poolMatches.find(m =>
        (m.team1Id === team2.id && m.team2Id === team3.id) ||
        (m.team1Id === team3.id && m.team2Id === team2.id)
      );

      if (match1vs4?.completed && match2vs3?.completed) {
        const getWinner = (match: Match, a: Team, b: Team) => {
          const isFirst = match.team1Id === a.id;
          const scoreA = isFirst ? match.team1Score! : match.team2Score!;
          const scoreB = isFirst ? match.team2Score! : match.team1Score!;
          return scoreA > scoreB ? a : b;
        };
        const getLoser = (match: Match, a: Team, b: Team) => {
          const isFirst = match.team1Id === a.id;
          const scoreA = isFirst ? match.team1Score! : match.team2Score!;
          const scoreB = isFirst ? match.team2Score! : match.team1Score!;
          return scoreA < scoreB ? a : b;
        };

        const winner1vs4 = getWinner(match1vs4, team1, team4);
        const winner2vs3 = getWinner(match2vs3, team2, team3);
        const loser1vs4 = getLoser(match1vs4, team1, team4);
        const loser2vs3 = getLoser(match2vs3, team2, team3);

        const winnersMatchExists = allMatches.some(m =>
          m.poolId === pool.id &&
          ((m.team1Id === winner1vs4.id && m.team2Id === winner2vs3.id) ||
           (m.team1Id === winner2vs3.id && m.team2Id === winner1vs4.id))
        );
        const losersMatchExists = allMatches.some(m =>
          m.poolId === pool.id &&
          ((m.team1Id === loser1vs4.id && m.team2Id === loser2vs3.id) ||
           (m.team1Id === loser2vs3.id && m.team2Id === loser1vs4.id))
        );

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
    }
  });

  return { ...tournament, matches: allMatches };
}

