import React from 'react';
import { Team } from '../types/tournament';
import { Trophy, TrendingUp, TrendingDown, Printer } from 'lucide-react';

interface StandingsTabProps {
  teams: Team[];
}

export function StandingsTab({ teams }: StandingsTabProps) {
  const isSolo = teams.every(t => t.players.length === 1);
  const sortedTeams = [...teams].sort((a, b) => {
    // Sort by wins first, then by point differential
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return b.performance - a.performance;
  });

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Trophy className="w-5 h-5 text-orange-500" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400">{index + 1}</span>;
  };

  const getPerformanceIcon = (performance: number) => {
    if (performance > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (performance < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4" />;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Résultats</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 10px;
              color: #333;
            }
            h1 {
              text-align: center;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              padding: 8px;
              text-align: left;
            }
            tbody tr {
              border-bottom: 1px solid #000;
            }
            tbody tr:last-child {
              border-bottom: none;
            }
            th { 
              background: #f1f5f9; 
              font-weight: bold;
            }
            tr:nth-child(even) { 
              background: #f8fafc;
            }
            .podium { 
              background: linear-gradient(to right, #dbeafe, transparent);
            }
            .position { 
              font-weight: bold; 
              text-align: center;
            }
            .team-name { 
              font-weight: bold;
            }
            .wins { 
              color: #059669; 
              font-weight: bold; 
              text-align: center;
            }
            .losses { 
              color: #dc2626; 
              font-weight: bold; 
              text-align: center;
            }
            .performance-positive { 
              color: #059669; 
              font-weight: bold;
            }
            .performance-negative { 
              color: #dc2626; 
              font-weight: bold;
            }
            .performance-neutral { 
              color: #64748b;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Résultats</h1>
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
              ${sortedTeams.map((team, index) => `
                <tr class="${index < 3 ? 'podium' : ''}">
                  <td class="position">${index + 1}</td>
                  <td class="team-name">
                    ${team.name} - ${team.players.map(player => `${player.label ? `[${player.label}] ` : ''}${player.name}`).join(', ')}
                  </td>
                  <td class="wins">${team.wins}</td>
                  <td class="losses">${team.losses}</td>
                  <td style="text-align: center;">${team.pointsFor}</td>
                  <td style="text-align: center;">${team.pointsAgainst}</td>
                  <td class="performance-${team.performance > 0 ? 'positive' : team.performance < 0 ? 'negative' : 'neutral'}" style="text-align: center;">
                    ${team.performance > 0 ? '+' : ''}${team.performance}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Classement</h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {teams.length} {isSolo ? 'joueur' : 'équipe'}{teams.length > 1 ? 's' : ''} inscrit{teams.length > 1 ? 's' : ''}
          </div>
          {teams.length > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le classement</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isSolo ? 'Joueur' : 'Équipe'}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  V
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  D
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  +
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  -
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Différentiel
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedTeams.map((team, index) => (
                <tr key={team.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  index < 3 ? 'bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20' : ''
                }`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getPositionIcon(index)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">{team.name}</div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {team.players.map((player) => (
                        <div key={player.id} className="flex items-center space-x-1">
                          {player.label && (
                            <span className="w-4 h-4 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                              {player.label}
                            </span>
                          )}
                          <span>{player.name}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">{team.wins}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-semibold text-red-600 dark:text-red-400">{team.losses}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{team.pointsFor}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{team.pointsAgainst}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {getPerformanceIcon(team.performance)}
                      <span className={`font-medium ${
                        team.performance > 0 ? 'text-green-600 dark:text-green-400' :
                        team.performance < 0 ? 'text-red-600 dark:text-red-400' :
                        'text-gray-500 dark:text-gray-400'
                      }`}>
                        {team.performance > 0 ? '+' : ''}{team.performance}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucun classement disponible
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Le classement apparaîtra une fois que {isSolo ? 'des joueurs' : 'des équipes'} seront inscrits
          </p>
        </div>
      )}
    </div>
  );
}
