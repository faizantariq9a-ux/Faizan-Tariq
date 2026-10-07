export type RoundSide = 'DRAGON' | 'TIGER';

export interface RoundRecord {
  id: string;
  roundNumber: number;
  side: RoundSide;
  timestamp: number;
  virtualCoinsDelta?: number;
}

export interface StreakInfo {
  side: RoundSide | null;
  count: number;
}

export interface StatisticalEstimate {
  estimatedSide: RoundSide;
  historicalPercentage: number;
  roundsAnalyzed: number;
  dragonHistoricalPct: number;
  tigerHistoricalPct: number;
  recentMomentumSide: RoundSide;
  recentMomentumPct: number;
  patternType: 'Streak Continuation' | 'Alternating Chop' | 'Empirical Frequency';
  rationale: string;
}

export interface StatisticsSummary {
  totalRounds: number;
  dragonCount: number;
  tigerCount: number;
  dragonPercentage: number;
  tigerPercentage: number;
  currentStreak: StreakInfo;
  longestDragonStreak: number;
  longestTigerStreak: number;
  alternationRate: number;
  estimate: StatisticalEstimate | null;
}

export type ActiveTab = 'analyzer' | 'roadmaps' | 'methodology' | 'android-apk';
