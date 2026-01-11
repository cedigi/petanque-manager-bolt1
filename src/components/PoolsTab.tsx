import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pool, Team, Tournament, Match } from '../types/tournament';
import { Grid3X3, Trophy, Shuffle, Printer, Crown, X, Edit3, Loader2 } from 'lucide-react';
import { CourtAvailability } from './CourtAvailability';
import { getCurrentBottomTeams, getCurrentQualifiedTeams } from '../hooks/finalsLogic';
import { calculateOptimalPools } from '../utils/poolGeneration';

interface PoolsTabProps {
  tournament: Tournament;
  teams: Team[];
  pools: Pool[];
  onGeneratePools: () => void;
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  onUpdateCourt?: (matchId: string, court: number) => void;
}

export function PoolsTab({ tournament, teams, pools, onGeneratePools, onUpdateScore, onUpdateCourt }: PoolsTabProps) {
  const isSolo = tournament.type === 'melee' || tournament.type === 'tete-a-tete';
  const [showCatB, setShowCatB] = useState(false);

  const [showCategoryB, setShowCategoryB] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const minimumTeams = tournament.preferredPoolSize === 3 ? 3 : 4;

  useEffect(() => {
    if (window.electronAPI?.onPrintError) {
      window.electronAPI.onPrintError((message) => {
        alert(`Erreur d'impression : ${message}`);
      });
    }
  }, []);

  const handlePrint = async () => {
    setIsPrinting(true);
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Poules - ${tournament.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            .pools-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
            .pool { border: 1px solid #333; border-radius: 8px; padding: 10px; margin-bottom: 12px; }
            .pool-title { font-weight: bold; font-size: 16px; margin-bottom: 8px; text-align: center; background: #f0f0f0; padding: 6px; border-radius: 4px; }
            .team-box { border: 1px solid #ddd; padding: 4px; margin: 2px 0; background: #f9f9f9; border-radius: 4px; text-align: center; font-size: 14px; }
            .team-name { font-weight: bold; }
            .score { font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Poules - ${tournament.name}</h1>
          <div class="pools-container">
            ${pools.map(pool => {
              const poolTeams = pool.teamIds
                .map(id => teams.find(t => t.id === id))
                .filter(Boolean);

              return `
                <div class="pool">
                  <div class="pool-title">${pool.name}</div>
                  ${generatePoolHTML(poolTeams)}
                </div>
              `;
            }).join('')}
          </div>
        </body>
      </html>
    `;

    try {
      if (window.electronAPI?.printHtml) {
        await window.electronAPI.printHtml(printContent);
      } else {
        window.print();
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const generatePoolHTML = (poolTeams: Team[]) => {
    if (poolTeams.length === 4) {
      const [team1, team2, team3, team4] = poolTeams;

      return `
        <div class="team-box">${team1.name}</div>
        <div class="team-box">${team2.name}</div>
        <div class="team-box">${team3.name}</div>
        <div class="team-box">${team4.name}</div>
      `;
    } else if (poolTeams.length === 3) {
      const [team1, team2, team3] = poolTeams;

      return `
        <div class="team-box">${team1.name}</div>
        <div class="team-box">${team2.name}</div>
        <div class="team-box">${team3.name}</div>
      `;
    } else if (poolTeams.length === 2) {
      const [team1, team2] = poolTeams;

      return `
        <div class="team-box">${team1.name}</div>
        <div class="team-box">${team2.name}</div>
      `;
    } else {
      return '<p>Poule incomplète</p>';
    }
  };

  const qualifiedTeams = getCurrentQualifiedTeams(tournament);
  const bottomTeams = getCurrentBottomTeams(tournament);

  const hasQualifiedA = qualifiedTeams.length > 0;
  const hasQualifiedB = bottomTeams.length > 0 || tournament.matchesB.length > 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white tracking-wider">Poules</h2>
        <div className="flex space-x-4">
          {pools.length > 0 && (
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="glass-button-secondary flex items-center space-x-2 px-4 py-2 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>{isPrinting ? 'Impression…' : 'Imprimer'}</span>
            </button>
          )}
          <button
            onClick={onGeneratePools}
            className="glass-button flex items-center space-x-2 px-6 py-3 font-bold tracking-wide hover:scale-105 transition-all duration-300"
            disabled={teams.length < minimumTeams}
          >
            <Shuffle className="w-5 h-5" />
            <span>Générer les poules</span>
          </button>
        </div>
      </div>

      {teams.length < minimumTeams && (
        <div className="glass-card p-6 mb-8 bg-orange-500/20 border-orange-400/40">
          <p className="text-orange-200 font-medium text-lg">
            Vous devez inscrire au moins {minimumTeams}{' '}
            {isSolo ? 'joueurs' : 'équipes'} pour générer des poules.
          </p>
        </div>
      )}

      {pools.length > 0 ? (
        <>
          {/* Affichage des poules compactes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-4">
            {pools.map((pool) => (
              <CompactPool
                key={pool.id}
                pool={pool}
                teams={teams}
                matches={tournament.matches}
                courts={tournament.courts}
                onUpdateScore={onUpdateScore}
                onUpdateCourt={onUpdateCourt}
              />
            ))}
          </div>

          <CourtAvailability
            courts={tournament.courts}
            matches={showCatB ? tournament.matchesB : tournament.matches}
          />

          {/* Phases finales - affichage conditionnel selon les qualifications */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowCatB(!showCatB)}
              className="glass-button-secondary px-4 py-1 text-sm"
            >
              {showCatB ? 'Voir Catégorie A' : 'Voir Catégorie B'}
            </button>
          </div>
          {(showCatB ? hasQualifiedB : hasQualifiedA) && (
            <FinalPhases
              qualifiedTeams={showCatB ? bottomTeams : qualifiedTeams}
              tournament={tournament}
              matches={showCatB ? tournament.matchesB : tournament.matches}
              onUpdateScore={onUpdateScore}
              onUpdateCourt={onUpdateCourt}
              totalTeams={teams.length}
              title={showCatB ? 'Catégorie B' : 'Catégorie A'}
              roundOffset={showCatB ? 200 : 100}
            />
          )}

          {/* Catégorie A / B toggle */}
          <div className="flex items-center justify-between my-6">
            <h3 className="text-2xl font-bold text-white">Catégorie A</h3>
            <button
              onClick={() => setShowCategoryB(!showCategoryB)}
              className="glass-button-secondary px-4 py-2 text-sm font-bold tracking-wide hover:scale-105 transition-all"
            >
              {showCategoryB ? 'Masquer Catégorie B' : 'Voir Catégorie B'}
            </button>
          </div>

          {/* Phases finales - affichage conditionnel */}
          {showCategoryB ? (
            <>
              <CourtAvailability
                courts={tournament.courts}
                matches={tournament.matchesB}
              />
              {hasQualifiedB && (
                <FinalPhases
                  qualifiedTeams={bottomTeams}
                  tournament={tournament}
                  matches={tournament.matchesB}
                  onUpdateScore={onUpdateScore}
                  onUpdateCourt={onUpdateCourt}
                  totalTeams={teams.length}
                  title="Catégorie B"
                  roundOffset={200}
                />
              )}
            </>
          ) : (
            <>
              <CourtAvailability
                courts={tournament.courts}
                matches={tournament.matches}
              />
              {hasQualifiedA && (
                <FinalPhases
                  qualifiedTeams={qualifiedTeams}
                  tournament={tournament}
                  matches={tournament.matches}
                  onUpdateScore={onUpdateScore}
                  onUpdateCourt={onUpdateCourt}
                  totalTeams={teams.length}
                  title="Catégorie A"
                  roundOffset={100}
                />
              )}
            </>
          )}

          {/* Statistiques des poules */}
          <div className="glass-card p-6 mt-8">
            <h3 className="text-xl font-bold text-white mb-4 tracking-wide flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Répartition des poules</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
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
                <div className="text-2xl font-bold text-pink-400">
                  {pools.filter(p => p.teamIds.length === 2).length}
                </div>
                <div className="text-white/70 text-sm">Poules de 2</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-2xl font-bold text-purple-400">{qualifiedTeams.length}</div>
                <div className="text-white/70 text-sm">Qualifiés</div>
              </div>
            </div>
          </div>
        </>
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
    </div>
  );
}

// Nouveau composant pour les phases finales avec remplissage progressif
interface FinalPhasesProps {
  qualifiedTeams: Team[];
  tournament: Tournament;
  matches: Match[];
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  onUpdateCourt?: (matchId: string, court: number) => void;
  totalTeams: number;
  title: string;
  roundOffset?: number;
}

function FinalPhases({ qualifiedTeams, tournament, matches, onUpdateScore, onUpdateCourt, totalTeams, title, roundOffset = 100 }: FinalPhasesProps) {
  // Calculer la structure du tableau en fonction du nombre total d'équipes
  const { poolsOf4, poolsOf3, poolsOf2 } = calculateOptimalPools(
    totalTeams,
    tournament.preferredPoolSize,
  );
  const expectedQualified = (poolsOf4 + poolsOf3 + poolsOf2) * 2;
  
  // Déterminer les phases nécessaires
  const getPhaseConfiguration = (count: number) => {
    if (count <= 2) return { phases: ['Finale'], startPhase: 'Finale' };
    if (count <= 4) return { phases: ['Demi-finales', 'Finale'], startPhase: 'Demi-finales' };
    if (count <= 8) return { phases: ['Quarts de finale', 'Demi-finales', 'Finale'], startPhase: 'Quarts de finale' };
    if (count <= 16) return { phases: ['8èmes de finale', 'Quarts de finale', 'Demi-finales', 'Finale'], startPhase: '8èmes de finale' };
    if (count <= 32) return { phases: ['16èmes de finale', '8èmes de finale', 'Quarts de finale', 'Demi-finales', 'Finale'], startPhase: '16èmes de finale' };
    return { phases: ['32èmes de finale', '16èmes de finale', '8èmes de finale', 'Quarts de finale', 'Demi-finales', 'Finale'], startPhase: '32èmes de finale' };
  };

  const config = getPhaseConfiguration(expectedQualified);

  // Trouver les matchs des phases finales pour la catégorie donnée
  const finalMatches = matches.filter(
    m => !m.poolId && m.round >= roundOffset && m.round < roundOffset + 100
  );

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintFinals = async () => {
    setIsPrinting(true);
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${tournament.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            h2 { margin-top: 20px; }
            .match { border: 1px solid #ddd; padding: 6px; margin: 4px 0; border-radius: 4px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>${title} - ${tournament.name}</h1>
          ${config.phases.map((phaseName, index) => {
            const phaseMatches = finalMatches.filter(m => m.round === index + roundOffset);
            return `
              <div>
                <h2>${phaseName}</h2>
                ${phaseMatches.map(match => {
                  const team1 = tournament.teams.find(t => t.id === match.team1Id);
                  const team2 = tournament.teams.find(t => t.id === match.team2Id);
                  const winner = match.completed
                    ? match.team1Score! > match.team2Score!
                      ? team1?.name
                      : team2?.name
                    : null;
                  return `<div class="match">T${match.court || '-'} | ${team1?.name || '-'} vs ${team2?.name || '-'} ${winner ? `(gagnant: ${winner})` : ''}</div>`;
                }).join('')}
              </div>
            `;
          }).join('')}
        </body>
      </html>
    `;

    try {
      if (window.electronAPI?.printHtml) {
        await window.electronAPI.printHtml(printContent);
      } else {
        window.print();
      }
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white tracking-wide flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span>{title}</span>
            <span className="text-lg text-white/70">({qualifiedTeams.length}/{expectedQualified} qualifiés)</span>
          </h3>
          {finalMatches.length > 0 && (
            <button
              onClick={handlePrintFinals}
              disabled={isPrinting}
              className="glass-button-secondary flex items-center space-x-2 px-4 py-2 text-sm font-bold tracking-wide hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>{isPrinting ? 'Impression…' : 'Imprimer'}</span>
            </button>
          )}
        </div>

        <div className="space-y-8">
          {config.phases.map((phaseName, index) => (
            <PhaseSection
              key={phaseName}
              phaseName={phaseName}
              phaseIndex={index}
              matches={finalMatches}
              tournament={tournament}
              onUpdateScore={onUpdateScore}
              onUpdateCourt={onUpdateCourt}
              expectedQualified={expectedQualified}
              roundOffset={roundOffset}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Composant pour une phase spécifique avec remplissage progressif
interface PhaseSectionProps {
  phaseName: string;
  phaseIndex: number;
  matches: Match[];
  tournament: Tournament;
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  onUpdateCourt?: (matchId: string, court: number) => void;
  expectedQualified: number;
  roundOffset: number;
}

function PhaseSection({ phaseName, phaseIndex, matches, tournament, onUpdateScore, onUpdateCourt, expectedQualified, roundOffset }: PhaseSectionProps) {
  const phaseMatches = matches.filter(m => m.round === phaseIndex + roundOffset); // 100+ pour les phases finales
  
  // Calculer le nombre de matchs attendus pour cette phase
  const getExpectedMatches = () => {
    if (phaseIndex === 0) {
      // Première phase : tableau complet basé sur la puissance de deux
      const bracketSize = 1 << Math.ceil(Math.log2(expectedQualified));
      return bracketSize / 2;
    } else {
      // Phases suivantes : moitié de la phase précédente
      const previousPhaseMatches = matches.filter(
        m => m.round === phaseIndex + roundOffset - 1
      );
      return Math.floor(previousPhaseMatches.length / 2);
    }
  };

  const expectedMatches = getExpectedMatches();
  
  // Compter les matchs prêts (avec les deux équipes connues)
  const matchesReady = phaseMatches.filter(m => m.team1Id && m.team2Id);
  
  return (
    <div className="space-y-4">
      <h4 className="text-xl font-bold text-white tracking-wide border-b border-white/20 pb-2">
        {phaseName} ({matchesReady.length}/{expectedMatches} prêts)
      </h4>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {/* Afficher TOUS les matchs, même vides */}
        {phaseMatches.map(match => (
          <ProgressiveFinalMatchBox
            key={match.id}
            match={match}
            tournament={tournament}
            onUpdateScore={onUpdateScore}
            onUpdateCourt={onUpdateCourt}
          />
        ))}
      </div>
      
      {phaseMatches.length === 0 && (
        <div className="text-center py-8">
          <div className="text-white/60">
            {phaseIndex === 0 ? 
              "En attente d'équipes qualifiées" :
              "En attente des résultats de la phase précédente"
            }
          </div>
        </div>
      )}
    </div>
  );
}

// Composant progressif pour un match de phase finale - TOUJOURS ACTIF
interface ProgressiveFinalMatchBoxProps {
  match: Match;
  tournament: Tournament;
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  onUpdateCourt?: (matchId: string, court: number) => void;
}

function ProgressiveFinalMatchBox({ match, tournament, onUpdateScore, onUpdateCourt }: ProgressiveFinalMatchBoxProps) {
  const [winnerModalPos, setWinnerModalPos] = useState<{x: number; y: number} | null>(null);
  
  const team1 = match.team1Id ? tournament.teams.find(t => t.id === match.team1Id) : null;
  const team2 = match.team2Id ? tournament.teams.find(t => t.id === match.team2Id) : null;

  const getWinner = () => {
    if (!match.completed || !team1 || !team2) return null;
    return (match.team1Score! > match.team2Score!) ? team1 : team2;
  };

  const winner = getWinner();

  const handleQuickWin = (winnerTeam: 'team1' | 'team2') => {
    if (!match || !onUpdateScore) return;
    const winnerScore = 13;
    const loserScore = Math.floor(Math.random() * 12);
    
    if (winnerTeam === 'team1') {
      onUpdateScore(match.id, winnerScore, loserScore);
    } else {
      onUpdateScore(match.id, loserScore, winnerScore);
    }
    setWinnerModalPos(null);
  };

  // Déterminer l'état du match
  const isEmpty = !team1 && !team2;
  const isPartial = (team1 && !team2) || (!team1 && team2);
  const isReady = team1 && team2;

  return (
    <>
      <div className={`glass-card p-1 min-h-[60px] transition-all duration-300 cursor-pointer hover:scale-105 relative ${
        isEmpty ? 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-gray-400/40' :
        isPartial ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-400/50' :
        isReady ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-400/50' :
        'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/50'
      }`}>
        {match.completed && onUpdateScore && (
          <button
            onClick={(e) => setWinnerModalPos({ x: e.clientX, y: e.clientY })}
            className="absolute top-1 right-1 p-1 text-white hover:text-white/80"
            title="Modifier le gagnant"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 flex-1 min-w-0">
              <span className={`font-bold text-sm truncate ${
                team1 ? 'text-white' : 'text-gray-400'
              }`}>
                {team1?.name || "🔄 En attente..."}
              </span>
              {winner?.id === team1?.id && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
            </div>
            {/* Score supprimé dans les phases finales */}
          </div>

          <div className="flex flex-col items-center">
            {onUpdateCourt ? (
              <select
                value={match.court}
                onChange={(e) => onUpdateCourt(match.id, Number(e.target.value))}
                className="glass-select text-xs border-0 mb-1"
              >
                {match.court > tournament.courts ? (
                  <option value={match.court}>{`Libre ${match.court - tournament.courts}`}</option>
                ) : null}
                {Array.from({ length: tournament.courts }, (_, i) => i + 1).map(court => (
                  <option key={court} value={court} className="bg-slate-800">
                    T{court}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`text-xs font-bold mb-1 ${
                isEmpty ? 'text-gray-400' :
                isPartial ? 'text-yellow-400' :
                isReady ? 'text-purple-400' :
                'text-green-400'
              }`}>
                T{match.court || '-'}
              </span>
            )}

            {isReady && onUpdateScore && !match.completed ? (
              <button
                onClick={(e) => setWinnerModalPos({ x: e.clientX, y: e.clientY })}
                className="p-1 bg-yellow-500/80 text-white rounded hover:bg-yellow-500 transition-colors animate-pulse"
                title="Sélectionner le gagnant"
              >
                <Trophy className="w-3 h-3" />
              </button>
            ) : (
              <span className={`font-bold text-xs ${
                isEmpty ? 'text-gray-400/60' :
                isPartial ? 'text-yellow-400/80' :
                match.completed ? 'text-green-400' :
                'text-white/60'
              }`}>
                {isEmpty ? '⏳' :
                 isPartial ? '🔄' :
                 match.completed ? '✅' :
                 'VS'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 flex-1 min-w-0">
              <span className={`font-bold text-sm truncate ${
                team2 ? 'text-white' : 'text-gray-400'
              }`}>
                {team2?.name || "🔄 En attente..."}
              </span>
              {winner?.id === team2?.id && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
            </div>
            {/* Score supprimé dans les phases finales */}
          </div>
        </div>

        {/* Indicateur d'état */}
        <div className="mt-2 text-center">
          <div className={`text-xs font-medium ${
            isEmpty ? 'text-gray-400' :
            isPartial ? 'text-yellow-400' :
            isReady && !match.completed ? 'text-purple-400 animate-pulse' :
            match.completed ? 'text-green-400' :
            'text-white/60'
          }`}>
            {isEmpty ? 'Vide' :
             isPartial ? 'Partiel' :
             isReady && !match.completed ? 'PRÊT !' :
             match.completed ? 'Terminé' :
             'En cours'}
          </div>
        </div>
      </div>

      {/* Modal de sélection du gagnant */}
      {winnerModalPos && team1 && team2 && (
        <WinnerModal
          team1={team1}
          team2={team2}
          onSelectWinner={handleQuickWin}
          onClose={() => setWinnerModalPos(null)}
          position={winnerModalPos}
        />
      )}
    </>
  );
}

// Composant de poule compacte avec 5 cases
interface CompactPoolProps {
  pool: Pool;
  teams: Team[];
  matches: Match[];
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  onUpdateCourt?: (matchId: string, court: number) => void;
  courts: number;
}

function CompactPool({ pool, teams, matches, onUpdateScore, onUpdateCourt, courts }: CompactPoolProps) {
  const poolMatches = matches.filter(m => m.poolId === pool.id);
  const poolTeams = pool.teamIds.map(id => teams.find(t => t.id === id)).filter(Boolean) as Team[];
  
  if (poolTeams.length === 4) {
    return (
      <CompactFourTeamPool
        poolTeams={poolTeams}
        poolMatches={poolMatches}
        pool={pool}
        courts={courts}
        onUpdateScore={onUpdateScore}
        onUpdateCourt={onUpdateCourt}
      />
    );
  } else if (poolTeams.length === 3) {
    return (
      <CompactThreeTeamPool
        poolTeams={poolTeams}
        poolMatches={poolMatches}
        pool={pool}
        courts={courts}
        onUpdateScore={onUpdateScore}
        onUpdateCourt={onUpdateCourt}
      />
    );
  } else if (poolTeams.length === 2) {
    return (
      <CompactTwoTeamPool
        poolTeams={poolTeams}
        poolMatches={poolMatches}
        pool={pool}
        courts={courts}
        onUpdateScore={onUpdateScore}
        onUpdateCourt={onUpdateCourt}
      />
    );
  } else {
    return (
      <div className="glass-card p-3">
        <h3 className="text-sm font-bold text-white mb-2">{pool.name}</h3>
        <p className="text-white/70 text-xs">Poule incomplète</p>
      </div>
    );
  }
}

// Composant pour poules de 4 équipes - Version compacte
function CompactFourTeamPool({ poolTeams, poolMatches, pool, courts, onUpdateScore, onUpdateCourt }: {
  poolTeams: Team[];
  poolMatches: Match[];
  pool: Pool;
  courts: number;
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  onUpdateCourt?: (matchId: string, court: number) => void;
}) {
  const [team1, team2, team3, team4] = poolTeams;

  // Logique des matchs (identique à avant)
  const match1vs4 = poolMatches.find(m => 
    (m.team1Id === team1.id && m.team2Id === team4.id) ||
    (m.team1Id === team4.id && m.team2Id === team1.id)
  );
  
  const match2vs3 = poolMatches.find(m => 
    (m.team1Id === team2.id && m.team2Id === team3.id) ||
    (m.team1Id === team3.id && m.team2Id === team2.id)
  );

  const getWinnerLoser = (match: Match | undefined, teamA: Team, teamB: Team) => {
    if (!match?.completed) return { winner: null, loser: null };
    
    const isTeamAFirst = match.team1Id === teamA.id;
    const teamAScore = isTeamAFirst ? match.team1Score! : match.team2Score!;
    const teamBScore = isTeamAFirst ? match.team2Score! : match.team1Score!;
    
    if (teamAScore > teamBScore) {
      return { winner: teamA, loser: teamB };
    } else {
      return { winner: teamB, loser: teamA };
    }
  };

  const result1vs4 = getWinnerLoser(match1vs4, team1, team4);
  const result2vs3 = getWinnerLoser(match2vs3, team2, team3);

  const winnersMatch = poolMatches.find(m => {
    if (!result1vs4.winner || !result2vs3.winner) return false;
    return (
      (m.team1Id === result1vs4.winner.id && m.team2Id === result2vs3.winner.id) ||
      (m.team1Id === result2vs3.winner.id && m.team2Id === result1vs4.winner.id)
    );
  });

  const losersMatch = poolMatches.find(m => {
    if (!result1vs4.loser || !result2vs3.loser) return false;
    return (
      (m.team1Id === result1vs4.loser.id && m.team2Id === result2vs3.loser.id) ||
      (m.team1Id === result2vs3.loser.id && m.team2Id === result1vs4.loser.id)
    );
  });

  const barrageMatch = poolMatches.find(m => m.round === 3);

  const barrageTeam1 = barrageMatch
    ? poolTeams.find(t => t.id === barrageMatch.team1Id)
    : undefined;
  const barrageTeam2 = barrageMatch
    ? poolTeams.find(t => t.id === barrageMatch.team2Id)
    : undefined;

  return (
    <div className="glass-card">
      <div className="px-3 py-2 border-b border-white/20 bg-white/5">
        <h3 className="text-sm font-bold text-white">{pool.name}</h3>
      </div>
      
      <div className="p-2 space-y-1">
        <CompactMatchBox
          team1={team1}
          team2={team4}
          match={match1vs4}
          courts={courts}
          onUpdateScore={onUpdateScore}
          onUpdateCourt={onUpdateCourt}
        />
        
        <CompactMatchBox
          team1={team2}
          team2={team3}
          match={match2vs3}
          courts={courts}
          onUpdateScore={onUpdateScore}
          onUpdateCourt={onUpdateCourt}
        />

        <CompactMatchBox
          team1={result1vs4.winner}
          team2={result2vs3.winner}
          match={winnersMatch}
          courts={courts}
          bgColor="bg-green-500/10"
          onUpdateScore={onUpdateScore}
          onUpdateCourt={onUpdateCourt}
        />

        <CompactMatchBox
          team1={result1vs4.loser}
          team2={result2vs3.loser}
          match={losersMatch}
          courts={courts}
          bgColor="bg-orange-500/10"
          onUpdateScore={onUpdateScore}
          onUpdateCourt={onUpdateCourt}
        />

        {barrageMatch && (
          <CompactMatchBox
            team1={barrageTeam1}
            team2={barrageTeam2}
            match={barrageMatch}
            courts={courts}
            bgColor="bg-red-500/10"
            onUpdateScore={onUpdateScore}
            onUpdateCourt={onUpdateCourt}
          />
        )}
      </div>
    </div>
  );
}

// Composant pour poules de 3 équipes - Version CORRIGÉE
function CompactThreeTeamPool({ poolTeams, poolMatches, pool, courts, onUpdateScore, onUpdateCourt }: {
  poolTeams: Team[];
  poolMatches: Match[];
  pool: Pool;
  courts: number;
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  onUpdateCourt?: (matchId: string, court: number) => void;
}) {
  const [team1, team2, team3] = poolTeams;

  const firstRoundMatch = poolMatches.find(m => 
    m.round === 1 && !m.isBye &&
    ((m.team1Id === team1.id && m.team2Id === team2.id) ||
     (m.team1Id === team2.id && m.team2Id === team1.id))
  );

  const getWinnerLoser = (match: Match | undefined, teamA: Team, teamB: Team) => {
    if (!match?.completed) return { winner: null, loser: null };
    
    const isTeamAFirst = match.team1Id === teamA.id;
    const teamAScore = isTeamAFirst ? match.team1Score! : match.team2Score!;
    const teamBScore = isTeamAFirst ? match.team2Score! : match.team1Score!;
    
    if (teamAScore > teamBScore) {
      return { winner: teamA, loser: teamB };
    } else {
      return { winner: teamB, loser: teamA };
    }
  };

  const firstRoundResult = getWinnerLoser(firstRoundMatch, team1, team2);

  const finalMatch = poolMatches.find(m => {
    if (!firstRoundResult.winner) return false;
    return m.round === 2 && !m.isBye &&
      ((m.team1Id === firstRoundResult.winner.id && m.team2Id === team3.id) ||
       (m.team1Id === team3.id && m.team2Id === firstRoundResult.winner.id));
  });

  const barrageMatch = poolMatches.find(m => m.round === 3);

  const barrageTeam1 = barrageMatch
    ? poolTeams.find(t => t.id === barrageMatch.team1Id)
    : undefined;
  const barrageTeam2 = barrageMatch
    ? poolTeams.find(t => t.id === barrageMatch.team2Id)
    : undefined;

  return (
    <div className="glass-card">
      <div className="px-3 py-2 border-b border-white/20 bg-white/5">
        <h3 className="text-sm font-bold text-white">{pool.name} (3)</h3>
      </div>
      
      <div className="p-2 space-y-1">
        <CompactMatchBox
          team1={team1}
          team2={team2}
          match={firstRoundMatch}
          courts={courts}
          onUpdateScore={onUpdateScore}
          onUpdateCourt={onUpdateCourt}
        />
        
        <div className="glass-card p-2 bg-blue-500/10 text-center">
          <div className="text-xs font-bold text-white flex items-center justify-center space-x-1">
            <span>T-</span>
            <span>{team3.name}</span>
            <Crown className="w-3 h-3 text-yellow-400" />
          </div>
          <div className="text-xs text-blue-400">BYE</div>
        </div>

        <CompactMatchBox
          team1={firstRoundResult.winner}
          team2={team3}
          match={finalMatch}
          courts={courts}
          bgColor="bg-green-500/10"
          onUpdateScore={onUpdateScore}
          onUpdateCourt={onUpdateCourt}
        />

        <div className="glass-card p-2 bg-orange-500/10 text-center">
          <div className="text-xs font-bold text-white">
            T- {firstRoundResult.loser?.name || "Perdant"}
          </div>
          <div className="text-xs text-orange-400">BYE</div>
        </div>

        {barrageMatch && (
          <CompactMatchBox
            team1={barrageTeam1}
            team2={barrageTeam2}
            match={barrageMatch}
            courts={courts}
            bgColor="bg-red-500/10"
            onUpdateScore={onUpdateScore}
            onUpdateCourt={onUpdateCourt}
          />
        )}
      </div>
    </div>
  );
}

function CompactTwoTeamPool({ poolTeams, poolMatches, pool, courts, onUpdateScore, onUpdateCourt }: {
  poolTeams: Team[];
  poolMatches: Match[];
  pool: Pool;
  courts: number;
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  onUpdateCourt?: (matchId: string, court: number) => void;
}) {
  const [team1, team2] = poolTeams;

  const match = poolMatches.find(m =>
    !m.isBye &&
    ((m.team1Id === team1.id && m.team2Id === team2.id) ||
      (m.team1Id === team2.id && m.team2Id === team1.id))
  );

  return (
    <div className="glass-card">
      <div className="px-3 py-2 border-b border-white/20 bg-white/5">
        <h3 className="text-sm font-bold text-white">{pool.name}</h3>
      </div>

      <div className="p-2 space-y-1">
        <CompactMatchBox
          team1={team1}
          team2={team2}
          match={match}
          courts={courts}
          onUpdateScore={onUpdateScore}
          onUpdateCourt={onUpdateCourt}
        />
      </div>
    </div>
  );
}

// Modal de sélection du gagnant
interface WinnerModalProps {
  team1: Team;
  team2: Team;
  onSelectWinner: (winner: 'team1' | 'team2') => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

function WinnerModal({ team1, team2, onSelectWinner, onClose, position }: WinnerModalProps) {
  const modalStyle = position
    ? { position: 'fixed' as const, top: position.y, left: position.x }
    : { position: 'fixed' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  const modal = (
    <div className="fixed inset-0 bg-black/50 z-50 p-4">
      <div className="glass-card p-4 max-w-xs w-full" style={modalStyle}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Qui a gagné ?</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => onSelectWinner('team1')}
            className="w-full glass-button p-3 text-left hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-base">{team1.name}</span>
            </div>
          </button>
          <button
            onClick={() => onSelectWinner('team2')}
            className="w-full glass-button p-3 text-left hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-base">{team2.name}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// Composant de case de match compacte CORRIGÉ - Les noms ne disparaissent plus
interface CompactMatchBoxProps {
  team1?: Team | null;
  team2?: Team | null;
  match?: Match;
  bgColor?: string;
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  showOnlyIfNeeded?: boolean;
  onUpdateCourt?: (matchId: string, court: number) => void;
  courts?: number;
}

function CompactMatchBox({ team1, team2, match, bgColor = "bg-white/5", onUpdateScore, onUpdateCourt, courts = 0, showOnlyIfNeeded = true }: CompactMatchBoxProps) {
  const [winnerModalPos, setWinnerModalPos] = useState<{x: number; y: number} | null>(null);

  // CORRECTION : Ne pas masquer la case si showOnlyIfNeeded est false
  if (showOnlyIfNeeded && (!team1 || !team2)) {
    return (
      <div className={`glass-card p-2 ${bgColor} opacity-50 text-center`}>
        <div className="text-xs text-white/60">En attente...</div>
      </div>
    );
  }

  const getWinner = () => {
    if (!match?.completed || !team1 || !team2) return null;
    
    const isTeam1First = match.team1Id === team1.id;
    const team1Score = isTeam1First ? match.team1Score! : match.team2Score!;
    const team2Score = isTeam1First ? match.team2Score! : match.team1Score!;
    
    return team1Score > team2Score ? team1 : team2;
  };

  const winner = getWinner();

  const handleQuickWin = (winnerTeam: 'team1' | 'team2') => {
    if (!match || !onUpdateScore) return;
    const winnerScore = 13;
    const loserScore = Math.floor(Math.random() * 12);
    
    if (winnerTeam === 'team1') {
      onUpdateScore(match.id, winnerScore, loserScore);
    } else {
      onUpdateScore(match.id, loserScore, winnerScore);
    }
    setWinnerModalPos(null);
  };

  // CORRECTION PRINCIPALE : Toujours afficher les noms même si pas d'équipes définies
  // Mais garder les vrais noms quand ils existent
  const displayTeam1Name = team1?.name || "En attente...";
  const displayTeam2Name = team2?.name || "En attente...";

  return (
    <>
      <div className={`glass-card p-2 ${bgColor} transition-all duration-300 relative`}>
        {match && onUpdateScore && match.completed && (
          <button
            onClick={(e) => setWinnerModalPos({ x: e.clientX, y: e.clientY })}
            className="absolute top-1 right-1 p-1 text-white hover:text-white/80"
            title="Modifier le gagnant"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        )}

        <div className="flex items-center justify-between">
          {/* Équipe 1 */}
          <div className="flex items-center space-x-1 flex-1">
            <span className="font-bold text-white truncate text-xs">
              {displayTeam1Name}
            </span>
            {winner?.id === team1?.id && (
              <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            )}
          </div>

          {/* Terrain et trophée/VS */}
          <div className="flex flex-col items-center mx-2 flex-shrink-0">
            {match && onUpdateCourt ? (
              <select
                value={match.court}
                onChange={(e) => onUpdateCourt(match.id, Number(e.target.value))}
                className="glass-select text-xs border-0 mb-1"
              >
                {match.court > courts ? (
                  <option value={match.court}>{`Libre ${match.court - courts}`}</option>
                ) : null}
                {Array.from({ length: courts }, (_, i) => i + 1).map((court) => (
                  <option key={court} value={court} className="bg-slate-800">
                    T{court}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-bold text-blue-400 mb-1">T{match?.court || '-'}</span>
            )}

            {match && onUpdateScore && team1 && team2 && !match.completed ? (
              <button
                onClick={(e) => setWinnerModalPos({ x: e.clientX, y: e.clientY })}
                className="p-1 bg-yellow-500/80 text-white rounded hover:bg-yellow-500 transition-colors"
                title="Sélectionner le gagnant"
              >
                <Trophy className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-white/60 text-xs">vs</span>
            )}
          </div>

          {/* Équipe 2 */}
          <div className="flex items-center space-x-1 flex-1 justify-end">
            {winner?.id === team2?.id && (
              <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            )}
            <span className="font-bold text-white truncate text-xs">
              {displayTeam2Name}
            </span>
          </div>
        </div>
      </div>

      {/* Modal de sélection du gagnant */}
      {winnerModalPos && team1 && team2 && (
        <WinnerModal
          team1={team1}
          team2={team2}
          onSelectWinner={handleQuickWin}
          onClose={() => setWinnerModalPos(null)}
          position={winnerModalPos}
        />
      )}
    </>
  );
}
