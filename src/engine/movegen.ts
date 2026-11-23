import {
  CASTLE_BK,
  CASTLE_BQ,
  CASTLE_WK,
  CASTLE_WQ,
  computePositionKey,
  oppositeColor,
  squareToAlgebraic,
} from './board';
import { BoardState, Color, Move, PieceType, SquareIndex, UndoInfo } from './types';

// Castling mask cleared when any piece moves from or to square i
const CASTLING_MASK = new Array<number>(64).fill(15);
CASTLING_MASK[0] = ~CASTLE_BQ & 15; // a8
CASTLING_MASK[4] = ~(CASTLE_BK | CASTLE_BQ) & 15; // e8
CASTLING_MASK[7] = ~CASTLE_BK & 15; // h8
CASTLING_MASK[56] = ~CASTLE_WQ & 15; // a1
CASTLING_MASK[60] = ~(CASTLE_WK | CASTLE_WQ) & 15; // e1
CASTLING_MASK[63] = ~CASTLE_WK & 15; // h1

const KNIGHT_OFFSETS: readonly [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const BISHOP_DIRS: readonly [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const ROOK_DIRS: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const KING_OFFSETS: readonly [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const PROMO_TYPES: readonly Exclude<PieceType, 'p' | 'k'>[] = ['q', 'r', 'b', 'n'];

export function isSquareAttacked(board: BoardState, sq: SquareIndex, byColor: Color): boolean {
  const row = sq >> 3;
  const col = sq & 7;
  const squares = board.squares;

  // 1. Pawn attacks (looking backwards from sq to attacker pawn)
  const pawnRow = byColor === 'w' ? row + 1 : row - 1;
  if (pawnRow >= 0 && pawnRow < 8) {
    if (col > 0) {
      const p = squares[(pawnRow << 3) | (col - 1)];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
    if (col < 7) {
      const p = squares[(pawnRow << 3) | (col + 1)];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }

  // 2. Knight attacks
  for (let i = 0; i < 8; i++) {
    const r = row + KNIGHT_OFFSETS[i][0];
    const c = col + KNIGHT_OFFSETS[i][1];
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = squares[(r << 3) | c];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }

  // 3. King attacks
  for (let i = 0; i < 8; i++) {
    const r = row + KING_OFFSETS[i][0];
    const c = col + KING_OFFSETS[i][1];
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = squares[(r << 3) | c];
      if (p && p.color === byColor && p.type === 'k') return true;
    }
  }

  // 4. Diagonal rays (Bishop / Queen)
  for (let i = 0; i < 4; i++) {
    const dr = BISHOP_DIRS[i][0];
    const dc = BISHOP_DIRS[i][1];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = squares[(r << 3) | c];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // 5. Orthogonal rays (Rook / Queen)
  for (let i = 0; i < 4; i++) {
    const dr = ROOK_DIRS[i][0];
    const dc = ROOK_DIRS[i][1];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = squares[(r << 3) | c];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function isInCheck(board: BoardState, color: Color): boolean {
  return isSquareAttacked(board, board.kingSq[color], oppositeColor(color));
}

export function generatePseudoLegalMoves(board: BoardState, capturesOnly = false): Move[] {
  const moves: Move[] = [];
  const turn = board.turn;
  const enemy = oppositeColor(turn);
  const squares = board.squares;

  for (let sq = 0; sq < 64; sq++) {
    const piece = squares[sq];
    if (!piece || piece.color !== turn) continue;

    const row = sq >> 3;
    const col = sq & 7;

    if (piece.type === 'p') {
      const dir = turn === 'w' ? -1 : 1;
      const startRow = turn === 'w' ? 6 : 1;
      const promoRow = turn === 'w' ? 0 : 7;
      const nextRow = row + dir;

      if (nextRow >= 0 && nextRow < 8) {
        // Forward single & double push
        if (!capturesOnly) {
          const oneStep = (nextRow << 3) | col;
          if (!squares[oneStep]) {
            if (nextRow === promoRow) {
              for (const promo of PROMO_TYPES) {
                moves.push({ from: sq, to: oneStep, piece: 'p', color: turn, promotion: promo });
              }
            } else {
              moves.push({ from: sq, to: oneStep, piece: 'p', color: turn });
              if (row === startRow) {
                const twoStep = ((row + dir * 2) << 3) | col;
                if (!squares[twoStep]) {
                  moves.push({ from: sq, to: twoStep, piece: 'p', color: turn });
                }
              }
            }
          }
        } else {
          // Promotion pushes can still be tactically decisive in quiescence
          const oneStep = (nextRow << 3) | col;
          if (nextRow === promoRow && !squares[oneStep]) {
            moves.push({ from: sq, to: oneStep, piece: 'p', color: turn, promotion: 'q' });
          }
        }

        // Captures & En Passant
        for (const dc of [-1, 1]) {
          const nc = col + dc;
          if (nc < 0 || nc > 7) continue;
          const targetSq = (nextRow << 3) | nc;
          const target = squares[targetSq];
          if (target && target.color === enemy) {
            if (nextRow === promoRow) {
              for (const promo of PROMO_TYPES) {
                moves.push({
                  from: sq,
                  to: targetSq,
                  piece: 'p',
                  color: turn,
                  captured: target.type,
                  promotion: promo,
                });
              }
            } else {
              moves.push({
                from: sq,
                to: targetSq,
                piece: 'p',
                color: turn,
                captured: target.type,
              });
            }
          } else if (board.epSquare === targetSq) {
            moves.push({
              from: sq,
              to: targetSq,
              piece: 'p',
              color: turn,
              captured: 'p',
              isEnPassant: true,
            });
          }
        }
      }
    } else if (piece.type === 'n') {
      for (let i = 0; i < 8; i++) {
        const nr = row + KNIGHT_OFFSETS[i][0];
        const nc = col + KNIGHT_OFFSETS[i][1];
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        const targetSq = (nr << 3) | nc;
        const target = squares[targetSq];
        if (!target) {
          if (!capturesOnly) {
            moves.push({ from: sq, to: targetSq, piece: 'n', color: turn });
          }
        } else if (target.color === enemy) {
          moves.push({ from: sq, to: targetSq, piece: 'n', color: turn, captured: target.type });
        }
      }
    } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
      const dirs =
        piece.type === 'b'
          ? BISHOP_DIRS
          : piece.type === 'r'
            ? ROOK_DIRS
            : [...BISHOP_DIRS, ...ROOK_DIRS];
      for (let i = 0; i < dirs.length; i++) {
        const dr = dirs[i][0];
        const dc = dirs[i][1];
        let nr = row + dr;
        let nc = col + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const targetSq = (nr << 3) | nc;
          const target = squares[targetSq];
          if (!target) {
            if (!capturesOnly) {
              moves.push({ from: sq, to: targetSq, piece: piece.type, color: turn });
            }
          } else {
            if (target.color === enemy) {
              moves.push({
                from: sq,
                to: targetSq,
                piece: piece.type,
                color: turn,
                captured: target.type,
              });
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    } else if (piece.type === 'k') {
      for (let i = 0; i < 8; i++) {
        const nr = row + KING_OFFSETS[i][0];
        const nc = col + KING_OFFSETS[i][1];
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        const targetSq = (nr << 3) | nc;
        const target = squares[targetSq];
        if (!target) {
          if (!capturesOnly) {
            moves.push({ from: sq, to: targetSq, piece: 'k', color: turn });
          }
        } else if (target.color === enemy) {
          moves.push({ from: sq, to: targetSq, piece: 'k', color: turn, captured: target.type });
        }
      }

      // Castling
      if (!capturesOnly) {
        if (turn === 'w' && sq === 60) {
          if (
            (board.castling & CASTLE_WK) &&
            !squares[61] &&
            !squares[62] &&
            !isSquareAttacked(board, 60, 'b') &&
            !isSquareAttacked(board, 61, 'b') &&
            !isSquareAttacked(board, 62, 'b')
          ) {
            moves.push({ from: 60, to: 62, piece: 'k', color: 'w', isCastle: 'K' });
          }
          if (
            (board.castling & CASTLE_WQ) &&
            !squares[59] &&
            !squares[58] &&
            !squares[57] &&
            !isSquareAttacked(board, 60, 'b') &&
            !isSquareAttacked(board, 59, 'b') &&
            !isSquareAttacked(board, 58, 'b')
          ) {
            moves.push({ from: 60, to: 58, piece: 'k', color: 'w', isCastle: 'Q' });
          }
        } else if (turn === 'b' && sq === 4) {
          if (
            (board.castling & CASTLE_BK) &&
            !squares[5] &&
            !squares[6] &&
            !isSquareAttacked(board, 4, 'w') &&
            !isSquareAttacked(board, 5, 'w') &&
            !isSquareAttacked(board, 6, 'w')
          ) {
            moves.push({ from: 4, to: 6, piece: 'k', color: 'b', isCastle: 'k' });
          }
          if (
            (board.castling & CASTLE_BQ) &&
            !squares[3] &&
            !squares[2] &&
            !squares[1] &&
            !isSquareAttacked(board, 4, 'w') &&
            !isSquareAttacked(board, 3, 'w') &&
            !isSquareAttacked(board, 2, 'w')
          ) {
            moves.push({ from: 4, to: 2, piece: 'k', color: 'b', isCastle: 'q' });
          }
        }
      }
    }
  }

  return moves;
}

export function makeMove(board: BoardState, move: Move, trackHistory = true): UndoInfo {
  const squares = board.squares;
  const movingPiece = squares[move.from]!;
  let capturedPiece = squares[move.to];
  let epCapturedSq: SquareIndex | null = null;

  if (move.isEnPassant) {
    epCapturedSq = move.color === 'w' ? move.to + 8 : move.to - 8;
    capturedPiece = squares[epCapturedSq];
    squares[epCapturedSq] = null;
  }

  const undo: UndoInfo = {
    move,
    capturedPiece,
    prevCastling: board.castling,
    prevEpSquare: board.epSquare,
    prevHalfmoveClock: board.halfmoveClock,
    prevFullmoveNumber: board.fullmoveNumber,
    prevPositionKey: '',
  };

  // Move piece
  squares[move.from] = null;
  squares[move.to] = move.promotion
    ? { color: move.color, type: move.promotion }
    : movingPiece;

  // Update king square
  if (move.piece === 'k') {
    board.kingSq[move.color] = move.to;
  }

  // Handle castling rook move
  if (move.isCastle === 'K') {
    squares[61] = squares[63];
    squares[63] = null;
  } else if (move.isCastle === 'Q') {
    squares[59] = squares[56];
    squares[56] = null;
  } else if (move.isCastle === 'k') {
    squares[5] = squares[7];
    squares[7] = null;
  } else if (move.isCastle === 'q') {
    squares[3] = squares[0];
    squares[0] = null;
  }

  // Update castling rights
  board.castling &= CASTLING_MASK[move.from] & CASTLING_MASK[move.to];

  // Update en passant target
  if (move.piece === 'p' && Math.abs(move.to - move.from) === 16) {
    board.epSquare = (move.from + move.to) >> 1;
  } else {
    board.epSquare = null;
  }

  // Halfmove clock & fullmove number
  if (move.piece === 'p' || move.captured || move.isEnPassant) {
    board.halfmoveClock = 0;
  } else {
    board.halfmoveClock += 1;
  }
  if (board.turn === 'b') {
    board.fullmoveNumber += 1;
  }

  board.turn = oppositeColor(board.turn);

  if (trackHistory) {
    const posKey = computePositionKey(board);
    undo.prevPositionKey = posKey;
    board.positionHistory.push(posKey);
  }

  return undo;
}

export function unmakeMove(board: BoardState, undo: UndoInfo, trackHistory = true): void {
  const { move, capturedPiece } = undo;
  const squares = board.squares;

  board.turn = oppositeColor(board.turn);
  board.castling = undo.prevCastling;
  board.epSquare = undo.prevEpSquare;
  board.halfmoveClock = undo.prevHalfmoveClock;
  board.fullmoveNumber = undo.prevFullmoveNumber;

  if (trackHistory && board.positionHistory.length > 0) {
    board.positionHistory.pop();
  }

  // Restore castling rook
  if (move.isCastle === 'K') {
    squares[63] = squares[61];
    squares[61] = null;
  } else if (move.isCastle === 'Q') {
    squares[56] = squares[59];
    squares[59] = null;
  } else if (move.isCastle === 'k') {
    squares[7] = squares[5];
    squares[5] = null;
  } else if (move.isCastle === 'q') {
    squares[0] = squares[3];
    squares[3] = null;
  }

  // Restore moving piece
  squares[move.from] = { color: move.color, type: move.piece };
  if (move.piece === 'k') {
    board.kingSq[move.color] = move.from;
  }

  if (move.isEnPassant) {
    squares[move.to] = null;
    const epCapturedSq = move.color === 'w' ? move.to + 8 : move.to - 8;
    squares[epCapturedSq] = capturedPiece;
  } else {
    squares[move.to] = capturedPiece;
  }
}

export function generateLegalMoves(board: BoardState, capturesOnly = false): Move[] {
  const pseudo = generatePseudoLegalMoves(board, capturesOnly);
  const legal: Move[] = [];
  const mover = board.turn;

  for (let i = 0; i < pseudo.length; i++) {
    const m = pseudo[i];
    const undo = makeMove(board, m, false);
    if (!isInCheck(board, mover)) {
      legal.push(m);
    }
    unmakeMove(board, undo, false);
  }

  return legal;
}

export function getLegalMovesFromSquare(board: BoardState, fromSq: SquareIndex): Move[] {
  return generateLegalMoves(board).filter((m) => m.from === fromSq);
}

export function moveToSAN(board: BoardState, move: Move, allLegalMoves?: Move[]): string {
  if (move.isCastle === 'K' || move.isCastle === 'k') return appendCheckSuffix(board, move, 'O-O');
  if (move.isCastle === 'Q' || move.isCastle === 'q') return appendCheckSuffix(board, move, 'O-O-O');

  const legal = allLegalMoves ?? generateLegalMoves(board);
  const toAlg = squareToAlgebraic(move.to);
  const fromAlg = squareToAlgebraic(move.from);
  const isCapture = Boolean(move.captured || move.isEnPassant);

  let san = '';
  if (move.piece === 'p') {
    if (isCapture) {
      san = `${fromAlg[0]}x${toAlg}`;
    } else {
      san = toAlg;
    }
    if (move.promotion) {
      san += `=${move.promotion.toUpperCase()}`;
    }
  } else {
    san = move.piece.toUpperCase();
    // Disambiguation among other legal moves of the same piece type targeting same square
    const ambiguous = legal.filter(
      (m) => m.piece === move.piece && m.to === move.to && m.from !== move.from
    );
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some((m) => (m.from & 7) === (move.from & 7));
      const sameRank = ambiguous.some((m) => (m.from >> 3) === (move.from >> 3));
      if (!sameFile) {
        san += fromAlg[0];
      } else if (!sameRank) {
        san += fromAlg[1];
      } else {
        san += fromAlg;
      }
    }
    if (isCapture) san += 'x';
    san += toAlg;
  }

  return appendCheckSuffix(board, move, san);
}

function appendCheckSuffix(board: BoardState, move: Move, baseSan: string): string {
  const undo = makeMove(board, move, false);
  const opponentInCheck = isInCheck(board, board.turn);
  let suffix = '';
  if (opponentInCheck) {
    const replies = generateLegalMoves(board);
    suffix = replies.length === 0 ? '#' : '+';
  }
  unmakeMove(board, undo, false);
  return baseSan + suffix;
}
