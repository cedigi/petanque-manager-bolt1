import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import type { Tournament, Team, Match } from '../types/tournament';

const FINALS_PHASE_LABELS = [
  'Finale',
  'Demi-finales',
  'Quarts de finale',
  '8èmes de finale',
  '16èmes de finale',
  '32èmes de finale',
  '64èmes de finale',
];

function createFinalsLabelResolver(rounds: number[]) {
  if (rounds.length === 0) {
    return (round: number) => `Tour ${round}`;
  }

  const sortedRounds = [...rounds].sort((a, b) => a - b);
  const totalRounds = sortedRounds.length;

  return (round: number) => {
    const roundIndex = sortedRounds.indexOf(round);
    if (roundIndex === -1) {
      return `Tour ${round}`;
    }

    const labelIndex = totalRounds - 1 - roundIndex;
    return FINALS_PHASE_LABELS[labelIndex] ?? `Phase ${roundIndex + 1}`;
  };
}

function teamLabel(team: Team, index: number) {
  const customName = team.name?.trim();
  if (customName) {
    return customName;
  }

  if (team.players.length > 0) {
    const playerNames = team.players.map((player) => player.name).filter(Boolean).join(' / ');
    if (playerNames) {
      return playerNames;
    }
  }

  return `Équipe ${index + 1}`;
}

function formatTournamentType(type: Tournament['type']) {
  if (!type) {
    return 'Inconnu';
  }

  const normalized = type.replace(/[_-]/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function sanitizeFileName(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase() || 'tournoi';
}

function collectMatches(tournament: Tournament) {
  const primaryMatches = Array.isArray(tournament.matches) ? tournament.matches : [];
  const secondaryMatches = Array.isArray(tournament.matchesB) ? tournament.matchesB : [];
  return [...primaryMatches, ...secondaryMatches];
}

function hasAssignedTeams(match: Match) {
  const hasTeam1Ids = Array.isArray(match.team1Ids) && match.team1Ids.length > 0;
  const hasTeam2Ids = Array.isArray(match.team2Ids) && match.team2Ids.length > 0;
  const hasTeam1 = hasTeam1Ids || Boolean(match.team1Id);
  const hasTeam2 = hasTeam2Ids || Boolean(match.team2Id);
  const hasAnyTeam = hasTeam1 || hasTeam2;

  if (!hasAnyTeam) {
    return false;
  }

  if (match.isBye) {
    return true;
  }

  return hasTeam1 && hasTeam2;
}

function formatRoundLabel(
  round: number,
  resolveFinalsLabelA: (round: number) => string,
  resolveFinalsLabelB: (round: number) => string,
) {
  if (round >= 200 && round < 300) {
    const label = resolveFinalsLabelB(round);
    return `Catégorie B – ${label}`;
  }

  if (round >= 100 && round < 200) {
    const label = resolveFinalsLabelA(round);
    return `Catégorie A – ${label}`;
  }

  return `Tour ${round}`;
}

function resolveMatchTeamLabel(match: Match, teamKey: 'team1' | 'team2', teams: Team[], teamLookup: Map<string, Team>) {
  if (match.isBye) {
    return 'Exempt';
  }

  const compositeIds = teamKey === 'team1' ? match.team1Ids : match.team2Ids;
  const fallbackId = teamKey === 'team1' ? match.team1Id : match.team2Id;

  if (Array.isArray(compositeIds) && compositeIds.length > 0) {
    return compositeIds
      .map((id) => {
        const team = teamLookup.get(id);
        if (!team) {
          return `Équipe ${id}`;
        }
        const index = teams.indexOf(team);
        const label = teamLabel(team, index);
        return `${label}`;
      })
      .join('\n');
  }

  if (!fallbackId) {
    return 'Inconnu';
  }

  const team = teamLookup.get(fallbackId);
  if (!team) {
    return `Équipe ${fallbackId}`;
  }

  const index = teams.indexOf(team);
  return teamLabel(team, index);
}

function computeStandings(teams: Team[]) {
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    if (b.performance !== a.performance) {
      return b.performance - a.performance;
    }

    const tieBreakA = a.tieBreakDeltas ?? [];
    const tieBreakB = b.tieBreakDeltas ?? [];
    const maxLength = Math.max(tieBreakA.length, tieBreakB.length);

    for (let i = 0; i < maxLength; i += 1) {
      const deltaA = tieBreakA[i] ?? 0;
      const deltaB = tieBreakB[i] ?? 0;

      if (deltaB !== deltaA) {
        return deltaB - deltaA;
      }
    }

    return 0;
  });

  return sortedTeams.map((team, index) => ({
    rank: index + 1,
    label: teamLabel(team, index),
    wins: team.wins ?? 0,
    losses: team.losses ?? 0,
    pf: team.pointsFor ?? 0,
    pa: team.pointsAgainst ?? 0,
    diff: (team.pointsFor ?? 0) - (team.pointsAgainst ?? 0),
    performance: team.performance ?? 0,
  }));
}

export async function exportTournamentToPDF(tournament: Tournament) {
  if (!tournament) {
    throw new Error('Tournoi vide');
  }

  const teams = Array.isArray(tournament.teams) ? tournament.teams : [];
  if (teams.length === 0) {
    throw new Error('Tournoi vide');
  }

  const matches = collectMatches(tournament).filter(hasAssignedTeams);
  const teamLookup = teams.reduce<Map<string, Team>>((acc, team) => {
    acc.set(team.id, team);
    return acc;
  }, new Map());

  const categoryAFinalsRounds = Array.from(
    new Set(
      matches
        .filter((match) => typeof match.round === 'number' && match.round >= 100 && match.round < 200)
        .map((match) => match.round),
    ),
  );

  const categoryBFinalsRounds = Array.from(
    new Set(
      matches
        .filter((match) => typeof match.round === 'number' && match.round >= 200 && match.round < 300)
        .map((match) => match.round),
    ),
  );

  const resolveFinalsLabelA = createFinalsLabelResolver(categoryAFinalsRounds);
  const resolveFinalsLabelB = createFinalsLabelResolver(categoryBFinalsRounds);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;
  let cursorY = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`Pétanque Manager – ${tournament.name}`, marginX, cursorY);
  cursorY += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const meta = `Type: ${formatTournamentType(tournament.type)} • Terrains: ${tournament.courts} • Tour: ${tournament.currentRound} • Export: ${dayjs().format('DD/MM/YYYY HH:mm')}`;
  doc.text(meta, marginX, cursorY);
  cursorY += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Équipes', marginX, cursorY);
  cursorY += 10;

  const teamRows = teams.map((team, index) => {
    const players = team.players.map((player) => player.name).filter(Boolean).join('\n') || '—';
    return [String(index + 1), teamLabel(team, index), players];
  });

  autoTable(doc, {
    startY: cursorY,
    head: [['#', 'Nom', 'Joueurs']],
    body: teamRows,
    styles: { font: 'helvetica', fontSize: 10, lineColor: [180, 180, 180], lineWidth: 0.5 },
    headStyles: { fillColor: [45, 55, 72], textColor: [255, 255, 255], lineColor: [90, 90, 90], lineWidth: 0.75 },
    bodyStyles: { lineColor: [200, 200, 200], lineWidth: 0.5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 40 },
      1: { cellWidth: 220 },
      2: { cellWidth: 260 },
    },
    margin: { left: marginX, right: marginX },
    tableLineColor: [120, 120, 120],
    tableLineWidth: 0.5,
  });

  cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
  cursorY += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Matchs', marginX, cursorY);
  cursorY += 10;

  const rounds = Array.from(new Set(matches.map((match) => match.round)))
    .filter((round) => typeof round === 'number' && Number.isFinite(round))
    .sort((a, b) => a - b);

  rounds.forEach((round) => {
    const roundMatches = matches.filter((match) => match.round === round);
    if (roundMatches.length === 0) {
      return;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const roundLabel = formatRoundLabel(round, resolveFinalsLabelA, resolveFinalsLabelB);
    doc.text(roundLabel, marginX, cursorY);

    const body = roundMatches.map((match) => {
      const court = match.isBye ? '—' : match.court ?? '—';
      const labelA = resolveMatchTeamLabel(match, 'team1', teams, teamLookup);
      const labelB = resolveMatchTeamLabel(match, 'team2', teams, teamLookup);
      const score = match.completed && !match.isBye && match.team1Score != null && match.team2Score != null
        ? `${match.team1Score} – ${match.team2Score}`
        : '—';
      return [String(court), labelA, labelB, score];
    });

    autoTable(doc, {
      startY: cursorY + 8,
      head: [['Terrain', 'Équipe A', 'Équipe B', 'Score (A – B)']],
      body,
      styles: { font: 'helvetica', fontSize: 10, lineColor: [180, 180, 180], lineWidth: 0.5 },
      headStyles: { fillColor: [45, 55, 72], textColor: [255, 255, 255], lineColor: [90, 90, 90], lineWidth: 0.75 },
      bodyStyles: { lineColor: [200, 200, 200], lineWidth: 0.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 70 },
        1: { cellWidth: 190 },
        2: { cellWidth: 190 },
        3: { halign: 'center', cellWidth: 80 },
      },
      didParseCell: (data) => {
        if (data.column.index === 3) {
          data.cell.styles.halign = 'center';
        }
      },
      margin: { left: marginX, right: marginX },
      tableLineColor: [120, 120, 120],
      tableLineWidth: 0.5,
    });

    cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
    cursorY += 16;
  });

  const standings = computeStandings(teams);

  doc.addPage();
  cursorY = 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Classement', marginX, cursorY);
  cursorY += 10;

  const standingBody = standings.map((row) => [
    String(row.rank),
    row.label,
    String(row.wins),
    String(row.losses),
    String(row.diff),
    `${row.pf}/${row.pa}`,
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [['#', 'Équipe', 'V', 'D', '+/−', 'PF/PA']],
    body: standingBody,
    styles: { font: 'helvetica', fontSize: 10, lineColor: [180, 180, 180], lineWidth: 0.5 },
    headStyles: { fillColor: [45, 55, 72], textColor: [255, 255, 255], lineColor: [90, 90, 90], lineWidth: 0.75 },
    bodyStyles: { lineColor: [200, 200, 200], lineWidth: 0.5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 40 },
      1: { cellWidth: 220 },
      2: { halign: 'center', cellWidth: 40 },
      3: { halign: 'center', cellWidth: 40 },
      4: { halign: 'center', cellWidth: 50 },
      5: { halign: 'center', cellWidth: 80 },
    },
    margin: { left: marginX, right: marginX },
    tableLineColor: [120, 120, 120],
    tableLineWidth: 0.5,
  });

  const safeName = sanitizeFileName(tournament.name ?? 'tournoi');
  doc.save(`${safeName}_tournoi.pdf`);
}
