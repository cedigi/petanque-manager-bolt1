import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MatchesTab } from '../MatchesTab';
import { Match, Team, Player } from '../../types/tournament';

function makePlayer(id: string, name: string, label: string): Player {
  return {
    id,
    name,
    label,
    cyberImplants: [],
    neuralScore: 0,
    combatRating: 0,
    hackingLevel: 0,
    augmentationLevel: 0,
  };
}

function makeTeam(id: string, playerName: string, label: string): Team {
  return {
    id,
    name: id,
    players: [makePlayer(`${id}-P`, playerName, label)],
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    performance: 0,
    teamRating: 0,
    synchroLevel: 0,
  };
}

describe('MatchesTab melee display', () => {
  it('shows combined player names for grouped teams', () => {
    const teams: Team[] = [
      makeTeam('T1', 'Alice', 'A'),
      makeTeam('T2', 'Bob', 'B'),
      makeTeam('T3', 'Clara', 'C'),
      makeTeam('T4', 'Dan', 'D'),
    ];

    const match: Match = {
      id: 'm1',
      round: 1,
      court: 1,
      team1Id: 'T1',
      team2Id: 'T3',
      team1Ids: ['T1', 'T2'],
      team2Ids: ['T3', 'T4'],
      completed: false,
      isBye: false,
      battleIntensity: 0,
      hackingAttempts: 0,
    };

    render(
      <MatchesTab
        matches={[match]}
        teams={teams}
        currentRound={0}
        courts={1}
        onGenerateRound={() => {}}
        onDeleteRound={() => {}}
        onUpdateScore={() => {}}
        onUpdateCourt={() => {}}
      />
    );

    const text = document.body.textContent || '';
    expect(text).toContain('1 : A - Alice / B - Bob');
    expect(text).toContain('3 : C - Clara / D - Dan');
  });
});
