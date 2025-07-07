import { Tournament, Match, Team } from '../types/tournament';
import { calculateOptimalPools } from '../utils/poolGeneration';
import { applyByeLogic } from '../utils/finals';
import { generateUuid } from '../utils/uuid';

export function createEmptyFinalPhases(totalTeams: number, courts: number, startCourt = 1): Match[] {
  const matches: Match[] = [];
  const { poolsOf4, poolsOf3 } = calculateOptimalPools(totalTeams);
  const expectedQualified = (poolsOf4 + poolsOf3) * 2;
  if (expectedQualified <= 1) return matches;

  const bracketSize = 1 << Math.ceil(Math.log2(expectedQualified));
  let currentTeamCount = bracketSize;
  let round = 100;
  let courtIndex = startCourt;

  while (currentTeamCount > 1) {
    const matchesInRound = Math.floor(currentTeamCount / 2);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: generateUuid(),
        round,
        court: courtIndex,
        team1Id: '',
        team2Id: '',
        completed: false,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      });
      courtIndex = (courtIndex % courts) + 1;
    }
    currentTeamCount = matchesInRound + (currentTeamCount % 2);
    round++;
  }

  return matches;
}

export function createEmptyFinalPhasesB(totalTeams: number, courts: number, startCourt = 1): Match[] {
  const { poolsOf4, poolsOf3 } = calculateOptimalPools(totalTeams);
  const expectedQualified = (poolsOf4 + poolsOf3) * 2;
  const bottomTeams = totalTeams - expectedQualified;
  const matches: Match[] = [];
  if (bottomTeams <= 1) return matches;

  const bracketSize = 1 << Math.ceil(Math.log2(bottomTeams));
  let currentTeamCount = bracketSize;
  let round = 200;
  let courtIndex = startCourt;

  while (currentTeamCount > 1) {
    const matchesInRound = Math.floor(currentTeamCount / 2);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: generateUuid(),
        round,
        court: courtIndex,
        team1Id: '',
        team2Id: '',
        completed: false,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      });
      courtIndex = (courtIndex % courts) + 1;
    }
    currentTeamCount = matchesInRound + (currentTeamCount % 2);
    round++;
  }

  return matches;
}

export function getCurrentQualifiedTeams(tournament: Tournament): Team[] {
  const qualified: Team[] = [];
  tournament.pools.forEach(pool => {
    const poolMatches = tournament.matches.filter(m => m.poolId === pool.id && m.completed);
    const poolTeams = pool.teamIds.map(id => tournament.teams.find(t => t.id === id)).filter(Boolean) as Team[];

    const teamStats = poolTeams.map(team => {
      const teamMatches = poolMatches.filter(m => !m.isBye && (m.team1Id === team.id || m.team2Id === team.id));
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
        matches: teamMatches.length + byeMatches.length,
      };
    });

    teamStats.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.performance - a.performance;
    });

    if (poolTeams.length === 4) {
      const teamsWithTwoWins = teamStats.filter(stat => stat.wins >= 2);
      qualified.push(...teamsWithTwoWins.map(stat => stat.team));
    } else if (poolTeams.length === 3) {
      const teamsWithTwoWins = teamStats.filter(stat => stat.wins >= 2);
      qualified.push(...teamsWithTwoWins.map(stat => stat.team));
    }
  });
  return qualified;
}

export function getCurrentBottomTeams(tournament: Tournament): Team[] {
  const qualified = new Set(getCurrentQualifiedTeams(tournament).map(t => t.id));
  return tournament.teams.filter(team => team.poolId && !qualified.has(team.id));
}

export function propagateWinnersList(matches: Match[]): Match[] {
  const byRound: { [round: number]: Match[] } = {};
  matches.forEach(m => {
    if (!byRound[m.round]) byRound[m.round] = [];
    byRound[m.round].push(m);
  });
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
  const updated = [...matches];
  let changed = false;

  for (let i = 0; i < rounds.length - 1; i++) {
    const current = rounds[i];
    const next = rounds[i + 1];
    const currentMatches = byRound[current].sort((a, b) => a.court - b.court);
    const nextMatches = byRound[next].sort((a, b) => a.court - b.court);

    currentMatches.forEach((m, idx) => {
      if (!m.completed) return;
      const winnerId = m.team1Score! > m.team2Score! ? m.team1Id : m.team2Id;
      const target = nextMatches[Math.floor(idx / 2)];
      const tIndex = updated.findIndex(x => x.id === target.id);
      if (tIndex === -1) return;
      if (idx % 2 === 0) {
        if (updated[tIndex].team1Id !== winnerId) {
          updated[tIndex] = { ...updated[tIndex], team1Id: winnerId };
          changed = true;
        }
      } else {
        if (updated[tIndex].team2Id !== winnerId) {
          updated[tIndex] = { ...updated[tIndex], team2Id: winnerId };
          changed = true;
        }
      }
    });
  }

  return changed ? updated : matches;
}

export function propagateWinnersToNextPhases(tournament: Tournament): Tournament {
  const finalMatches = tournament.matches.filter(m => m.round >= 100);
  const poolMatches = tournament.matches.filter(m => m.poolId);

  const matchesByRound: { [round: number]: Match[] } = {};
  finalMatches.forEach(match => {
    if (!matchesByRound[match.round]) matchesByRound[match.round] = [];
    matchesByRound[match.round].push(match);
  });

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
  let hasChanges = false;
  const updatedMatches = [...finalMatches];

  for (let i = 0; i < rounds.length - 1; i++) {
    const currentRound = rounds[i];
    const nextRound = rounds[i + 1];

    const currentMatches = matchesByRound[currentRound].sort((a, b) => a.court - b.court);
    const nextMatches = matchesByRound[nextRound].sort((a, b) => a.court - b.court);

    currentMatches.forEach((match, idx) => {
      if (!match.completed) return;
      const winnerId = match.team1Score! > match.team2Score! ? match.team1Id : match.team2Id;
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
    return { ...tournament, matches: [...poolMatches, ...updatedMatches] };
  }
  return tournament;
}

export function updateCategoryBPhases(t: Tournament): Tournament {
  const bottomTeams = getCurrentBottomTeams(t);
  const bottomIds = new Set(bottomTeams.map(bt => bt.id));
  const { poolsOf4, poolsOf3 } = calculateOptimalPools(t.teams.length);
  const expectedQualified = (poolsOf4 + poolsOf3) * 2;
  const bottomCount = t.teams.length - expectedQualified;
  // If no team has qualified yet, don't populate category B
  if (bottomTeams.length === t.teams.length) {
    return t;
  }
  if (bottomCount <= 1) return t;

  let matchesB = t.matchesB;
  const rebuildBracket =
    matchesB.length === 0 || bottomTeams.length !== bottomCount;
  if (rebuildBracket) {
    matchesB = createEmptyFinalPhasesB(
      t.teams.length,
      t.courts,
      t.pools.length * 2 + 1,
    );
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
  if (rebuildBracket) {
    const bracketSize = 1 << Math.ceil(Math.log2(bottomCount));
    const byesNeeded = bracketSize - bottomCount;
    const sorted = [...bottomTeams];
    let teamIdx = 0;
    for (let i = 0; i < firstRound.length; i++) {
      const match = firstRound[i];
      if (teamIdx < byesNeeded) {
        const team = sorted[teamIdx++];
        firstRound[i] = {
          ...match,
          team1Id: team?.id || '',
          team2Id: team?.id || '',
          team1Score: 13,
          team2Score: 0,
          completed: true,
          isBye: true,
        } as Match;
      } else {
        const t1 = sorted[teamIdx++];
        const t2 = sorted[teamIdx++];
        firstRound[i] = {
          ...match,
          team1Id: t1?.id || '',
          team2Id: t2?.id || '',
          team1Score: undefined,
          team2Score: undefined,
          completed: false,
          isBye: false,
        } as Match;
      }
    }
  } else {
    const used = new Set<string>();
    firstRound.forEach(m => {
      if (m.team1Id) used.add(m.team1Id);
      if (m.team2Id) used.add(m.team2Id);
    });
    const positions: { matchIndex: number; position: 'team1' | 'team2' }[] = [];
    firstRound.forEach((m, idx) => {
      if (!m.team1Id) positions.push({ matchIndex: idx, position: 'team1' });
    });
    firstRound.forEach((m, idx) => {
      if (!m.team2Id) positions.push({ matchIndex: idx, position: 'team2' });
    });
    const newTeams = bottomTeams.filter(bt => !used.has(bt.id));
    newTeams.forEach(team => {
      if (positions.length === 0) return;
      const pos = positions.shift()!;
      const match = firstRound[pos.matchIndex];
      firstRound[pos.matchIndex] = {
        ...match,
        [pos.position + 'Id']: team.id,
      } as Match;
    });
  }

  const pending = t.matches.filter(m => m.poolId && !m.completed).length;
  const withByes = applyByeLogic(firstRound, bottomTeams.length, bottomCount, pending);
  for (let i = 0; i < firstRound.length; i++) {
    firstRound[i] = withByes[i];
  }

  const others = matchesB.filter(m => m.round > 200);
  const combined = [...firstRound, ...others];
  const propagated = propagateWinnersList(combined);
  return { ...t, matchesB: propagated };
}

export function updateFinalPhasesWithQualified(updatedTournament: Tournament): Tournament {
  const isPoolTournament =
    updatedTournament.type === 'doublette-poule' || updatedTournament.type === 'triplette-poule';
  if (!isPoolTournament || updatedTournament.pools.length === 0) {
    return updatedTournament;
  }

  const qualifiedTeams = getCurrentQualifiedTeams(updatedTournament);
  const totalTeams = updatedTournament.teams.length;
  const { poolsOf4, poolsOf3 } = calculateOptimalPools(totalTeams);
  const expectedQualified = (poolsOf4 + poolsOf3) * 2;

  const finalMatches = updatedTournament.matches.filter(m => m.round >= 100);
  const poolMatches = updatedTournament.matches.filter(m => m.poolId);

  const qualifiedIds = new Set(qualifiedTeams.map(t => t.id));
  const cleanedFinalMatches = finalMatches.map(match => {
    let changed = false;
    let { team1Id, team2Id } = match;

    if (team1Id && !qualifiedIds.has(team1Id)) {
      team1Id = '';
      changed = true;
    }
    if (team2Id && !qualifiedIds.has(team2Id)) {
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

  const firstRoundFinalMatches = cleanedFinalMatches.filter(m => m.round === 100);
  const usedTeams = new Set<string>();
  firstRoundFinalMatches.forEach(match => {
    if (match.team1Id) usedTeams.add(match.team1Id);
    if (match.team2Id) usedTeams.add(match.team2Id);
  });
  const newQualifiedTeams = qualifiedTeams.filter(team => !usedTeams.has(team.id));

  if (newQualifiedTeams.length === 0) {
    const baseTournament = {
      ...updatedTournament,
      matches: [...poolMatches, ...cleanedFinalMatches],
    };
    return updateCategoryBPhases(propagateWinnersToNextPhases(baseTournament));
  }

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
          continue;
        }
      }
      updatedFinalMatches[pos.matchIndex] = {
        ...match,
        [pos.position + 'Id']: team.id,
      } as Match;
      orderedPositions.splice(i, 1);
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

  const pendingPoolMatches = poolMatches.filter(m => !m.completed).length;
  const finalMatchesWithByes = applyByeLogic(
    updatedFinalMatches,
    qualifiedTeams.length,
    expectedQualified,
    pendingPoolMatches,
  );
  for (let i = 0; i < updatedFinalMatches.length; i++) {
    updatedFinalMatches[i] = finalMatchesWithByes[i];
  }

  const allUpdatedMatches = [
    ...poolMatches,
    ...updatedFinalMatches,
    ...cleanedFinalMatches.filter(m => m.round > 100),
  ];

  const result = {
    ...updatedTournament,
    matches: allUpdatedMatches,
  };

  const afterA = propagateWinnersToNextPhases(result);
  return updateCategoryBPhases(afterA);
}

export function autoGenerateNextMatches(updatedTournament: Tournament): Tournament {
  const isPoolTournament =
    updatedTournament.type === 'doublette-poule' || updatedTournament.type === 'triplette-poule';
  if (!isPoolTournament || updatedTournament.pools.length === 0) {
    return updatedTournament;
  }

  const allMatches: Match[] = [...updatedTournament.matches];

  updatedTournament.pools.forEach((pool, poolIndex) => {
    const baseCourt = poolIndex * 2 + 1;
    const poolMatches = allMatches.filter(m => m.poolId === pool.id);
    const poolTeams = pool.teamIds.map(id => updatedTournament.teams.find(t => t.id === id)).filter(Boolean);

    if (poolTeams.length === 4) {
      const [team1, team2, team3, team4] = poolTeams as Team[];
      const match1vs4 = poolMatches.find(m =>
        (m.team1Id === team1.id && m.team2Id === team4.id) ||
        (m.team1Id === team4.id && m.team2Id === team1.id),
      );
      const match2vs3 = poolMatches.find(m =>
        (m.team1Id === team2.id && m.team2Id === team3.id) ||
        (m.team1Id === team3.id && m.team2Id === team2.id),
      );

      if (match1vs4?.completed && match2vs3?.completed) {
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

        const winner1vs4 = getWinner(match1vs4, team1, team4);
        const winner2vs3 = getWinner(match2vs3, team2, team3);
        const loser1vs4 = getLoser(match1vs4, team1, team4);
        const loser2vs3 = getLoser(match2vs3, team2, team3);

        const winnersMatchExists = allMatches.some(m =>
          m.poolId === pool.id &&
          ((m.team1Id === winner1vs4.id && m.team2Id === winner2vs3.id) ||
           (m.team1Id === winner2vs3.id && m.team2Id === winner1vs4.id)),
        );
        const losersMatchExists = allMatches.some(m =>
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
      const [team1, team2, team3] = poolTeams as Team[];
      const firstRoundMatch = poolMatches.find(
        m => m.round === 1 && !m.isBye &&
        ((m.team1Id === team1.id && m.team2Id === team2.id) ||
         (m.team1Id === team2.id && m.team2Id === team1.id)),
      );

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

        const winner = getWinner(firstRoundMatch, team1, team2);
        const loser = getLoser(firstRoundMatch, team1, team2);

        const winnersMatchExists = allMatches.some(
          m => m.poolId === pool.id && m.round === 2 &&
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
          m => m.poolId === pool.id && m.round === 2 && m.isBye &&
            m.team1Id === loser.id && m.team2Id === loser.id,
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
          m => m.poolId === pool.id && m.round === 2 && !m.isBye &&
            ((m.team1Id === winner.id && m.team2Id === team3.id) ||
             (m.team1Id === team3.id && m.team2Id === winner.id)),
        );
        if (finalMatch?.completed) {
          const getTeamStats = (team: Team) => {
            const teamMatches = allMatches.filter(
              m => m.poolId === pool.id && m.completed && !m.isBye &&
                (m.team1Id === team.id || m.team2Id === team.id),
            );
            const byeMatches = allMatches.filter(
              m => m.poolId === pool.id && m.completed && m.isBye &&
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
              m => m.poolId === pool.id && m.round === 3 &&
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
    }
  });

  let result = { ...updatedTournament, matches: allMatches };
  result = updateFinalPhasesWithQualified(result);
  return result;
}

