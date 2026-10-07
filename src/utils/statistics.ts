import {
  RoundRecord,
  RoundSide,
  StatisticalEstimate,
  StatisticsSummary,
  StreakInfo,
} from '../types/predictor';

export const MAX_HISTORY_ROUNDS = 100;
export const MIN_ROUNDS_FOR_ESTIMATE = 5;
export const ANALYSIS_DELAY_MS = 6000;

/**
 * Calculates comprehensive Dragon vs Tiger statistics from up to 100 recorded rounds.
 */
export function calculateStatistics(rounds: RoundRecord[]): StatisticsSummary {
  const capped = rounds.slice(-MAX_HISTORY_ROUNDS);
  const totalRounds = capped.length;

  if (totalRounds === 0) {
    return {
      totalRounds: 0,
      dragonCount: 0,
      tigerCount: 0,
      dragonPercentage: 0,
      tigerPercentage: 0,
      currentStreak: { side: null, count: 0 },
      longestDragonStreak: 0,
      longestTigerStreak: 0,
      alternationRate: 0,
      estimate: null,
    };
  }

  let dragonCount = 0;
  let tigerCount = 0;
  let longestDragonStreak = 0;
  let longestTigerStreak = 0;
  let runningSide: RoundSide | null = null;
  let runningCount = 0;
  let alternations = 0;

  for (let i = 0; i < capped.length; i++) {
    const side = capped[i].side;
    if (side === 'DRAGON') {
      dragonCount++;
    } else {
      tigerCount++;
    }

    if (i > 0 && capped[i - 1].side !== side) {
      alternations++;
    }

    if (side === runningSide) {
      runningCount++;
    } else {
      runningSide = side;
      runningCount = 1;
    }

    if (side === 'DRAGON' && runningCount > longestDragonStreak) {
      longestDragonStreak = runningCount;
    } else if (side === 'TIGER' && runningCount > longestTigerStreak) {
      longestTigerStreak = runningCount;
    }
  }

  const currentStreak: StreakInfo = {
    side: runningSide,
    count: runningCount,
  };

  const dragonPercentage = Number(((dragonCount / totalRounds) * 100).toFixed(1));
  const tigerPercentage = Number(((tigerCount / totalRounds) * 100).toFixed(1));
  const alternationRate =
    totalRounds > 1
      ? Number(((alternations / (totalRounds - 1)) * 100).toFixed(1))
      : 0;

  const estimate =
    totalRounds >= MIN_ROUNDS_FOR_ESTIMATE
      ? computeStatisticalEstimate(
          capped,
          dragonCount,
          tigerCount,
          dragonPercentage,
          tigerPercentage,
          currentStreak,
          alternationRate
        )
      : null;

  return {
    totalRounds,
    dragonCount,
    tigerCount,
    dragonPercentage,
    tigerPercentage,
    currentStreak,
    longestDragonStreak,
    longestTigerStreak,
    alternationRate,
    estimate,
  };
}

/**
 * Pure historical estimator after >= 5 rounds.
 * Uses recorded distribution + 1st-order transition frequencies from the history window.
 */
function computeStatisticalEstimate(
  rounds: RoundRecord[],
  dragonCount: number,
  tigerCount: number,
  dragonPct: number,
  tigerPct: number,
  currentStreak: StreakInfo,
  alternationRate: number
): StatisticalEstimate {
  const total = rounds.length;
  const lastSide = rounds[total - 1].side;

  // Analyze 1st-order transition following lastSide in recorded history
  let followDragon = 0;
  let followTiger = 0;
  for (let i = 0; i < total - 1; i++) {
    if (rounds[i].side === lastSide) {
      if (rounds[i + 1].side === 'DRAGON') followDragon++;
      else followTiger++;
    }
  }

  // Recent window (up to last 10 rounds)
  const recentWindow = rounds.slice(-10);
  const recentDragon = recentWindow.filter((r) => r.side === 'DRAGON').length;
  const recentTiger = recentWindow.length - recentDragon;
  const recentMomentumSide: RoundSide =
    recentDragon >= recentTiger ? 'DRAGON' : 'TIGER';
  const recentMomentumPct = Number(
    (
      (Math.max(recentDragon, recentTiger) / recentWindow.length) *
      100
    ).toFixed(1)
  );

  // Combine overall empirical frequency (70% weight) + transition history (30% weight)
  const overallDragonRatio = dragonCount / total;
  const overallTigerRatio = tigerCount / total;

  const transitionTotal = followDragon + followTiger;
  const transDragonRatio =
    transitionTotal > 0 ? followDragon / transitionTotal : overallDragonRatio;
  const transTigerRatio =
    transitionTotal > 0 ? followTiger / transitionTotal : overallTigerRatio;

  const compositeDragon = overallDragonRatio * 0.7 + transDragonRatio * 0.3;
  const compositeTiger = overallTigerRatio * 0.7 + transTigerRatio * 0.3;

  let estimatedSide: RoundSide;
  if (Math.abs(compositeDragon - compositeTiger) < 0.001) {
    // Tie-breaker: use overall count or most recent streak side
    estimatedSide = dragonCount >= tigerCount ? 'DRAGON' : 'TIGER';
  } else {
    estimatedSide = compositeDragon > compositeTiger ? 'DRAGON' : 'TIGER';
  }

  const historicalPercentage =
    estimatedSide === 'DRAGON' ? dragonPct : tigerPct;

  let patternType: StatisticalEstimate['patternType'] = 'Empirical Frequency';
  let rationale = `Based on ${total} recorded rounds (${dragonPct}% Dragon vs ${tigerPct}% Tiger).`;

  if (currentStreak.count >= 3 && currentStreak.side === estimatedSide) {
    patternType = 'Streak Continuation';
    rationale = `${estimatedSide} holds a ${currentStreak.count}-round active run and ${historicalPercentage}% historical share across ${total} rounds.`;
  } else if (alternationRate >= 60) {
    patternType = 'Alternating Chop';
    rationale = `High table alternation (${alternationRate}% chop rate) combined with ${historicalPercentage}% historical share across ${total} rounds.`;
  }

  return {
    estimatedSide,
    historicalPercentage,
    roundsAnalyzed: total,
    dragonHistoricalPct: dragonPct,
    tigerHistoricalPct: tigerPct,
    recentMomentumSide,
    recentMomentumPct,
    patternType,
    rationale,
  };
}

/**
 * Builds columns for a Big Road (streak-based roadmap) where each column represents a consecutive run.
 */
export function buildBigRoadColumns(
  rounds: RoundRecord[],
  maxColumns = 16
): RoundRecord[][] {
  const columns: RoundRecord[][] = [];
  for (const round of rounds) {
    const lastCol = columns[columns.length - 1];
    if (!lastCol || lastCol[0].side !== round.side) {
      columns.push([round]);
    } else {
      lastCol.push(round);
    }
  }
  return columns.slice(-maxColumns);
}

/**
 * Builds a 6-row Bead Plate grid from recorded rounds.
 */
export function buildBeadPlateColumns(
  rounds: RoundRecord[],
  rowsPerCol = 6,
  maxColumns = 14
): RoundRecord[][] {
  const columns: RoundRecord[][] = [];
  for (let i = 0; i < rounds.length; i += rowsPerCol) {
    columns.push(rounds.slice(i, i + rowsPerCol));
  }
  return columns.slice(-maxColumns);
}
