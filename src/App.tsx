import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TournamentSetup } from './components/TournamentSetup';
import { TabNavigation } from './components/TabNavigation';
import { TeamsTab } from './components/TeamsTab';
import { MatchesTab } from './components/MatchesTab';
import { StandingsTab } from './components/StandingsTab';
import { useTournament } from './hooks/useTournament';
import { RotateCcw } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('teams');
  const [animationPaused, setAnimationPaused] = useState(false);
  const {
    tournament,
    createTournament,
    addTeam,
    removeTeam,
    generateRound,
    updateMatchScore,
    updateMatchCourt,
    deleteRound,
    updateTeam,
    resetTournament,
  } = useTournament();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (animationPaused) {
      document.body.classList.add('animation-paused');
    } else {
      document.body.classList.remove('animation-paused');
    }
  }, [animationPaused]);

  const toggleAnimation = () => {
    setAnimationPaused((prev) => !prev);
  };

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
                tournament.type.slice(1)} • {tournament.courts} terrain
              {tournament.courts > 1 ? 's' : ''} • Tour {tournament.currentRound}
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
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <main className="min-h-screen">
        {activeTab === 'teams' && (
          <TeamsTab
            teams={tournament.teams}
            tournamentType={tournament.type}
            onAddTeam={addTeam}
            onRemoveTeam={removeTeam}
            onUpdateTeam={updateTeam}
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
            onDeleteRound={deleteRound}
          />
        )}
        {activeTab === 'standings' && (
          <StandingsTab teams={tournament.teams} pools={tournament.poolStandings} />
        )}
      </main>
    </>
  );

  return (
    <div className="min-h-screen relative">
      {/* Floating petanque balls background */}
      <div className={`floating-petanque-balls${animationPaused ? ' paused' : ''}`}>
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
        <div className="petanque-ball"></div>
      </div>

      <Header animationPaused={animationPaused} onToggleAnimation={toggleAnimation} />
      {content}
    </div>
  );
}

export default App;
