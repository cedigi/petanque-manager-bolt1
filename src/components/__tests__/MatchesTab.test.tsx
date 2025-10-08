import * as React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
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

function makeNamedPlayer(id: string, name: string, label: string): Player {
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

function makeCustomTeam(id: string, players: Player[]): Team {
  return {
    id,
    name: id,
    players,
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
    expect(getByRole('button', { name: 'Valider' })).toBeInTheDocument();
  });

  it('calls onUpdateScore when clicking Valider', () => {
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

    const onUpdateScore = jest.fn();
    const { getByRole, getAllByRole } = render(
      <MatchesTab
        matches={[match]}
        teams={teams}
        currentRound={0}
        courts={1}
        onGenerateRound={() => {}}
        onDeleteRound={() => {}}
        onUpdateScore={onUpdateScore}
        onUpdateCourt={() => {}}
      />
    );

    const scoreCell = getByRole('button', { name: '- - -' });
    fireEvent.click(scoreCell);

    const inputs = getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '13' } });
    fireEvent.change(inputs[1], { target: { value: '7' } });

    const saveButton = getByRole('button', { name: 'Valider' });
    fireEvent.click(saveButton);

    expect(onUpdateScore).toHaveBeenCalledWith('m1', 13, 7);
  });

  it('stacks long player names only for teams with at least three players', () => {
    const longName = 'JeanMichelDeLaTour';
    const teams: Team[] = [
      makeCustomTeam('T1', [
        makeNamedPlayer('T1-A', 'Alex', 'A'),
        makeNamedPlayer('T1-B', 'Benoit', 'B'),
        makeNamedPlayer('T1-C', longName, 'C'),
      ]),
      makeCustomTeam('T2', [
        makeNamedPlayer('T2-A', 'Claire', 'A'),
        makeNamedPlayer('T2-B', 'Delphine', 'B'),
        makeNamedPlayer('T2-C', 'Emma', 'C'),
      ]),
    ];
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

    const { container } = render(
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

    const inlineContainers = container.querySelectorAll(
      '.flex.flex-wrap.items-center.justify-center.gap-1'
    );
    expect(inlineContainers).toHaveLength(2);

    const longNameElement = screen.getByText('C - JeanMichelDeLaTour');
    expect(longNameElement).toBeInTheDocument();
    expect(
      within(inlineContainers[0]).queryByText('C - JeanMichelDeLaTour')
    ).not.toBeInTheDocument();
  });

  it('keeps long player names inline for teams with fewer than three players', () => {
    const longName = 'MaximilienSuperLongNom';
    const teams: Team[] = [
      makeCustomTeam('T1', [
        makeNamedPlayer('T1-A', 'Alex', 'A'),
        makeNamedPlayer('T1-B', longName, 'B'),
      ]),
      makeCustomTeam('T2', [
        makeNamedPlayer('T2-A', 'Claire', 'A'),
        makeNamedPlayer('T2-B', 'Delphine', 'B'),
      ]),
    ];
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

    const { container } = render(
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

    const inlineContainers = container.querySelectorAll(
      '.flex.flex-wrap.items-center.justify-center.gap-1'
    );
    expect(inlineContainers).toHaveLength(2);

    const firstTeamParts = Array.from(inlineContainers[0].querySelectorAll('span')).map(
      span => span.textContent
    );
    expect(firstTeamParts).toEqual([
      '1 : A - Alex',
      ' / ',
      `B - ${longName}`,
    ]);
  });
});

