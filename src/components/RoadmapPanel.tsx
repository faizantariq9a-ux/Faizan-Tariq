import React, { useState } from 'react';
import { RoundRecord } from '../types/predictor';
import { buildBeadPlateColumns, buildBigRoadColumns } from '../utils/statistics';

interface RoadmapPanelProps {
  rounds: RoundRecord[];
  compact?: boolean;
}

export const RoadmapPanel: React.FC<RoadmapPanelProps> = ({
  rounds,
  compact = false,
}) => {
  const [sequenceLimit, setSequenceLimit] = useState<25 | 50 | 100>(50);
  const bigRoadCols = buildBigRoadColumns(rounds, compact ? 12 : 18);
  const beadPlateCols = buildBeadPlateColumns(rounds, 6, compact ? 10 : 16);

  const displayedSequence = rounds.slice(-sequenceLimit);

  return (
    <div className="space-y-6">
      {/* 1. Recent Results Emoji Sequence (🐉 🐯 🐉 🐉 🐯 ...) */}
      <section className="rounded-2xl bg-[#131822] border border-white/[0.08] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#F8FAFC]">
              Recent Results Sequence
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Chronological stream · Oldest to newest (up to 100 rounds stored locally)
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#0B0E14] rounded-lg border border-white/[0.06]">
            {([25, 50, 100] as const).map((limit) => (
              <button
                key={limit}
                type="button"
                onClick={() => setSequenceLimit(limit)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  sequenceLimit === limit
                    ? 'bg-[#1E293B] text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Last {limit}
              </button>
            ))}
          </div>
        </div>

        {rounds.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#64748B]">
            No rounds recorded yet. Tap <span className="text-[#F87171]">🐉 DRAGON</span>,{' '}
            <span className="text-[#34D399]">⚖️ TIE</span>, or{' '}
            <span className="text-[#FBBF24]">🐯 TIGER</span> to record your first round.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Explicit emoji stream matching prompt requirement: 🐉 🐯 🐉 🐉 🐯 ... */}
            <div
              className="p-3.5 rounded-xl bg-[#0B0E14] border border-white/[0.06] font-mono text-lg leading-relaxed tracking-wider break-words select-all"
              aria-label="Recent results sequence"
            >
              {displayedSequence.map((r, idx) => {
                const isLatest = idx === displayedSequence.length - 1;
                return (
                  <span
                    key={r.id}
                    title={`Round #${r.roundNumber}: ${r.side}`}
                    className={`inline-block mr-2 transition-transform ${
                      isLatest
                        ? 'scale-125 animate-pop-in underline decoration-[#F59E0B] underline-offset-4'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {r.side === 'DRAGON' ? '🐉' : r.side === 'TIGER' ? '🐯' : '⚖️'}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono tabular-nums">
              <span>
                Showing {displayedSequence.length} of {rounds.length} recorded rounds
              </span>
              <span>
                Latest: Round #{rounds[rounds.length - 1].roundNumber} (
                {rounds[rounds.length - 1].side === 'DRAGON'
                  ? '🐉 DRAGON'
                  : rounds[rounds.length - 1].side === 'TIGER'
                  ? '🐯 TIGER'
                  : '⚖️ TIE'}
                )
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 2. Big Road (Streak Columns) & Bead Plate (6-Row Chronological Grid) */}
      <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Big Road */}
        <section className="rounded-2xl bg-[#131822] border border-white/[0.08] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[#F8FAFC]">
                Big Road Streak Matrix
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Each column tracks a consecutive run of Dragon, Tiger, or Tie
              </p>
            </div>
            <span className="text-xs text-[#94A3B8] font-mono tabular-nums">
              {bigRoadCols.length} cols
            </span>
          </div>

          {rounds.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-[#64748B] bg-[#0B0E14] rounded-xl border border-white/[0.05]">
              Big Road columns populate automatically as rounds are recorded.
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="inline-grid grid-flow-col auto-cols-[34px] gap-1.5 p-3 bg-[#0B0E14] rounded-xl border border-white/[0.06] min-w-full">
                {bigRoadCols.map((col, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-1.5 min-h-[216px]">
                    {Array.from({ length: 6 }).map((_, rowIdx) => {
                      const item = col[rowIdx];
                      const overflowCount =
                        rowIdx === 5 && col.length > 6 ? col.length - 5 : null;
                      if (!item) {
                        return (
                          <div
                            key={rowIdx}
                            className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                          />
                        );
                      }
                      const isDragon = item.side === 'DRAGON';
                      const isTiger = item.side === 'TIGER';
                      return (
                        <div
                          key={item.id}
                          title={`Round #${item.roundNumber}: ${item.side}`}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-semibold tabular-nums transition-transform ${
                            isDragon
                              ? 'bg-[#DC2626]/20 border border-[#EF4444]/60 text-[#FCA5A5]'
                              : isTiger
                              ? 'bg-[#F59E0B]/20 border border-[#FBBF24]/60 text-[#FDE68A]'
                              : 'bg-[#10B981]/20 border border-[#34D399]/60 text-[#A7F3D0]'
                          }`}
                        >
                          {overflowCount
                            ? `+${overflowCount}`
                            : isDragon
                            ? 'D'
                            : isTiger
                            ? 'T'
                            : 'E'}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Bead Plate (6-Row Chronological Grid) */}
        <section className="rounded-2xl bg-[#131822] border border-white/[0.08] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[#F8FAFC]">
                6-Row Bead Plate
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Sequential top-to-bottom, left-to-right round markers
              </p>
            </div>
            <span className="text-xs text-[#94A3B8] font-mono tabular-nums">
              6 rows × {beadPlateCols.length} cols
            </span>
          </div>

          {rounds.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-[#64748B] bg-[#0B0E14] rounded-xl border border-white/[0.05]">
              Bead Plate markers appear as you record Dragon, Tiger, or Tie results.
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="inline-grid grid-flow-col auto-cols-[34px] gap-1.5 p-3 bg-[#0B0E14] rounded-xl border border-white/[0.06] min-w-full">
                {beadPlateCols.map((col, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-1.5 min-h-[216px]">
                    {Array.from({ length: 6 }).map((_, rowIdx) => {
                      const item = col[rowIdx];
                      if (!item) {
                        return (
                          <div
                            key={rowIdx}
                            className="w-8 h-8 rounded-full bg-white/[0.02] border border-white/[0.04]"
                          />
                        );
                      }
                      const isDragon = item.side === 'DRAGON';
                      const isTiger = item.side === 'TIGER';
                      return (
                        <div
                          key={item.id}
                          title={`Round #${item.roundNumber}: ${item.side}`}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-transform ${
                            isDragon
                              ? 'bg-[#991B1B]/50 border border-[#EF4444]/60'
                              : isTiger
                              ? 'bg-[#B45309]/50 border border-[#F59E0B]/60'
                              : 'bg-[#065F46]/50 border border-[#10B981]/60'
                          }`}
                        >
                          {isDragon ? '🐉' : isTiger ? '🐯' : '⚖️'}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
