import { evaluatePosition, PIECE_VALUE_CP } from './evaluation';
import { generateLegalMoves, isInCheck, makeMove, unmakeMove } from './movegen';
import { isInsufficientMaterial, isThreefoldRepetition } from './rules';
import { BoardState, Difficulty, Move } from './types';

const MATE_SCORE = 100000;
const INF = 200000;

export interface SearchResult {
  move: Move | null;
  evalCp: number;
  depth: number;
  nodes: number;
}

interface SearchContext {
  nodes: number;
  startTime: number;
  timeLimitMs: number;
  aborted: boolean;
  killers: (Move | null)[][];
}

function sameMove(a: Move | null, b: Move | null): boolean {
  if (!a || !b) return false;
  return a.from === b.from && a.to === b.to && a.promotion === b.promotion;
}

function scoreMove(move: Move, pvMove: Move | null, killers: (Move | null)[], ply: number): number {
  if (sameMove(move, pvMove)) return 1000000;
  if (move.captured) {
    // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    const victimVal = PIECE_VALUE_CP[move.captured];
    const attackerVal = PIECE_VALUE_CP[move.piece];
    return 100000 + victimVal * 10 - attackerVal;
  }
  if (move.promotion) {
    return 90000 + PIECE_VALUE_CP[move.promotion];
  }
  if (ply < killers.length && sameMove(move, killers[ply])) {
    return 50000;
  }
  if (move.isCastle) return 4000;
  // Center push preference
  const toRow = move.to >> 3;
  const toCol = move.to & 7;
  const centerDist = Math.abs(toRow - 3.5) + Math.abs(toCol - 3.5);
  return Math.round(100 - centerDist * 10);
}

function orderMoves(
  moves: Move[],
  pvMove: Move | null,
  killers: (Move | null)[][],
  ply: number
): void {
  const killerRow = killers[ply] ?? [];
  moves.sort((a, b) => {
    const sa = scoreMove(a, pvMove, killerRow, ply);
    const sb = scoreMove(b, pvMove, killerRow, ply);
    return sb - sa;
  });
}

function quiescence(
  board: BoardState,
  alpha: number,
  beta: number,
  ctx: SearchContext,
  qDepth: number
): number {
  ctx.nodes++;
  if ((ctx.nodes & 2047) === 0 && performance.now() - ctx.startTime > ctx.timeLimitMs) {
    ctx.aborted = true;
    return 0;
  }

  const standPat = evaluatePosition(board);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  if (qDepth >= 4) return alpha;

  const captures = generateLegalMoves(board, true);
  orderMoves(captures, null, ctx.killers, 0);

  for (let i = 0; i < captures.length; i++) {
    const m = captures[i];
    const undo = makeMove(board, m, false);
    const score = -quiescence(board, -beta, -alpha, ctx, qDepth + 1);
    unmakeMove(board, undo, false);

    if (ctx.aborted) return 0;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

function alphaBeta(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  ctx: SearchContext
): number {
  ctx.nodes++;
  if ((ctx.nodes & 2047) === 0 && performance.now() - ctx.startTime > ctx.timeLimitMs) {
    ctx.aborted = true;
    return 0;
  }

  // Draw detection inside search
  if (ply > 0) {
    if (board.halfmoveClock >= 100 || isThreefoldRepetition(board) || isInsufficientMaterial(board)) {
      return 0;
    }
  }

  if (depth <= 0) {
    return quiescence(board, alpha, beta, ctx, 0);
  }

  const legalMoves = generateLegalMoves(board);
  if (legalMoves.length === 0) {
    if (isInCheck(board, board.turn)) {
      return -MATE_SCORE + ply;
    }
    return 0; // Stalemate
  }

  orderMoves(legalMoves, null, ctx.killers, ply);

  let bestScore = -INF;
  for (let i = 0; i < legalMoves.length; i++) {
    const m = legalMoves[i];
    const undo = makeMove(board, m, true);
    const score = -alphaBeta(board, depth - 1, -beta, -alpha, ply + 1, ctx);
    unmakeMove(board, undo, true);

    if (ctx.aborted) return 0;

    if (score > bestScore) {
      bestScore = score;
    }
    if (score > alpha) {
      alpha = score;
    }
    if (alpha >= beta) {
      if (!m.captured && ply < ctx.killers.length) {
        ctx.killers[ply][1] = ctx.killers[ply][0];
        ctx.killers[ply][0] = m;
      }
      break;
    }
  }

  return bestScore;
}

export function findBestMove(
  board: BoardState,
  difficulty: Difficulty,
  customTimeLimitMs?: number
): SearchResult {
  const legalMoves = generateLegalMoves(board);
  if (legalMoves.length === 0) {
    return { move: null, evalCp: 0, depth: 0, nodes: 0 };
  }
  if (legalMoves.length === 1) {
    return { move: legalMoves[0], evalCp: evaluatePosition(board), depth: 1, nodes: 1 };
  }

  const maxDepth =
    difficulty === 'beginner' ? 2 : difficulty === 'intermediate' ? 3 : 4;
  const defaultTimeMs =
    difficulty === 'beginner' ? 250 : difficulty === 'intermediate' ? 750 : 1600;
  const timeLimitMs = customTimeLimitMs ?? defaultTimeMs;

  const ctx: SearchContext = {
    nodes: 0,
    startTime: performance.now(),
    timeLimitMs,
    aborted: false,
    killers: Array.from({ length: 16 }, () => [null, null]),
  };

  let bestMove: Move = legalMoves[0];
  let bestEval = 0;
  let completedDepth = 0;

  // Iterative deepening
  for (let depth = 1; depth <= maxDepth; depth++) {
    const candidates = [...legalMoves];
    orderMoves(candidates, bestMove, ctx.killers, 0);

    let iterBestMove = candidates[0];
    let iterBestScore = -INF;
    let alpha = -INF;
    const beta = INF;
    const scoredMoves: { move: Move; score: number }[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const m = candidates[i];
      const undo = makeMove(board, m, true);
      const score = -alphaBeta(board, depth - 1, -beta, -alpha, 1, ctx);
      unmakeMove(board, undo, true);

      if (ctx.aborted) break;

      scoredMoves.push({ move: m, score });
      if (score > iterBestScore) {
        iterBestScore = score;
        iterBestMove = m;
      }
      if (score > alpha) {
        alpha = score;
      }
    }

    if (ctx.aborted) {
      break;
    }

    // Difficulty calibration at final completed depth
    if (difficulty === 'beginner' && depth === maxDepth && scoredMoves.length > 1) {
      scoredMoves.sort((a, b) => b.score - a.score);
      // Avoid hanging mate immediately, otherwise pick among top few moves with soft noise
      const topPool = scoredMoves.filter((s) => s.score > scoredMoves[0].score - 140);
      const pickPool = topPool.slice(0, Math.min(3, topPool.length));
      const picked = pickPool[Math.floor(Math.random() * pickPool.length)];
      bestMove = picked.move;
      bestEval = picked.score;
    } else if (difficulty === 'intermediate' && depth === maxDepth && scoredMoves.length > 1) {
      scoredMoves.sort((a, b) => b.score - a.score);
      const nearEqual = scoredMoves.filter((s) => s.score >= scoredMoves[0].score - 22);
      const picked = nearEqual[Math.floor(Math.random() * nearEqual.length)];
      bestMove = picked.move;
      bestEval = picked.score;
    } else {
      bestMove = iterBestMove;
      bestEval = iterBestScore;
    }

    completedDepth = depth;
    if (bestEval > MATE_SCORE - 100) break; // Forced mate found
  }

  return {
    move: bestMove,
    evalCp: bestEval,
    depth: completedDepth,
    nodes: ctx.nodes,
  };
}
