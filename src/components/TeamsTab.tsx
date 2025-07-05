import React, { useState } from 'react';
import { Player, Team, TournamentType } from '../types/tournament';
import { generateUuid } from '../utils/uuid';
import { Plus, Trash2, Users, Printer, X, Edit3 } from 'lucide-react';

interface TeamsTabProps {
  teams: Team[];
  tournamentType: TournamentType;
  onAddTeam: (players: Player[]) => void;
  onRemoveTeam: (teamId: string) => void;
  onUpdateTeam: (teamId: string, players: Player[]) => void;
}

export function TeamsTab({ teams, tournamentType, onAddTeam, onRemoveTeam, onUpdateTeam }: TeamsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editNames, setEditNames] = useState<string[]>([]);

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
            onClick={() => setShowForm(true)}
            className="glass-button flex items-center space-x-2 px-4 py-2 transition-all duration-300 hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter {isSolo ? 'Joueur' : 'Équipe'}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <CompactTeamForm
          tournamentType={tournamentType}
          playersPerTeam={getPlayersPerTeam()}
          onAddTeam={onAddTeam}
          onClose={() => setShowForm(false)}
        />
      )}

      <div className="space-y-2">
        {teams.map(team => (
          <React.Fragment key={team.id}>
            <div className="glass-card p-3 hover:scale-[1.01] transition-all duration-300">
              <div className="flex items-center justify-between">
              {/* Partie gauche : Icône + Nom équipe + Joueurs sur une ligne */}
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Users className="w-5 h-5 text-white flex-shrink-0" />
                
                {/* Nom de l'équipe et joueurs sur la même ligne */}
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="font-bold text-white text-lg flex-shrink-0">
                    {team.name} :
                  </span>
                  
                  {/* Liste des joueurs avec labels */}
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {team.players.map((player, index) => (
                      <React.Fragment key={player.id}>
                        {index > 0 && <span className="text-white/60">-</span>}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {player.label && (
                            <span className="w-5 h-5 bg-blue-400/20 border border-blue-400 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {player.label}
                            </span>
                          )}
                          <span className="text-white font-medium truncate">
                            {player.name}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Partie droite : Badge poule + Bouton supprimer */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                {team.poolId && (
                  <span className="px-2 py-1 bg-blue-500/30 border border-blue-400 text-blue-400 rounded-full text-xs font-bold">
                    Poule
                  </span>
                )}
                <button
                  onClick={() => {
                    setEditingTeamId(team.id);
                    setEditNames(team.players.map(p => p.name));
                  }}
                  className="text-white hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/10"
                  title="Modifier"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onRemoveTeam(team.id)}
                  className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-lg hover:bg-red-400/10"
                  title={isSolo ? 'Supprimer le joueur' : "Supprimer l'équipe"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          {editingTeamId === team.id && (
            <EditTeamForm
              tournamentType={tournamentType}
              players={team.players}
              playerNames={editNames}
              onChangeNames={setEditNames}
              onSave={(names) => {
                const players = team.players.map((p, i) => ({ ...p, name: names[i] || '' }));
                onUpdateTeam(team.id, players);
                setEditingTeamId(null);
              }}
              onCancel={() => setEditingTeamId(null)}
            />
          )}
          </React.Fragment>
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

// Nouveau formulaire compact
interface CompactTeamFormProps {
  tournamentType: TournamentType;
  playersPerTeam: number;
  onAddTeam: (players: Player[]) => void;
  onClose: () => void;
}

function CompactTeamForm({ tournamentType, playersPerTeam, onAddTeam, onClose }: CompactTeamFormProps) {
  const [playerNames, setPlayerNames] = useState<string[]>(Array(playersPerTeam).fill(''));

  const isSolo = tournamentType === 'melee' || tournamentType === 'tete-a-tete';
  const labels = tournamentType === 'quadrette' ? ['A', 'B', 'C', 'D'] : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validNames = playerNames.filter(name => name.trim());
    if (validNames.length === 0) return;

    const players: Player[] = validNames.map((name, index) => ({
      id: generateUuid(),
      name: name.trim(),
      label: labels?.[index],
      cyberImplants: [],
      neuralScore: 100,
      combatRating: 100,
      hackingLevel: 1,
      augmentationLevel: 0
    }));

    onAddTeam(players);
    onClose();
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  return (
    <div className="mb-8">
      <div className="compact-team-form">
        <div className="form-header">
          <h3 className="form-title">
            Nouvelle {isSolo ? 'inscription' : 'équipe'}
          </h3>
          <button
            onClick={onClose}
            className="close-button"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-content">
          <div className="players-grid">
            {Array.from({ length: playersPerTeam }, (_, index) => (
              <div key={index} className="player-input-group">
                <label className="player-label">
                  {labels ? `Joueur ${labels[index]}` : `Joueur ${index + 1}`}
                </label>
                <input
                  type="text"
                  value={playerNames[index]}
                  onChange={(e) => updatePlayerName(index, e.target.value)}
                  placeholder={`Nom du joueur ${labels?.[index] || index + 1}`}
                  className="player-input"
                  required={index === 0}
                />
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={!playerNames[0]?.trim()}
            >
              Créer {isSolo ? 'joueur' : 'équipe'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditTeamFormProps {
  tournamentType: TournamentType;
  players: Player[];
  playerNames: string[];
  onChangeNames: (names: string[]) => void;
  onSave: (names: string[]) => void;
  onCancel: () => void;
}

function EditTeamForm({ tournamentType, players, playerNames, onChangeNames, onSave, onCancel }: EditTeamFormProps) {
  const labels = tournamentType === 'quadrette' ? ['A', 'B', 'C', 'D'] : undefined;
  const isSolo = tournamentType === 'melee' || tournamentType === 'tete-a-tete';

  const updateName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    onChangeNames(newNames);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(playerNames.map(n => n.trim()));
  };

  return (
    <div className="mb-4">
      <div className="compact-team-form">
        <div className="form-header">
          <h3 className="form-title">Modifier {isSolo ? 'le joueur' : "l'équipe"}</h3>
          <button onClick={onCancel} className="close-button" title="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form-content">
          <div className="players-grid">
            {players.map((p, idx) => (
              <div key={p.id} className="player-input-group">
                <label className="player-label">
                  {labels ? `Joueur ${labels[idx]}` : `Joueur ${idx + 1}`}
                </label>
                <input
                  type="text"
                  value={playerNames[idx]}
                  onChange={(e) => updateName(idx, e.target.value)}
                  className="player-input"
                  required={idx === 0}
                />
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={!playerNames[0]?.trim()}>Sauvegarder</button>
            <button type="button" onClick={onCancel} className="cancel-button">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}