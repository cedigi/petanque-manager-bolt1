import React, { useState, useEffect, useMemo } from 'react';
import { Tournament, Team, Match } from '../types/tournament';
import { Trophy, TrendingUp, TrendingDown, Printer, Loader2, Download } from 'lucide-react';

interface StandingsTabProps {
  tournament: Tournament;
}

export function StandingsTab({ tournament }: StandingsTabProps) {
  const { teams, matches, matchesB, name, type, currentRound, courts } = tournament;
  const isSolo = teams.every(t => t.players.length === 1);
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

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-lg" />;
    if (index === 1) return <Trophy className="w-6 h-6 text-gray-300 drop-shadow-lg" />;
    if (index === 2) return <Trophy className="w-6 h-6 text-orange-400 drop-shadow-lg" />;
    return <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-white">{index + 1}</span>;
  };

  const getPerformanceIcon = (performance: number) => {
    if (performance > 0) return <TrendingUp className="w-5 h-5 text-green-400" />;
    if (performance < 0) return <TrendingDown className="w-5 h-5 text-red-400" />;
    return <div className="w-5 h-5" />;
  };

  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const teamLookup = useMemo(() => {
    return teams.reduce<Record<string, { label: string; team: Team }>>((acc, team, index) => {
      acc[team.id] = {
        label: `${index + 1}`,
        team,
      };
      return acc;
    }, {});
  }, [teams]);

  const formatTournamentType = () => {
    const formatted = type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
    return formatted;
  };

  useEffect(() => {
    if (window.electronAPI?.onPrintError) {
      window.electronAPI.onPrintError((message) => {
        alert(`Erreur d'impression : ${message}`);
      });
    }
  }, []);

  const handlePrint = async () => {
    setIsPrinting(true);

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th style="text-align: center;">Position</th>
            <th>${isSolo ? 'Joueur' : 'Équipe'}</th>
            <th style="text-align: center;">V</th>
            <th style="text-align: center;">D</th>
            <th style="text-align: center;">+</th>
            <th style="text-align: center;">-</th>
            <th style="text-align: center;">Différentiel</th>
          </tr>
        </thead>
        <tbody>
          ${sortedTeams
            .map((team, index) => {
              const label = teams.indexOf(team) + 1;
              const names = team.players.map((p) => p.name).join(' - ');
              return `
            <tr class="${index < 3 ? 'podium' : ''}">
              <td class="position">${index + 1}</td>
              <td>${label} : ${names}</td>
              <td style="text-align: center;">${team.wins}</td>
              <td style="text-align: center;">${team.losses}</td>
              <td style="text-align: center;">${team.pointsFor}</td>
              <td style="text-align: center;">${team.pointsAgainst}</td>
              <td style="text-align: center;">${team.performance > 0 ? '+' : ''}${team.performance}</td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>
    `;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Classement</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #555;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border: 1px solid #555;
            }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .podium { background-color: #fff3cd; }
            .position { font-weight: bold; text-align: center; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${tableHtml}
        </body>
      </html>
    `;

    try {
      if (window.electronAPI?.printHtml) {
        await window.electronAPI.printHtml(printContent);
      } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const getMatchTeamLabel = (match: Match, teamKey: 'team1' | 'team2') => {
    if (match.isBye) {
      return 'Exempt';
    }

    const teamIds = teamKey === 'team1' ? match.team1Ids : match.team2Ids;
    const singleTeamId = teamKey === 'team1' ? match.team1Id : match.team2Id;

    if (teamIds && teamIds.length > 0) {
      return teamIds
        .map((id) => {
          const entry = teamLookup[id];
          if (!entry) {
            return 'Inconnu';
          }
          const playerNames = entry.team.players.map((player) => player.name).join(' / ');
          return `${entry.label} - ${playerNames || entry.team.name || 'Équipe'}`;
        })
        .join('\n');
    }

    if (!singleTeamId) {
      return 'Inconnu';
    }

    const entry = teamLookup[singleTeamId];
    if (!entry) {
      return 'Inconnu';
    }

    const playerNames = entry.team.players.map((player) => player.name).join(' / ');
    const fallbackName = entry.team.name || `Équipe ${entry.label}`;
    return `${entry.label} - ${playerNames || fallbackName}`;
  };

  const sanitizeFileName = (title: string) => {
    const sanitized = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();
    return sanitized || 'tournoi';
  };

  const handleExportPdf = async () => {
    setIsExporting(true);

    try {
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new JsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const addSectionTitle = (title: string, y: number) => {
        doc.setFontSize(16);
        doc.text(title, 40, y);
        return y + 12;
      };

      const ensureSpace = (currentY: number, requiredSpace = 80) => {
        if (currentY + requiredSpace > pageHeight - 40) {
          doc.addPage();
          return 60;
        }
        return currentY;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Rapport du tournoi', pageWidth / 2, 50, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text(`Nom : ${name}`, 40, 90);
      doc.text(`Type : ${formatTournamentType()}`, 40, 110);
      doc.text(`Terrains : ${courts}`, 40, 130);
      doc.text(`Tour actuel : ${currentRound}`, 40, 150);

      let cursorY = 190;

      // Section équipes
      cursorY = addSectionTitle('Liste des équipes', cursorY);
      cursorY = ensureSpace(cursorY, 120);
      doc.setFontSize(12);
      autoTable(doc, {
        startY: cursorY,
        head: [['#', "Nom de l'équipe", 'Joueurs']],
        body: teams.map((team, index) => [
          `${index + 1}`,
          team.name || `Équipe ${index + 1}`,
          team.players.map((player) => player.name).join('\n') || '—',
        ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [41, 50, 60], textColor: 255 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 40 },
          1: { cellWidth: 200 },
          2: { cellWidth: 280 },
        },
      });
      cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 30;

      // Section matchs
      const allMatches: Match[] = [...matches, ...matchesB];
      if (allMatches.length > 0) {
        cursorY = ensureSpace(cursorY);
        cursorY = addSectionTitle('Liste des matchs', cursorY);
        const matchesByRound = allMatches.reduce<Record<number, Match[]>>((acc, match) => {
          if (!acc[match.round]) {
            acc[match.round] = [];
          }
          acc[match.round].push(match);
          return acc;
        }, {});

        const sortedRounds = Object.keys(matchesByRound)
          .map(Number)
          .sort((a, b) => a - b);

        sortedRounds.forEach((round, roundIndex) => {
          const roundMatches = matchesByRound[round];
          if (!roundMatches || roundMatches.length === 0) {
            return;
          }

          cursorY = ensureSpace(cursorY);
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.text(`Tour ${round}`, 40, cursorY);
          cursorY += 10;

          doc.setFont('helvetica', 'normal');
          autoTable(doc, {
            startY: cursorY,
            head: [['Terrain', "Équipe 1", 'Score', "Équipe 2"]],
            body: roundMatches.map((match) => [
              match.isBye ? '—' : `${match.court}`,
              getMatchTeamLabel(match, 'team1'),
              match.completed
                ? `${match.team1Score ?? 0} - ${match.team2Score ?? 0}`
                : 'À jouer',
              getMatchTeamLabel(match, 'team2'),
            ]),
            styles: { fontSize: 10, cellPadding: 6, valign: 'middle' },
            headStyles: { fillColor: [41, 50, 60], textColor: 255 },
            columnStyles: {
              0: { halign: 'center', cellWidth: 60 },
              1: { cellWidth: 200 },
              2: { halign: 'center', cellWidth: 80 },
              3: { cellWidth: 200 },
            },
            didDrawPage: (data) => {
              cursorY = data.cursor.y + 20;
            },
          });

          cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + (roundIndex === sortedRounds.length - 1 ? 30 : 20);
        });
      }

      // Section classement
      cursorY = ensureSpace(cursorY);
      cursorY = addSectionTitle('Classement', cursorY);
      autoTable(doc, {
        startY: cursorY,
        head: [['Position', isSolo ? 'Joueur' : 'Équipe', 'V', 'D', '+', '-', 'Diff.']],
        body: sortedTeams.map((team, index) => [
          `${index + 1}`,
          team.players.map((player) => player.name).join(' - ') || team.name || `Équipe ${index + 1}`,
          `${team.wins}`,
          `${team.losses}`,
          `${team.pointsFor}`,
          `${team.pointsAgainst}`,
          `${team.performance > 0 ? '+' : ''}${team.performance}`,
        ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [41, 50, 60], textColor: 255 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 70 },
          1: { cellWidth: 220 },
          2: { halign: 'center', cellWidth: 40 },
          3: { halign: 'center', cellWidth: 40 },
          4: { halign: 'center', cellWidth: 40 },
          5: { halign: 'center', cellWidth: 40 },
          6: { halign: 'center', cellWidth: 60 },
        },
      });

      const fileName = `${sanitizeFileName(name)}-tournoi.pdf`;
      doc.save(fileName);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white tracking-wider">Classement</h2>
        <div className="flex items-center space-x-6">
          <div className="text-lg text-white/80 font-medium">
            {teams.length} {isSolo ? 'joueur' : 'équipe'}{teams.length > 1 ? 's' : ''} inscrit{teams.length > 1 ? 's' : ''}
          </div>
          {teams.length > 0 && (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="glass-button-secondary flex items-center space-x-2 px-4 py-2 font-bold tracking-wide hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isExporting ? 'Export…' : 'Télécharger en PDF'}</span>
              </button>
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="glass-button-secondary flex items-center space-x-2 px-4 py-2 font-bold tracking-wide hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPrinting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                <span>{isPrinting ? 'Impression…' : 'Imprimer'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="glass-table w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-center font-bold tracking-wider">
                  Position
                </th>
                <th className="px-6 py-4 text-left font-bold tracking-wider">
                  {isSolo ? 'Joueur' : 'Équipe'}
                </th>
                <th className="px-6 py-4 text-center font-bold tracking-wider">
                  V
                </th>
                <th className="px-6 py-4 text-center font-bold tracking-wider">
                  D
                </th>
                <th className="px-6 py-4 text-center font-bold tracking-wider">
                  +
                </th>
                <th className="px-6 py-4 text-center font-bold tracking-wider">
                  -
                </th>
                <th className="px-6 py-4 text-center font-bold tracking-wider">
                  Différentiel
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => {
                const label = teams.indexOf(team) + 1;
                const names = team.players.map((p) => p.name).join(' - ');
                return (
                  <tr
                    key={team.id}
                    className={`hover:bg-white/5 transition-colors ${
                      index < 3
                        ? 'bg-gradient-to-r from-yellow-400/10 to-transparent'
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        {getPositionIcon(index)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-white text-lg">
                        {label} : {names}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-2xl font-bold text-green-400">
                        {team.wins}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-2xl font-bold text-red-400">
                        {team.losses}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-white">
                        {team.pointsFor}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-white">
                        {team.pointsAgainst}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getPerformanceIcon(team.performance)}
                        <span
                          className={`text-lg font-bold ${
                            team.performance > 0
                              ? 'text-green-400'
                              : team.performance < 0
                                ? 'text-red-400'
                                : 'text-white/60'
                          }`}
                        >
                          {team.performance > 0 ? '+' : ''}
                          {team.performance}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {teams.length === 0 && (
        <div className="text-center py-16">
          <Trophy className="w-16 h-16 text-white/50 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-4 tracking-wide">
            Aucun classement disponible
          </h3>
          <p className="text-white/60 text-lg font-medium">
            Le classement apparaîtra une fois que {isSolo ? 'des joueurs' : 'des équipes'} seront inscrits
          </p>
        </div>
      )}
    </div>
  );
}
