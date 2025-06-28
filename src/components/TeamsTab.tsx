import React, { useState } from 'react';
import { Player, Team, TournamentType } from '../types/tournament';
import { Plus, Trash2, Users, Printer } from 'lucide-react';

interface TeamsTabProps {
  teams: Team[];
  tournamentType: TournamentType;
  onAddTeam: (players: Player[]) => void;
  onRemoveTeam: (teamId: string) => void;
}

export function TeamsTab({ teams, tournamentType, onAddTeam, onRemoveTeam }: TeamsTabProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [showForm, setShowForm] = useState(false);

  const isSolo = tournamentType === 'melee' || tournamentType === 'tete-a-tete';

  const getPlayersPerTeam = () => {
    switch (tournamentType) {
      case 'tete-a-tete': return 1;
      case 'doublette': return 2;
      case 'triplette': return 3;
      case 'quadrette': return 4;
      case 'melee': return 1;
      default: return 2;
    }
  };

  const initializeForm = () => {
    const playersCount = getPlayersPerTeam();
    const newPlayers: Player[] = Array.from({ length: playersCount }, (_, index) => ({
      id: crypto.randomUUID(),
      name: '',
      label: tournamentType === 'quadrette' ? ['A', 'B', 'C', 'D'][index] : undefined,
    }));
    setPlayers(newPlayers);
    setShowForm(true);
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = { ...updatedPlayers[index], name };
    setPlayers(updatedPlayers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validPlayers = players.filter(player => player.name.trim());
    if (validPlayers.length === getPlayersPerTeam()) {
      onAddTeam(validPlayers);
      setShowForm(false);
      setPlayers([]);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setPlayers([]);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Liste des équipes</title>
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
            .team-list {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .team-item {
              padding: 8px 0;
              border-bottom: 1px solid #000;
            }
            .team-item:last-child {
              border-bottom: none;
            }
            .team-name {
              font-weight: bold;
              font-size: 16px;
              color: #1e40af;
              margin-bottom: 8px;
            }
            .player-list {
              display: flex;
              flex-wrap: wrap;
              gap: 4px 12px;
            }
            .player {
              display: inline-flex;
              align-items: center;
              font-size: 12px;
            }
            .player-label {
              display: inline-block;
              width: 20px;
              height: 20px;
              background: #dbeafe;
              color: #1e40af;
              border-radius: 50%;
              text-align: center;
              line-height: 20px;
              font-size: 12px;
              font-weight: bold;
              margin-right: 8px;
            }
            @media print {
              body { margin: 0; }
              .team-item { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Liste des équipes</h1>
          <div class="team-list">
            ${teams.map(team => `
              <div class="team-item">
                <div class="team-name">${team.name}</div>
                ${!isSolo
                  ? `<div class="player-list">${team.players
                      .map((player: Player) => `
                        <div class="player">
                          ${player.label ? `<span class="player-label">${player.label}</span>` : ''}
                          ${player.name}
                        </div>
                      `)
                      .join('')}</div>`
                  : ''}
              </div>
            `).join('')}
          </div>
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isSolo ? 'Joueurs' : 'Équipes'}
        </h2>
        <div className="flex space-x-3">
          {teams.length > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer la liste</span>
            </button>
          )}
          <button
            onClick={initializeForm}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter {isSolo ? 'un joueur' : 'une équipe'}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {isSolo ? 'Nouveau joueur' : `Nouvelle équipe (${getPlayersPerTeam()} joueur${getPlayersPerTeam() > 1 ? 's' : ''})`}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {players.map((player, index) => (
              <div key={player.id} className="flex items-center space-x-3">
                {tournamentType === 'quadrette' && (
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-medium">
                    {player.label}
                  </div>
                )}
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  placeholder={`Nom du joueur ${tournamentType === 'quadrette' ? player.label : index + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            ))}
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des équipes en format vertical compact */}
      <div className="space-y-1">
        {teams.map((team) => (
          <div key={team.id} className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900 dark:text-white">{team.name}</h3>
                </div>
                {!isSolo && (
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {team.players.map((player: Player) => (
                      <div
                        key={player.id}
                        className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
                      >
                        {player.label && (
                          <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                            {player.label}
                          </span>
                        )}
                        <span>{player.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => onRemoveTeam(team.id)}
                className="text-red-500 hover:text-red-700 transition-colors ml-4"
                title={isSolo ? 'Supprimer le joueur' : "Supprimer l'équipe"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && !showForm && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {isSolo ? 'Aucun joueur inscrit' : 'Aucune équipe inscrite'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {isSolo
              ? 'Commencez par ajouter des joueurs pour votre tournoi'
              : 'Commencez par ajouter des équipes pour votre tournoi'}
          </p>
        </div>
      )}
    </div>
  );
}
