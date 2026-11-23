import { BoardState, Color, Piece, PieceType, SquareIndex } from './types';

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const CASTLE_WK = 1;
export const CASTLE_WQ = 2;
export const CASTLE_BK = 4;
export const CASTLE_BQ = 8;

const FILES = 'abcdefgh';

export function squareToAlgebraic(sq: SquareIndex): string {
  const file = FILES[sq & 7];
  const rank = 8 - (sq >> 3);
  return `${file}${rank}`;
}

export function algebraicToSquare(alg: string): SquareIndex | null {
  if (alg.length !== 2) return null;
  const col = FILES.indexOf(alg[0].toLowerCase());
  const row = 8 - parseInt(alg[1], 10);
  if (col < 0 || col > 7 || Number.isNaN(row) || row < 0 || row > 7) return null;
  return (row << 3) | col;
}

export function oppositeColor(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

export function pieceFromChar(ch: string): Piece | null {
  const lower = ch.toLowerCase() as PieceType;
  if (!['p', 'n', 'b', 'r', 'q', 'k'].includes(lower)) return null;
  return {
    color: ch === ch.toUpperCase() ? 'w' : 'b',
    type: lower,
  };
}

export function pieceToChar(piece: Piece): string {
  return piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
}

export function cloneBoard(board: BoardState): BoardState {
  return {
    squares: board.squares.map((p) => (p ? { ...p } : null)),
    turn: board.turn,
    castling: board.castling,
    epSquare: board.epSquare,
    halfmoveClock: board.halfmoveClock,
    fullmoveNumber: board.fullmoveNumber,
    kingSq: { ...board.kingSq },
    positionHistory: [...board.positionHistory],
  };
}

export function computePositionKey(board: BoardState): string {
  let key = '';
  for (let i = 0; i < 64; i++) {
    const p = board.squares[i];
    if (p) {
      key += pieceToChar(p);
    } else {
      key += '.';
    }
  }
  key += `|${board.turn}|${board.castling}`;
  // Include epSquare only if an opposing pawn is positioned adjacent to capture it
  if (board.epSquare !== null) {
    const epCol = board.epSquare & 7;
    const epRow = board.epSquare >> 3;
    const pawnRow = board.turn === 'w' ? epRow + 1 : epRow - 1;
    let canCaptureEp = false;
    if (pawnRow >= 0 && pawnRow < 8) {
      for (const dc of [-1, 1]) {
        const c = epCol + dc;
        if (c >= 0 && c < 8) {
          const adj = board.squares[(pawnRow << 3) | c];
          if (adj && adj.color === board.turn && adj.type === 'p') {
            canCaptureEp = true;
            break;
          }
        }
      }
    }
    key += canCaptureEp ? `|${board.epSquare}` : '|-';
  } else {
    key += '|-';
  }
  return key;
}

export function parseFEN(fen: string): BoardState {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) {
    throw new Error('Invalid FEN string: missing fields');
  }
  const [placement, turnPart, castlingPart, epPart, halfmovePart, fullmovePart] = parts;
  const ranks = placement.split('/');
  if (ranks.length !== 8) {
    throw new Error('Invalid FEN placement: must contain 8 ranks');
  }

  const squares: (Piece | null)[] = new Array(64).fill(null);
  let wKing = -1;
  let bKing = -1;

  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of ranks[r]) {
      if (ch >= '1' && ch <= '8') {
        c += parseInt(ch, 10);
      } else {
        const piece = pieceFromChar(ch);
        if (!piece || c > 7) {
          throw new Error(`Invalid FEN character "${ch}" at rank ${8 - r}`);
        }
        const sq = (r << 3) | c;
        squares[sq] = piece;
        if (piece.type === 'k') {
          if (piece.color === 'w') wKing = sq;
          else bKing = sq;
        }
        c++;
      }
    }
    if (c !== 8) {
      throw new Error(`Invalid FEN rank width at rank ${8 - r}`);
    }
  }

  if (wKing === -1 || bKing === -1) {
    throw new Error('Invalid FEN: both kings must be present');
  }

  const turn: Color = turnPart === 'b' ? 'b' : 'w';
  let castling = 0;
  if (castlingPart && castlingPart !== '-') {
    if (castlingPart.includes('K')) castling |= CASTLE_WK;
    if (castlingPart.includes('Q')) castling |= CASTLE_WQ;
    if (castlingPart.includes('k')) castling |= CASTLE_BK;
    if (castlingPart.includes('q')) castling |= CASTLE_BQ;
  }

  const epSquare = epPart && epPart !== '-' ? algebraicToSquare(epPart) : null;
  const halfmoveClock = halfmovePart ? Math.max(0, parseInt(halfmovePart, 10) || 0) : 0;
  const fullmoveNumber = fullmovePart ? Math.max(1, parseInt(fullmovePart, 10) || 1) : 1;

  const board: BoardState = {
    squares,
    turn,
    castling,
    epSquare,
    halfmoveClock,
    fullmoveNumber,
    kingSq: { w: wKing, b: bKing },
    positionHistory: [],
  };
  board.positionHistory.push(computePositionKey(board));
  return board;
}

export function toFEN(board: BoardState): string {
  let placement = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const piece = board.squares[(r << 3) | c];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) {
          placement += empty;
          empty = 0;
        }
        placement += pieceToChar(piece);
      }
    }
    if (empty > 0) placement += empty;
    if (r < 7) placement += '/';
  }

  let castlingStr = '';
  if (board.castling & CASTLE_WK) castlingStr += 'K';
  if (board.castling & CASTLE_WQ) castlingStr += 'Q';
  if (board.castling & CASTLE_BK) castlingStr += 'k';
  if (board.castling & CASTLE_BQ) castlingStr += 'q';
  if (!castlingStr) castlingStr = '-';

  const epStr = board.epSquare !== null ? squareToAlgebraic(board.epSquare) : '-';
  return `${placement} ${board.turn} ${castlingStr} ${epStr} ${board.halfmoveClock} ${board.fullmoveNumber}`;
}
