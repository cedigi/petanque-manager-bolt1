import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MatchesTab } from '../MatchesTab';
import { Match, Team, Player } from '../../types/tournament';

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

describe('MatchesTab display', () => {
  it('shows team numbers in player list', () => {
    const teams = [makeTeam('T1'), makeTeam('T2')];
    const match: Match = {
      id: 'm1',
      round: 1,
      court: 1,
      team1Id: 'T1',
      team2Id: 'T2',
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
    expect(text).toContain('1 : A - T1-A');
    expect(text).toContain('2 : A - T2-A');
  });

  it('enables score editing when clicking the score cell', () => {
    const teams = [makeTeam('T1'), makeTeam('T2')];
    const match: Match = {
      id: 'm1',
      round: 1,
      court: 1,
      team1Id: 'T1',
      team2Id: 'T2',
      completed: false,
      isBye: false,
      battleIntensity: 0,
      hackingAttempts: 0,
    };

    const { getByRole, getAllByRole } = render(
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

    const scoreCell = getByRole('button', { name: '- - -' });
    fireEvent.click(scoreCell);

    const inputs = getAllByRole('spinbutton');
    expect(inputs).toHaveLength(2);
  });
});

