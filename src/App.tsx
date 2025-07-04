import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TournamentSetup } from './components/TournamentSetup';
import { TabNavigation } from './components/TabNavigation';
import { TeamsTab } from './components/TeamsTab';
import { PoolsTab } from './components/PoolsTab';
import { MatchesTab } from './components/MatchesTab';
import { StandingsTab } from './components/StandingsTab';
import { useTournament } from './hooks/useTournament';
import { RotateCcw } from 'lucide-react';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');
  const {
    tournament,
    createTournament,
    addTeam,
    removeTeam,
    generateTournamentPools,
    generateRound,
    updateMatchScore,
    updateMatchCourt,
    resetTournament,
  } = useTournament();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const isSolo = tournament && (tournament.type === 'melee' || tournament.type === 'tete-a-tete');
  const isPoolTournament = tournament && (tournament.type === 'doublette-poule' || tournament.type === 'triplette-poule');

  const content = !tournament ? (
    <TournamentSetup onCreateTournament={createTournament} />
  ) : (
    <>
      <div className="glass-card shadow-xl mx-6 mt-6">
        <div className="px-6 py-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">
              {tournament.name}
            </h2>
            <p className="text-white/80 font-medium tracking-wide">
              {tournament.type.charAt(0).toUpperCase() +
                tournament.type.slice(1).replace('-', ' ')} • {tournament.courts} terrain
              {tournament.courts > 1 ? 's' : ''} • Tour {tournament.currentRound}
              {isPoolTournament && tournament.poolsGenerated && (
                <span className="ml-2 px-2 py-1 bg-green-500/30 border border-green-400 text-green-400 rounded text-sm">
                  Poules générées
                </span>
              )}
            </p>
          </div>
          <button
            onClick={resetTournament}
            className="glass-button-secondary flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
            title="Nouveau tournoi"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOUVEAU TOURNOI</span>
          </button>
        </div>
        <TabNavigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          tournamentType={tournament.type}
        />
      </div>

      <main className="min-h-screen">
        {activeTab === 'teams' && (
          <TeamsTab
            teams={tournament.teams}
            tournamentType={tournament.type}
            onAddTeam={addTeam}
            onRemoveTeam={removeTeam}
          />
        )}
        {activeTab === 'pools' && isPoolTournament && (
          <PoolsTab
            tournament={tournament}
            teams={tournament.teams}
            pools={tournament.pools}
            onGeneratePools={generateTournamentPools}
            onUpdateScore={updateMatchScore}
          />
        )}
        {activeTab === 'matches' && (
          <MatchesTab
            matches={tournament.matches}
            teams={tournament.teams}
            currentRound={tournament.currentRound}
            courts={tournament.courts}
            onGenerateRound={generateRound}
            onUpdateScore={updateMatchScore}
            onUpdateCourt={updateMatchCourt}
          />
        )}
        {activeTab === 'standings' && (
          <StandingsTab teams={tournament.teams} />
        )}
      </main>
    </>
  );

  return (
    <div className="min-h-screen relative">
      {/* Floating petanque balls background */}
      <div className="floating-petanque-balls">
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
      </div>
      
      <Header darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
      {content}
    </div>
  );
}

export default App;