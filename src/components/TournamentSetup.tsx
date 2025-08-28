import React, { useState } from 'react';
import { TournamentType } from '../types/tournament';
import { Users, Target, Trophy, Shield, Grid3X3 } from 'lucide-react';
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
    { 
      value: 'tete-a-tete', 
      label: 'Tête à tête', 
      icon: Target, 
      players: '1 joueur par équipe',
      description: 'Duel individuel'
    },
    { 
      value: 'doublette', 
      label: 'Doublette', 
      icon: Users, 
      players: '2 joueurs par équipe',
      description: 'Jeu en binôme'
    },
    { 
      value: 'triplette', 
      label: 'Triplette', 
      icon: Users, 
      players: '3 joueurs par équipe',
      description: 'Formation classique'
    },
    { 
      value: 'quadrette', 
      label: 'Quadrette', 
      icon: Users, 
      players: '4 joueurs par équipe',
      description: 'Grande équipe'
    },
    { 
      value: 'melee', 
      label: 'Mêlée', 
      icon: Trophy, 
      players: 'Joueurs individuels',
      description: 'Tournoi libre'
    },
    { 
      value: 'doublette-poule', 
      label: 'Doublette en poule', 
      icon: Grid3X3, 
      players: '2 joueurs par équipe',
      description: 'Tournoi par poules'
    },
    { 
      value: 'triplette-poule', 
      label: 'Triplette en poule', 
      icon: Grid3X3, 
      players: '3 joueurs par équipe',
      description: 'Tournoi par poules'
    },
  ] as const;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <Logo className="w-24 h-24 drop-shadow-2xl" />
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-white/30 blur-2xl animate-pulse"></div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-wider">
            Nouveau Tournoi
          </h1>
          <p className="text-white/80 text-lg font-medium tracking-wide">
            Configurez votre tournoi de pétanque
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="glass-card p-8">
            <label className="block text-xl font-bold text-white mb-6 tracking-wide">
              Type de tournoi
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournamentTypes.map((tournamentType) => {
                const Icon = tournamentType.icon;
                return (
                  <label
                    key={tournamentType.value}
                    className={`glass-card flex flex-col p-6 cursor-pointer transition-all duration-300 ${
                      type === tournamentType.value
                        ? 'bg-blue-500/30 border-white/40 hover:bg-blue-500/40 hover:border-white/50'
                        : 'hover:bg-white/10'
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
                    <div className="flex items-center space-x-3 mb-3">
                      <Icon className="w-8 h-8 text-white" />
                      <div className="font-bold text-white text-lg tracking-wide">
                        {tournamentType.label}
                      </div>
                    </div>
                    <div className="text-sm text-white/70 font-medium mb-2">
                      {tournamentType.players}
                    </div>
                    <div className="text-xs text-white/60 italic">
                      {tournamentType.description}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-6">
            <label className="block text-lg font-bold text-white mb-4 tracking-wide">
              Nombre de terrains
            </label>
            <select
              value={courts}
              onChange={(e) => setCourts(Number(e.target.value))}
              className="glass-select w-full px-4 py-3 text-lg font-medium tracking-wide focus:outline-none"
            >
              {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num} className="bg-slate-800">
                  {num} terrain{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="glass-button w-full py-4 px-6 text-xl font-bold tracking-wider hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center justify-center space-x-3">
              <Shield className="w-6 h-6" />
              <span>Créer le tournoi</span>
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}