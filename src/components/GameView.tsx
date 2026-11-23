import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Undo2,
  Lightbulb,
  RotateCw,
  RotateCcw,
  Flag,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Home,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ScrollText,
  X,
  Eye,
  Pause,
  Play,
  Handshake,
} from 'lucide-react';
import {
  INITIAL_FEN,
  oppositeColor,
  parseFEN,
  toFEN,
} from '../engine/board';
import { evaluatePosition } from '../engine/evaluation';
import {
  generateLegalMoves,
  getLegalMovesFromSquare,
  isInCheck,
  makeMove,
  moveToSAN,
} from '../engine/movegen';
import {
  computeCapturedFromHistory,
  computeMaterialFromBoard,
  evaluateGameOutcome,
  generatePGN,
} from '../engine/rules';
import {
  BoardState,
  BoardTheme,
  ChessSettings,
  Color,
  Difficulty,
  GameMode,
  GameOutcome,
  Move,
  MoveRecord,
  PieceType,
  SavedGameState,
  SquareIndex,
} from '../engine/types';
import { soundEngine } from '../services/audio';
import { engineClient } from '../services/engineClient';
import { TIME_CONTROLS } from '../services/storage';
import { CameraPreset, ChessScene3D } from '../scene/ChessScene3D';
import { BrandCrest } from './BrandCrest';
import { ChessPieceSvg } from './ChessPieces';
import { GameOverModal } from './GameOverModal';
import { OfflineStatusIndicator } from './OfflineBadge';

interface GameViewProps {
  initialState: SavedGameState;
  settings: ChessSettings;
  isSettingsOpen: boolean;
  onSaveState: (state: SavedGameState) => void;
  onRecordOutcome: (outcome: GameOutcome, mode: GameMode, difficulty: Difficulty) => void;
  onUpdateSettings: (next: ChessSettings) => void;
  onOpenSettings: () => void;
  onExitToMenu: () => void;
}

function formatClock(ms: number): string {
  const clamped = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const GameView: React.FC<GameViewProps> = ({
  initialState,
  settings,
  isSettingsOpen,
  onSaveState,
  onRecordOutcome,
  onUpdateSettings,
  onOpenSettings,
  onExitToMenu,
}) => {
  const [gameState, setGameState] = useState<SavedGameState>(initialState);
  const [board, setBoard] = useState<BoardState>(() => {
    const parsed = parseFEN(initialState.fen);
    if (initialState.positionHistory.length > 0) {
      parsed.positionHistory = [...initialState.positionHistory];
    }
    return parsed;
  });

  const [flipped, setFlipped] = useState<boolean>(
    initialState.mode === 'pvc' && initialState.playerColor === 'b'
  );
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('classic');
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [selectedSq, setSelectedSq] = useState<SquareIndex | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{
    from: SquareIndex;
    to: SquareIndex;
    color: Color;
  } | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [hintMove, setHintMove] = useState<{ from: SquareIndex; to: SquareIndex } | null>(null);
  const [isComputingHint, setIsComputingHint] = useState(false);
  const [reviewPlyIndex, setReviewPlyIndex] = useState<number | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState<boolean>(
    Boolean(initialState.outcome)
  );
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);

  // Draw offer state
  const [pendingLocalDrawOffer, setPendingLocalDrawOffer] = useState<Color | null>(null);
  const [drawNotice, setDrawNotice] = useState<string | null>(null);

  // Practice FEN loader & PGN export state
  const [fenInput, setFenInput] = useState(initialState.fen);
  const [fenError, setFenError] = useState<string | null>(null);
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);

  const recordedMatchIdRef = useRef<string | null>(
    initialState.outcome ? initialState.id : null
  );
  const moveListEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    soundEngine.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  useEffect(() => {
    onSaveState(gameState);
  }, [gameState, onSaveState]);

  useEffect(() => {
    if (showHistoryDrawer && reviewPlyIndex === null) {
      moveListEndRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [gameState.moveHistory.length, reviewPlyIndex, showHistoryDrawer]);

  // Timed clock tick (pauses automatically when Pause menu or Settings is open)
  useEffect(() => {
    if (
      gameState.timeControl === 'untimed' ||
      gameState.outcome ||
      isPaused ||
      isSettingsOpen ||
      gameState.moveHistory.length === 0
    ) {
      return;
    }

    const turn = board.turn;
    const interval = window.setInterval(() => {
      setGameState((prev) => {
        if (prev.outcome) return prev;
        const nextRemaining = Math.max(0, prev.clockMs[turn] - 250);
        const nextClock = { ...prev.clockMs, [turn]: nextRemaining };
        if (nextRemaining === 0) {
          const winner = oppositeColor(turn);
          const timeoutOutcome: GameOutcome = {
            winner,
            reason: 'timeout',
            message: `Time Expired — ${winner === 'w' ? 'White' : 'Black'} wins`,
          };
          soundEngine.playGameOver(
            prev.mode !== 'pvc' || winner === prev.playerColor
          );
          if (recordedMatchIdRef.current !== prev.id) {
            recordedMatchIdRef.current = prev.id;
            onRecordOutcome(timeoutOutcome, prev.mode, prev.difficulty);
          }
          setShowGameOverModal(true);
          return {
            ...prev,
            clockMs: nextClock,
            outcome: timeoutOutcome,
            updatedAt: Date.now(),
          };
        }
        return { ...prev, clockMs: nextClock };
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [
    board.turn,
    gameState.timeControl,
    gameState.outcome,
    gameState.moveHistory.length,
    isPaused,
    isSettingsOpen,
    onRecordOutcome,
  ]);

  // Trigger computer turn automatically in PvC mode
  useEffect(() => {
    if (gameState.mode !== 'pvc' || gameState.outcome || isPaused) return;
    const aiColor = oppositeColor(gameState.playerColor);
    if (board.turn !== aiColor) return;

    let cancelled = false;
    setIsThinking(true);

    const thinkDelayMs =
      gameState.difficulty === 'beginner'
        ? 380
        : gameState.difficulty === 'intermediate'
          ? 480
          : 520;

    const timer = window.setTimeout(async () => {
      try {
        const res = await engineClient.requestBestMove(
          gameState.fen,
          board.positionHistory,
          gameState.difficulty
        );
        if (cancelled) return;
        if (res.move) {
          applyMoveToGame(res.move, res.evalCp);
        }
      } catch {
        // Cancelled
      } finally {
        if (!cancelled) setIsThinking(false);
      }
    }, thinkDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState.fen,
    gameState.mode,
    gameState.outcome,
    gameState.playerColor,
    gameState.difficulty,
    isPaused,
  ]);

  useEffect(() => {
    return () => {
      engineClient.cancelAll();
    };
  }, []);

  const displayedBoard = useMemo(() => {
    if (reviewPlyIndex === null) return board;
    if (reviewPlyIndex < 0) return parseFEN(gameState.initialFen);
    const rec = gameState.moveHistory[reviewPlyIndex];
    return rec ? parseFEN(rec.fenAfter) : board;
  }, [board, reviewPlyIndex, gameState.initialFen, gameState.moveHistory]);

  const displayedLastMove = useMemo(() => {
    if (reviewPlyIndex !== null) {
      if (reviewPlyIndex < 0) return null;
      const rec = gameState.moveHistory[reviewPlyIndex];
      return rec
        ? {
            from: rec.move.from,
            to: rec.move.to,
            isCapture: Boolean(rec.move.captured || rec.move.isEnPassant),
          }
        : null;
    }
    const last = gameState.moveHistory[gameState.moveHistory.length - 1];
    return last
      ? {
          from: last.move.from,
          to: last.move.to,
          isCapture: Boolean(last.move.captured || last.move.isEnPassant),
        }
      : null;
  }, [gameState.moveHistory, reviewPlyIndex]);

  const isInspectingHistory = reviewPlyIndex !== null;
  const isHumanTurn =
    !gameState.outcome &&
    !isPaused &&
    !isInspectingHistory &&
    !isThinking &&
    (gameState.mode !== 'pvc' || board.turn === gameState.playerColor);

  const legalMovesForSelection = useMemo(() => {
    if (!isHumanTurn || selectedSq === null) return [];
    return getLegalMovesFromSquare(board, selectedSq);
  }, [board, isHumanTurn, selectedSq]);

  const inCheckColor = useMemo(() => {
    return isInCheck(displayedBoard, displayedBoard.turn) ? displayedBoard.turn : null;
  }, [displayedBoard]);

  const capturedSummary = useMemo(() => {
    if (gameState.initialFen !== INITIAL_FEN) {
      return computeMaterialFromBoard(displayedBoard);
    }
    if (reviewPlyIndex !== null) {
      return computeCapturedFromHistory(gameState.moveHistory.slice(0, reviewPlyIndex + 1));
    }
    return computeCapturedFromHistory(gameState.moveHistory);
  }, [displayedBoard, gameState.initialFen, gameState.moveHistory, reviewPlyIndex]);

  const pgnText = useMemo(() => {
    const whiteName =
      gameState.mode === 'pvc'
        ? gameState.playerColor === 'w'
          ? 'Player'
          : `PeakCraft Engine (${gameState.difficulty})`
        : 'White';
    const blackName =
      gameState.mode === 'pvc'
        ? gameState.playerColor === 'b'
          ? 'Player'
          : `PeakCraft Engine (${gameState.difficulty})`
        : 'Black';
    return generatePGN(
      gameState.moveHistory,
      gameState.outcome,
      gameState.initialFen,
      whiteName,
      blackName
    );
  }, [
    gameState.moveHistory,
    gameState.outcome,
    gameState.initialFen,
    gameState.mode,
    gameState.playerColor,
    gameState.difficulty,
  ]);

  function applyMoveToGame(move: Move, evalCp?: number) {
    const nextBoard = parseFEN(toFEN(board));
    nextBoard.positionHistory = [...board.positionHistory];
    const allLegal = generateLegalMoves(nextBoard);
    const san = moveToSAN(nextBoard, move, allLegal);
    const fenBefore = toFEN(nextBoard);
    const undo = makeMove(nextBoard, move, true);
    const fenAfter = toFEN(nextBoard);

    const tc = TIME_CONTROLS[gameState.timeControl];
    const nextClock = { ...gameState.clockMs };
    if (gameState.timeControl !== 'untimed' && tc.incrementMs > 0) {
      nextClock[move.color] += tc.incrementMs;
    }

    const record: MoveRecord = {
      move,
      san,
      fenBefore,
      fenAfter,
      capturedPiece: undo.capturedPiece,
      evaluationCp: evalCp,
      clockRemainingMs: nextClock,
    };

    const nextOutcome = evaluateGameOutcome(nextBoard);

    if (nextOutcome) {
      const playerWon =
        nextOutcome.winner !== 'draw' &&
        (gameState.mode !== 'pvc' || nextOutcome.winner === gameState.playerColor);
      soundEngine.playGameOver(playerWon);
    } else if (isInCheck(nextBoard, nextBoard.turn)) {
      soundEngine.playCheck();
    } else if (move.isCastle) {
      soundEngine.playCastle();
    } else if (move.captured || move.isEnPassant) {
      soundEngine.playCapture();
    } else {
      soundEngine.playMove();
    }

    setBoard(nextBoard);
    setSelectedSq(null);
    setHintMove(null);
    setPendingPromo(null);
    setReviewPlyIndex(null);
    setConfirmRestart(false);
    setConfirmResign(false);
    setPendingLocalDrawOffer(null);
    setFenInput(fenAfter);

    if (gameState.mode === 'local' && settings.autoFlipLocal && !nextOutcome) {
      setFlipped(nextBoard.turn === 'b');
    }

    setGameState((prev) => ({
      ...prev,
      fen: fenAfter,
      moveHistory: [...prev.moveHistory, record],
      positionHistory: [...nextBoard.positionHistory],
      clockMs: nextClock,
      outcome: nextOutcome,
      updatedAt: Date.now(),
    }));

    if (nextOutcome) {
      if (recordedMatchIdRef.current !== gameState.id) {
        recordedMatchIdRef.current = gameState.id;
        onRecordOutcome(nextOutcome, gameState.mode, gameState.difficulty);
      }
      setShowGameOverModal(true);
    }
  }

  function attemptMove(from: SquareIndex, to: SquareIndex) {
    if (!isHumanTurn) return;
    const candidates = getLegalMovesFromSquare(board, from).filter((m) => m.to === to);
    if (candidates.length === 0) return;

    if (candidates.some((m) => m.promotion)) {
      setPendingPromo({ from, to, color: board.turn });
      return;
    }

    applyMoveToGame(candidates[0]);
  }

  function handleSquareClick(sq: SquareIndex) {
    if (!isHumanTurn) return;

    if (selectedSq !== null) {
      const matching = legalMovesForSelection.filter((m) => m.to === sq);
      if (matching.length > 0) {
        attemptMove(selectedSq, sq);
        return;
      }
    }

    const clickedPiece = board.squares[sq];
    if (clickedPiece && clickedPiece.color === board.turn) {
      setSelectedSq(selectedSq === sq ? null : sq);
    } else {
      setSelectedSq(null);
    }
  }

  function handleSelectPromotion(promoType: Exclude<PieceType, 'p' | 'k'>) {
    if (!pendingPromo) return;
    const move = getLegalMovesFromSquare(board, pendingPromo.from).find(
      (m) => m.to === pendingPromo.to && m.promotion === promoType
    );
    setPendingPromo(null);
    if (move) applyMoveToGame(move);
  }

  function handleUndo() {
    if (gameState.moveHistory.length === 0 || isThinking || isPaused) return;
    engineClient.cancelAll();
    setHintMove(null);
    setSelectedSq(null);
    setPendingPromo(null);
    setReviewPlyIndex(null);

    let stepsToUndo = 1;
    if (
      gameState.mode === 'pvc' &&
      board.turn === gameState.playerColor &&
      gameState.moveHistory.length >= 2
    ) {
      stepsToUndo = 2;
    }

    const nextHistory = gameState.moveHistory.slice(0, gameState.moveHistory.length - stepsToUndo);
    const targetFen =
      nextHistory.length > 0
        ? nextHistory[nextHistory.length - 1].fenAfter
        : gameState.initialFen;
    const targetPosHistory = gameState.positionHistory.slice(
      0,
      Math.max(1, gameState.positionHistory.length - stepsToUndo)
    );

    const restoredBoard = parseFEN(targetFen);
    restoredBoard.positionHistory = targetPosHistory;
    setBoard(restoredBoard);
    setFenInput(targetFen);
    setShowGameOverModal(false);

    if (gameState.mode === 'local' && settings.autoFlipLocal) {
      setFlipped(restoredBoard.turn === 'b');
    }

    setGameState((prev) => ({
      ...prev,
      fen: targetFen,
      moveHistory: nextHistory,
      positionHistory: targetPosHistory,
      outcome: null,
      updatedAt: Date.now(),
    }));
  }

  async function handleHint() {
    if (!isHumanTurn || isComputingHint) return;
    setIsComputingHint(true);
    try {
      const res = await engineClient.requestBestMove(
        gameState.fen,
        board.positionHistory,
        'advanced',
        900
      );
      if (res.move) {
        setHintMove({ from: res.move.from, to: res.move.to });
      }
    } catch {
      // Cancelled
    } finally {
      setIsComputingHint(false);
    }
  }

  function handleOfferDraw() {
    if (gameState.outcome || gameState.mode === 'practice' || isPaused) return;

    if (gameState.mode === 'local') {
      setPendingLocalDrawOffer(board.turn);
      return;
    }

    // PvC: Engine evaluates position from its own side
    const aiColor = oppositeColor(gameState.playerColor);
    const evalBoard = parseFEN(gameState.fen);
    const turnEval = evaluatePosition(evalBoard);
    const aiEval = evalBoard.turn === aiColor ? turnEval : -turnEval;

    if (gameState.moveHistory.length >= 8 && aiEval <= 25) {
      const drawOutcome: GameOutcome = {
        winner: 'draw',
        reason: 'mutual-agreement',
        message: 'Draw by Mutual Agreement',
      };
      soundEngine.playGameOver(false);
      if (recordedMatchIdRef.current !== gameState.id) {
        recordedMatchIdRef.current = gameState.id;
        onRecordOutcome(drawOutcome, gameState.mode, gameState.difficulty);
      }
      setShowGameOverModal(true);
      setGameState((prev) => ({
        ...prev,
        outcome: drawOutcome,
        updatedAt: Date.now(),
      }));
    } else {
      const reason =
        gameState.moveHistory.length < 8
          ? 'Too early in the opening — engine declined draw.'
          : 'Engine declined draw offer.';
      setDrawNotice(reason);
      window.setTimeout(() => setDrawNotice(null), 2600);
    }
  }

  function acceptLocalDraw() {
    const drawOutcome: GameOutcome = {
      winner: 'draw',
      reason: 'mutual-agreement',
      message: 'Draw by Mutual Agreement',
    };
    soundEngine.playGameOver(false);
    setPendingLocalDrawOffer(null);
    if (recordedMatchIdRef.current !== gameState.id) {
      recordedMatchIdRef.current = gameState.id;
      onRecordOutcome(drawOutcome, gameState.mode, gameState.difficulty);
    }
    setShowGameOverModal(true);
    setGameState((prev) => ({
      ...prev,
      outcome: drawOutcome,
      updatedAt: Date.now(),
    }));
  }

  function handleRestart(overrideColor?: Color) {
    engineClient.cancelAll();
    const tc = TIME_CONTROLS[gameState.timeControl];
    const freshBoard = parseFEN(INITIAL_FEN);
    const nextId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    recordedMatchIdRef.current = null;

    const nextPlayerColor = overrideColor ?? gameState.playerColor;
    setBoard(freshBoard);
    setSelectedSq(null);
    setPendingPromo(null);
    setHintMove(null);
    setIsThinking(false);
    setIsPaused(false);
    setReviewPlyIndex(null);
    setShowGameOverModal(false);
    setConfirmRestart(false);
    setConfirmResign(false);
    setPendingLocalDrawOffer(null);
    setFenInput(INITIAL_FEN);
    setFenError(null);

    if (gameState.mode === 'pvc') {
      setFlipped(nextPlayerColor === 'b');
    } else if (gameState.mode === 'local' && settings.autoFlipLocal) {
      setFlipped(false);
    }

    setGameState({
      ...gameState,
      id: nextId,
      playerColor: nextPlayerColor,
      fen: INITIAL_FEN,
      initialFen: INITIAL_FEN,
      moveHistory: [],
      positionHistory: [...freshBoard.positionHistory],
      clockMs: { w: tc.initialMs, b: tc.initialMs },
      outcome: null,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  function handleResign() {
    if (gameState.outcome) return;
    engineClient.cancelAll();
    const loser = gameState.mode === 'pvc' ? gameState.playerColor : board.turn;
    const winner = oppositeColor(loser);
    const resignOutcome: GameOutcome = {
      winner,
      reason: 'resignation',
      message: `${loser === 'w' ? 'White' : 'Black'} Resigned — ${winner === 'w' ? 'White' : 'Black'} wins`,
    };
    soundEngine.playGameOver(gameState.mode !== 'pvc' || winner === gameState.playerColor);
    if (recordedMatchIdRef.current !== gameState.id) {
      recordedMatchIdRef.current = gameState.id;
      onRecordOutcome(resignOutcome, gameState.mode, gameState.difficulty);
    }
    setConfirmResign(false);
    setIsPaused(false);
    setShowGameOverModal(true);
    setGameState((prev) => ({
      ...prev,
      outcome: resignOutcome,
      updatedAt: Date.now(),
    }));
  }

  function handleLoadPracticeFen() {
    try {
      const parsed = parseFEN(fenInput);
      const normalizedFen = toFEN(parsed);
      engineClient.cancelAll();
      setBoard(parsed);
      setSelectedSq(null);
      setPendingPromo(null);
      setHintMove(null);
      setReviewPlyIndex(null);
      setFenError(null);
      const outcome = evaluateGameOutcome(parsed);
      setGameState((prev) => ({
        ...prev,
        fen: normalizedFen,
        initialFen: normalizedFen,
        moveHistory: [],
        positionHistory: [...parsed.positionHistory],
        outcome,
        updatedAt: Date.now(),
      }));
    } catch (err) {
      setFenError(err instanceof Error ? err.message : 'Invalid FEN string');
    }
  }

  function handleCopyFen() {
    const activeFen = toFEN(displayedBoard);
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(activeFen)
        .then(() => {
          setCopiedFen(true);
          setTimeout(() => setCopiedFen(false), 1800);
        })
        .catch(() => {});
    }
  }

  function handleCopyPgn() {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(pgnText)
        .then(() => {
          setCopiedPgn(true);
          setTimeout(() => setCopiedPgn(false), 1800);
        })
        .catch(() => {});
    }
  }

  // Keyboard shortcuts during active gameplay
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen || showGameOverModal || pendingPromo) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (showHistoryDrawer) {
          setShowHistoryDrawer(false);
        } else if (selectedSq !== null) {
          setSelectedSq(null);
        } else if (!gameState.outcome) {
          setIsPaused((p) => !p);
        }
        return;
      }

      if (isPaused) return;

      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((c) => !c);
      } else if (e.key === 'f' || e.key === 'F') {
        setFlipped((f) => !f);
      } else if (e.key === 'm' || e.key === 'M') {
        onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled });
      } else if (
        (e.key === 'z' || e.key === 'Z') &&
        (!e.shiftKey)
      ) {
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSettingsOpen,
    showGameOverModal,
    pendingPromo,
    showHistoryDrawer,
    selectedSq,
    isPaused,
    gameState.outcome,
    settings,
    gameState.moveHistory.length,
    isThinking,
  ]);

  const moveRows = useMemo(() => {
    const rows: {
      moveNumber: number;
      white?: { rec: MoveRecord; ply: number };
      black?: { rec: MoveRecord; ply: number };
    }[] = [];

    for (let i = 0; i < gameState.moveHistory.length; i += 2) {
      rows.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: { rec: gameState.moveHistory[i], ply: i },
        black: gameState.moveHistory[i + 1]
          ? { rec: gameState.moveHistory[i + 1], ply: i + 1 }
          : undefined,
      });
    }
    return rows;
  }, [gameState.moveHistory]);

  const turnStatusLabel = useMemo(() => {
    if (gameState.outcome) return gameState.outcome.message;
    if (isPaused) return 'Match Paused';
    if (isThinking) return 'Engine thinking...';
    const side = board.turn === 'w' ? 'White' : 'Black';
    return inCheckColor === board.turn ? `${side} in Check` : `${side} to Move`;
  }, [board.turn, gameState.outcome, inCheckColor, isPaused, isThinking]);

  const setBoardThemeQuick = (boardTheme: BoardTheme) => {
    onUpdateSettings({ ...settings, boardTheme });
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B2A29] text-[#F5F0E5]">
      {/* Full-Viewport 3D Spatial Canvas */}
      <div className="absolute inset-0 z-0">
        <ChessScene3D
          board={displayedBoard}
          flipped={flipped}
          cameraPreset={cameraPreset}
          cameraResetNonce={cameraResetNonce}
          attractMode={false}
          interactive={isHumanTurn}
          selectedSquare={selectedSq}
          legalMovesForSelection={legalMovesForSelection}
          lastMove={displayedLastMove}
          lastMoveIsCapture={displayedLastMove?.isCapture}
          hintMove={isInspectingHistory ? null : hintMove}
          inCheckColor={inCheckColor}
          capturedByWhite={capturedSummary.capturedByWhite}
          capturedByBlack={capturedSummary.capturedByBlack}
          pendingPromotion={pendingPromo}
          showLegalMoves={settings.showLegalMoves}
          showCoordinates={settings.showCoordinates}
          animationsEnabled={settings.animationsEnabled}
          boardTheme={settings.boardTheme}
          onSquareClick={handleSquareClick}
          onSelectPromotion={handleSelectPromotion}
          onCancelPromotion={() => setPendingPromo(null)}
        />
      </div>

      {/* Low-Occlusion Perimeter HUD Overlay (Zero viewport obstruction, zero backdrop-filter) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4 flex flex-wrap items-start justify-between gap-3">
        {/* Top-Left Brand & Pause Cluster */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#D4AA55]/35 bg-[#0D3231]/92 shadow-lg">
          <button
            type="button"
            onClick={() => setIsPaused(true)}
            title="Pause Match (Esc)"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F0D69B] hover:text-[#F5F0E5] transition-colors cursor-pointer"
          >
            <BrandCrest className="w-6 h-6 shrink-0" />
            <span className="hidden sm:inline font-display text-lg font-bold text-[#F5F0E5]">
              PeakCraft
            </span>
          </button>
          <span className="h-4 w-px bg-[#D4AA55]/25" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setIsPaused(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[#F5F0E5]/85 hover:bg-[#174D49] hover:text-[#F0D69B] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 text-[#D4AA55]" aria-hidden="true" />
            <span>Pause</span>
          </button>
        </div>

        {/* Top-Center Turn, Material Edge & Clocks */}
        <div className="pointer-events-auto flex flex-col items-center gap-2 mx-auto">
          <div className="flex items-center justify-between gap-3 sm:gap-4 px-3.5 py-1.5 rounded-xl border border-[#D4AA55]/35 bg-[#0D3231]/92 shadow-lg">
            {/* White Status */}
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 shrink-0">
                <ChessPieceSvg color="w" type="k" />
              </span>
              <span className="text-xs font-semibold text-[#F5F0E5]">
                {gameState.mode === 'pvc'
                  ? gameState.playerColor === 'w'
                    ? 'You'
                    : 'Engine'
                  : 'White'}
              </span>
              {capturedSummary.whiteAdvantage > 0 && (
                <span className="font-mono-tabular text-[11px] text-[#D4AA55]">
                  +{capturedSummary.whiteAdvantage}
                </span>
              )}
              {gameState.timeControl !== 'untimed' && (
                <span className="ml-1 px-2 py-0.5 rounded bg-[#103C3B] border border-[#D4AA55]/25 font-mono-tabular text-xs font-semibold text-[#F0D69B]">
                  {formatClock(gameState.clockMs.w)}
                </span>
              )}
            </div>

            {/* Turn Badge */}
            <div
              className={`px-2.5 py-1 rounded-md border text-xs font-semibold whitespace-nowrap ${
                inCheckColor && !gameState.outcome
                  ? 'bg-red-950/90 border-red-400/60 text-red-100'
                  : 'bg-[#174D49] border-[#D4AA55]/30 text-[#F0D69B]'
              }`}
            >
              {turnStatusLabel}
            </div>

            {/* Black Status */}
            <div className="flex items-center gap-1.5">
              {gameState.timeControl !== 'untimed' && (
                <span className="mr-1 px-2 py-0.5 rounded bg-[#103C3B] border border-[#D4AA55]/25 font-mono-tabular text-xs font-semibold text-[#F0D69B]">
                  {formatClock(gameState.clockMs.b)}
                </span>
              )}
              {capturedSummary.whiteAdvantage < 0 && (
                <span className="font-mono-tabular text-[11px] text-[#D4AA55]">
                  +{Math.abs(capturedSummary.whiteAdvantage)}
                </span>
              )}
              <span className="text-xs font-semibold text-[#F5F0E5]">
                {gameState.mode === 'pvc'
                  ? gameState.playerColor === 'b'
                    ? 'You'
                    : 'Engine'
                  : 'Black'}
              </span>
              <span className="w-5 h-5 shrink-0">
                <ChessPieceSvg color="b" type="k" />
              </span>
            </div>
          </div>

          {isInspectingHistory && (
            <div className="flex items-center gap-3 px-3.5 py-1 rounded-lg border border-[#D4AA55]/55 bg-[#174D49]/95 text-xs text-[#F0D69B] shadow-lg">
              <span>Viewing Move {Math.floor((reviewPlyIndex! + 2) / 2)}</span>
              <button
                type="button"
                onClick={() => setReviewPlyIndex(null)}
                className="px-2.5 py-0.5 rounded bg-[#D4AA55] text-[#202522] font-semibold hover:bg-[#F0D69B] cursor-pointer"
              >
                Return to Live
              </button>
            </div>
          )}

          {drawNotice && (
            <div className="px-3.5 py-1.5 rounded-lg border border-[#D4AA55]/50 bg-[#174D49]/95 text-xs text-[#F0D69B] shadow-lg">
              {drawNotice}
            </div>
          )}
        </div>

        {/* Top-Right Status & Quick Utility Cluster */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#D4AA55]/35 bg-[#0D3231]/92 shadow-lg">
          <div className="hidden lg:block">
            <OfflineStatusIndicator />
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })
            }
            aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
            title="Toggle Sound (M)"
            className="p-1.5 rounded-lg text-[#F0D69B] hover:bg-[#174D49] transition-colors cursor-pointer"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#D4AA55]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#F5F0E5]/55" />
            )}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Preferences"
            title="Preferences"
            className="p-1.5 rounded-lg text-[#F0D69B] hover:bg-[#174D49] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onExitToMenu}
            title="Title Screen"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#174D49] border border-[#D4AA55]/35 text-xs font-medium text-[#F0D69B] hover:bg-[#1E5C57] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Title</span>
          </button>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-transform duration-200 ${
          dockCollapsed ? 'bottom-0 translate-y-[calc(100%-32px)]' : 'bottom-4 translate-y-0'
        }`}
        style={{ maxWidth: 'min(980px, 95vw)' }}
      >
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-t-lg border border-b-0 border-[#D4AA55]/35 bg-[#0D3231]/95 text-[11px] font-medium text-[#F0D69B] hover:text-[#F5F0E5] cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        <div className="w-full rounded-xl border border-[#D4AA55]/40 bg-[#0D3231]/94 px-3 py-2.5 shadow-2xl flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {/* Primary Gameplay Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={gameState.moveHistory.length === 0 || isThinking}
              title="Undo Move (Z)"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#D4AA55]/30 bg-[#174D49] text-xs font-medium text-[#F5F0E5] hover:border-[#D4AA55] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5 text-[#D4AA55]" aria-hidden="true" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={() => void handleHint()}
              disabled={!isHumanTurn || isComputingHint}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#D4AA55]/30 bg-[#174D49] text-xs font-medium text-[#F5F0E5] hover:border-[#D4AA55] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#F0D69B]" aria-hidden="true" />
              <span>{isComputingHint ? 'Analyzing...' : 'Hint'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHistoryDrawer((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                showHistoryDrawer
                  ? 'border-[#D4AA55] bg-[#D4AA55] text-[#202522] font-semibold'
                  : 'border-[#D4AA55]/30 bg-[#174D49] text-[#F5F0E5] hover:border-[#D4AA55]'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>History</span>
            </button>
          </div>

          <span className="hidden sm:block h-5 w-px bg-[#D4AA55]/25" aria-hidden="true" />

          {/* Camera Angle Presets & Flip */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#103C3B] border border-[#D4AA55]/25">
            {[
              { id: 'classic' as const, label: 'Classic 3/4' },
              { id: 'dramatic' as const, label: 'Low' },
              { id: 'overhead' as const, label: 'Top' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setCameraPreset(preset.id);
                  setCameraResetNonce((n) => n + 1);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  cameraPreset === preset.id
                    ? 'bg-[#D4AA55] text-[#202522] font-semibold'
                    : 'text-[#F5F0E5]/80 hover:text-[#F5F0E5]'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              title="Flip 3D Board (F)"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-[#F0D69B] hover:bg-[#174D49] transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Flip</span>
            </button>
          </div>

          <span className="hidden sm:block h-5 w-px bg-[#D4AA55]/25" aria-hidden="true" />

          {/* Quick 3D Material Finish Swatches */}
          <div className="flex items-center gap-1.5" role="group" aria-label="3D Board Material">
            <button
              type="button"
              onClick={() => setBoardThemeQuick('peakcraft')}
              title="Teal & Gold"
              className={`w-6 h-6 rounded border grid grid-cols-2 overflow-hidden cursor-pointer ${
                settings.boardTheme === 'peakcraft'
                  ? 'border-[#F0D69B] ring-2 ring-[#D4AA55]'
                  : 'border-[#F5F0E5]/25'
              }`}
            >
              <span className="bg-[#F5F0E5]" />
              <span className="bg-[#174D49]" />
              <span className="bg-[#174D49]" />
              <span className="bg-[#F5F0E5]" />
            </button>
            <button
              type="button"
              onClick={() => setBoardThemeQuick('porcelain')}
              title="Alabaster & Obsidian"
              className={`w-6 h-6 rounded border grid grid-cols-2 overflow-hidden cursor-pointer ${
                settings.boardTheme === 'porcelain'
                  ? 'border-[#F0D69B] ring-2 ring-[#D4AA55]'
                  : 'border-[#F5F0E5]/25'
              }`}
            >
              <span className="bg-[#F4F6F8]" />
              <span className="bg-[#2C3338]" />
              <span className="bg-[#2C3338]" />
              <span className="bg-[#F4F6F8]" />
            </button>
            <button
              type="button"
              onClick={() => setBoardThemeQuick('walnut')}
              title="Royal Walnut"
              className={`w-6 h-6 rounded border grid grid-cols-2 overflow-hidden cursor-pointer ${
                settings.boardTheme === 'walnut'
                  ? 'border-[#F0D69B] ring-2 ring-[#D4AA55]'
                  : 'border-[#F5F0E5]/25'
              }`}
            >
              <span className="bg-[#EBDAC0]" />
              <span className="bg-[#5C402D]" />
              <span className="bg-[#5C402D]" />
              <span className="bg-[#EBDAC0]" />
            </button>
          </div>

          <span className="hidden sm:block h-5 w-px bg-[#D4AA55]/25" aria-hidden="true" />

          {/* Draw / Restart / Resign */}
          <div className="flex items-center gap-1.5">
            {gameState.mode !== 'practice' && !gameState.outcome && (
              <button
                type="button"
                onClick={handleOfferDraw}
                title="Offer Draw"
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#D4AA55]/30 bg-[#174D49] text-xs font-medium text-[#F5F0E5] hover:border-[#D4AA55] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Handshake className="w-3.5 h-3.5 text-[#F0D69B]" aria-hidden="true" />
                <span>Draw</span>
              </button>
            )}

            {!confirmRestart ? (
              <button
                type="button"
                onClick={() => {
                  if (gameState.moveHistory.length <= 2 || gameState.outcome) {
                    handleRestart();
                  } else {
                    setConfirmRestart(true);
                    setConfirmResign(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#D4AA55]/30 bg-[#174D49] text-xs font-medium text-[#F5F0E5] hover:border-[#D4AA55] transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#D4AA55]" aria-hidden="true" />
                <span>Restart</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRestart()}
                className="px-2.5 py-2 rounded-lg bg-[#D4AA55] text-[#202522] text-xs font-semibold hover:bg-[#F0D69B] transition-colors whitespace-nowrap cursor-pointer"
              >
                Confirm Reset
              </button>
            )}

            {gameState.mode !== 'practice' && !gameState.outcome && (
              !confirmResign ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmResign(true);
                    setConfirmRestart(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#F5F0E5]/20 bg-[#103C3B] text-xs font-medium text-[#F5F0E5]/80 hover:text-red-200 hover:border-red-400/50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Resign</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResign}
                  className="px-2.5 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-500 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Confirm Resign
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Slide-Over Move History & PGN / Practice Drawer */}
      {showHistoryDrawer && (
        <aside className="absolute top-16 right-3 bottom-20 z-30 w-80 max-w-[calc(100vw-24px)] rounded-xl border border-[#D4AA55]/40 bg-[#0D3231]/96 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D4AA55]/20 flex items-center justify-between bg-[#174D49]">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#D4AA55]" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold text-[#F0D69B]">
                Move History
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous move"
                disabled={gameState.moveHistory.length === 0 || reviewPlyIndex === -1}
                onClick={() => {
                  if (reviewPlyIndex === null) {
                    setReviewPlyIndex(gameState.moveHistory.length - 2);
                  } else if (reviewPlyIndex > -1) {
                    setReviewPlyIndex(reviewPlyIndex - 1);
                  }
                }}
                className="p-1.5 rounded hover:bg-[#103C3B] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next move"
                disabled={reviewPlyIndex === null}
                onClick={() => {
                  if (reviewPlyIndex === null) return;
                  if (reviewPlyIndex + 1 >= gameState.moveHistory.length - 1) {
                    setReviewPlyIndex(null);
                  } else {
                    setReviewPlyIndex(reviewPlyIndex + 1);
                  }
                }}
                className="p-1.5 rounded hover:bg-[#103C3B] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                aria-label="Close move history"
                className="p-1.5 rounded hover:bg-[#103C3B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pc-scroll px-3 py-2">
            {moveRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#F5F0E5]/55">
                No moves played yet. Drag to orbit · Click pieces to move.
              </div>
            ) : (
              <div className="space-y-0.5 font-mono-tabular text-sm">
                {moveRows.map((row) => (
                  <div
                    key={row.moveNumber}
                    className="grid grid-cols-12 items-center rounded px-2 py-1 hover:bg-[#174D49]/55"
                  >
                    <span className="col-span-2 text-xs text-[#F5F0E5]/55">
                      {row.moveNumber}.
                    </span>
                    {row.white && (
                      <button
                        type="button"
                        onClick={() =>
                          setReviewPlyIndex(
                            row.white!.ply === gameState.moveHistory.length - 1
                              ? null
                              : row.white!.ply
                          )
                        }
                        className={`col-span-5 text-left px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          (reviewPlyIndex === null &&
                            row.white.ply === gameState.moveHistory.length - 1) ||
                          reviewPlyIndex === row.white.ply
                            ? 'bg-[#D4AA55]/25 text-[#F0D69B] font-semibold'
                            : 'text-[#F5F0E5] hover:text-[#F0D69B]'
                        }`}
                      >
                        {row.white.rec.san}
                      </button>
                    )}
                    {row.black && (
                      <button
                        type="button"
                        onClick={() =>
                          setReviewPlyIndex(
                            row.black!.ply === gameState.moveHistory.length - 1
                              ? null
                              : row.black!.ply
                          )
                        }
                        className={`col-span-5 text-left px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          (reviewPlyIndex === null &&
                            row.black.ply === gameState.moveHistory.length - 1) ||
                          reviewPlyIndex === row.black.ply
                            ? 'bg-[#D4AA55]/25 text-[#F0D69B] font-semibold'
                            : 'text-[#F5F0E5] hover:text-[#F0D69B]'
                        }`}
                      >
                        {row.black.rec.san}
                      </button>
                    )}
                  </div>
                ))}
                <div ref={moveListEndRef} />
              </div>
            )}
          </div>

          {/* Export PGN footer */}
          <div className="px-3.5 py-2.5 border-t border-[#D4AA55]/20 bg-[#103C3B] flex items-center justify-between">
            <span className="text-[11px] text-[#F5F0E5]/65 font-mono-tabular">
              {gameState.moveHistory.length} ply recorded
            </span>
            <button
              type="button"
              onClick={handleCopyPgn}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F0D69B] hover:text-[#F5F0E5] cursor-pointer"
            >
              {copiedPgn ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#D4AA55]" />
                  <span>PGN Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy PGN</span>
                </>
              )}
            </button>
          </div>

          {gameState.mode === 'practice' && (
            <div className="p-3.5 border-t border-[#D4AA55]/20 bg-[#0D3231] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F0D69B]">
                  Position Explorer (FEN)
                </span>
                <button
                  type="button"
                  onClick={handleCopyFen}
                  className="inline-flex items-center gap-1 text-xs text-[#F5F0E5]/80 hover:text-[#F0D69B] cursor-pointer"
                >
                  {copiedFen ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#D4AA55]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy FEN</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fenInput}
                  onChange={(e) => {
                    setFenInput(e.target.value);
                    setFenError(null);
                  }}
                  aria-label="FEN Position String"
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded border border-[#D4AA55]/25 bg-[#0B2A29] text-xs font-mono-tabular text-[#F5F0E5] focus:outline-none focus:border-[#D4AA55]"
                />
                <button
                  type="button"
                  onClick={handleLoadPracticeFen}
                  className="px-3 py-1.5 rounded bg-[#D4AA55] text-[#202522] text-xs font-semibold hover:bg-[#F0D69B] cursor-pointer"
                >
                  Load
                </button>
              </div>
              {fenError && <p className="text-xs text-red-300">{fenError}</p>}
            </div>
          )}
        </aside>
      )}

      {/* Local Two-Player Draw Offer Modal */}
      {pendingLocalDrawOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="draw-offer-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-[#D4AA55]/45 bg-[#103C3B] p-6 text-center shadow-2xl space-y-4">
            <Handshake className="w-8 h-8 text-[#D4AA55] mx-auto" aria-hidden="true" />
            <div>
              <h2 id="draw-offer-title" className="font-display text-2xl font-bold text-[#F0D69B]">
                Draw Offered
              </h2>
              <p className="mt-1 text-xs text-[#F5F0E5]/80">
                {pendingLocalDrawOffer === 'w' ? 'White' : 'Black'} proposes a draw. Does{' '}
                {pendingLocalDrawOffer === 'w' ? 'Black' : 'White'} accept?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={acceptLocalDraw}
                className="py-2.5 px-4 rounded-lg bg-[#D4AA55] text-[#202522] font-semibold text-xs hover:bg-[#F0D69B] transition-colors cursor-pointer"
              >
                Accept Draw
              </button>
              <button
                type="button"
                onClick={() => setPendingLocalDrawOffer(null)}
                className="py-2.5 px-4 rounded-lg border border-[#F5F0E5]/20 bg-[#174D49] text-xs font-medium text-[#F5F0E5] hover:bg-[#1E5C57] transition-colors cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu Modal */}
      {isPaused && !gameState.outcome && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-[#D4AA55]/45 bg-[#103C3B] p-6 shadow-2xl space-y-5 text-center">
            <div>
              <p className="text-xs font-semibold text-[#D4AA55] tracking-wide">
                PeakCraft Chess
              </p>
              <h2 id="pause-modal-title" className="mt-1 font-display text-3xl font-bold text-[#F0D69B]">
                Match Paused
              </h2>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#D4AA55] text-[#202522] font-semibold text-sm hover:bg-[#F0D69B] transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Resume Match</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPaused(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[#D4AA55]/35 bg-[#174D49] text-sm font-medium text-[#F5F0E5] hover:bg-[#1E5C57] transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#D4AA55]" aria-hidden="true" />
                <span>Preferences</span>
              </button>

              <button
                type="button"
                onClick={() => handleRestart()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[#D4AA55]/35 bg-[#174D49] text-sm font-medium text-[#F5F0E5] hover:bg-[#1E5C57] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[#D4AA55]" aria-hidden="true" />
                <span>Restart Match</span>
              </button>

              <button
                type="button"
                onClick={onExitToMenu}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[#F5F0E5]/20 bg-[#0D3231] text-sm font-medium text-[#F5F0E5]/85 hover:bg-[#174D49] transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4 text-[#F0D69B]" aria-hidden="true" />
                <span>Title Screen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {showGameOverModal && gameState.outcome && (
        <GameOverModal
          outcome={gameState.outcome}
          mode={gameState.mode}
          moveCount={gameState.moveHistory.length}
          pgnText={pgnText}
          onRematch={() =>
            handleRestart(
              gameState.mode === 'pvc'
                ? oppositeColor(gameState.playerColor)
                : gameState.playerColor
            )
          }
          onReviewBoard={() => setShowGameOverModal(false)}
          onMainMenu={onExitToMenu}
        />
      )}
    </div>
  );
};
