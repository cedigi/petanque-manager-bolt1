import React, { useState } from 'react';
import { Match, Team } from '../types/tournament';
import { Play, Edit3, MapPin, Trophy, Printer, ChevronDown } from 'lucide-react';

interface MatchesTabProps {
  matches: Match[];
  teams: Team[];
  currentRound: number;
  courts: number;
  onGenerateRound: () => void;
  onUpdateScore: (matchId: string, team1Score: number, team2Score: number) => void;
  onUpdateCourt: (matchId: string, court: number) => void;
}

export function MatchesTab({
  matches,
  teams,
  currentRound,
  courts,
  onGenerateRound,
  onUpdateScore,
  onUpdateCourt
}: MatchesTabProps) {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<{ team1: number; team2: number }>({ team1: 0, team2: 0 });
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const isSolo = teams.every(t => t.players.length === 1);

  const getTeamName = (teamId: string) => {
    const index = teams.findIndex(t => t.id === teamId);
    const team = teams[index];
    if (!team) return isSolo ? 'Joueur inconnu' : 'Équipe inconnue';
    if (isSolo) {
      const player = team.players[0];
      return `${index + 1} : ${player.name}`;
    }
    return team.name;
  };

  const getTeamPlayers = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return '';
    return team.players
      .map(player => (player.label ? `[${player.label}] ${player.name}` : player.name))
      .join(' - ');
  };

  const getGroupLabel = (ids: string[]) => {
    const labels = ids.map(id => {
      const index = teams.findIndex(t => t.id === id);
      const team = teams[index];
      if (!team) return 'Inconnu';
      if (isSolo) {
        const player = team.players[0];
        return `${index + 1} : ${player.name}`;
      }
      return team.name || team.players[0]?.name || 'Inconnu';
    });
    return labels.join(isSolo ? ' - ' : ' + ');
  };

  const handleEditScore = (match: Match) => {
    setEditingMatch(match.id);
    setEditScores({
      team1: match.team1Score || 0,
      team2: match.team2Score || 0,
    });
  };

  const handleSaveScore = (matchId: string) => {
    onUpdateScore(matchId, editScores.team1, editScores.team2);
    setEditingMatch(null);
  };

  const handleCancelEdit = () => {
    setEditingMatch(null);
  };

  const groupedMatches = matches.reduce((acc: { [round: number]: Match[] }, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {});

  const sortedRounds = Object.keys(groupedMatches).map(Number).sort((a, b) => b - a);

  const handlePrintRound = (round: number) => {
    const roundMatches = groupedMatches[round];
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tour ${round}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
            th, td { padding: 12px; border: 1px solid #ddd; }
            th { background-color: #f2f2f2; font-weight: bold; }
            th.terrain, td.terrain { width: 10%; text-align: center; }
            th.team, td.team { width: 35%; }
            th.score, td.score { width: 10%; text-align: center; font-size: 18px; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Tour ${round}</h1>
          <table>
            <thead>
              <tr>
                <th class="terrain">Terrain</th>
                <th class="team">${isSolo ? 'Joueur' : 'Équipe'}</th>
                <th class="score">Score</th>
                <th class="team">${isSolo ? 'Joueur' : 'Équipe'}</th>
              </tr>
            </thead>
            <tbody>
              ${roundMatches.map(match => `
                <tr>
                  <td class="terrain">${match.isBye ? '-' : match.court}</td>
                  <td class="team">
                      ${match.team1Ids ? getGroupLabel(match.team1Ids) : getTeamName(match.team1Id)}
                      ${!match.team1Ids && !isSolo ? `<br/><small>${getTeamPlayers(match.team1Id)}</small>` : ''}
                    </td>
                    <td class="score">${match.completed || match.isBye ? `${match.team1Score} - ${match.team2Score}` : '- - -'}</td>
                    <td class="team">
                      ${match.isBye ? 'BYE' : match.team2Ids ? getGroupLabel(match.team2Ids) : `${getTeamName(match.team2Id)}${!isSolo ? `<br/><small>${getTeamPlayers(match.team2Id)}</small>` : ''}`}
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
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white tracking-wider">Matchs</h2>
        <button
          onClick={onGenerateRound}
          className="glass-button flex items-center space-x-2 px-6 py-3 font-bold tracking-wide hover:scale-105 transition-all duration-300"
          disabled={teams.length < 2}
        >
          <Play className="w-5 h-5" />
          <span>Générer tour {currentRound + 1}</span>
        </button>
      </div>

      {teams.length < 2 && (
        <div className="glass-card p-6 mb-8 bg-orange-500/20 border-orange-400/40">
          <p className="text-orange-200 font-medium text-lg">
            Vous devez inscrire au moins 2 {isSolo ? 'joueurs' : 'équipes'} pour générer des matchs.
          </p>
        </div>
      )}

      {sortedRounds.length > 0 && (
        <div className="mb-8">
          <label className="block text-lg font-bold text-white mb-4 tracking-wide">
            Sélectionner un tour à afficher :
          </label>
          <div className="relative inline-block">
            <select
              value={selectedRound || ''}
              onChange={(e) => setSelectedRound(e.target.value ? Number(e.target.value) : null)}
              className="glass-select appearance-none px-4 py-3 pr-10 font-medium tracking-wide"
            >
              <option value="">Tous les tours</option>
              {sortedRounds.map(round => (
                <option key={round} value={round} className="bg-slate-800">Tour {round}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
          </div>
        </div>
      )}

      <div className="space-y-8">
        {sortedRounds
          .filter(round => selectedRound === null || round === selectedRound)
          .map(round => (
          <div key={round} className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold text-white tracking-wide">
                Tour {round}
              </h3>
              <button
                onClick={() => handlePrintRound(round)}
                className="glass-button-secondary flex items-center space-x-2 px-4 py-2 font-bold text-sm tracking-wide hover:scale-105 transition-all duration-300"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="glass-table w-full table-fixed">
                <thead>
                  <tr>
                    <th className="w-1/12 px-2 py-4 text-left font-bold tracking-wider">
                      Terrain
                    </th>
                    <th className="w-4/12 px-4 py-4 text-center font-bold tracking-wider">
                      {isSolo ? 'Joueur' : 'Équipe'}
                    </th>
                    <th className="w-2/12 px-2 py-4 text-center font-bold tracking-wider">
                      Score
                    </th>
                    <th className="w-4/12 px-4 py-4 text-center font-bold tracking-wider">
                      {isSolo ? 'Joueur' : 'Équipe'}
                    </th>
                    <th className="w-1/12 px-2 py-4 text-center font-bold tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedMatches[round].map((match) => (
                    <tr key={match.id} className="hover:bg-white/5 transition-colors">
                      <td className="w-1/12 px-2 py-4 whitespace-nowrap">
                        {match.isBye ? (
                          <span className="text-white/50">-</span>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-white" />
                            {match.court > courts ? (
                              <select
                                value={match.court}
                                onChange={(e) => onUpdateCourt(match.id, Number(e.target.value))}
                                className="glass-select w-16 text-sm border-0 font-medium"
                              >
                                <option value={match.court}>{`Libre ${match.court - courts}`}</option>
                                {Array.from({ length: courts }, (_, i) => i + 1).map(court => (
                                  <option key={court} value={court} className="bg-slate-800">{court}</option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={match.court}
                                onChange={(e) => onUpdateCourt(match.id, Number(e.target.value))}
                                className="glass-select w-16 text-sm border-0 font-medium"
                              >
                                {match.court === 0 && (
                                  <option value={0} className="bg-slate-800">Choisir</option>
                                )}
                                {Array.from({ length: courts }, (_, i) => i + 1).map(court => (
                                  <option key={court} value={court} className="bg-slate-800">{court}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="w-4/12 px-4 py-4 whitespace-nowrap text-center">
                          {match.team1Ids ? (
                            <span className="font-bold text-white">{getGroupLabel(match.team1Ids)}</span>
                          ) : (
                            <>
                              <span className="font-bold text-white">{getTeamName(match.team1Id)}</span>
                              {!isSolo && (
                                <div className="mt-1 text-xs text-white/70">
                                  {getTeamPlayers(match.team1Id)}
                                </div>
                              )}
                            </>
                          )}
                      </td>
                      <td className="w-2/12 px-2 py-4 whitespace-nowrap text-center">
                        {editingMatch === match.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              max="13"
                              value={editScores.team1}
                              onChange={(e) => setEditScores({ ...editScores, team1: Number(e.target.value) })}
                              className="glass-input w-16 px-2 py-1 text-center font-bold"
                            />
                            <span className="text-white font-bold">-</span>
                            <input
                              type="number"
                              min="0"
                              max="13"
                              value={editScores.team2}
                              onChange={(e) => setEditScores({ ...editScores, team2: Number(e.target.value) })}
                              className="glass-input w-16 px-2 py-1 text-center font-bold"
                            />
                          </div>
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {match.completed || match.isBye ? `${match.team1Score} - ${match.team2Score}` : '- - -'}
                          </span>
                        )}
                      </td>
                      <td className="w-4/12 px-4 py-4 whitespace-nowrap text-center">
                          {match.isBye ? (
                            <span className="text-white/50 italic font-bold">BYE</span>
                          ) : match.team2Ids ? (
                            <span className="font-bold text-white">{getGroupLabel(match.team2Ids)}</span>
                          ) : (
                            <>
                              <span className="font-bold text-white">{getTeamName(match.team2Id)}</span>
                              {!isSolo && (
                                <div className="mt-1 text-xs text-white/70">
                                  {getTeamPlayers(match.team2Id)}
                                </div>
                              )}
                            </>
                          )}
                      </td>
                      <td className="w-1/12 px-2 py-4 whitespace-nowrap text-center">
                        {!match.isBye && (
                          <div className="flex justify-center space-x-2">
                            {editingMatch === match.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveScore(match.id)}
                                  className="text-green-400 hover:text-green-300 transition-colors p-2 rounded-lg hover:bg-green-400/10"
                                  title="Sauvegarder"
                                >
                                  <Trophy className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10 text-xl font-bold"
                                  title="Annuler"
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleEditScore(match)}
                                className="text-white hover:text-white/80 transition-colors p-2 rounded-lg hover:bg-white/10"
                                title="Modifier le score"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {matches.length === 0 && (
        <div className="text-center py-16">
          <Play className="w-16 h-16 text-white/50 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-4 tracking-wide">
            Aucun match généré
          </h3>
          <p className="text-white/60 text-lg font-medium">
            Générez le premier tour pour commencer le tournoi
          </p>
        </div>
      )}
    </div>
  );
}