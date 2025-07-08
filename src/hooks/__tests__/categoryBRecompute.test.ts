import { updateCategoryBPhases } from '../finalsLogic';
import { Tournament, Team, Player, Pool, Match } from '../../types/tournament';

beforeEach(() => {
  localStorage.clear();
});

describe('Category B recompute when bottom count changes', () => {
  it('rebuilds first round to correct BYE count', () => {
    const makeTeam = (id: string): Team => ({
      id,
      name: id,
      players: [] as Player[],
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      performance: 0,
      teamRating: 0,
      synchroLevel: 0,
    });

    const teams: Team[] = Array.from({ length: 35 }, (_, i) => makeTeam(`T${i + 1}`));
    const pools: Pool[] = [];

    for (let i = 0; i < 8; i++) {
      const ids = teams.slice(i * 4, i * 4 + 4).map(t => t.id);
      pools.push({ id: `p${i + 1}`, name: `Poule ${i + 1}`, teamIds: ids, matches: [] });
    }
    pools.push({ id: 'p9', name: 'Poule 9', teamIds: teams.slice(32).map(t => t.id), matches: [] });

    pools.forEach(pool => {
      pool.teamIds.forEach(id => {
        const t = teams.find(tm => tm.id === id)!;
        t.poolId = pool.id;
      });
    });

    const matches: Match[] = [];
    let mId = 0;
    pools.forEach((pool, idx) => {
      const [t1, t2] = pool.teamIds;
      // give two BYE wins to first team in each pool
      [t1].forEach(id => {
        for (let i = 0; i < 2; i++) {
          matches.push({
            id: `m${mId++}`,
            round: 1,
            court: 0,
            team1Id: id,
            team2Id: id,
            team1Score: 13,
            team2Score: 0,
            completed: true,
            isBye: true,
            poolId: pool.id,
            battleIntensity: 0,
            hackingAttempts: 0,
          } as Match);
        }
      });
      // for first eight pools give wins to second team as well
      if (idx < 8) {
        [t2].forEach(id => {
          for (let i = 0; i < 2; i++) {
            matches.push({
              id: `m${mId++}`,
              round: 1,
              court: 0,
              team1Id: id,
              team2Id: id,
              team1Score: 13,
              team2Score: 0,
              completed: true,
              isBye: true,
              poolId: pool.id,
              battleIntensity: 0,
              hackingAttempts: 0,
            } as Match);
          }
        });
      }
    });

    const tournament: Tournament = {
      id: 'tour',
      name: 'Test',
      type: 'doublette-poule',
      courts: 8,
      teams,
      matches,
      matchesB: [],
      pools,
      currentRound: 1,
      completed: false,
      createdAt: new Date(),
      securityLevel: 1,
      networkStatus: 'online',
      poolsGenerated: true,
    };

    // initial call with only 17 qualifiers (last pool second team missing)
    const interim = updateCategoryBPhases(tournament);

    // now add wins for T34 to reach expected 18 qualifiers
    ['T34'].forEach(id => {
      for (let i = 0; i < 2; i++) {
        interim.matches.push({
          id: `extra${mId++}`,
          round: 1,
          court: 0,
          team1Id: id,
          team2Id: id,
          team1Score: 13,
          team2Score: 0,
          completed: true,
          isBye: true,
          poolId: 'p9',
          battleIntensity: 0,
          hackingAttempts: 0,
        } as Match);
      }
    });

    const updated = updateCategoryBPhases(interim);
    const firstRound = updated.matchesB.filter(m => m.round === 200);
    const byeMatches = firstRound.filter(m => m.isBye);

    expect(firstRound).toHaveLength(16);
    expect(byeMatches).toHaveLength(15);
  });
});
