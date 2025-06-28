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
  const [showForm, setShowForm] = useState(false);

  const isSolo = tournamentType === 'melee' || tournamentType === 'tete-a-tete';

  const getPlayersPerTeam = () => {
    switch (tournamentType) {
      case 'tete-a-tete':
        return 1;
      case 'doublette':
        return 2;
      case 'triplette':
        return 3;
      case 'quadrette':
        return 4;
      case 'melee':
        return 1;
      default:
        return 2;
    }
  };

  const initializeForm = () => {
    setShowForm(true);
  };

  const handleAddTeamInternal = (teamPlayers: Player[]) => {
    onAddTeam(teamPlayers);
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
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
            .team { text-align: center; margin: 4px 0; padding: 6px; border: 1px solid #ccc; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Liste des ${isSolo ? 'Joueurs' : 'Équipes'}</h1>
          ${teams
            .map(
              (team) => `
            <div class="team">
              ${team.name} : ${team.players
                .map(player => `${player.name}${player.label ? ` [${player.label}]` : ''}`)
                .join(' - ')}
            </div>
          `
            )
            .join('')}
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
          <TeamForm
            playersPerTeam={getPlayersPerTeam()}
            tournamentType={tournamentType}
            onAddTeam={handleAddTeamInternal}
            onCancel={handleCancel}
          />
        </div>
      )}

        codex/modifier-la-présentation-des-cartes-d-équipe
      <div className="space-y-4">
        {teams.map(team => {
          const playerList = team.players.map(p => p.name).join(' - ');
          return (
            <div
              key={team.id}
              className="glass-card p-4 hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-medium">
                  {isSolo ? team.name : `${team.name} - ${playerList}`}
                </h3>
                <button
                  onClick={() => onRemoveTeam(team.id)}
                  className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10"
                  title={isSolo ? 'Supprimer le joueur' : "Supprimer l'équipe"}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

      <div className="space-y-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="glass-card p-3 hover:scale-[1.02] transition-all duration-300"
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-white font-medium">{team.name}</h3>
              <button
                onClick={() => onRemoveTeam(team.id)}
                className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-lg hover:bg-red-400/10"
                title={isSolo ? 'Supprimer le joueur' : "Supprimer l'équipe"}
              >
                <Trash2 className="w-5 h-5" />
              </button>
        main
            </div>
          );
        })}
      </div>

      {teams.length === 0 && !showForm && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-white/50 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-4 tracking-wide">
            {isSolo ? 'Aucun joueur inscrit' : 'Aucune équipe inscrite'}
          </h3>
          <p className="text-white/60 text-lg font-medium">
            {isSolo ? 'Commencez par créer des joueurs' : 'Commencez par créer des équipes'}
          </p>
        </div>
      )}
    </div>
  );
}

// Formulaire simplifié sans les implants cybernétiques
interface TeamFormProps {
  playersPerTeam: number;
  tournamentType: TournamentType;
  onAddTeam: (players: Player[]) => void;
  onCancel: () => void;
}

function TeamForm({ playersPerTeam, tournamentType, onAddTeam, onCancel }: TeamFormProps) {
  const [playerNames, setPlayerNames] = useState<string[]>(Array(playersPerTeam).fill(''));

  const isSolo = playersPerTeam === 1;

  const handleChange = (index: number, value: string) => {
    const names = [...playerNames];
    names[index] = value;
    setPlayerNames(names);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerNames.some((name) => !name.trim())) return;

    const labels = ['A', 'B', 'C', 'D'];
    const players = playerNames.map((name, idx) => ({
      id: crypto.randomUUID(),
      name: name.trim(),
      label: tournamentType === 'quadrette' ? labels[idx] : undefined,
      cyberImplants: [],
      neuralScore: 100,
      combatRating: 100,
      hackingLevel: 1,
      augmentationLevel: 0,
    }));

    onAddTeam(players);
  };

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white tracking-wider">
          {isSolo ? 'Nouveau joueur' : 'Nouvelle équipe'}
        </h3>
        <button
          onClick={onCancel}
          className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {playerNames.map((name, idx) => (
          <div key={idx}>
            <label className="block text-lg font-bold text-white mb-3 tracking-wide">
              Nom du joueur {playersPerTeam > 1 ? idx + 1 : ''}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleChange(idx, e.target.value)}
              placeholder="Entrez le nom du joueur"
              className="glass-input w-full px-4 py-3 text-lg font-medium tracking-wide"
              required
            />
          </div>
        ))}

        <div className="flex space-x-4">
          <button
            type="submit"
            className="glass-button flex-1 py-3 px-6 font-bold text-lg tracking-wider hover:scale-105 transition-all duration-300"
          >
            {isSolo ? 'Créer joueur' : 'Créer équipe'}
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
