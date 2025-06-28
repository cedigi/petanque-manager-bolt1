import React from 'react';
import { Team } from '../types/tournament';
import { Trophy, TrendingUp, TrendingDown, Printer } from 'lucide-react';

interface StandingsTabProps {
  teams: Team[];
}

export function StandingsTab({ teams }: StandingsTabProps) {
  const isSolo = teams.every(t => t.players.length === 1);
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return b.performance - a.performance;
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Classement</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .podium { background-color: #fff3cd; }
            .position { font-weight: bold; text-align: center; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Classement</h1>
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
                  <td>
                    ${team.name}
                    <br/><small>${team.players.map(player => `${player.label ? `[${player.label}] ` : ''}${player.name}`).join(', ')}</small>
                  </td>
                  <td style="text-align: center;">${team.wins}</td>
                  <td style="text-align: center;">${team.losses}</td>
                  <td style="text-align: center;">${team.pointsFor}</td>
                  <td style="text-align: center;">${team.pointsAgainst}</td>
                  <td style="text-align: center;">${team.performance > 0 ? '+' : ''}${team.performance}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 8px 16px; font-size: 16px;">Imprimer</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    // The user can review the preview window and click the button to print
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
            <button
              onClick={handlePrint}
              className="glass-button-secondary flex items-center space-x-2 px-4 py-2 font-bold tracking-wide hover:scale-105 transition-all duration-300"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
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
              {sortedTeams.map((team, index) => (
                <tr key={team.id} className={`hover:bg-white/5 transition-colors ${
                  index < 3 ? 'bg-gradient-to-r from-yellow-400/10 to-transparent' : ''
                }`}>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      {getPositionIcon(index)}
                    </div>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap">
                    <span className="font-bold text-white text-lg">
                      {team.name}
                      {team.players.length > 0 && ' - '}
                      {team.players
                        .map((player) =>
                          `${player.label ? `[${player.label}] ` : ''}${player.name}`
                        )
                        .join(', ')}
                    </span>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    <span className="text-2xl font-bold text-green-400">{team.wins}</span>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    <span className="text-2xl font-bold text-red-400">{team.losses}</span>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-white">{team.pointsFor}</span>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-white">{team.pointsAgainst}</span>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {getPerformanceIcon(team.performance)}
                      <span className={`text-lg font-bold ${
                        team.performance > 0 ? 'text-green-400' :
                        team.performance < 0 ? 'text-red-400' :
                        'text-white/60'
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