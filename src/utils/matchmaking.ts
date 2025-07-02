import { Tournament, Match, Team } from '../types/tournament';

export function generateMatches(tournament: Tournament): Match[] {
  switch (tournament.type) {
    case 'pool':
      return generatePoolMatches(tournament);
    case 'quadrette':
      return generateQuadretteMatches(tournament);
    case 'melee':
      return generateMeleeMatches(tournament);
    default:
      return generateStandardMatches(tournament);
  }
}

function generateStandardMatches(tournament: Tournament): Match[] {
  const { teams, matches, currentRound } = tournament;
  const round = currentRound + 1;

  // Sort teams by performance (best to worst)
  const sortedTeams = [...teams].sort((a, b) => b.performance - a.performance);

  const remainingTeams = [...sortedTeams];
  const newMatches: Match[] = [];

  if (round === 1) {
    // Handle BYE if the number of teams is odd
    if (remainingTeams.length % 2 === 1) {
      const byeTeam = remainingTeams.pop() as Team;
      newMatches.push({
        id: crypto.randomUUID(),
        round,
        court: 0,
        team1Id: byeTeam.id,
        team2Id: byeTeam.id,
        team1Score: 13,
        team2Score: 7,
        completed: true,
        isBye: true,
        battleIntensity: 0,
        hackingAttempts: 0,
      });
    }

    let courtIndex = 1;

    // Pair by groups of four using the 1 vs 3, 2 vs 4 pattern
    let i = 0;
    for (; i + 3 < remainingTeams.length; i += 4) {
      const t1 = remainingTeams[i];
      const t2 = remainingTeams[i + 2];
      newMatches.push({
        id: crypto.randomUUID(),
        round,
        court: courtIndex++,
        team1Id: t1.id,
        team2Id: t2.id,
        completed: false,
        isBye: false,
        battleIntensity: Math.floor(Math.random() * 50) + 25,
        hackingAttempts: 0,
      });

      const t3 = remainingTeams[i + 1];
      const t4 = remainingTeams[i + 3];
      newMatches.push({
        id: crypto.randomUUID(),
        round,
        court: courtIndex++,
        team1Id: t3.id,
        team2Id: t4.id,
        completed: false,
        isBye: false,
        battleIntensity: Math.floor(Math.random() * 50) + 25,
        hackingAttempts: 0,
      });
    }

    // Pair any remaining teams sequentially
    for (; i < remainingTeams.length - 1; i += 2) {
      const t1 = remainingTeams[i];
      const t2 = remainingTeams[i + 1];
      newMatches.push({
        id: crypto.randomUUID(),
        round,
        court: courtIndex++,
        team1Id: t1.id,
        team2Id: t2.id,
        completed: false,
        isBye: false,
        battleIntensity: Math.floor(Math.random() * 50) + 25,
        hackingAttempts: 0,
      });
    }

    return newMatches;
  }

  // Handle BYE if odd number of teams
  if (remainingTeams.length % 2 === 1) {
    const byeTeam = remainingTeams[remainingTeams.length - 1];

    newMatches.push({
      id: crypto.randomUUID(),
      round,
      court: 0,
      team1Id: byeTeam.id,
      team2Id: byeTeam.id,
      team1Score: 13,
      team2Score: 7,
      completed: true,
      isBye: true,
      battleIntensity: 0,
      hackingAttempts: 0,
    });

    remainingTeams.splice(remainingTeams.findIndex(t => t.id === byeTeam.id), 1);
  }

  // Pair remaining teams ensuring everyone gets an opponent
  let courtIndex = 1;
  while (remainingTeams.length > 1) {
    const team1 = remainingTeams.shift() as Team;

    let opponentIndex = remainingTeams.findIndex(
      team => !havePlayedBefore(team1.id, team.id, matches)
    );

    if (opponentIndex === -1) {
      opponentIndex = 0;
    }

    const [team2] = remainingTeams.splice(opponentIndex, 1);

    newMatches.push({
      id: crypto.randomUUID(),
      round,
      court: courtIndex,
      team1Id: team1.id,
      team2Id: team2.id,
      completed: false,
      isBye: false,
      battleIntensity: Math.floor(Math.random() * 75) + 25,
      hackingAttempts: 0,
    });

    courtIndex++;
  }

  return newMatches;
}

function generatePoolMatches(tournament: Tournament): Match[] {
  const { teams, matches, currentRound } = tournament;
  const round = currentRound + 1;

  const teamsByPool: Record<string, Team[]> = {};
  teams.forEach(team => {
    const poolId = (team.poolId ?? 'A');
    if (!teamsByPool[poolId]) {
      teamsByPool[poolId] = [];
    }
    teamsByPool[poolId].push(team);
  });

  const newMatches: Match[] = [];
  let courtIndex = 1;

  for (const [poolId, poolTeams] of Object.entries(teamsByPool)) {
    const previousDay = matches
      .filter(m => m.poolId === poolId)
      .reduce((max, m) => Math.max(max, m.day ?? 0), 0);
    const day = previousDay + 1;

    const ids = poolTeams.map(t => t.id);
    if (ids.length % 2 === 1) ids.push('bye');

    const n = ids.length;
    const fixed = ids[0];
    const rotating = ids.slice(1);

    for (let i = 0; i < day - 1; i++) {
      rotating.unshift(rotating.pop()!);
    }

    const arrangement = [fixed, ...rotating];
    const half = n / 2;

    for (let i = 0; i < half; i++) {
      const t1 = arrangement[i];
      const t2 = arrangement[n - 1 - i];

      if (t1 === 'bye' || t2 === 'bye') {
        const realId = t1 === 'bye' ? t2 : t1;
        newMatches.push({
          id: crypto.randomUUID(),
          round,
          court: 0,
          poolId,
          day,
          team1Id: realId,
          team2Id: realId,
          team1Score: 13,
          team2Score: 7,
          completed: true,
          isBye: true,
          battleIntensity: 0,
          hackingAttempts: 0,
        });
      } else {
        newMatches.push({
          id: crypto.randomUUID(),
          round,
          court: courtIndex++,
          poolId,
          day,
          team1Id: t1,
          team2Id: t2,
          completed: false,
          isBye: false,
          battleIntensity: Math.floor(Math.random() * 75) + 25,
          hackingAttempts: 0,
        });
      }
    }
  }

  return newMatches;
}

function generateQuadretteMatches(tournament: Tournament): Match[] {
  const { teams, currentRound, courts } = tournament;
  const round = currentRound + 1;

  const schedule: { [key: number]: string[][] } = {
    1: [['ABC'], ['D']],
    2: [['AB'], ['CD']],
    3: [['ABD'], ['C']],
    4: [['AC'], ['BD']],
    5: [['ACD'], ['B']],
    6: [['AD'], ['BC']],
    7: [['BCD'], ['A']],
  };

  if (round > 7) return [];

  const roundSchedule = schedule[round];
  const newMatches: Match[] = [];

  const quadretteTeams: { [teamId: string]: { [label: string]: string } } = {};
  
  teams.forEach(team => {
    team.players.forEach(player => {
      if (player.label) {
        const baseTeamId = team.id.split('-')[0];
        if (!quadretteTeams[baseTeamId]) {
          quadretteTeams[baseTeamId] = {};
        }
        quadretteTeams[baseTeamId][player.label] = team.id;
      }
    });
  });

  let courtIndex = 1;
  Object.keys(quadretteTeams).forEach(baseTeamId => {
    const teamLabels = quadretteTeams[baseTeamId];
    
    roundSchedule.forEach((patterns) => {
      const pattern = patterns[0];
      
      if (pattern.length > 1) {
        const subTeamIds = pattern.split('').map(label => teamLabels[label]).filter(Boolean);
        
        for (let i = 0; i < subTeamIds.length - 1; i += 2) {
          if (subTeamIds[i + 1]) {
            newMatches.push({
              id: crypto.randomUUID(),
              round,
              court: ((courtIndex - 1) % courts) + 1,
              team1Id: subTeamIds[i],
              team2Id: subTeamIds[i + 1],
              completed: false,
              isBye: false,
              battleIntensity: Math.floor(Math.random() * 100) + 50,
              hackingAttempts: 0,
            });
            courtIndex++;
          }
        }
      }
    });
  });

  return newMatches;
}

function generateMeleeMatches(tournament: Tournament): Match[] {
  const { teams, matches, currentRound, courts } = tournament;
  const round = currentRound + 1;

  const playerCount = teams.length;
  let doublettes = Math.floor(playerCount / 2);
  let triplettes = playerCount % 2;
  if (triplettes === 1) {
    doublettes -= 1;
  }

  let teamCount = doublettes + triplettes;
  while (teamCount > 2 * courts && doublettes >= 3) {
    doublettes -= 3;
    triplettes += 2;
    teamCount = doublettes + triplettes;
  }

  while (teamCount % 2 === 1 && doublettes >= 3) {
    doublettes -= 3;
    triplettes += 2;
    teamCount = doublettes + triplettes;
  }

  const groupSizes: number[] = [];
  for (let i = 0; i < doublettes; i++) groupSizes.push(2);
  for (let i = 0; i < triplettes; i++) groupSizes.push(3);

  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const groups: string[][] = [];

  for (const size of groupSizes) {
    const group: string[] = [];
    while (group.length < size && shuffled.length > 0) {
      let idx = shuffled.findIndex(team =>
        group.every(id => !haveTeamedBefore(id, team.id, matches))
      );
      if (idx === -1) idx = 0;
      group.push(shuffled.splice(idx, 1)[0].id);
    }
    groups.push(group);
  }

  while (shuffled.length > 0 && groups.length > 0) {
    groups[groups.length - 1].push(shuffled.shift()!.id);
  }

  const matchesResult: Match[] = [];
  let courtIndex = 1;

  if (groups.length % 2 === 1) {
    const doubletteIndexes = groups
      .map((g, idx) => (g.length === 2 ? idx : -1))
      .filter(idx => idx !== -1);
    const tripletteIndexes = groups
      .map((g, idx) => (g.length === 3 ? idx : -1))
      .filter(idx => idx !== -1);

    if (doubletteIndexes.length === 1 && tripletteIndexes.length === 1) {
      const dIdx = doubletteIndexes[0];
      const tIdx = tripletteIndexes[0];

      const doublette = groups.splice(dIdx, 1)[0];
      const triplette = groups.splice(tIdx < dIdx ? tIdx : tIdx - 1, 1)[0];

      const addedPlayer = triplette.pop()!;
      const newDoublette = triplette;
      const newTriplette = [...doublette, addedPlayer];

      groups.push(newDoublette, newTriplette);
    } else if (tripletteIndexes.length >= 2) {
      const idxA = tripletteIndexes[0];
      const idxB = tripletteIndexes[1];

      const groupA = groups.splice(Math.max(idxA, idxB), 1)[0];
      const groupB = groups.splice(Math.min(idxA, idxB), 1)[0];

      const playerA = groupA.pop()!;
      const playerB = groupB.pop()!;

      const doubletteA = groupA;
      const doubletteB = groupB;

      matchesResult.push({
        id: crypto.randomUUID(),
        round,
        court: courtIndex++,
        team1Id: doubletteA[0],
        team2Id: doubletteB[0],
        team1Ids: doubletteA,
        team2Ids: doubletteB,
        completed: false,
        isBye: false,
        battleIntensity: Math.floor(Math.random() * 100) + 50,
        hackingAttempts: Math.floor(Math.random() * 5),
      });

      groups.push([playerA, playerB]);
    }
  }

  const doubletteIndexes = groups
    .map((g, idx) => (g.length === 2 ? idx : -1))
    .filter(idx => idx !== -1);
  if (doubletteIndexes.length === 2) {
    const [idxA, idxB] = doubletteIndexes;
    const groupA = groups[idxA];
    const groupB = groups[idxB];

    const alreadyPlayed = groupA.some(id1 =>
      groupB.some(id2 => havePlayedAgainst(id1, id2, matches))
    );

    if (!alreadyPlayed) {
      const first = Math.max(idxA, idxB);
      const second = Math.min(idxA, idxB);
      groups.splice(first, 1);
      groups.splice(second, 1);

      matchesResult.push({
        id: crypto.randomUUID(),
        round,
        court: courtIndex,
        team1Id: groupA[0],
        team2Id: groupB[0],
        team1Ids: groupA,
        team2Ids: groupB,
        completed: false,
        isBye: false,
        battleIntensity: Math.floor(Math.random() * 100) + 50,
        hackingAttempts: Math.floor(Math.random() * 3),
      });

      courtIndex++;
    }
  }

  while (groups.length > 1) {
    const team1Ids = groups.shift()!;

    let opponentIndex = groups.findIndex(group =>
      !team1Ids.some(id1 =>
        group.some(id2 => havePlayedAgainst(id1, id2, matches))
      )
    );
    if (opponentIndex === -1) opponentIndex = 0;

    const team2Ids = groups.splice(opponentIndex, 1)[0];

    matchesResult.push({
      id: crypto.randomUUID(),
      round,
      court: courtIndex,
      team1Id: team1Ids[0],
      team2Id: team2Ids[0],
      team1Ids,
      team2Ids,
      completed: false,
      isBye: false,
      battleIntensity: Math.floor(Math.random() * 100) + 50,
      hackingAttempts: Math.floor(Math.random() * 5),
    });

    courtIndex++;
  }

  // No BYE matches should remain; any leftover group is paired using special rules earlier

  return matchesResult;
}

function havePlayedBefore(team1Id: string, team2Id: string, matches: Match[]): boolean {
  return matches.some(match =>
    (match.team1Id === team1Id && match.team2Id === team2Id) ||
    (match.team1Id === team2Id && match.team2Id === team1Id)
  );
}

function haveTeamedBefore(id1: string, id2: string, matches: Match[]): boolean {
  return matches.some(match => {
    const team1 = match.team1Ids ?? [match.team1Id];
    const team2 = match.team2Ids ?? [match.team2Id];
    return (
      (team1.includes(id1) && team1.includes(id2)) ||
      (team2.includes(id1) && team2.includes(id2))
    );
  });
}

function havePlayedAgainst(id1: string, id2: string, matches: Match[]): boolean {
  return matches.some(match => {
    const team1 = match.team1Ids ?? [match.team1Id];
    const team2 = match.team2Ids ?? [match.team2Id];
    return (
      (team1.includes(id1) && team2.includes(id2)) ||
      (team1.includes(id2) && team2.includes(id1))
    );
  });
}