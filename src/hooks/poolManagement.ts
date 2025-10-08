import { Tournament, Team, Match } from '../types/tournament';
import { generatePools } from '../utils/poolGeneration';
import { generateUuid } from '../utils/uuid';
import { createEmptyFinalPhases, createEmptyFinalPhasesB } from './finalsLogic';

export function generateNextPoolMatches(tournament: Tournament): Match[] {
  const allMatches: Match[] = [...tournament.matches];

  tournament.pools.forEach((pool, poolIndex) => {
    const baseCourt = poolIndex * 2 + 1;
    const poolMatches = tournament.matches.filter(m => m.poolId === pool.id);
    const poolTeams = pool.teamIds
      .map(id => tournament.teams.find(t => t.id === id))
      .filter(Boolean) as Team[];

    if (poolTeams.length === 4) {
      const [team1, team2, team3, team4] = poolTeams;

      const match1vs4 = poolMatches.find(
        m =>
          (m.team1Id === team1.id && m.team2Id === team4.id) ||
          (m.team1Id === team4.id && m.team2Id === team1.id),
      );
      const match2vs3 = poolMatches.find(
        m =>
          (m.team1Id === team2.id && m.team2Id === team3.id) ||
          (m.team1Id === team3.id && m.team2Id === team2.id),
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

        const winnersMatchExists = allMatches.some(
          m =>
            m.poolId === pool.id &&
            ((m.team1Id === winner1vs4.id && m.team2Id === winner2vs3.id) ||
              (m.team1Id === winner2vs3.id && m.team2Id === winner1vs4.id)),
        );
        const losersMatchExists = allMatches.some(
          m =>
            m.poolId === pool.id &&
            ((m.team1Id === loser1vs4.id && m.team2Id === loser2vs3.id) ||
              (m.team1Id === loser2vs3.id && m.team2Id === loser1vs4.id)),
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

        const winnersMatch = allMatches.find(
          m =>
            m.poolId === pool.id &&
            ((m.team1Id === winner1vs4.id && m.team2Id === winner2vs3.id) ||
              (m.team1Id === winner2vs3.id && m.team2Id === winner1vs4.id)),
        );
        const losersMatch = allMatches.find(
          m =>
            m.poolId === pool.id &&
            ((m.team1Id === loser1vs4.id && m.team2Id === loser2vs3.id) ||
              (m.team1Id === loser2vs3.id && m.team2Id === loser1vs4.id)),
        );

        if (winnersMatch?.completed && losersMatch?.completed) {
          const allPoolMatches = allMatches.filter(
            m => m.poolId === pool.id && m.completed,
          );

          const teamStats = [team1, team2, team3, team4].map(team => {
            const teamMatches = allPoolMatches.filter(
              m => m.team1Id === team.id || m.team2Id === team.id,
            );

            let wins = 0;
            teamMatches.forEach(match => {
              const isTeam1 = match.team1Id === team.id;
              const teamScore = isTeam1 ? match.team1Score! : match.team2Score!;
              const opponentScore = isTeam1 ? match.team2Score! : match.team1Score!;
              if (teamScore > opponentScore) wins++;
            });

            return { team, wins, matches: teamMatches.length };
          });

          const teamsWithOneWin = teamStats.filter(stat => stat.wins === 1);
          if (teamsWithOneWin.length === 2) {
            const barrageExists = allMatches.some(
              m =>
                m.poolId === pool.id &&
                m.round === 3 &&
                ((m.team1Id === teamsWithOneWin[0].team.id &&
                  m.team2Id === teamsWithOneWin[1].team.id) ||
                  (m.team1Id === teamsWithOneWin[1].team.id &&
                    m.team2Id === teamsWithOneWin[0].team.id)),
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
    } else if (poolTeams.length === 3) {
      const [team1, team2, team3] = poolTeams;

      const firstRoundMatch = poolMatches.find(
        m =>
          m.round === 1 &&
          !m.isBye &&
          ((m.team1Id === team1.id && m.team2Id === team2.id) ||
            (m.team1Id === team2.id && m.team2Id === team1.id)),
      );

      if (firstRoundMatch?.completed) {
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

        const winner = getWinner(firstRoundMatch, team1, team2);
        const loser = getLoser(firstRoundMatch, team1, team2);

        const winnersMatchExists = allMatches.some(
          m =>
            m.poolId === pool.id &&
            m.round === 2 &&
            ((m.team1Id === winner.id && m.team2Id === team3.id) ||
              (m.team1Id === team3.id && m.team2Id === winner.id)),
        );

        if (!winnersMatchExists) {
          allMatches.push({
            id: generateUuid(),
            round: 2,
            court: baseCourt,
            team1Id: winner.id,
            team2Id: team3.id,
            completed: false,
            isBye: false,
            poolId: pool.id,
            battleIntensity: Math.floor(Math.random() * 50) + 25,
            hackingAttempts: 0,
          });
        }

        const loserByeExists = allMatches.some(
          m =>
            m.poolId === pool.id &&
            m.round === 2 &&
            m.isBye &&
            m.team1Id === loser.id &&
            m.team2Id === loser.id,
        );

        if (!loserByeExists) {
          allMatches.push({
            id: generateUuid(),
            round: 2,
            court: 0,
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

        const finalMatch = allMatches.find(
          m =>
            m.poolId === pool.id &&
            m.round === 2 &&
            !m.isBye &&
            ((m.team1Id === winner.id && m.team2Id === team3.id) ||
              (m.team1Id === team3.id && m.team2Id === winner.id)),
        );

        if (finalMatch?.completed) {
          const getTeamStats = (team: Team) => {
            const teamMatches = allMatches.filter(
              m =>
                m.poolId === pool.id &&
                m.completed &&
                !m.isBye &&
                (m.team1Id === team.id || m.team2Id === team.id),
            );

            const byeMatches = allMatches.filter(
              m =>
                m.poolId === pool.id &&
                m.completed &&
                m.isBye &&
                (m.team1Id === team.id || m.team2Id === team.id) &&
                ((m.team1Id === team.id && (m.team1Score || 0) > (m.team2Score || 0)) ||
                  (m.team2Id === team.id && (m.team2Score || 0) > (m.team1Score || 0))),
            );

            let wins = 0;
            teamMatches.forEach(match => {
              const isTeam1 = match.team1Id === team.id;
              const teamScore = isTeam1 ? match.team1Score! : match.team2Score!;
              const opponentScore = isTeam1 ? match.team2Score! : match.team1Score!;

              if (teamScore > opponentScore) wins++;
            });

            wins += byeMatches.length;

            return { wins, matches: teamMatches.length + byeMatches.length };
          };

          const team1Stats = getTeamStats(team1);
          const team2Stats = getTeamStats(team2);
          const team3Stats = getTeamStats(team3);

          const allStats = [
            { team: team1, ...team1Stats },
            { team: team2, ...team2Stats },
            { team: team3, ...team3Stats },
          ];

          const teamsWithOneWin = allStats.filter(stat => stat.wins === 1);

          if (teamsWithOneWin.length === 2) {
            const barrageExists = allMatches.some(
              m =>
                m.poolId === pool.id &&
                m.round === 3 &&
                ((m.team1Id === teamsWithOneWin[0].team.id && m.team2Id === teamsWithOneWin[1].team.id) ||
                  (m.team1Id === teamsWithOneWin[1].team.id && m.team2Id === teamsWithOneWin[0].team.id)),
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
    } else if (poolTeams.length === 2) {
      const [team1, team2] = poolTeams;

      const directMatchExists = poolMatches.some(
        m =>
          (m.team1Id === team1.id && m.team2Id === team2.id) ||
          (m.team1Id === team2.id && m.team2Id === team1.id),
      );

      if (!directMatchExists) {
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
      }
    }
  });

  return allMatches;
}

export function generateTournamentPools(tournament: Tournament): Tournament {
  const pools = generatePools(tournament.teams, tournament.preferredPoolSize);

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
    } else if (poolTeams.length === 2) {
      const [team1, team2] = poolTeams as Team[];

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
    }
  });

  const finalPhasesStart = pools.length * 2 + 1;
  const finals = createEmptyFinalPhases(
    tournament.teams.length,
    tournament.courts,
    finalPhasesStart,
    tournament.preferredPoolSize,
  );
  const finalsB = createEmptyFinalPhasesB(
    tournament.teams.length,
    tournament.courts,
    finalPhasesStart,
    tournament.preferredPoolSize,
  );

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

  const allMatches = generateNextPoolMatches(tournament);

  return { ...tournament, matches: allMatches, currentRound: tournament.currentRound + 1 };
}

