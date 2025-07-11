import { Tournament, Match, Team } from '../types/tournament';
import { generateUuid } from './uuid';

export function generateMatches(tournament: Tournament): Match[] {
  switch (tournament.type) {
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

  const remainingTeams =
    round === 1
      ? [...teams].sort(() => Math.random() - 0.5)
      : [...teams].sort((a, b) => b.performance - a.performance);

  const newMatches: Match[] = [];

  if (round === 1) {
    // Handle BYE if the number of teams is odd by randomly selecting a team
    if (remainingTeams.length % 2 === 1) {
      const byeIndex = Math.floor(Math.random() * remainingTeams.length);
      const [byeTeam] = remainingTeams.splice(byeIndex, 1);
      newMatches.push({
        id: generateUuid(),
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

    const baseOrder = teams.map(t => t.id);
    let courtIndex = 1;
    for (let i = 0; i < remainingTeams.length - 1; i += 2) {
      const team1 = remainingTeams[i];
      let team2 = remainingTeams[i + 1];

      if (
        Math.abs(baseOrder.indexOf(team1.id) - baseOrder.indexOf(team2.id)) === 1 &&
        i + 2 < remainingTeams.length
      ) {
        const swapIdx = remainingTeams.slice(i + 2).findIndex(t =>
          Math.abs(baseOrder.indexOf(team1.id) - baseOrder.indexOf(t.id)) !== 1
        );
        if (swapIdx !== -1) {
          const actual = i + 2 + swapIdx;
          [remainingTeams[i + 1], remainingTeams[actual]] = [remainingTeams[actual], remainingTeams[i + 1]];
          team2 = remainingTeams[i + 1];
        }
      }
      newMatches.push({
        id: generateUuid(),
        round,
        court: courtIndex++,
        team1Id: team1.id,
        team2Id: team2.id,
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
      id: generateUuid(),
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
      id: generateUuid(),
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

function generateQuadretteMatches(tournament: Tournament): Match[] {
  const { teams, matches, currentRound, courts } = tournament;
  const round = currentRound + 1;

  const schedule: { [key: number]: [string, string][] } = {
    1: [
      ['ABC', 'ABC'],
      ['D', 'D'],
    ],
    2: [
      ['AB', 'AB'],
      ['CD', 'CD'],
    ],
    3: [
      ['ABD', 'ABD'],
      ['C', 'C'],
    ],
    4: [
      ['AC', 'AC'],
      ['BD', 'BD'],
    ],
    5: [
      ['ACD', 'ACD'],
      ['B', 'B'],
    ],
    6: [
      ['AD', 'AD'],
      ['BC', 'BC'],
    ],
    7: [
      ['BCD', 'BCD'],
      ['A', 'A'],
    ],
  };

  if (round > 7) return [];

  const roundPatterns = schedule[round];
  const newMatches: Match[] = [];

  const playerMap: Record<string, Record<string, string>> = {};
  teams.forEach(team => {
    playerMap[team.id] = {};
    team.players.forEach(player => {
      if (player.label) {
        playerMap[team.id][player.label] = player.id;
      }
    });
  });

        codex/extend-generatequadrettematches-functionality
  const pairKey = (a: string, b: string) => [a, b].sort().join('-');

  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function makePairings(exclude: Set<string>): [Team, Team][] {
    const order = shuffle(teams);
    const remain = [...order];
    const result: [Team, Team][] = [];

    while (remain.length > 1) {
      const team1 = remain.shift() as Team;
      let idx = remain.findIndex(
        t => !haveBaseTeamsPlayedBefore(team1.id, t.id, matches) && !exclude.has(pairKey(team1.id, t.id))
      );
      if (idx === -1) {
        idx = remain.findIndex(t => !exclude.has(pairKey(team1.id, t.id)));
      }
      if (idx === -1) idx = 0;
      const team2 = remain.splice(idx, 1)[0];
      exclude.add(pairKey(team1.id, team2.id));
      result.push([team1, team2]);
    }

    return result;

  const remaining = [...teams].sort(() => Math.random() - 0.5);
  const pairings: [Team, Team][] = [];

  while (remaining.length > 1) {
    const team1 = remaining.shift() as Team;
    let idx = remaining.findIndex(t => !haveBaseTeamsPlayedBefore(team1.id, t.id, matches));
    if (idx === -1) idx = 0;
    const team2 = remaining.splice(idx, 1)[0];
    pairings.push([team1, team2]);
        main
  }

  const usedPairs = new Set<string>();
  const triplettePairings = makePairings(usedPairs);
  const tetePairings = makePairings(usedPairs);

  let courtIndex = 1;
  const [triplettePattern, tetePattern] = roundPatterns;

  triplettePairings.forEach(([t1, t2]) => {
    const [p1, p2] = triplettePattern;
    const ids1 = p1.split('').map(l => playerMap[t1.id][l]).filter(Boolean);
    const ids2 = p2.split('').map(l => playerMap[t2.id][l]).filter(Boolean);

    const match: Match = {
      id: generateUuid(),
      round,
      court: ((courtIndex - 1) % courts) + 1,
      team1Id: t1.id,
      team2Id: t2.id,
      completed: false,
      isBye: false,
      battleIntensity: Math.floor(Math.random() * 100) + 50,
      hackingAttempts: 0,
    };

    match.team1Ids = ids1;
    match.team2Ids = ids2;

    newMatches.push(match);
    courtIndex++;
  });

  tetePairings.forEach(([t1, t2]) => {
    const [p1, p2] = tetePattern;
    const ids1 = p1.split('').map(l => playerMap[t1.id][l]).filter(Boolean);
    const ids2 = p2.split('').map(l => playerMap[t2.id][l]).filter(Boolean);

    const match: Match = {
      id: generateUuid(),
      round,
      court: ((courtIndex - 1) % courts) + 1,
      team1Id: t1.id,
      team2Id: t2.id,
      completed: false,
      isBye: false,
      battleIntensity: Math.floor(Math.random() * 100) + 50,
      hackingAttempts: 0,
    };

    match.team1Ids = ids1;
    match.team2Ids = ids2;

    newMatches.push(match);
    courtIndex++;
  });

  return newMatches;

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
        id: generateUuid(),
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
      id: generateUuid(),
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

  if (groups.length === 1) {
    const teamIds = groups.shift()!;

    if (teamIds.length === 2) {
      matchesResult.push({
        id: generateUuid(),
        round,
        court: courtIndex,
        team1Id: teamIds[0],
        team2Id: teamIds[1],
        team1Ids: [teamIds[0]],
        team2Ids: [teamIds[1]],
        completed: false,
        isBye: false,
        battleIntensity: Math.floor(Math.random() * 100) + 50,
        hackingAttempts: 0,
      });
    } else if (teamIds.length === 3) {
      matchesResult.push({
        id: generateUuid(),
        round,
        court: courtIndex,
        team1Id: teamIds[0],
        team2Id: teamIds[0],
        team1Ids: teamIds,
        team2Ids: teamIds,
        team1Score: 13,
        team2Score: 0,
        completed: true,
        isBye: true,
        battleIntensity: 0,
        hackingAttempts: 0,
      });
    }

    courtIndex++;
  }

  return matchesResult;
}

function havePlayedBefore(team1Id: string, team2Id: string, matches: Match[]): boolean {
  return matches.some(match =>
    (match.team1Id === team1Id && match.team2Id === team2Id) ||
    (match.team1Id === team2Id && match.team2Id === team1Id)
  );
}

function haveBaseTeamsPlayedBefore(team1Id: string, team2Id: string, matches: Match[]): boolean {
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