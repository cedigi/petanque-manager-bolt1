import { Sun, Moon, Palette } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  theme: 'default' | 'cyber';
  onToggleTheme: () => void;
}

export function Header({
  darkMode,
  onToggleDarkMode,
  theme,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Logo + titre */}
        <div className="flex items-center space-x-3">
          {/* Utilisation du composant Logo pour garantir le bon chemin d'accès */}
          <Logo className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Pétanque Manager
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestionnaire de Tournois Professionnel
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={theme === 'cyber' ? 'Thème classique' : 'Thème Cyber Blue'}
          >
            <Palette className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
