import React, { useState } from 'react';
import { Crown, Handshake, RotateCcw, Eye, Home, Copy, Check } from 'lucide-react';
import { GameMode, GameOutcome } from '../engine/types';

interface GameOverModalProps {
  outcome: GameOutcome;
  mode: GameMode;
  moveCount: number;
  pgnText: string;
  onRematch: () => void;
  onReviewBoard: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  outcome,
  mode,
  moveCount,
  pgnText,
  onRematch,
  onReviewBoard,
  onMainMenu,
}) => {
  const [copiedPgn, setCopiedPgn] = useState(false);
  const isDraw = outcome.winner === 'draw';
  const fullMoves = Math.ceil(moveCount / 2);

  const handleCopyPgn = () => {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(pgnText)
        .then(() => {
          setCopiedPgn(true);
          setTimeout(() => setCopiedPgn(false), 1800);
        })
        .catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[#D4AA55]/45 bg-[#103C3B] text-[#F5F0E5] shadow-2xl overflow-hidden">
        <div className="px-6 pt-8 pb-6 text-center border-b border-[#D4AA55]/20 bg-gradient-to-b from-[#174D49]/80 to-[#103C3B]">
          <div className="mx-auto w-14 h-14 rounded-full border border-[#D4AA55]/50 bg-[#103C3B] flex items-center justify-center mb-4">
            {isDraw ? (
              <Handshake className="w-7 h-7 text-[#F0D69B]" aria-hidden="true" />
            ) : (
              <Crown className="w-7 h-7 text-[#D4AA55]" aria-hidden="true" />
            )}
          </div>
          <h2 id="game-over-title" className="font-display text-3xl font-bold text-[#F0D69B]">
            {outcome.message}
          </h2>
          <p className="mt-2 text-sm text-[#F5F0E5]/75">
            {mode === 'pvc'
              ? 'Player vs Computer'
              : mode === 'local'
                ? 'Local Two-Player'
                : 'Practice Session'}{' '}
            <span aria-hidden="true">·</span>{' '}
            <span className="font-mono-tabular">
              {fullMoves} {fullMoves === 1 ? 'move' : 'moves'}
            </span>
          </p>
        </div>

        <div className="p-6 space-y-3">
          <button
            type="button"
            onClick={onRematch}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#D4AA55] text-[#202522] font-semibold text-sm hover:bg-[#F0D69B] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Rematch</span>
          </button>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={onReviewBoard}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-[#D4AA55]/35 bg-[#174D49]/60 text-xs font-medium text-[#F5F0E5] hover:bg-[#174D49] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#D4AA55]" aria-hidden="true" />
              <span>Review</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPgn}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-[#D4AA55]/35 bg-[#174D49]/60 text-xs font-medium text-[#F5F0E5] hover:bg-[#174D49] transition-colors whitespace-nowrap cursor-pointer"
            >
              {copiedPgn ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#D4AA55]" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#F0D69B]" aria-hidden="true" />
                  <span>Copy PGN</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onMainMenu}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-[#F5F0E5]/20 bg-[#0C2F2E] text-xs font-medium text-[#F5F0E5] hover:bg-[#174D49]/60 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-[#F0D69B]" aria-hidden="true" />
              <span>Title</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
