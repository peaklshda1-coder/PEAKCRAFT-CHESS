import { INITIAL_FEN, parseFEN } from './board';
import { generateLegalMoves, makeMove, moveToSAN, unmakeMove } from './movegen';
import { evaluateGameOutcome } from './rules';
import { findBestMove } from './search';
import { BoardState } from './types';

export function perft(board: BoardState, depth: number): number {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(board);
  if (depth === 1) return moves.length;

  let nodes = 0;
  for (let i = 0; i < moves.length; i++) {
    const undo = makeMove(board, moves[i], false);
    nodes += perft(board, depth - 1);
    unmakeMove(board, undo, false);
  }
  return nodes;
}

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`ASSERTION FAILED [${label}]: expected ${expected}, got ${actual}`);
  }
  console.log(`PASS: ${label} => ${actual}`);
}

export function runVerificationSuite() {
  // 1. Initial position Perft 1..4
  const startBoard = parseFEN(INITIAL_FEN);
  assertEqual('Initial Perft(1)', perft(startBoard, 1), 20);
  assertEqual('Initial Perft(2)', perft(startBoard, 2), 400);
  assertEqual('Initial Perft(3)', perft(startBoard, 3), 8902);
  assertEqual('Initial Perft(4)', perft(startBoard, 4), 197281);

  // 2. Kiwipete (complex castling, en passant, promotions, pins)
  const kiwipete = parseFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  assertEqual('Kiwipete Perft(1)', perft(kiwipete, 1), 48);
  assertEqual('Kiwipete Perft(2)', perft(kiwipete, 2), 2039);
  assertEqual('Kiwipete Perft(3)', perft(kiwipete, 3), 97862);

  // 3. Position 3 (En passant discovered check & promotions)
  const pos3 = parseFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
  assertEqual('Position 3 Perft(1)', perft(pos3, 1), 14);
  assertEqual('Position 3 Perft(2)', perft(pos3, 2), 191);
  assertEqual('Position 3 Perft(3)', perft(pos3, 3), 2812);
  assertEqual('Position 3 Perft(4)', perft(pos3, 4), 43238);

  // 4. Position 5 (Promotion + castling edge cases)
  const pos5 = parseFEN('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8');
  assertEqual('Position 5 Perft(1)', perft(pos5, 1), 44);
  assertEqual('Position 5 Perft(2)', perft(pos5, 2), 1486);
  assertEqual('Position 5 Perft(3)', perft(pos5, 3), 62379);

  // 5. Fool's mate checkmate recognition
  const foolsMate = parseFEN('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
  const mateOutcome = evaluateGameOutcome(foolsMate);
  assertEqual('Checkmate winner', mateOutcome?.winner, 'b');
  assertEqual('Checkmate reason', mateOutcome?.reason, 'checkmate');

  // 6. Stalemate recognition
  const stalemateBoard = parseFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  const staleOutcome = evaluateGameOutcome(stalemateBoard);
  assertEqual('Stalemate reason', staleOutcome?.reason, 'stalemate');

  // 7. Insufficient material (K+B vs K+B same color: c3 dark + d2 dark)
  const sameColorBishops = parseFEN('8/8/8/3k4/8/2B5/3bK3/8 w - - 0 1');
  const insuffOutcome = evaluateGameOutcome(sameColorBishops);
  assertEqual('Insufficient material (same color bishops)', insuffOutcome?.reason, 'insufficient-material');

  // 8. Fifty-move rule
  const fiftyBoard = parseFEN('8/8/8/3k4/8/3R4/4K3/8 w - - 100 60');
  assertEqual('Fifty-move draw', evaluateGameOutcome(fiftyBoard)?.reason, 'fifty-move');

  // 9. Threefold repetition
  const repBoard = parseFEN(INITIAL_FEN);
  const wN1 = generateLegalMoves(repBoard).find((m) => moveToSAN(repBoard, m) === 'Nf3')!;
  const bN1 = (() => {
    makeMove(repBoard, wN1, true);
    return generateLegalMoves(repBoard).find((m) => moveToSAN(repBoard, m) === 'Nf6')!;
  })();
  unmakeMove(repBoard, {
    move: wN1,
    capturedPiece: null,
    prevCastling: 15,
    prevEpSquare: null,
    prevHalfmoveClock: 0,
    prevFullmoveNumber: 1,
    prevPositionKey: '',
  }, true);
  // Cycle Nf3 Nf6 Ng1 Ng8 twice to reach starting position 3 times
  for (let cycle = 0; cycle < 2; cycle++) {
    const m1 = generateLegalMoves(repBoard).find((m) => moveToSAN(repBoard, m) === 'Nf3')!;
    makeMove(repBoard, m1, true);
    const m2 = generateLegalMoves(repBoard).find((m) => moveToSAN(repBoard, m) === 'Nf6')!;
    makeMove(repBoard, m2, true);
    const m3 = generateLegalMoves(repBoard).find((m) => moveToSAN(repBoard, m) === 'Ng1')!;
    makeMove(repBoard, m3, true);
    const m4 = generateLegalMoves(repBoard).find((m) => moveToSAN(repBoard, m) === 'Ng8')!;
    makeMove(repBoard, m4, true);
  }
  assertEqual('Threefold repetition draw', evaluateGameOutcome(repBoard)?.reason, 'repetition');
  void bN1;

  // 10. Search finds mate in 1
  const mateInOne = parseFEN('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1');
  const searchRes = findBestMove(mateInOne, 'advanced', 500);
  assertEqual('AI finds Re8#', moveToSAN(mateInOne, searchRes.move!), 'Re8#');

  console.log('ALL CHESS ENGINE VERIFICATION TESTS PASSED.');
}

// Allow direct CLI execution via `npx tsx src/engine/perft.ts`
if (typeof process !== 'undefined' && process.argv[1]?.includes('perft')) {
  runVerificationSuite();
}
