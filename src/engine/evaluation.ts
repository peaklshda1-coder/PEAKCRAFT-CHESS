import { BoardState, PieceType } from './types';

export const PIECE_VALUE_CP: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 335,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables from White's perspective (index 0 = a8, index 63 = h1)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  12, 16, 22, 32, 32, 22, 16, 12,
   6,  8, 14, 28, 28, 14,  8,  6,
   2,  4, 12, 24, 24, 12,  4,  2,
   4, -2, -8,  2,  2, -8, -2,  4,
   4, 10, 10,-22,-22, 10, 10,  4,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  4,  4,  0,-20,-40,
  -30,  4, 14, 18, 18, 14,  4,-30,
  -30,  6, 18, 24, 24, 18,  6,-30,
  -30,  2, 18, 22, 22, 18,  2,-30,
  -30,  8, 12, 16, 16, 12,  8,-30,
  -40,-20,  0,  6,  6,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  4,  0,  0,  0,  0,  4,-10,
  -10, 10, 10, 12, 12, 10, 10,-10,
  -10,  2, 12, 14, 14, 12,  2,-10,
  -10,  6,  8, 14, 14,  8,  6,-10,
  -10, 10, 10,  6,  6, 10, 10,-10,
  -10,  8,  0,  0,  0,  0,  8,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
   0,  0,  2,  6,  6,  2,  0,  0,
  12, 18, 18, 18, 18, 18, 18, 12,
  -6,  0,  0,  0,  0,  0,  0, -6,
  -6,  0,  0,  0,  0,  0,  0, -6,
  -6,  0,  0,  0,  0,  0,  0, -6,
  -6,  0,  0,  0,  0,  0,  0, -6,
  -6,  0,  0,  0,  0,  0,  0, -6,
   0,  0,  4, 10, 10,  4,  0,  0,
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  6,  6,  6,  6,  0,-10,
   -5,  0,  6,  8,  8,  6,  0, -5,
    0,  0,  6,  8,  8,  6,  0, -5,
  -10,  4,  6,  6,  6,  6,  0,-10,
  -10,  0,  4,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MID_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   16, 16,  0, -4, -4,  0, 16, 16,
   20, 32, 14,  0,  0, 10, 32, 20,
];

const KING_END_PST = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50,
];

function flipIndex(sq: number): number {
  const row = 7 - (sq >> 3);
  const col = sq & 7;
  return (row << 3) | col;
}

/**
 * Evaluates board from the perspective of `board.turn` (positive = good for side to move).
 */
export function evaluatePosition(board: BoardState): number {
  const squares = board.squares;
  let whiteScore = 0;
  let blackScore = 0;

  let wBishops = 0;
  let bBishops = 0;
  let nonPawnMaterial = 0;

  const wPawnFiles = [0, 0, 0, 0, 0, 0, 0, 0];
  const bPawnFiles = [0, 0, 0, 0, 0, 0, 0, 0];

  for (let sq = 0; sq < 64; sq++) {
    const p = squares[sq];
    if (!p) continue;
    if (p.type !== 'k' && p.type !== 'p') {
      nonPawnMaterial += PIECE_VALUE_CP[p.type];
    }
    if (p.type === 'p') {
      if (p.color === 'w') wPawnFiles[sq & 7]++;
      else bPawnFiles[sq & 7]++;
    }
  }

  // Endgame phase factor (0 = middlegame, 1 = endgame)
  const isEndgame = nonPawnMaterial <= 2600;

  for (let sq = 0; sq < 64; sq++) {
    const p = squares[sq];
    if (!p) continue;

    const idx = p.color === 'w' ? sq : flipIndex(sq);
    let score = PIECE_VALUE_CP[p.type];

    switch (p.type) {
      case 'p':
        score += PAWN_PST[idx];
        break;
      case 'n':
        score += KNIGHT_PST[idx];
        break;
      case 'b':
        score += BISHOP_PST[idx];
        if (p.color === 'w') wBishops++;
        else bBishops++;
        break;
      case 'r':
        score += ROOK_PST[idx];
        // Open / semi-open file bonus
        {
          const file = sq & 7;
          const ownPawns = p.color === 'w' ? wPawnFiles[file] : bPawnFiles[file];
          const enemyPawns = p.color === 'w' ? bPawnFiles[file] : wPawnFiles[file];
          if (ownPawns === 0) {
            score += enemyPawns === 0 ? 18 : 10;
          }
        }
        break;
      case 'q':
        score += QUEEN_PST[idx];
        break;
      case 'k':
        score += isEndgame ? KING_END_PST[idx] : KING_MID_PST[idx];
        // King pawn shield in middlegame
        if (!isEndgame) {
          const kRow = sq >> 3;
          const kCol = sq & 7;
          const shieldRow = p.color === 'w' ? kRow - 1 : kRow + 1;
          if (shieldRow >= 0 && shieldRow < 8) {
            for (let dc = -1; dc <= 1; dc++) {
              const sc = kCol + dc;
              if (sc >= 0 && sc < 8) {
                const sp = squares[(shieldRow << 3) | sc];
                if (sp && sp.color === p.color && sp.type === 'p') {
                  score += 12;
                }
              }
            }
          }
        }
        break;
    }

    if (p.color === 'w') whiteScore += score;
    else blackScore += score;
  }

  // Bishop pair bonus
  if (wBishops >= 2) whiteScore += 32;
  if (bBishops >= 2) blackScore += 32;

  // Doubled & isolated pawn penalties
  for (let f = 0; f < 8; f++) {
    if (wPawnFiles[f] > 1) whiteScore -= 14 * (wPawnFiles[f] - 1);
    if (bPawnFiles[f] > 1) blackScore -= 14 * (bPawnFiles[f] - 1);
    if (wPawnFiles[f] > 0) {
      const left = f > 0 ? wPawnFiles[f - 1] : 0;
      const right = f < 7 ? wPawnFiles[f + 1] : 0;
      if (left === 0 && right === 0) whiteScore -= 12 * wPawnFiles[f];
    }
    if (bPawnFiles[f] > 0) {
      const left = f > 0 ? bPawnFiles[f - 1] : 0;
      const right = f < 7 ? bPawnFiles[f + 1] : 0;
      if (left === 0 && right === 0) blackScore -= 12 * bPawnFiles[f];
    }
  }

  // Development bonus (penalize minor pieces still sitting on back rank in opening/early middlegame)
  if (!isEndgame) {
    for (const col of [1, 2, 5, 6]) {
      const wp = squares[(7 << 3) | col];
      if (wp && wp.color === 'w' && (wp.type === 'n' || wp.type === 'b')) whiteScore -= 14;
      const bp = squares[col];
      if (bp && bp.color === 'b' && (bp.type === 'n' || bp.type === 'b')) blackScore -= 14;
    }
  }

  // Center control bonus (e4, d4, e5, d5 occupation)
  for (const centerSq of [27, 28, 35, 36]) {
    const cp = squares[centerSq];
    if (cp) {
      const bonus = cp.type === 'p' ? 16 : 10;
      if (cp.color === 'w') whiteScore += bonus;
      else blackScore += bonus;
    }
  }

  const net = whiteScore - blackScore;
  return board.turn === 'w' ? net : -net;
}
