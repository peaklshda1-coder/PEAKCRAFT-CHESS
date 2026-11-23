export type Color = 'w' | 'b';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  color: Color;
  type: PieceType;
}

export type SquareIndex = number; // 0 (a8) .. 63 (h1)

export interface Move {
  from: SquareIndex;
  to: SquareIndex;
  piece: PieceType;
  color: Color;
  captured?: PieceType;
  promotion?: Exclude<PieceType, 'p' | 'k'>;
  isEnPassant?: boolean;
  isCastle?: 'K' | 'Q' | 'k' | 'q';
}

export interface UndoInfo {
  move: Move;
  capturedPiece: Piece | null;
  prevCastling: number;
  prevEpSquare: SquareIndex | null;
  prevHalfmoveClock: number;
  prevFullmoveNumber: number;
  prevPositionKey: string;
}

export interface BoardState {
  squares: (Piece | null)[];
  turn: Color;
  castling: number; // bitmask: 1=K, 2=Q, 4=k, 8=q
  epSquare: SquareIndex | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  kingSq: { w: SquareIndex; b: SquareIndex };
  positionHistory: string[];
}

export type GameMode = 'pvc' | 'local' | 'practice';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type PlayerColorPref = 'w' | 'b' | 'random';

export type TimeControlId = 'untimed' | 'blitz5' | 'rapid10' | 'classical15';

export interface TimeControlConfig {
  id: TimeControlId;
  label: string;
  initialMs: number;
  incrementMs: number;
}

export type GameEndReason =
  | 'checkmate'
  | 'stalemate'
  | 'repetition'
  | 'fifty-move'
  | 'insufficient-material'
  | 'resignation'
  | 'timeout'
  | 'mutual-agreement';

export interface GameOutcome {
  winner: Color | 'draw';
  reason: GameEndReason;
  message: string;
}

export interface MoveRecord {
  move: Move;
  san: string;
  fenBefore: string;
  fenAfter: string;
  capturedPiece?: Piece | null;
  evaluationCp?: number;
  clockRemainingMs?: { w: number; b: number };
}

export type BoardTheme = 'peakcraft' | 'porcelain' | 'walnut';

export interface ChessSettings {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  autoFlipLocal: boolean;
  boardTheme: BoardTheme;
}

export interface SavedGameState {
  id: string;
  mode: GameMode;
  difficulty: Difficulty;
  playerColor: Color;
  timeControl: TimeControlId;
  fen: string;
  initialFen: string;
  moveHistory: MoveRecord[];
  positionHistory: string[];
  clockMs: { w: number; b: number };
  outcome: GameOutcome | null;
  startedAt: number;
  updatedAt: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  pvcWinsByDifficulty: Record<Difficulty, number>;
}
