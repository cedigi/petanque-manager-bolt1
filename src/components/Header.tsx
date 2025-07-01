import { Logo } from './Logo';
import { Pause, Play } from 'lucide-react';

interface HeaderProps {
  animationPaused: boolean;
  onToggleAnimation: () => void;
}

export function Header({ animationPaused, onToggleAnimation }: HeaderProps) {
  return (
    <header className="glass-card border-b border-white/20 shadow-lg mx-6 mt-6">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Logo className="w-12 h-12 drop-shadow-lg" />
            <div className="absolute inset-0 w-12 h-12 rounded-full bg-white/20 blur-xl animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">
              Pétanque Manager
            </h1>
            <p className="text-sm text-white/80 tracking-wide font-medium">
              Gestionnaire de tournois moderne
            </p>
          </div>
        </div>
        <button
          onClick={onToggleAnimation}
          className="glass-button-secondary p-2 rounded-lg hover:scale-105 transition-all duration-300"
          title={animationPaused ? 'Reprendre l\'animation' : 'Mettre en pause l\'animation'}
        >
          {animationPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
