import { createKnockoutBracket } from '../bracket';
import { Team, Player } from '../../types/tournament';

function makeTeams(count: number): Team[] {
  const players: Player[] = [];
  return Array.from({ length: count }).map((_, i) => ({
    id: `t${i + 1}`,
    name: `Team ${i + 1}`,
    players,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    performance: 0,
    teamRating: 0,
    synchroLevel: 0,
  }));
}

describe('createKnockoutBracket', () => {
  it('adds BYE matches when team count is not a power of two', () => {
    const teams = makeTeams(6); // needs 2 BYEs to reach 8
    const matches = createKnockoutBracket(teams);
    const byeMatches = matches.filter(m => m.isBye);
    expect(byeMatches).toHaveLength(2);
    const byeRounds = new Set(byeMatches.map(m => m.round));
    expect(Array.from(byeRounds)).toEqual([1]);
    // Total matches for an 8 team bracket is 7
    expect(matches).toHaveLength(7);
  });

  it('creates a bracket without BYEs for power-of-two team counts', () => {
    const teams = makeTeams(8);
    const matches = createKnockoutBracket(teams);
    expect(matches.filter(m => m.isBye)).toHaveLength(0);
    // 8 team bracket -> 7 matches
    expect(matches).toHaveLength(7);
  });

  it('creates an eight-final bracket with BYEs for twelve teams', () => {
    const teams = makeTeams(12);
    const matches = createKnockoutBracket(teams);
    const firstRound = matches.filter(m => m.round === 1);
    expect(firstRound).toHaveLength(8);
    expect(firstRound.filter(m => m.isBye)).toHaveLength(4);
    expect(matches).toHaveLength(15); // bracket of 16
  });
});
