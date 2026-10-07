import React from 'react';
import { StatisticsSummary } from '../types/predictor';

interface MethodologyPanelProps {
  stats: StatisticsSummary;
}

export const MethodologyPanel: React.FC<MethodologyPanelProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#131822] border border-white/[0.08] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F8FAFC]">
          Statistical Estimator Methodology & Fair Use Notice
        </h2>
        <p className="text-sm text-[#CBD5E1] leading-relaxed max-w-3xl">
          Dragon Tiger Predictor Demo is a standalone educational statistics and round-tracking
          utility. It records user-entered outcomes locally on your device (up to the latest 100
          rounds) and summarizes historical frequencies, active streaks, and first-order
          transitions.
        </p>

        <div className="pt-4 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">
              01. 5-Round Minimum Sample
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              No Statistical Estimate is generated until at least 5 rounds have been recorded.
              Small samples below 5 rounds lack meaningful frequency distribution.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">
              02. 6-Second Calculation Delay
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Every newly recorded result triggers a 6-second analysis window (
              <span className="text-[#FBBF24]">"Analyzing recent results..."</span>) before
              displaying the updated statistical estimate for the next round.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">
              03. Empirical Frequency & Transition
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Combines overall recorded proportion (70% weight) with historical next-round
              transition frequency following the latest outcome (30% weight) across up to 100
              stored rounds.
            </p>
          </div>
        </div>
      </section>

      {/* Current Session Empirical Table */}
      <section className="rounded-2xl bg-[#131822] border border-white/[0.08] p-6">
        <h3 className="text-base font-semibold text-[#F8FAFC] mb-4">
          Current Session Telemetry Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-xs text-[#94A3B8]">
                <th className="py-3 pr-4 font-medium">Metric</th>
                <th className="py-3 px-4 font-medium">🐉 Dragon</th>
                <th className="py-3 px-4 font-medium">🐯 Tiger</th>
                <th className="py-3 pl-4 font-medium text-right">Session Total / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] font-mono tabular-nums text-xs">
              <tr>
                <td className="py-3.5 pr-4 font-sans text-[#CBD5E1]">Recorded Count</td>
                <td className="py-3.5 px-4 text-[#F87171]">{stats.dragonCount} rounds</td>
                <td className="py-3.5 px-4 text-[#FBBF24]">{stats.tigerCount} rounds</td>
                <td className="py-3.5 pl-4 text-right text-[#F8FAFC]">
                  {stats.totalRounds} / 100 max
                </td>
              </tr>
              <tr>
                <td className="py-3.5 pr-4 font-sans text-[#CBD5E1]">Historical Share</td>
                <td className="py-3.5 px-4 text-[#F87171]">{stats.dragonPercentage}%</td>
                <td className="py-3.5 px-4 text-[#FBBF24]">{stats.tigerPercentage}%</td>
                <td className="py-3.5 pl-4 text-right text-[#94A3B8]">
                  {stats.totalRounds > 0 ? '100.0%' : '0.0%'}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 pr-4 font-sans text-[#CBD5E1]">Longest Streak</td>
                <td className="py-3.5 px-4 text-[#F87171]">×{stats.longestDragonStreak}</td>
                <td className="py-3.5 px-4 text-[#FBBF24]">×{stats.longestTigerStreak}</td>
                <td className="py-3.5 pl-4 text-right text-[#94A3B8]">
                  Active:{' '}
                  {stats.currentStreak.side
                    ? `${stats.currentStreak.side} ×${stats.currentStreak.count}`
                    : 'None'}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 pr-4 font-sans text-[#CBD5E1]">Table Alternation (Chop)</td>
                <td className="py-3.5 px-4 text-[#94A3B8]" colSpan={2}>
                  Side switches every {stats.alternationRate}% of consecutive rounds
                </td>
                <td className="py-3.5 pl-4 text-right text-[#F8FAFC]">
                  {stats.alternationRate}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Strict Compliance & Non-Guarantee Statement */}
      <section className="rounded-2xl bg-[#131822] border border-white/[0.08] p-6 space-y-2">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">
          Important Compliance & Statistical Independence Notice
        </h3>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          This application is strictly a virtual-coin statistics and analysis demo. It does not
          place real-money bets, does not connect to or modify any external gaming or betting
          application, requires no login or network connection, and never guarantees future
          results. In independent random trials, past frequencies do not alter future
          probabilities.
        </p>
      </section>
    </div>
  );
};
