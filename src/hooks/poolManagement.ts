import { Tournament, Team, Match, Pool } from '../types/tournament';
import { generatePools } from '../utils/poolGeneration';
import { generateUuid } from '../utils/uuid';
import { createEmptyFinalPhases, createEmptyFinalPhasesB } from './finalsLogic';

function getPoolCourtAssignments(pools: Pool[], teams: Team[]): {
  baseCourts: Map<string, number>;
  totalCourtsUsed: number;
} {
  let currentCourt = 1;
  const baseCourts = new Map<string, number>();

  pools.forEach(pool => {
    const poolTeams = pool.teamIds
      .map(id => teams.find(team => team.id === id))
      .filter(Boolean) as Team[];
    const courtsNeeded = poolTeams.length === 4 ? 2 : 1;
    baseCourts.set(pool.id, currentCourt);
    currentCourt += courtsNeeded;
  });

  return { baseCourts, totalCourtsUsed: Math.max(0, currentCourt - 1) };
}

export function generateNextPoolMatches(tournament: Tournament): Match[] {
  const allMatches: Match[] = [...tournament.matches];
  const { baseCourts } = getPoolCourtAssignments(tournament.pools, tournament.teams);

  const resetMatchForTeams = (
    match: Match,
    team1Id: string,
    team2Id: string,
    completed: boolean,
    isBye: boolean,
    court: number,
    team1Score?: number,
    team2Score?: number,
  ): Match => ({
    ...match,
    team1Id,
    team2Id,
    completed,
    isBye,
    court,
    team1Score,
    team2Score,
    battleIntensity: isBye ? 0 : match.battleIntensity,
    hackingAttempts: 0,
  });

  tournament.pools.forEach(pool => {
    const baseCourt = baseCourts.get(pool.id) ?? 1;
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

        const winnersMatch = allMatches.find(
          m => m.poolId === pool.id && m.round === 2 && !m.isBye && m.court === baseCourt,
        );
        const losersMatch = allMatches.find(
          m => m.poolId === pool.id && m.round === 2 && !m.isBye && m.court === baseCourt + 1,
        );

        if (!winnersMatch) {
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
        } else if (
          winnersMatch.team1Id !== winner1vs4.id ||
          winnersMatch.team2Id !== winner2vs3.id
        ) {
          const matchIndex = allMatches.findIndex(m => m.id === winnersMatch.id);
          allMatches[matchIndex] = resetMatchForTeams(
            winnersMatch,
            winner1vs4.id,
            winner2vs3.id,
            false,
            false,
            baseCourt,
          );
        }
        if (!losersMatch) {
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
        } else if (
          losersMatch.team1Id !== loser1vs4.id ||
          losersMatch.team2Id !== loser2vs3.id
        ) {
          const matchIndex = allMatches.findIndex(m => m.id === losersMatch.id);
          allMatches[matchIndex] = resetMatchForTeams(
            losersMatch,
            loser1vs4.id,
            loser2vs3.id,
            false,
            false,
            baseCourt + 1,
          );
        }

        const refreshedWinnersMatch = allMatches.find(
          m =>
            m.poolId === pool.id &&
            ((m.team1Id === winner1vs4.id && m.team2Id === winner2vs3.id) ||
              (m.team1Id === winner2vs3.id && m.team2Id === winner1vs4.id)),
        );
        const refreshedLosersMatch = allMatches.find(
          m =>
            m.poolId === pool.id &&
            ((m.team1Id === loser1vs4.id && m.team2Id === loser2vs3.id) ||
              (m.team1Id === loser2vs3.id && m.team2Id === loser1vs4.id)),
        );

        if (refreshedWinnersMatch?.completed && refreshedLosersMatch?.completed) {
          const allPoolMatches = allMatches.filter(
            m => m.poolId === pool.id && m.completed && m.round < 3,
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
          const barrageMatch = allMatches.find(
            m => m.poolId === pool.id && m.round === 3 && !m.isBye && m.court === baseCourt,
          );

          if (teamsWithOneWin.length === 2) {
            if (!barrageMatch) {
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
            } else if (
              barrageMatch.team1Id !== teamsWithOneWin[0].team.id ||
              barrageMatch.team2Id !== teamsWithOneWin[1].team.id
            ) {
              const matchIndex = allMatches.findIndex(m => m.id === barrageMatch.id);
              allMatches[matchIndex] = resetMatchForTeams(
                barrageMatch,
                teamsWithOneWin[0].team.id,
                teamsWithOneWin[1].team.id,
                false,
                false,
                baseCourt,
              );
            }
          } else if (barrageMatch) {
            const matchIndex = allMatches.findIndex(m => m.id === barrageMatch.id);
            allMatches.splice(matchIndex, 1);
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

        const winnersMatch = allMatches.find(
          m => m.poolId === pool.id && m.round === 2 && !m.isBye && m.court === baseCourt,
        );

        if (!winnersMatch) {
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
        } else if (
          winnersMatch.team1Id !== winner.id ||
          winnersMatch.team2Id !== team3.id
        ) {
          const matchIndex = allMatches.findIndex(m => m.id === winnersMatch.id);
          allMatches[matchIndex] = resetMatchForTeams(
            winnersMatch,
            winner.id,
            team3.id,
            false,
            false,
            baseCourt,
          );
        }

        const loserByeMatch = allMatches.find(
          m => m.poolId === pool.id && m.round === 2 && m.isBye,
        );

        if (!loserByeMatch) {
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
        } else if (loserByeMatch.team1Id !== loser.id || loserByeMatch.team2Id !== loser.id) {
          const matchIndex = allMatches.findIndex(m => m.id === loserByeMatch.id);
          allMatches[matchIndex] = resetMatchForTeams(
            loserByeMatch,
            loser.id,
            loser.id,
            true,
            true,
            0,
            13,
            0,
          );
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
                m.round < 3 &&
                !m.isBye &&
                (m.team1Id === team.id || m.team2Id === team.id),
            );

            const byeMatches = allMatches.filter(
              m =>
                m.poolId === pool.id &&
                m.completed &&
                m.round < 3 &&
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

          const barrageMatch = allMatches.find(
            m => m.poolId === pool.id && m.round === 3 && !m.isBye && m.court === baseCourt,
          );

          if (teamsWithOneWin.length === 2) {
            if (!barrageMatch) {
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
            } else if (
              barrageMatch.team1Id !== teamsWithOneWin[0].team.id ||
              barrageMatch.team2Id !== teamsWithOneWin[1].team.id
            ) {
              const matchIndex = allMatches.findIndex(m => m.id === barrageMatch.id);
              allMatches[matchIndex] = resetMatchForTeams(
                barrageMatch,
                teamsWithOneWin[0].team.id,
                teamsWithOneWin[1].team.id,
                false,
                false,
                baseCourt,
              );
            }
          } else if (barrageMatch) {
            const matchIndex = allMatches.findIndex(m => m.id === barrageMatch.id);
            allMatches.splice(matchIndex, 1);
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
  const { baseCourts, totalCourtsUsed } = getPoolCourtAssignments(pools, tournament.teams);

  const updatedTeams = tournament.teams.map(team => {
    const pool = pools.find(p => p.teamIds.includes(team.id));
    return { ...team, poolId: pool?.id };
  });

  const allMatches: Match[] = [];

  pools.forEach(pool => {
    const baseCourt = baseCourts.get(pool.id) ?? 1;
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

  const finalPhasesStart = totalCourtsUsed + 1;
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
