import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  RotateCcw,
  SlidersHorizontal,
  Cpu,
  Users,
  Compass,
  Clock,
  ArrowRight,
  Shuffle,
} from 'lucide-react';
import { INITIAL_FEN, parseFEN } from '../engine/board';
import {
  ChessSettings,
  Difficulty,
  GameMode,
  PlayerColorPref,
  PlayerStats,
  SavedGameState,
  TimeControlId,
} from '../engine/types';
import { TIME_CONTROLS } from '../services/storage';
import { ChessScene3D } from '../scene/ChessScene3D';
import { ChessPieceSvg } from './ChessPieces';
import { OfflineStatusIndicator, PWAInstallButton } from './OfflineBadge';

export interface NewGameConfig {
  mode: GameMode;
  difficulty: Difficulty;
  colorPref: PlayerColorPref;
  timeControl: TimeControlId;
}

interface WelcomeScreenProps {
  savedGame: SavedGameState | null;
  stats: PlayerStats;
  settings: ChessSettings;
  isModalOpen: boolean;
  onStartNewGame: (config: NewGameConfig) => void;
  onContinueGame: () => void;
  onOpenSettings: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  savedGame,
  stats,
  settings,
  isModalOpen,
  onStartNewGame,
  onContinueGame,
  onOpenSettings,
}) => {
  const [mode, setMode] = useState<GameMode>('pvc');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [colorPref, setColorPref] = useState<PlayerColorPref>('w');
  const [timeControl, setTimeControl] = useState<TimeControlId>('untimed');

  const previewBoard = useMemo(() => {
    if (savedGame && !savedGame.outcome) {
      try {
        return parseFEN(savedGame.fen);
      } catch {
        return parseFEN(INITIAL_FEN);
      }
    }
    return parseFEN(INITIAL_FEN);
  }, [savedGame]);

  const hasContinuableGame = Boolean(savedGame && !savedGame.outcome);
  const savedMovesCount = savedGame ? Math.ceil(savedGame.moveHistory.length / 2) : 0;

  // Enter/Space keyboard shortcut to start match when no modal or button focus overrides
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      if (
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartNewGame({ mode, difficulty, colorPref, timeControl });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, mode, difficulty, colorPref, timeControl, onStartNewGame]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B2A29] text-[#F5F0E5]">
      {/* Live 3D World Backdrop */}
      <div className="absolute inset-0 z-0">
        <ChessScene3D
          board={previewBoard}
          flipped={false}
          cameraPreset="classic"
          cameraResetNonce={0}
          attractMode={true}
          interactive={false}
          selectedSquare={null}
          legalMovesForSelection={[]}
          lastMove={null}
          hintMove={null}
          inCheckColor={null}
          capturedByWhite={[]}
          capturedByBlack={[]}
          pendingPromotion={null}
          showLegalMoves={false}
          showCoordinates={settings.showCoordinates}
          animationsEnabled={settings.animationsEnabled}
          boardTheme={settings.boardTheme}
          onSquareClick={() => {}}
          onSelectPromotion={() => {}}
          onCancelPromotion={() => {}}
        />
        {/* Subtle left directional vignette for crisp text legibility without obscuring the right-center 3D board */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(11,42,41,0.92) 0%, rgba(11,42,41,0.72) 38%, rgba(11,42,41,0.14) 72%, rgba(11,42,41,0.18) 100%)',
          }}
        />
      </div>

      {/* Perimeter Top-Right Utility Cluster */}
      <div className="pointer-events-none absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-3">
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-xl border border-[#D4AA55]/30 bg-[#0D3231]/92 shadow-lg">
          <OfflineStatusIndicator />
          <span className="h-3.5 w-px bg-[#D4AA55]/25" aria-hidden="true" />
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F0D69B] hover:text-[#F5F0E5] transition-colors whitespace-nowrap cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Preferences</span>
          </button>
          <PWAInstallButton />
        </div>
      </div>

      {/* Dedicated Title Lockup & Match Configurator Side Panel */}
      <div className="pointer-events-none relative z-10 h-full w-full flex flex-col justify-between p-4 sm:p-8 lg:p-10">
        <div className="pointer-events-auto w-full max-w-[460px] my-auto max-h-[calc(100vh-88px)] overflow-y-auto pc-scroll rounded-2xl border border-[#D4AA55]/35 bg-[#0D3231]/92 p-6 sm:p-7 shadow-2xl space-y-5">
          {/* Bespoke Inline SVG Title Lockup */}
          <div className="space-y-2.5">
            <svg
              viewBox="0 0 380 76"
              className="w-full max-w-[340px] h-auto"
              role="img"
              aria-label="PeakCraft Chess — Strategy Reimagined"
            >
              <defs>
                <linearGradient id="pc-lockup-gold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F0D69B" />
                  <stop offset="55%" stopColor="#D4AA55" />
                  <stop offset="100%" stopColor="#A67E2E" />
                </linearGradient>
              </defs>
              {/* Emblem */}
              <rect
                x="2"
                y="8"
                width="54"
                height="54"
                rx="12"
                fill="#174D49"
                stroke="url(#pc-lockup-gold)"
                strokeWidth="2"
              />
              <path
                d="M19 20 L23 26 L29 17 L35 26 L39 20 L37 30 L21 30 Z"
                fill="url(#pc-lockup-gold)"
              />
              <path d="M21 32 L37 32 L39 44 L19 44 Z" fill="url(#pc-lockup-gold)" opacity="0.92" />
              <path d="M29 34 L32 38 L29 42 L26 38 Z" fill="#103C3B" />
              <rect x="17" y="46" width="24" height="3.5" rx="1.5" fill="#F5F0E5" />
              <rect x="14" y="51" width="30" height="4" rx="1.5" fill="url(#pc-lockup-gold)" />

              {/* Wordmark */}
              <text
                x="72"
                y="37"
                fill="#F5F0E5"
                fontFamily="Cormorant Garamond, Georgia, serif"
                fontWeight="700"
                fontSize="31"
                letterSpacing="0.5"
              >
                PeakCraft Chess
              </text>
              <text
                x="73"
                y="57"
                fill="#D4AA55"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontWeight="600"
                fontSize="11"
                letterSpacing="2.4"
              >
                STRATEGY REIMAGINED
              </text>
            </svg>

            <p className="text-xs text-[#F5F0E5]/70">
              Original 3D Tabletop Chess · PeakCraft Innovations Limited
            </p>
          </div>

          {/* Continue Saved Match Banner */}
          {hasContinuableGame && savedGame && (
            <div className="rounded-xl border border-[#D4AA55]/50 bg-[#174D49]/90 p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F0D69B]">
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Match in Progress</span>
                </div>
                <p className="text-xs text-[#F5F0E5]/85 font-mono-tabular truncate mt-0.5">
                  {savedGame.mode === 'pvc'
                    ? `vs Engine (${savedGame.difficulty})`
                    : savedGame.mode === 'local'
                      ? 'Local 2-Player'
                      : 'Practice'}{' '}
                  · Move {Math.max(1, savedMovesCount)}
                </p>
              </div>
              <button
                type="button"
                onClick={onContinueGame}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F5F0E5] text-[#202522] text-xs font-semibold hover:bg-[#F0D69B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Resume</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Game Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#F0D69B] tracking-wide">
              Game Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pvc' as const, label: 'vs Engine', icon: Cpu },
                { id: 'local' as const, label: 'Local 2P', icon: Users },
                { id: 'practice' as const, label: 'Practice', icon: Compass },
              ].map((item) => {
                const Icon = item.icon;
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'border-[#D4AA55] bg-[#174D49] text-[#F0D69B]'
                        : 'border-[#F5F0E5]/15 bg-[#103C3B] text-[#F5F0E5]/80 hover:border-[#D4AA55]/45'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty & Color (PvC) */}
          {mode === 'pvc' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#F0D69B] tracking-wide">
                  Strength
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#103C3B] border border-[#D4AA55]/25">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`py-1.5 px-1 rounded text-[11px] font-medium capitalize transition-colors whitespace-nowrap cursor-pointer ${
                        difficulty === level
                          ? 'bg-[#D4AA55] text-[#202522] font-semibold'
                          : 'text-[#F5F0E5]/75 hover:text-[#F5F0E5]'
                      }`}
                    >
                      {level === 'beginner' ? 'Easy' : level === 'intermediate' ? 'Mid' : 'Hard'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#F0D69B] tracking-wide">
                  Play As
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#103C3B] border border-[#D4AA55]/25">
                  <button
                    type="button"
                    onClick={() => setColorPref('w')}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      colorPref === 'w'
                        ? 'bg-[#F5F0E5] text-[#202522] font-semibold'
                        : 'text-[#F5F0E5]/75 hover:text-[#F5F0E5]'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 shrink-0">
                      <ChessPieceSvg color="w" type="k" />
                    </span>
                    <span>White</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setColorPref('random')}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      colorPref === 'random'
                        ? 'bg-[#D4AA55] text-[#202522] font-semibold'
                        : 'text-[#F5F0E5]/75 hover:text-[#F5F0E5]'
                    }`}
                  >
                    <Shuffle className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>Auto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setColorPref('b')}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      colorPref === 'b'
                        ? 'bg-[#202522] text-[#F0D69B] font-semibold border border-[#D4AA55]/50'
                        : 'text-[#F5F0E5]/75 hover:text-[#F5F0E5]'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 shrink-0">
                      <ChessPieceSvg color="b" type="k" />
                    </span>
                    <span>Black</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Time Control */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#F0D69B] tracking-wide">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clock</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(TIME_CONTROLS) as TimeControlId[]).map((tcId) => {
                const tc = TIME_CONTROLS[tcId];
                const active = timeControl === tcId;
                return (
                  <button
                    key={tcId}
                    type="button"
                    onClick={() => setTimeControl(tcId)}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium font-mono-tabular transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'border-[#D4AA55] bg-[#174D49] text-[#F0D69B]'
                        : 'border-[#F5F0E5]/15 bg-[#103C3B] text-[#F5F0E5]/80 hover:border-[#D4AA55]/45'
                    }`}
                  >
                    {tc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Start Match CTA */}
          <button
            type="button"
            onClick={() => onStartNewGame({ mode, difficulty, colorPref, timeControl })}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#D4AA55] text-[#202522] font-semibold text-sm hover:bg-[#F0D69B] transition-colors shadow-lg cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0D69B]"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Start Match</span>
          </button>

          {/* Real Local Stats (only once >= 1 match finished) */}
          {stats.gamesPlayed > 0 && (
            <div className="pt-2 border-t border-[#D4AA55]/20 flex items-center justify-between text-[11px] text-[#F5F0E5]/75 font-mono-tabular">
              <span>Played: {stats.gamesPlayed}</span>
              <span>Wins: {stats.wins}</span>
              <span>Draws: {stats.draws}</span>
              <span>Losses: {stats.losses}</span>
            </div>
          )}
        </div>

        {/* Single Flat Control Hint Line */}
        <div className="pointer-events-none flex justify-center pt-2">
          <p className="px-4 py-1.5 rounded-lg bg-[#0D3231]/88 border border-[#D4AA55]/25 text-[11px] sm:text-xs text-[#F5F0E5]/80 font-mono-tabular text-center">
            Click Piece &amp; Square to Move · Drag to Orbit · Scroll to Zoom · Enter Start · H Hide HUD · Esc Pause
          </p>
        </div>
      </div>
    </div>
  );
};
