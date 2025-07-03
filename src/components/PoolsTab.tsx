import React from 'react';
import { Pool, Team, Tournament } from '../types/tournament';
import { Grid3X3, Users, Trophy, Shuffle, Printer } from 'lucide-react';

interface PoolsTabProps {
  tournament: Tournament;
  teams: Team[];
  pools: Pool[];
  onGeneratePools: () => void;
}

export function PoolsTab({ tournament, teams, pools, onGeneratePools }: PoolsTabProps) {
  const isSolo = tournament.type === 'melee' || tournament.type === 'tete-a-tete';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Poules - ${tournament.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 30px; }
            .pools-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .pool { border: 2px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
            .pool-title { font-weight: bold; font-size: 18px; margin-bottom: 15px; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 4px; }
            .team { padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; background: #f9f9f9; }
            .team-name { font-weight: bold; margin-bottom: 5px; }
            .team-players { font-size: 14px; color: #666; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Poules - ${tournament.name}</h1>
          <div class="pools-container">
            ${pools.map(pool => `
              <div class="pool">
                <div class="pool-title">${pool.name}</div>
                ${pool.teamIds.map(teamId => {
                  const team = teams.find(t => t.id === teamId);
                  return team ? `
                    <div class="team">
                      <div class="team-name">${team.name}</div>
                      <div class="team-players">${team.players.map(p => `${p.label ? `[${p.label}] ` : ''}${p.name}`).join(', ')}</div>
                    </div>
                  ` : '';
                }).join('')}
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
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white tracking-wider">Poules</h2>
        <div className="flex space-x-4">
          {pools.length > 0 && (
            <button
              onClick={handlePrint}
              className="glass-button-secondary flex items-center space-x-2 px-4 py-2 transition-all duration-300 hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
          )}
          <button
            onClick={onGeneratePools}
            className="glass-button flex items-center space-x-2 px-6 py-3 font-bold tracking-wide hover:scale-105 transition-all duration-300"
            disabled={teams.length < 4}
          >
            <Shuffle className="w-5 h-5" />
            <span>Générer les poules</span>
          </button>
        </div>
      </div>

      {teams.length < 4 && (
        <div className="glass-card p-6 mb-8 bg-orange-500/20 border-orange-400/40">
          <p className="text-orange-200 font-medium text-lg">
            Vous devez inscrire au moins 4 {isSolo ? 'joueurs' : 'équipes'} pour générer des poules.
          </p>
        </div>
      )}

      {pools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map((pool) => (
            <div key={pool.id} className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/20 bg-white/5">
                <h3 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
                  <Grid3X3 className="w-5 h-5" />
                  <span>{pool.name}</span>
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {pool.teamIds.map((teamId) => {
                  const team = teams.find(t => t.id === teamId);
                  if (!team) return null;
                  
                  return (
                    <div key={teamId} className="glass-card p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <Users className="w-5 h-5 text-white" />
                        <h4 className="font-bold text-white text-lg">{team.name}</h4>
                      </div>
                      <div className="space-y-2">
                        {team.players.map((player) => (
                          <div key={player.id} className="flex items-center space-x-2 text-sm text-white/80">
                            {player.label && (
                              <span className="w-5 h-5 bg-blue-400/20 border border-blue-400 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                                {player.label}
                              </span>
                            )}
                            <span>{player.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Grid3X3 className="w-16 h-16 text-white/50 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-4 tracking-wide">
            Aucune poule générée
          </h3>
          <p className="text-white/60 text-lg font-medium">
            Générez les poules pour organiser le tournoi
          </p>
        </div>
      )}

      {pools.length > 0 && (
        <div className="mt-8 glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-4 tracking-wide flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Répartition des poules</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-blue-400">{pools.length}</div>
              <div className="text-white/70 text-sm">Poules créées</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-green-400">
                {pools.filter(p => p.teamIds.length === 4).length}
              </div>
              <div className="text-white/70 text-sm">Poules de 4</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {pools.filter(p => p.teamIds.length === 3).length}
              </div>
              <div className="text-white/70 text-sm">Poules de 3</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-white">{teams.length}</div>
              <div className="text-white/70 text-sm">Total équipes</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}