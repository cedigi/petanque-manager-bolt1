import { Tournament, Match, Team } from '../types/tournament';
import { calculateOptimalPools } from '../utils/poolGeneration';
import { applyByeLogic } from '../utils/finals';
import { generateUuid } from '../utils/uuid';
import { generateNextPoolMatches } from './poolManagement';

function getPoolCourtUsage(tournament: Tournament): number {
  let currentCourt = 1;
  tournament.pools.forEach(pool => {
    const poolTeams = pool.teamIds
      .map(id => tournament.teams.find(team => team.id === id))
      .filter(Boolean) as Team[];
    const courtsNeeded = poolTeams.length === 4 ? 2 : 1;
    currentCourt += courtsNeeded;
  });
  return Math.max(0, currentCourt - 1);
}

function assignAvailableFinalCourts(tournament: Tournament): Tournament {
  const poolMatches = tournament.matches.filter(m => m.poolId);
  const finalsA = tournament.matches.filter(m => m.round >= 100);
  const finalsB = tournament.matchesB;

  const activePoolCourts = new Set(
    poolMatches
      .filter(match => !match.completed && !match.isBye && match.court > 0)
      .map(match => match.court),
  );

  const availableCourts = Array.from({ length: tournament.courts }, (_, i) => i + 1).filter(
    court => !activePoolCourts.has(court),
  );
  const availableSet = new Set(availableCourts);
  const usedCourts = new Set<number>();

  const assignCourts = (matches: Match[]): Match[] => {
    const indexed = matches.map((match, index) => ({ match, index }));
    indexed.sort((a, b) => a.match.round - b.match.round || a.match.court - b.match.court);

    const updated = [...matches];

    indexed.forEach(({ match, index }) => {
      if (match.completed || match.isBye || !match.team1Id || !match.team2Id) {
        return;
      }

      const currentCourt = match.court;
      if (
        currentCourt > 0 &&
        availableSet.has(currentCourt) &&
        !usedCourts.has(currentCourt)
      ) {
        usedCourts.add(currentCourt);
        return;
      }

      const nextCourt = availableCourts.find(court => !usedCourts.has(court));
      if (nextCourt !== undefined) {
        usedCourts.add(nextCourt);
        updated[index] = { ...match, court: nextCourt };
      }
    });

    return updated;
  };

  const updatedFinalsA = assignCourts(finalsA);
  const updatedFinalsB = assignCourts(finalsB);

  return {
    ...tournament,
    matches: [...poolMatches, ...updatedFinalsA],
    matchesB: updatedFinalsB,
  };
}

export function createEmptyFinalPhases(
  totalTeams: number,
  courts: number,
  startCourt = 1,
  preferredPoolSize?: 3 | 4,
): Match[] {
  const matches: Match[] = [];
  const { poolsOf4, poolsOf3, poolsOf2 } = calculateOptimalPools(
    totalTeams,
    preferredPoolSize,
  );
  const expectedQualified = (poolsOf4 + poolsOf3 + poolsOf2) * 2;
  if (expectedQualified <= 1) return matches;

  const bracketSize = 1 << Math.ceil(Math.log2(expectedQualified));
  let currentTeamCount = bracketSize;
  let round = 100;
  let court = startCourt;

  while (currentTeamCount > 1) {
    const matchesInRound = Math.floor(currentTeamCount / 2);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: generateUuid(),
        round,
        court: court++,
        team1Id: '',
        team2Id: '',
        completed: false,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      });
    }
    currentTeamCount = matchesInRound + (currentTeamCount % 2);
    round++;
  }

  return matches;
}

export function createEmptyFinalPhasesB(
  totalTeams: number,
  courts: number,
  startCourt = 1,
  preferredPoolSize?: 3 | 4,
  expectedBottomCount?: number,
): Match[] {
  let bottomTeams = expectedBottomCount;
  if (bottomTeams === undefined) {
    const { poolsOf4, poolsOf3, poolsOf2 } = calculateOptimalPools(
      totalTeams,
      preferredPoolSize,
    );
    const expectedQualified = (poolsOf4 + poolsOf3 + poolsOf2) * 2;
    bottomTeams = totalTeams - expectedQualified;
  }
  const matches: Match[] = [];
  if (bottomTeams <= 1) return matches;

  const bracketSize = 1 << Math.ceil(Math.log2(bottomTeams));
  let currentTeamCount = bracketSize;
  let round = 200;
  let court = startCourt;
  // Courts for Category B finals are chosen manually

  while (currentTeamCount > 1) {
    const matchesInRound = Math.floor(currentTeamCount / 2);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: generateUuid(),
        round,
        court: court++,
        team1Id: '',
        team2Id: '',
        completed: false,
        isBye: false,
        battleIntensity: 0,
        hackingAttempts: 0,
      });
    }
    currentTeamCount = matchesInRound + (currentTeamCount % 2);
    round++;
  }

  return matches;
}

export function getCurrentQualifiedTeams(tournament: Tournament): Team[] {
  const qualified: Team[] = [];
  const qualifiedIds = new Set<string>();
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
        losses: teamMatches.length + byeMatches.length - wins,
      };
    });

    teamStats.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.performance - a.performance;
    });

    const completedMatches = poolMatches.filter(m => !m.isBye).length;
    const totalMatches = (poolTeams.length * (poolTeams.length - 1)) / 2;
    const poolComplete = totalMatches > 0 && completedMatches >= totalMatches;

    if (poolComplete) {
      teamStats.slice(0, Math.min(2, teamStats.length)).forEach(stat => {
        if (!qualifiedIds.has(stat.team.id)) {
          qualified.push(stat.team);
          qualifiedIds.add(stat.team.id);
        }
      });
      return;
    }

    teamStats
      .filter(stat => stat.wins >= 2)
      .forEach(stat => {
        if (!qualifiedIds.has(stat.team.id)) {
          qualified.push(stat.team);
          qualifiedIds.add(stat.team.id);
        }
      });
  });
  return qualified;
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomByeIndices(matchCount: number, byesNeeded: number): Set<number> {
  if (byesNeeded <= 0 || matchCount <= 0) return new Set();
  const indices = Array.from({ length: matchCount }, (_, i) => i);
  let candidates = indices;
  if (matchCount > 2) {
    const interior = indices.slice(1, -1);
    if (interior.length >= byesNeeded) {
      candidates = interior;
    }
  }
  const shuffled = shuffleArray(candidates);
  return new Set(shuffled.slice(0, byesNeeded));
}

function orderByeCandidates(candidates: number[], byesNeeded: number): number[] {
  if (candidates.length <= 1 || byesNeeded <= 1) {
    return shuffleArray(candidates);
  }
  const maxGap = Math.min(4, Math.max(1, Math.floor(candidates.length / byesNeeded)));
  const remaining = shuffleArray(candidates);
  const ordered: number[] = [];
  let cursor = Math.floor(Math.random() * remaining.length);
  while (remaining.length > 0) {
    cursor = cursor % remaining.length;
    ordered.push(remaining.splice(cursor, 1)[0]);
    const gap = Math.floor(Math.random() * (maxGap + 1));
    cursor += gap;
  }
  return ordered;
}

function selectByeIndices(matches: Match[], byesNeeded: number): Set<number> {
  if (byesNeeded <= 0 || matches.length === 0) return new Set();

  const existingByeIndices = matches
    .map((match, index) => ({ match, index }))
    .filter(
      ({ match }) =>
        match.isBye || (match.team1Id && match.team2Id && match.team1Id === match.team2Id),
    )
    .map(({ index }) => index);

  const partialIndices = matches
    .map((match, index) => ({ match, index }))
    .filter(
      ({ match }) =>
        (match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id),
    )
    .map(({ index }) => index);

  const emptyIndices = matches
    .map((match, index) => ({ match, index }))
    .filter(({ match }) => !match.team1Id && !match.team2Id)
    .map(({ index }) => index);

  const selected = new Set<number>();
  const groupCount = Math.ceil(matches.length / 2);
  const enforceUniqueGroups = byesNeeded <= groupCount;
  const usedGroups = new Set<number>();
  const trySelect = (index: number, enforceGroups: boolean): boolean => {
    if (selected.has(index)) return false;
    const groupIndex = Math.floor(index / 2);
    if (enforceGroups && usedGroups.has(groupIndex)) return false;
    selected.add(index);
    usedGroups.add(groupIndex);
    return true;
  };

  for (const index of existingByeIndices) {
    if (selected.size >= byesNeeded) break;
    trySelect(index, enforceUniqueGroups);
  }

  const remainingCandidates = orderByeCandidates(
    [...partialIndices, ...emptyIndices].filter(index => !selected.has(index)),
    byesNeeded - selected.size,
  );
  for (const index of remainingCandidates) {
    if (selected.size >= byesNeeded) break;
    trySelect(index, enforceUniqueGroups);
  }

  if (enforceUniqueGroups && selected.size < byesNeeded) {
    const relaxedCandidates = orderByeCandidates(
      [...existingByeIndices, ...remainingCandidates].filter(index => !selected.has(index)),
      byesNeeded - selected.size,
    );
    for (const index of relaxedCandidates) {
      if (selected.size >= byesNeeded) break;
      trySelect(index, false);
    }
  }

  if (selected.size < byesNeeded) {
    const fallback = getRandomByeIndices(matches.length, byesNeeded);
    for (const index of fallback) {
      if (selected.size >= byesNeeded) break;
      selected.add(index);
    }
  }

  return selected;
}

export function getExpectedQualifiedCounts(tournament: Tournament): {
  expectedQualifiedA: number;
  expectedBottomCount: number;
} {
  if (tournament.pools.length > 0) {
    return tournament.pools.reduce(
      (acc, pool) => {
        const size = pool.teamIds.length;
        if (size >= 2) {
          acc.expectedQualifiedA += 2;
        }
        if (size === 4) {
          acc.expectedBottomCount += 2;
        } else if (size === 3) {
          acc.expectedBottomCount += 1;
        }
        return acc;
      },
      { expectedQualifiedA: 0, expectedBottomCount: 0 },
    );
  }

  const { poolsOf4, poolsOf3, poolsOf2 } = calculateOptimalPools(
    tournament.teams.length,
    tournament.preferredPoolSize,
  );
  const expectedQualifiedA = (poolsOf4 + poolsOf3 + poolsOf2) * 2;
  const expectedBottomCount = poolsOf4 * 2 + poolsOf3;
  return { expectedQualifiedA, expectedBottomCount };
}

export function getCurrentBottomTeams(tournament: Tournament): Team[] {
  const bottomTeams: Team[] = [];
  const bottomIds = new Set<string>();

  tournament.pools.forEach(pool => {
    const poolMatches = tournament.matches.filter(m => m.poolId === pool.id && m.completed);
    const poolTeams = pool.teamIds
      .map(id => tournament.teams.find(t => t.id === id))
      .filter(Boolean) as Team[];

    const teamStats = poolTeams.map(team => {
      const teamMatches = poolMatches.filter(
        m => !m.isBye && (m.team1Id === team.id || m.team2Id === team.id),
      );
      const byeMatches = poolMatches.filter(m =>
        m.isBye && (m.team1Id === team.id || m.team2Id === team.id) &&
        ((m.team1Id === team.id && (m.team1Score || 0) > (m.team2Score || 0)) ||
         (m.team2Id === team.id && (m.team2Score || 0) > (m.team1Score || 0))),
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
        losses: teamMatches.length + byeMatches.length - wins,
      };
    });

    teamStats.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.performance - a.performance;
    });

    const completedMatches = poolMatches.filter(m => !m.isBye).length;
    const totalMatches = (poolTeams.length * (poolTeams.length - 1)) / 2;
    const poolComplete = totalMatches > 0 && completedMatches >= totalMatches;

    if (poolComplete) {
      const qualifiedIds = new Set(teamStats.slice(0, Math.min(2, teamStats.length)).map(stat => stat.team.id));
      teamStats.forEach(stat => {
        if (!qualifiedIds.has(stat.team.id) && !bottomIds.has(stat.team.id)) {
          bottomTeams.push(stat.team);
          bottomIds.add(stat.team.id);
        }
      });
      return;
    }

    teamStats
      .filter(stat => stat.losses >= 2)
      .forEach(stat => {
        if (!bottomIds.has(stat.team.id)) {
          bottomTeams.push(stat.team);
          bottomIds.add(stat.team.id);
        }
      });
  });

  return bottomTeams;
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
    nextMatches.forEach(match => {
      const tIndex = updated.findIndex(x => x.id === match.id);
      if (tIndex === -1) return;
      if (!updated[tIndex].completed) {
        const needsReset =
          updated[tIndex].team1Id ||
          updated[tIndex].team2Id ||
          updated[tIndex].team1Score !== undefined ||
          updated[tIndex].team2Score !== undefined ||
          updated[tIndex].isBye;
        if (needsReset) {
          updated[tIndex] = {
            ...updated[tIndex],
            team1Id: '',
            team2Id: '',
            team1Score: undefined,
            team2Score: undefined,
            completed: false,
            isBye: false,
          };
          changed = true;
        }
      }
    });

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
    nextMatches.forEach(match => {
      const targetIndex = updatedMatches.findIndex(m => m.id === match.id);
      if (targetIndex === -1) return;
      if (!updatedMatches[targetIndex].completed) {
        const needsReset =
          updatedMatches[targetIndex].team1Id ||
          updatedMatches[targetIndex].team2Id ||
          updatedMatches[targetIndex].team1Score !== undefined ||
          updatedMatches[targetIndex].team2Score !== undefined ||
          updatedMatches[targetIndex].isBye;
        if (needsReset) {
          updatedMatches[targetIndex] = {
            ...updatedMatches[targetIndex],
            team1Id: '',
            team2Id: '',
            team1Score: undefined,
            team2Score: undefined,
            completed: false,
            isBye: false,
          };
          hasChanges = true;
        }
      }
    });

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

export function initializeCategoryBBracket(
  tournament: Tournament,
  firstRound: Match[],
  others: Match[],
  bottomTeams: Team[],
  bottomCount: number,
  byeMatchIds?: Set<string>,
  applyByes = true,
): Match[] {
  if (applyByes) {
    const withByes = applyByeLogic(firstRound, bottomTeams.length, bottomCount, byeMatchIds);
    for (let i = 0; i < firstRound.length; i++) {
      firstRound[i] = withByes[i];
    }
  }

  const combined = [...firstRound, ...others];
  return propagateWinnersList(combined);
}

export function updateCategoryBPhases(t: Tournament): Tournament {
  const bottomTeams = getCurrentBottomTeams(t);
  const bottomIds = new Set(bottomTeams.map(bt => bt.id));
  const pendingPoolMatches = t.matches.filter(m => m.poolId && !m.completed).length;
  const { expectedBottomCount } = getExpectedQualifiedCounts(t);
  const bottomCount = expectedBottomCount;
  if (bottomCount <= 1) return assignAvailableFinalCourts(t);

  let matchesB = t.matchesB;
  const rebuildBracket = matchesB.length === 0;
  if (rebuildBracket) {
    matchesB = createEmptyFinalPhasesB(
      t.teams.length,
      t.courts,
      getPoolCourtUsage(t) + 1,
      t.preferredPoolSize,
      bottomCount,
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

  if (bottomTeams.length === 0) {
    return assignAvailableFinalCourts({ ...t, matchesB });
  }

  const firstRound = matchesB.filter(m => m.round === 200);
  const bracketSize = 1 << Math.ceil(Math.log2(bottomCount));
  const byesNeeded = bracketSize - bottomCount;
  const shouldApplyByes = pendingPoolMatches === 0;
  const byeIndices =
    shouldApplyByes && byesNeeded > 0 ? selectByeIndices(firstRound, byesNeeded) : new Set();
  const byeMatchIds = new Set(
    firstRound.filter((_, index) => byeIndices.has(index)).map(match => match.id),
  );
  if (rebuildBracket) {
    const sorted = shuffleArray(bottomTeams);
    let teamIdx = 0;
    for (let i = 0; i < firstRound.length; i++) {
      const match = firstRound[i];
      if (byeIndices.has(i)) {
        const team = sorted[teamIdx++];
        firstRound[i] = {
          ...match,
          team1Id: team?.id || '',
          team2Id: '',
          team1Score: undefined,
          team2Score: undefined,
          completed: false,
          isBye: false,
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
    const canRedistribute =
      pendingPoolMatches === 0 && firstRound.every(match => !match.completed);
    if (canRedistribute) {
      const shuffledTeams = shuffleArray(bottomTeams);
      for (let i = 0; i < firstRound.length; i++) {
        const match = firstRound[i];
        firstRound[i] = {
          ...match,
          team1Id: '',
          team2Id: '',
          team1Score: undefined,
          team2Score: undefined,
          completed: false,
          isBye: false,
        } as Match;
      }
      let teamIdx = 0;
      for (let i = 0; i < firstRound.length; i++) {
        if (teamIdx >= shuffledTeams.length) break;
        const match = firstRound[i];
        firstRound[i] = {
          ...match,
          team1Id: shuffledTeams[teamIdx++]?.id || '',
        } as Match;
      }
      for (let i = 0; i < firstRound.length; i++) {
        if (teamIdx >= shuffledTeams.length) break;
        if (byeIndices.has(i)) continue;
        const match = firstRound[i];
        firstRound[i] = {
          ...match,
          team2Id: shuffledTeams[teamIdx++]?.id || '',
        } as Match;
      }
    } else {
      const priorityPositions: { matchIndex: number; position: 'team1' | 'team2' }[] = [];
      const secondaryPositions: { matchIndex: number; position: 'team1' | 'team2' }[] = [];
      firstRound.forEach((m, idx) => {
        if (!m.team1Id && !m.team2Id) {
          if (byeIndices.has(idx)) {
            priorityPositions.push({ matchIndex: idx, position: 'team1' });
          } else {
            priorityPositions.push({ matchIndex: idx, position: 'team1' });
            secondaryPositions.push({ matchIndex: idx, position: 'team2' });
          }
        } else if (!m.team1Id) {
          if (!byeIndices.has(idx)) {
            secondaryPositions.push({ matchIndex: idx, position: 'team1' });
          }
        } else if (!m.team2Id) {
          if (!byeIndices.has(idx)) {
            secondaryPositions.push({ matchIndex: idx, position: 'team2' });
          }
        }
      });
      const newTeams = shuffleArray(bottomTeams.filter(bt => !used.has(bt.id)));
      const minPartialMatchesBeforePairing = 3;
      let partialMatchesCount = firstRound.filter(match => {
        const filled = Number(Boolean(match.team1Id)) + Number(Boolean(match.team2Id));
        return filled === 1;
      }).length;
      const shuffledPriority = shuffleArray(priorityPositions);
      const shuffledSecondary = shuffleArray(secondaryPositions);
      newTeams.forEach(team => {
        const shouldTryPairingFirst =
          partialMatchesCount >= minPartialMatchesBeforePairing && shuffledSecondary.length > 0;
        const positionPools = shouldTryPairingFirst
          ? [shuffledSecondary, shuffledPriority]
          : [shuffledPriority, shuffledSecondary];
        let placed = false;
        for (const pool of positionPools) {
          const pos = pool.shift();
          if (!pos) continue;
          const match = firstRound[pos.matchIndex];
          const filledBefore =
            Number(Boolean(match.team1Id)) + Number(Boolean(match.team2Id));
          firstRound[pos.matchIndex] = {
            ...match,
            [pos.position + 'Id']: team.id,
          } as Match;
          if (filledBefore === 0) {
            partialMatchesCount += 1;
          } else if (filledBefore === 1) {
            partialMatchesCount -= 1;
          }
          placed = true;
          break;
        }
        if (!placed) {
          const fallback = shuffledPriority.shift() ?? shuffledSecondary.shift();
          if (!fallback) return;
          const match = firstRound[fallback.matchIndex];
          const filledBefore =
            Number(Boolean(match.team1Id)) + Number(Boolean(match.team2Id));
          firstRound[fallback.matchIndex] = {
            ...match,
            [fallback.position + 'Id']: team.id,
          } as Match;
          if (filledBefore === 0) {
            partialMatchesCount += 1;
          } else if (filledBefore === 1) {
            partialMatchesCount -= 1;
          }
        }
      });
    }
  }

  const others = matchesB.filter(m => m.round > 200);
  const propagated = initializeCategoryBBracket(
    t,
    firstRound,
    others,
    bottomTeams,
    bottomCount,
    byeMatchIds,
    shouldApplyByes,
  );
  return assignAvailableFinalCourts({ ...t, matchesB: propagated });
}

export function updateFinalPhasesWithQualified(updatedTournament: Tournament): Tournament {
  const isPoolTournament =
    updatedTournament.type === 'doublette-poule' || updatedTournament.type === 'triplette-poule';
  if (!isPoolTournament || updatedTournament.pools.length === 0) {
    return updatedTournament;
  }

  const qualifiedTeams = getCurrentQualifiedTeams(updatedTournament);
  const { expectedQualifiedA } = getExpectedQualifiedCounts(updatedTournament);
  const expectedQualified = expectedQualifiedA;

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

  const bracketSize = 1 << Math.ceil(Math.log2(expectedQualified));
  const pendingPoolMatches = poolMatches.filter(m => !m.completed).length;
  const shouldApplyByes = pendingPoolMatches === 0;
  const byesNeeded = bracketSize - expectedQualified;
  const byeIndices =
    shouldApplyByes && byesNeeded > 0 ? selectByeIndices(firstRoundFinalMatches, byesNeeded) : new Set();
  const byeMatchIds = new Set(
    firstRoundFinalMatches.filter((_, index) => byeIndices.has(index)).map(match => match.id),
  );

  if (newQualifiedTeams.length === 0) {
    const mergedFinalMatches = shouldApplyByes
      ? (() => {
          const finalMatchesWithByes = applyByeLogic(
            firstRoundFinalMatches,
            qualifiedTeams.length,
            expectedQualified,
            byeMatchIds,
          );
          const byesById = new Map(finalMatchesWithByes.map(match => [match.id, match]));
          return cleanedFinalMatches.map(match => byesById.get(match.id) ?? match);
        })()
      : cleanedFinalMatches;
    const baseTournament = {
      ...updatedTournament,
      matches: [...poolMatches, ...mergedFinalMatches],
    };
    return updateCategoryBPhases(propagateWinnersToNextPhases(baseTournament));
  }

  const byeSides = byeIndices.size > 0
    ? shuffleArray(Array.from(byeIndices)).map(index => ({
        matchIndex: index,
        position: Math.random() < 0.5 ? 'team1' : 'team2',
      }))
    : [];
  const byeSideByIndex = new Map(byeSides.map(side => [side.matchIndex, side.position]));
  const primary: { matchIndex: number; position: 'team1' | 'team2' }[] = [];
  const secondary: { matchIndex: number; position: 'team1' | 'team2' }[] = [];
  firstRoundFinalMatches.forEach((match, matchIndex) => {
    const empty1 = !match.team1Id;
    const empty2 = !match.team2Id;
    if (empty1 && empty2) {
      if (byeIndices.has(matchIndex)) {
        const position = byeSideByIndex.get(matchIndex) ?? 'team1';
        primary.push({ matchIndex, position });
      } else {
        primary.push({ matchIndex, position: 'team1' });
        secondary.push({ matchIndex, position: 'team2' });
      }
    } else if (empty1 || empty2) {
      const pos = empty1 ? 'team1' : 'team2';
      if (!byeIndices.has(matchIndex)) {
        secondary.push({ matchIndex, position: pos });
      }
    }
  });

  const updatedFinalMatches = [...firstRoundFinalMatches];
  const randomizedTeams = shuffleArray(newQualifiedTeams);
  const minPartialMatchesBeforePairing = 3;
  let partialMatchesCount = updatedFinalMatches.filter(match => {
    const filled = Number(Boolean(match.team1Id)) + Number(Boolean(match.team2Id));
    return filled === 1;
  }).length;
  const primaryPositions = shuffleArray(primary);
  const secondaryPositions = shuffleArray(secondary);
  const tryFindPosition = (
    positions: { matchIndex: number; position: 'team1' | 'team2' }[],
    team: Team,
  ): number => {
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const match = updatedFinalMatches[pos.matchIndex];
      const otherTeamId = pos.position === 'team1' ? match.team2Id : match.team1Id;
      if (otherTeamId) {
        const otherTeam = updatedTournament.teams.find(t => t.id === otherTeamId);
        if (otherTeam && otherTeam.poolId === team.poolId) {
          continue;
        }
      }
      return i;
    }
    return -1;
  };

  randomizedTeams.forEach(team => {
    const shouldTryPairingFirst =
      partialMatchesCount >= minPartialMatchesBeforePairing && secondaryPositions.length > 0;
    const positionPools = shouldTryPairingFirst
      ? [secondaryPositions, primaryPositions]
      : [primaryPositions, secondaryPositions];
    let placed = false;
    for (const pool of positionPools) {
      const index = tryFindPosition(pool, team);
      if (index === -1) continue;
      const pos = pool[index];
      const match = updatedFinalMatches[pos.matchIndex];
      const filledBefore =
        Number(Boolean(match.team1Id)) + Number(Boolean(match.team2Id));
      updatedFinalMatches[pos.matchIndex] = {
        ...match,
        [pos.position + 'Id']: team.id,
      } as Match;
      pool.splice(index, 1);
      if (filledBefore === 0) {
        partialMatchesCount += 1;
      } else if (filledBefore === 1) {
        partialMatchesCount -= 1;
      }
      placed = true;
      break;
    }
    if (!placed) {
      const fallbackPool =
        primaryPositions.length > 0 ? primaryPositions : secondaryPositions;
      const pos = fallbackPool.shift();
      if (!pos) return;
      const match = updatedFinalMatches[pos.matchIndex];
      const filledBefore =
        Number(Boolean(match.team1Id)) + Number(Boolean(match.team2Id));
      updatedFinalMatches[pos.matchIndex] = {
        ...match,
        [pos.position + 'Id']: team.id,
      } as Match;
      if (filledBefore === 0) {
        partialMatchesCount += 1;
      } else if (filledBefore === 1) {
        partialMatchesCount -= 1;
      }
    }
  });

  if (shouldApplyByes) {
    const finalMatchesWithByes = applyByeLogic(
      updatedFinalMatches,
      qualifiedTeams.length,
      expectedQualified,
      byeMatchIds,
    );
    for (let i = 0; i < updatedFinalMatches.length; i++) {
      updatedFinalMatches[i] = finalMatchesWithByes[i];
    }
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

  const allMatches = generateNextPoolMatches(updatedTournament);

  let result = { ...updatedTournament, matches: allMatches };
  result = updateFinalPhasesWithQualified(result);
  return result;
}
