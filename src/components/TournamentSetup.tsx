import React, { useState } from 'react';
import { TournamentType } from '../types/tournament';
import { Users, Target, Trophy } from 'lucide-react';
import { Logo } from './Logo';

interface TournamentSetupProps {
  onCreateTournament: (type: TournamentType, courts: number) => void;
}

export function TournamentSetup({ onCreateTournament }: TournamentSetupProps) {
  const [type, setType] = useState<TournamentType>('doublette');
  const [courts, setCourts] = useState(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateTournament(type, courts);
  };

  const tournamentTypes = [
    { value: 'tete-a-tete', label: 'Tête-à-tête', icon: Target, players: '1 joueur par équipe' },
    { value: 'doublette', label: 'Doublette', icon: Users, players: '2 joueurs par équipe' },
    { value: 'triplette', label: 'Triplette', icon: Users, players: '3 joueurs par équipe' },
    { value: 'quadrette', label: 'Quadrette', icon: Users, players: '4 joueurs par équipe' },
    { value: 'melee', label: 'Mêlée', icon: Trophy, players: 'Joueurs individuels' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4">
            <Logo className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Nouveau Tournoi de Pétanque
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configurez votre tournoi et commencez à organiser les matchs
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Type de tournoi
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tournamentTypes.map((tournamentType) => {
                const Icon = tournamentType.icon;
                return (
                  <label
                    key={tournamentType.value}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      type === tournamentType.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={tournamentType.value}
                      checked={type === tournamentType.value}
                      onChange={(e) => setType(e.target.value as TournamentType)}
                      className="sr-only"
                    />
                    <Icon className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {tournamentType.label}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {tournamentType.players}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre de terrains
            </label>
            <select
              value={courts}
              onChange={(e) => setCourts(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 150 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>{num} terrain{num > 1 ? 's' : ''}</option>
              ))}
              </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Créer le tournoi
          </button>
        </form>
      </div>
    </div>
  );
}
