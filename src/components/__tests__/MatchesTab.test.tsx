import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MatchesTab } from '../MatchesTab';
import { generateMatches } from '../../utils/matchmaking';
import { Tournament, Team, Player } from '../../types/tournament';

function makePlayer(id: string, label: string): Player {
  return {
    id,
    name: id,
    label,
    cyberImplants: [],
    neuralScore: 0,
    combatRating: 0,
    hackingLevel: 0,
    augmentationLevel: 0,
  };
}

function makeTeam(id: string): Team {
  return {
    id,
    name: id,
    players: [
      makePlayer(`${id}-A`, 'A'),
      makePlayer(`${id}-B`, 'B'),
      makePlayer(`${id}-C`, 'C'),
      makePlayer(`${id}-D`, 'D'),
    ],
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    performance: 0,
    teamRating: 0,
    synchroLevel: 0,
  };
}

function baseTournament(teams: Team[]): Tournament {
  return {
    id: 't',
    name: 'Test',
    type: 'quadrette',
    courts: 1,
    teams,
    matches: [],
    matchesB: [],
    pools: [],
    currentRound: 0,
    completed: false,
    createdAt: new Date(),
    securityLevel: 1,
    networkStatus: 'online',
    poolsGenerated: false,
  };
}

describe('MatchesTab display', () => {
  it('shows team numbers in player list', () => {
    const teams = [makeTeam('T1'), makeTeam('T2')];
    const matches = generateMatches(baseTournament(teams));

    render(
      <MatchesTab
        matches={matches}
        teams={teams}
        currentRound={0}
        courts={1}
        onGenerateRound={() => {}}
        onDeleteRound={() => {}}
        onUpdateScore={() => {}}
        onUpdateCourt={() => {}}
      />
    );
    // Debug DOM output for inspection
    // screen.debug();

    const text = document.body.textContent || '';
        codex/modifier-handleprint-pour-tous-les-types-de-tournoi
    expect(text).toContain('1a - T1-A');
    expect(text).toContain('2a - T2-A');

        codex/modifier-conditionnel-pour-getgrouplabel
    expect(text).toContain('1a - T1-A');
    expect(text).toContain('2a - T2-A');

    expect(text).toContain('1 : A - T1-A');
    expect(text).toContain('2 : A - T2-A');
        main
        main
  });
});
