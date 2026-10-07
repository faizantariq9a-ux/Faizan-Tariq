/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Code2,
  Coins,
  RotateCcw,
  Smartphone,
  Sparkles,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ActiveTab, RoundRecord, RoundSide } from './types/predictor';
import {
  ANALYSIS_DELAY_MS,
  MAX_HISTORY_ROUNDS,
  MIN_ROUNDS_FOR_ESTIMATE,
  calculateStatistics,
} from './utils/statistics';
import { soundFX } from './utils/sound';
import { DragonCrestSvg, TieCrestSvg, TigerCrestSvg } from './components/Crests';
import { RoadmapPanel } from './components/RoadmapPanel';
import { MethodologyPanel } from './components/MethodologyPanel';
import { AndroidSourceViewer } from './components/AndroidSourceViewer';

const STORAGE_KEY_ROUNDS = 'dragon_tiger_predictor_rounds_v1';
const STORAGE_KEY_COINS = 'dragon_tiger_predictor_virtual_coins_v1';
const INITIAL_VIRTUAL_COINS = 1000;

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyzer');

  // Load up to 100 saved rounds from local device storage
  const [rounds, setRounds] = useState<RoundRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROUNDS);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.slice(-MAX_HISTORY_ROUNDS);
      }
      return [];
    } catch {
      return [];
    }
  });

  // Virtual coins counter (purely for virtual statistical tracking)
  const [virtualCoins, setVirtualCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COINS);
      return saved ? Number(saved) || INITIAL_VIRTUAL_COINS : INITIAL_VIRTUAL_COINS;
    } catch {
      return INITIAL_VIRTUAL_COINS;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastTappedSide, setLastTappedSide] = useState<RoundSide | null>(null);

  // 6-second delay state ("Analyzing recent results...")
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const deadlineRef = useRef<number>(0);

  // Persist rounds locally whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_ROUNDS,
        JSON.stringify(rounds.slice(-MAX_HISTORY_ROUNDS))
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [rounds]);

  // Persist virtual coins locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COINS, String(virtualCoins));
    } catch {
      // Ignore storage errors
    }
  }, [virtualCoins]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const stats = useMemo(() => calculateStatistics(rounds), [rounds]);

  const startSixSecondAnalysis = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    setIsAnalyzing(true);
    setRemainingMs(ANALYSIS_DELAY_MS);
    deadlineRef.current = performance.now() + ANALYSIS_DELAY_MS;

    timerRef.current = window.setInterval(() => {
      const now = performance.now();
      const left = Math.max(0, deadlineRef.current - now);
      setRemainingMs(left);
      if (left <= 0) {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsAnalyzing(false);
        soundFX.playEstimateReady();
      }
    }, 80);
  };

  const stopAnalysisTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsAnalyzing(false);
    setRemainingMs(0);
  };

  const handleRecordResult = (side: RoundSide) => {
    if (side === 'DRAGON') {
      soundFX.playDragonTap();
    } else if (side === 'TIGER') {
      soundFX.playTigerTap();
    } else {
      soundFX.playTieTap();
    }

    setLastTappedSide(side);

    // Virtual coin tracking: if there was an active Statistical Estimate before this round,
    // adjust virtual coins by +25 if the recorded result matched the estimate, or -25 if not.
    let coinsDelta = 0;
    if (stats.estimate && !isAnalyzing) {
      coinsDelta = stats.estimate.estimatedSide === side ? 25 : -25;
      setVirtualCoins((prev) => Math.max(0, prev + coinsDelta));
    }

    setRounds((prev) => {
      const nextRoundNum =
        prev.length > 0 ? prev[prev.length - 1].roundNumber + 1 : 1;
      const newRecord: RoundRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        roundNumber: nextRoundNum,
        side,
        timestamp: Date.now(),
        virtualCoinsDelta: coinsDelta,
      };
      return [...prev, newRecord].slice(-MAX_HISTORY_ROUNDS);
    });

    startSixSecondAnalysis();
  };

  const handleUndoLastResult = () => {
    if (rounds.length === 0) return;
    soundFX.playControlClick();
    stopAnalysisTimer();
    const removed = rounds[rounds.length - 1];
    if (removed?.virtualCoinsDelta) {
      setVirtualCoins((prev) => Math.max(0, prev - removed.virtualCoinsDelta!));
    }
    setRounds((prev) => prev.slice(0, -1));
  };

  const handleClearHistory = () => {
    if (rounds.length === 0) return;
    soundFX.playControlClick();
    stopAnalysisTimer();
    setRounds([]);
    setLastTappedSide(null);
  };

  const handleResetStatistics = () => {
    soundFX.playControlClick();
    stopAnalysisTimer();
    setRounds([]);
    setVirtualCoins(INITIAL_VIRTUAL_COINS);
    setLastTappedSide(null);
  };

  const handleSeedFiveRounds = () => {
    soundFX.playControlClick();
    const sampleSides: RoundSide[] = ['DRAGON', 'TIGER', 'DRAGON', 'TIE', 'TIGER'];
    setRounds((prev) => {
      let nextNum = prev.length > 0 ? prev[prev.length - 1].roundNumber + 1 : 1;
      const additions: RoundRecord[] = sampleSides.map((s, i) => ({
        id: `${Date.now()}-seed-${i}`,
        roundNumber: nextNum++,
        side: s,
        timestamp: Date.now() + i,
      }));
      return [...prev, ...additions].slice(-MAX_HISTORY_ROUNDS);
    });
    startSixSecondAnalysis();
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.enabled = next;
  };

  const progressPercentage = Math.min(
    100,
    Math.max(0, ((ANALYSIS_DELAY_MS - remainingMs) / ANALYSIS_DELAY_MS) * 100)
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0E14] text-[#F1F5F9] pb-20 md:pb-10">
      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (Nav Links) — Zone 3 (Actions) */}
      <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 lg:px-8 bg-[#0B0E14]/90 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('analyzer');
          }}
          className="font-display text-base sm:text-lg font-bold tracking-wide text-[#F8FAFC] whitespace-nowrap truncate"
        >
          Dragon vs Tiger Predictor
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('analyzer')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'analyzer'
                ? 'text-[#F8FAFC] border-[#F59E0B]'
                : 'text-[#94A3B8] border-transparent hover:text-[#F8FAFC]'
            }`}
          >
            Analyzer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roadmaps')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'roadmaps'
                ? 'text-[#F8FAFC] border-[#F59E0B]'
                : 'text-[#94A3B8] border-transparent hover:text-[#F8FAFC]'
            }`}
          >
            Roadmaps
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('methodology')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'methodology'
                ? 'text-[#F8FAFC] border-[#F59E0B]'
                : 'text-[#94A3B8] border-transparent hover:text-[#F8FAFC]'
            }`}
          >
            Methodology
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android-apk')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'android-apk'
                ? 'text-[#F8FAFC] border-[#F59E0B]'
                : 'text-[#94A3B8] border-transparent hover:text-[#F8FAFC]'
            }`}
          >
            Android Kotlin APK
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSeedFiveRounds}
            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#E2E8F0] transition-colors whitespace-nowrap cursor-pointer"
            title="Add 5 sample rounds (🐉 🐯 🐉 🐉 🐯) to test analysis"
          >
            +5 Demo Rounds
          </button>
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            className="min-h-[38px] min-w-[38px] p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#CBD5E1] flex items-center justify-center transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#F59E0B]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#64748B]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        {activeTab === 'analyzer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN (Mobile Phone Deck / Primary Recording & Virtual Analysis) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Main Android Phone Deck Container */}
              <section className="rounded-3xl bg-[#131822] border border-white/[0.08] p-5 sm:p-6 space-y-6">
                {/* Title & Subtitle */}
                <div className="text-center space-y-1">
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-[#F8FAFC] text-balance">
                    Dragon vs Tiger Predictor
                  </h1>
                  <p className="text-xs text-[#94A3B8]">
                    Virtual-Coin Statistics Demo · Local 100-Round History
                  </p>
                </div>

                {/* Top Summary Strip: Total Rounds Recorded & Virtual Coins */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
                  <div className="pt-3">
                    <div className="text-xs text-[#94A3B8]">Total Rounds Recorded</div>
                    <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-[#F8FAFC]">
                      {stats.totalRounds}{' '}
                      <span className="text-xs font-normal text-[#64748B]">
                        / {MAX_HISTORY_ROUNDS}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 text-right">
                    <div className="text-xs text-[#94A3B8] flex items-center justify-end gap-1">
                      <Coins className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Virtual Demo Coins</span>
                    </div>
                    <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-[#FBBF24]">
                      {virtualCoins.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Three Large Touch Buttons: 🐉 DRAGON, ⚖️ TIE, & 🐯 TIGER */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* 🐉 DRAGON Button */}
                    <button
                      type="button"
                      onClick={() => handleRecordResult('DRAGON')}
                      className={`group relative min-h-[144px] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#991B1B] to-[#450A0A] border transition-transform duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF4444] ${
                        lastTappedSide === 'DRAGON'
                          ? 'border-[#F87171] shadow-lg shadow-[#DC2626]/20'
                          : 'border-[#EF4444]/60 hover:border-[#F87171]'
                      }`}
                    >
                      <DragonCrestSvg className="w-10 h-10 text-[#FCA5A5] group-hover:scale-105 transition-transform" />
                      <div className="text-xl sm:text-2xl font-bold tracking-wider text-white whitespace-nowrap">
                        🐉 DRAGON
                      </div>
                      <span className="text-xs text-[#FCA5A5]/90 font-medium whitespace-nowrap">
                        Tap to Record
                      </span>
                    </button>

                    {/* 🐯 TIGER Button */}
                    <button
                      type="button"
                      onClick={() => handleRecordResult('TIGER')}
                      className={`group relative min-h-[144px] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#B45309] to-[#451A03] border transition-transform duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B] ${
                        lastTappedSide === 'TIGER'
                          ? 'border-[#FBBF24] shadow-lg shadow-[#F59E0B]/20'
                          : 'border-[#F59E0B]/60 hover:border-[#FBBF24]'
                      }`}
                    >
                      <TigerCrestSvg className="w-10 h-10 text-[#FDE68A] group-hover:scale-105 transition-transform" />
                      <div className="text-xl sm:text-2xl font-bold tracking-wider text-white whitespace-nowrap">
                        🐯 TIGER
                      </div>
                      <span className="text-xs text-[#FDE68A]/90 font-medium whitespace-nowrap">
                        Tap to Record
                      </span>
                    </button>
                  </div>

                  {/* ⚖️ TIE Button */}
                  <button
                    type="button"
                    onClick={() => handleRecordResult('TIE')}
                    className={`group relative w-full min-h-[76px] rounded-2xl px-5 py-3.5 flex items-center justify-between bg-gradient-to-r from-[#065F46] via-[#064E3B] to-[#022C22] border transition-transform duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981] ${
                      lastTappedSide === 'TIE'
                        ? 'border-[#34D399] shadow-lg shadow-[#10B981]/20'
                        : 'border-[#10B981]/60 hover:border-[#34D399]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <TieCrestSvg className="w-9 h-9 text-[#A7F3D0] group-hover:scale-105 transition-transform shrink-0" />
                      <div className="text-left">
                        <div className="text-lg sm:text-xl font-bold tracking-wider text-white whitespace-nowrap">
                          ⚖️ TIE
                        </div>
                        <div className="text-xs text-[#A7F3D0]/90 font-medium">
                          Equal Card Rank Outcome
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#A7F3D0] whitespace-nowrap">
                      Tap to Record →
                    </span>
                  </button>
                </div>

                {/* Current Virtual Analysis / Statistical Estimate Box (with 6-second delay) */}
                <div
                  className="rounded-2xl bg-[#0B0E14] border border-white/[0.08] p-5 space-y-3"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span className="font-semibold text-[#CBD5E1]">
                      Statistical Estimate
                    </span>
                    <span className="font-mono tabular-nums">
                      {isAnalyzing
                        ? `Delay: ${(remainingMs / 1000).toFixed(1)}s`
                        : `${stats.totalRounds} rounds analyzed`}
                    </span>
                  </div>

                  {isAnalyzing ? (
                    <div className="py-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base sm:text-lg font-semibold text-[#FBBF24] animate-pulse">
                          Analyzing recent results...
                        </span>
                        <span className="font-mono tabular-nums text-xs text-[#94A3B8]">
                          {Math.ceil(remainingMs / 1000)}s
                        </span>
                      </div>
                      {/* Smooth compositor-friendly progress bar */}
                      <div className="w-full h-2 rounded-full bg-[#1E293B] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#DC2626] via-[#10B981] to-[#F59E0B] origin-left transition-transform duration-100"
                          style={{
                            transform: `scaleX(${progressPercentage / 100})`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-[#94A3B8]">
                        Computing historical frequencies and streak transitions across{' '}
                        <span className="font-mono tabular-nums text-[#F8FAFC]">
                          {stats.totalRounds}
                        </span>{' '}
                        recorded {stats.totalRounds === 1 ? 'round' : 'rounds'}...
                      </p>
                    </div>
                  ) : stats.totalRounds < MIN_ROUNDS_FOR_ESTIMATE ? (
                    <div className="py-3 space-y-2">
                      <div className="text-sm font-medium text-[#E2E8F0]">
                        Awaiting minimum 5-round sample ({stats.totalRounds} /{' '}
                        {MIN_ROUNDS_FOR_ESTIMATE} recorded)
                      </div>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">
                        Record{' '}
                        <span className="font-mono tabular-nums text-[#FBBF24] font-semibold">
                          {MIN_ROUNDS_FOR_ESTIMATE - stats.totalRounds}
                        </span>{' '}
                        more {MIN_ROUNDS_FOR_ESTIMATE - stats.totalRounds === 1 ? 'round' : 'rounds'}{' '}
                        by tapping <span className="text-[#F87171]">🐉 DRAGON</span>,{' '}
                        <span className="text-[#34D399]">⚖️ TIE</span>, or{' '}
                        <span className="text-[#FBBF24]">🐯 TIGER</span> above to calculate a
                        Statistical Estimate.
                      </p>
                    </div>
                  ) : (
                    stats.estimate && (
                      <div className="space-y-3 pt-1 animate-pop-in">
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <div className="text-xs text-[#94A3B8]">Estimated Side</div>
                            <div
                              className={`mt-1 text-lg sm:text-xl font-bold whitespace-nowrap ${
                                stats.estimate.estimatedSide === 'DRAGON'
                                  ? 'text-[#F87171]'
                                  : stats.estimate.estimatedSide === 'TIGER'
                                  ? 'text-[#FBBF24]'
                                  : 'text-[#34D399]'
                              }`}
                            >
                              {stats.estimate.estimatedSide === 'DRAGON'
                                ? '🐉 DRAGON'
                                : stats.estimate.estimatedSide === 'TIGER'
                                ? '🐯 TIGER'
                                : '⚖️ TIE'}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-[#94A3B8]">Historical %</div>
                            <div className="mt-1 font-mono tabular-nums text-lg sm:text-xl font-bold text-[#F8FAFC]">
                              {stats.estimate.historicalPercentage}%
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-[#94A3B8]">Rounds Analyzed</div>
                            <div className="mt-1 font-mono tabular-nums text-lg sm:text-xl font-bold text-[#F8FAFC]">
                              {stats.estimate.roundsAnalyzed}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] text-xs text-[#94A3B8] flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[#CBD5E1] font-medium">
                            {stats.estimate.patternType}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{stats.estimate.rationale}</span>
                        </div>

                        <p className="text-[11px] text-[#64748B] leading-normal">
                          Disclaimer: This Statistical Estimate is calculated strictly from
                          recorded local history and is not a guaranteed prediction of future
                          rounds.
                        </p>
                      </div>
                    )
                  )}
                </div>

                {/* Controls: Undo Last Result, Clear History, Reset Statistics */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleUndoLastResult}
                    disabled={rounds.length === 0}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-40 disabled:pointer-events-none border border-white/[0.08] text-xs font-medium text-[#E2E8F0] flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                    <span className="truncate">Undo Last</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearHistory}
                    disabled={rounds.length === 0}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-40 disabled:pointer-events-none border border-white/[0.08] text-xs font-medium text-[#E2E8F0] flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#F87171] shrink-0" />
                    <span className="truncate">Clear History</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetStatistics}
                    disabled={rounds.length === 0 && virtualCoins === INITIAL_VIRTUAL_COINS}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-40 disabled:pointer-events-none border border-white/[0.08] text-xs font-medium text-[#E2E8F0] flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                    <span className="truncate">Reset Statistics</span>
                  </button>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN (History, Counts, Percentages, Streaks, and Roadmaps) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Statistical Breakdown Grid: Dragon Count/%, Tie Count/%, Tiger Count/%, Current Streak */}
              <section className="rounded-2xl bg-[#131822] border border-white/[0.08] p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-[#F8FAFC]">
                    Historical Distribution & Streak Telemetry
                  </h2>
                  <div className="text-xs text-[#94A3B8] font-mono tabular-nums">
                    <span>Dragon {stats.dragonPercentage}%</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span>Tie {stats.tiePercentage}%</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span>Tiger {stats.tigerPercentage}%</span>
                  </div>
                </div>

                {/* Proportional Distribution Bar */}
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full bg-[#0B0E14] overflow-hidden flex border border-white/[0.06]">
                    {stats.totalRounds === 0 ? (
                      <div className="w-full h-full bg-[#1E293B]" />
                    ) : (
                      <>
                        <div
                          className="h-full bg-[#DC2626] transition-all duration-200"
                          style={{ width: `${stats.dragonPercentage}%` }}
                          title={`Dragon: ${stats.dragonPercentage}%`}
                        />
                        <div
                          className="h-full bg-[#10B981] transition-all duration-200"
                          style={{ width: `${stats.tiePercentage}%` }}
                          title={`Tie: ${stats.tiePercentage}%`}
                        />
                        <div
                          className="h-full bg-[#F59E0B] transition-all duration-200"
                          style={{ width: `${stats.tigerPercentage}%` }}
                          title={`Tiger: ${stats.tigerPercentage}%`}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Core Historical Metrics including Dragon, Tie, Tiger, and Current Streak */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/[0.06]">
                  <div>
                    <div className="text-xs text-[#94A3B8]">🐉 Dragon</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-bold text-[#F87171]">
                      {stats.dragonCount}{' '}
                      <span className="text-xs font-normal text-[#94A3B8]">
                        ({stats.dragonPercentage}%)
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[#94A3B8]">⚖️ Tie</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-bold text-[#34D399]">
                      {stats.tieCount}{' '}
                      <span className="text-xs font-normal text-[#94A3B8]">
                        ({stats.tiePercentage}%)
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[#94A3B8]">🐯 Tiger</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-bold text-[#FBBF24]">
                      {stats.tigerCount}{' '}
                      <span className="text-xs font-normal text-[#94A3B8]">
                        ({stats.tigerPercentage}%)
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[#94A3B8]">Current Streak</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-bold text-[#F8FAFC] whitespace-nowrap">
                      {stats.currentStreak.side ? (
                        <span
                          className={
                            stats.currentStreak.side === 'DRAGON'
                              ? 'text-[#F87171]'
                              : stats.currentStreak.side === 'TIGER'
                              ? 'text-[#FBBF24]'
                              : 'text-[#34D399]'
                          }
                        >
                          {stats.currentStreak.side === 'DRAGON'
                            ? '🐉'
                            : stats.currentStreak.side === 'TIGER'
                            ? '🐯'
                            : '⚖️'}{' '}
                          ×{stats.currentStreak.count}
                        </span>
                      ) : (
                        <span className="text-[#64748B]">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Recent Results Sequence (🐉 🐯 🐉 🐉 🐯 ...) & Roadmaps */}
              <RoadmapPanel rounds={rounds} compact />
            </div>
          </div>
        )}

        {activeTab === 'roadmaps' && <RoadmapPanel rounds={rounds} />}

        {activeTab === 'methodology' && <MethodologyPanel stats={stats} />}

        {activeTab === 'android-apk' && <AndroidSourceViewer />}
      </main>

      {/* Footer with Compliance & Native Android Quick Link */}
      <footer className="mt-auto border-t border-white/[0.06] py-5 px-4 sm:px-6 lg:px-8 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Dragon Tiger Predictor Demo · Virtual-coin statistical analysis utility only. No
            real-money gambling, external app integration, or guaranteed predictions.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('android-apk')}
            className="text-[#94A3B8] hover:text-[#F8FAFC] underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            View & Download Native Android Kotlin Project (.zip)
          </button>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar (Ergonomic Thumb Zone for Android Viewports) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0B0E14]/95 backdrop-blur-md border-t border-white/[0.08] grid grid-cols-4 items-center px-2"
      >
        <button
          type="button"
          onClick={() => setActiveTab('analyzer')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'analyzer' ? 'text-[#F59E0B]' : 'text-[#94A3B8]'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
            Analyzer
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roadmaps')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'roadmaps' ? 'text-[#F59E0B]' : 'text-[#94A3B8]'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
            Roadmaps
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('methodology')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'methodology' ? 'text-[#F59E0B]' : 'text-[#94A3B8]'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
            Formula
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('android-apk')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'android-apk' ? 'text-[#F59E0B]' : 'text-[#94A3B8]'
          }`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
            Kotlin APK
          </span>
        </button>
      </nav>
    </div>
  );
}
