import { oppositeColor } from './board';
import { generateLegalMoves, isInCheck } from './movegen';
import { BoardState, Color, GameOutcome, MoveRecord, Piece, PieceType } from './types';

export function isInsufficientMaterial(board: BoardState): boolean {
  const minors: { color: Color; type: PieceType; sqColor: number }[] = [];

  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (!p || p.type === 'k') continue;
    if (p.type === 'p' || p.type === 'r' || p.type === 'q') return false;
    const sqColor = ((sq >> 3) + (sq & 7)) & 1;
    minors.push({ color: p.color, type: p.type, sqColor });
    if (minors.length > 2) return false;
  }

  if (minors.length === 0) return true; // K vs K
  if (minors.length === 1) return true; // K+B vs K or K+N vs K

  // K+B vs K+B on same color square
  if (
    minors.length === 2 &&
    minors[0].type === 'b' &&
    minors[1].type === 'b' &&
    minors[0].color !== minors[1].color &&
    minors[0].sqColor === minors[1].sqColor
  ) {
    return true;
  }

  return false;
}

export function isThreefoldRepetition(board: BoardState): boolean {
  const history = board.positionHistory;
  if (history.length < 5) return false;
  const current = history[history.length - 1];
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] === current) {
      count++;
      if (count >= 3) return true;
    }
  }
  return false;
}

export function evaluateGameOutcome(board: BoardState): GameOutcome | null {
  const legalMoves = generateLegalMoves(board);
  const inCheck = isInCheck(board, board.turn);

  if (legalMoves.length === 0) {
    if (inCheck) {
      const winner = oppositeColor(board.turn);
      return {
        winner,
        reason: 'checkmate',
        message: `Checkmate — ${winner === 'w' ? 'White' : 'Black'} wins`,
      };
    }
    return {
      winner: 'draw',
      reason: 'stalemate',
      message: 'Draw by Stalemate',
    };
  }

  if (board.halfmoveClock >= 100) {
    return {
      winner: 'draw',
      reason: 'fifty-move',
      message: 'Draw by Fifty-Move Rule',
    };
  }

  if (isThreefoldRepetition(board)) {
    return {
      winner: 'draw',
      reason: 'repetition',
      message: 'Draw by Threefold Repetition',
    };
  }

  if (isInsufficientMaterial(board)) {
    return {
      winner: 'draw',
      reason: 'insufficient-material',
      message: 'Draw by Insufficient Material',
    };
  }

  return null;
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export interface CapturedSummary {
  capturedByWhite: PieceType[];
  capturedByBlack: PieceType[];
  whiteAdvantage: number;
}

const CAPTURE_ORDER: Record<PieceType, number> = {
  q: 5,
  r: 4,
  b: 3,
  n: 2,
  p: 1,
  k: 0,
};

export function computeCapturedFromHistory(history: MoveRecord[]): CapturedSummary {
  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];
  let whiteScore = 0;
  let blackScore = 0;

  for (const rec of history) {
    if (rec.move.captured) {
      if (rec.move.color === 'w') {
        capturedByWhite.push(rec.move.captured);
        whiteScore += PIECE_VALUES[rec.move.captured];
      } else {
        capturedByBlack.push(rec.move.captured);
        blackScore += PIECE_VALUES[rec.move.captured];
      }
    }
  }

  const sortFn = (a: PieceType, b: PieceType) => CAPTURE_ORDER[b] - CAPTURE_ORDER[a];
  capturedByWhite.sort(sortFn);
  capturedByBlack.sort(sortFn);

  return {
    capturedByWhite,
    capturedByBlack,
    whiteAdvantage: whiteScore - blackScore,
  };
}

export function computeMaterialFromBoard(board: BoardState): {
  capturedByWhite: PieceType[];
  capturedByBlack: PieceType[];
  whiteAdvantage: number;
} {
  // Useful when inspecting custom FEN positions in Practice Mode
  const starting: Record<Color, Record<PieceType, number>> = {
    w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
  };
  const current: Record<Color, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };

  let wTotal = 0;
  let bTotal = 0;
  for (let i = 0; i < 64; i++) {
    const p: Piece | null = board.squares[i];
    if (!p) continue;
    current[p.color][p.type]++;
    if (p.color === 'w') wTotal += PIECE_VALUES[p.type];
    else bTotal += PIECE_VALUES[p.type];
  }

  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];
  for (const t of ['q', 'r', 'b', 'n', 'p'] as PieceType[]) {
    const missingBlack = Math.max(0, starting.b[t] - current.b[t]);
    for (let i = 0; i < missingBlack; i++) capturedByWhite.push(t);
    const missingWhite = Math.max(0, starting.w[t] - current.w[t]);
    for (let i = 0; i < missingWhite; i++) capturedByBlack.push(t);
  }

  return {
    capturedByWhite,
    capturedByBlack,
    whiteAdvantage: wTotal - bTotal,
  };
}

export function generatePGN(
  history: MoveRecord[],
  outcome: GameOutcome | null,
  initialFen?: string,
  whiteName = 'White',
  blackName = 'Black'
): string {
  const resultTag = !outcome
    ? '*'
    : outcome.winner === 'w'
      ? '1-0'
      : outcome.winner === 'b'
        ? '0-1'
        : '1/2-1/2';

  const now = new Date();
  const dateStr = `${now.getUTCFullYear()}.${String(now.getUTCMonth() + 1).padStart(2, '0')}.${String(now.getUTCDate()).padStart(2, '0')}`;
  const headers = [
    `[Event "PeakCraft Chess Match"]`,
    `[Site "PeakCraft Chess (Local)"]`,
    `[Date "${dateStr}"]`,
    `[White "${whiteName}"]`,
    `[Black "${blackName}"]`,
    `[Result "${resultTag}"]`,
  ];

  if (initialFen && initialFen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    headers.push(`[SetUp "1"]`);
    headers.push(`[FEN "${initialFen}"]`);
  }

  const tokens: string[] = [];
  for (let i = 0; i < history.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteSan = history[i]?.san;
    const blackSan = history[i + 1]?.san;
    if (whiteSan && blackSan) {
      tokens.push(`${moveNum}. ${whiteSan} ${blackSan}`);
    } else if (whiteSan) {
      tokens.push(`${moveNum}. ${whiteSan}`);
    }
  }
  tokens.push(resultTag);

  return `${headers.join('\n')}\n\n${tokens.join(' ')}`;
}

