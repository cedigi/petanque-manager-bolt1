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
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  const isSolo = tournamentType === 'melee' || tournamentType === 'tete-a-tete';

  const getPlayersPerTeam = () => {
    switch (tournamentType) {
      case 'tete-a-tete': return 1;
      case 'doublette': 
      case 'doublette-poule': return 2;
      case 'triplette': 
      case 'triplette-poule': return 3;
      case 'quadrette': return 4;
      case 'melee': return 1;
      default: return 2;
    }
  };

  const initializeForm = () => {
    setPlayers([]);
    setCurrentPlayerIndex(0);
    setShowForm(true);
  };

  const handleAddPlayer = (player: Player) => {
    const updatedPlayers = [...players, player];
    setPlayers(updatedPlayers);

    if (updatedPlayers.length === getPlayersPerTeam()) {
      onAddTeam(updatedPlayers);
      setShowForm(false);
      setPlayers([]);
      setCurrentPlayerIndex(0);
    } else {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setPlayers([]);
    setCurrentPlayerIndex(0);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Équipes</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            .team { margin-bottom: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 8px; }
            .team-name { font-weight: bold; font-size: 18px; margin-bottom: 10px; }
            .player { margin: 5px 0; padding: 8px; background: #f5f5f5; border-radius: 4px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Liste des ${isSolo ? 'Joueurs' : 'Équipes'}</h1>
          ${teams.map(team => `
            <div class="team">
              <div class="team-name">${team.name}</div>
              ${team.players.map(player => `
                <div class="player">
                  ${player.name} ${player.label ? `[${player.label}]` : ''}
                </div>
              `).join('')}
            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white tracking-wider">
          {isSolo ? 'Joueurs' : 'Équipes'}
        </h2>
        <div className="flex space-x-4">
          {teams.length > 0 && (
            <button
              onClick={handlePrint}
              className="glass-button-secondary flex items-center space-x-2 px-4 py-2 transition-all duration-300 hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
          )}
          <button
            onClick={initializeForm}
            className="glass-button flex items-center space-x-2 px-4 py-2 transition-all duration-300 hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter {isSolo ? 'Joueur' : 'Équipe'}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-8">
          <div className="mb-4">
            <div className="flex items-center space-x-4 mb-2">
              <span className="text-white font-bold">
                Joueur {currentPlayerIndex + 1}/{getPlayersPerTeam()}
              </span>
              {players.length > 0 && (
                <div className="flex space-x-2">
                  {players.map((player, index) => (
                    <div key={player.id} className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  ))}
                  {Array.from({ length: getPlayersPerTeam() - players.length }, (_, index) => (
                    <div key={`empty-${index}`} className="w-3 h-3 border border-white/40 rounded-full"></div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <PlayerForm
            onAddPlayer={handleAddPlayer}
            onCancel={handleCancel}
            playerLabel={tournamentType === 'quadrette' ? ['A', 'B', 'C', 'D'][currentPlayerIndex] : undefined}
          />
        </div>
      )}

      <div className="space-y-4">
        {teams.map((team) => (
          <div key={team.id} className="glass-card p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <Users className="w-6 h-6 text-white" />
                  <h3 className="font-bold text-white text-xl tracking-wide">{team.name}</h3>
                  {team.poolId && (
                    <span className="px-3 py-1 bg-blue-500/30 border border-blue-400 text-blue-400 rounded-full text-sm font-bold">
                      Poule assignée
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemoveTeam(team.id)}
                className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10"
                title={isSolo ? 'Supprimer le joueur' : "Supprimer l'équipe"}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {team.players.map((player: Player) => (
                <div
                  key={player.id}
                  className="glass-card p-4"
                >
                  <div className="flex items-center space-x-3">
                    {player.label && (
                      <span className="w-8 h-8 bg-blue-400/20 border border-blue-400 text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
                        {player.label}
                      </span>
                    )}
                    <span className="font-bold text-white text-lg">{player.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && !showForm && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-white/50 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-4 tracking-wide">
            {isSolo ? 'Aucun joueur inscrit' : 'Aucune équipe inscrite'}
          </h3>
          <p className="text-white/60 text-lg font-medium">
            {isSolo
              ? 'Commencez par créer des joueurs'
              : 'Commencez par créer des équipes'}
          </p>
        </div>
      )}
    </div>
  );
}

// Formulaire simplifié sans les implants cybernétiques
interface PlayerFormProps {
  onAddPlayer: (player: Player) => void;
  onCancel: () => void;
  playerLabel?: string;
}

function PlayerForm({ onAddPlayer, onCancel, playerLabel }: PlayerFormProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const player: Player = {
        id: crypto.randomUUID(),
        name: name.trim(),
        label: playerLabel,
        cyberImplants: [],
        neuralScore: 100,
        combatRating: 100,
        hackingLevel: 1,
        augmentationLevel: 0
      };
      onAddPlayer(player);
    }
  };

  return (
    <div className="glass-card p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white tracking-wider">
          Nouveau joueur {playerLabel && `[${playerLabel}]`}
        </h3>
        <button
          onClick={onCancel}
          className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-lg font-bold text-white mb-3 tracking-wide">
            Nom du joueur
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Entrez le nom du joueur"
            className="glass-input w-full px-4 py-3 text-lg font-medium tracking-wide"
            required
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="glass-button flex-1 py-3 px-6 font-bold text-lg tracking-wider hover:scale-105 transition-all duration-300"
          >
            Créer joueur
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="glass-button-secondary px-6 py-3 font-bold text-lg tracking-wider hover:scale-105 transition-all duration-300"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}