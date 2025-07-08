import React from 'react';
import { Users, Gamepad2, Trophy, Grid3X3 } from 'lucide-react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tournamentType: string;
}

export function TabNavigation({ activeTab, onTabChange, tournamentType }: TabNavigationProps) {
  const isPoolTournament = tournamentType === 'doublette-poule' || tournamentType === 'triplette-poule';
  
  const tabs = [
    { id: 'teams', label: 'Équipes', icon: Users },
    ...(isPoolTournament ? [{ id: 'pools', label: 'Poules', icon: Grid3X3 }] : []),
    ...(!isPoolTournament
      ? [
          { id: 'matches', label: 'Matchs', icon: Gamepad2 },
          { id: 'standings', label: 'Classement', icon: Trophy },
        ]
      : []),
  ];

  return (
    <div className="border-b border-white/20">
      <nav className="flex space-x-2 px-6 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`glass-tab flex items-center space-x-3 py-3 px-6 font-bold text-sm transition-all duration-300 ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}