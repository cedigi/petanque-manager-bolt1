import { Pause, Play } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  animationsPaused: boolean;
  onToggleAnimations: () => void;
}

export function Header({ animationsPaused, onToggleAnimations }: HeaderProps) {
  return (
    <header className="glass-card border-b border-white/20 shadow-lg mx-6 mt-6">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Logo className="w-36 h-36 drop-shadow-lg" />
            <div className="absolute inset-0 w-36 h-36 rounded-full bg-white/20 blur-xl animate-pulse"></div>
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

        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleAnimations}
            className="glass-button-secondary p-3 rounded-lg transition-all duration-300 hover:scale-110"
            title="Pause des animations"
          >
            {animationsPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}