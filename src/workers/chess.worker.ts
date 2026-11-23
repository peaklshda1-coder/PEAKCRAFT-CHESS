import { parseFEN } from '../engine/board';
import { findBestMove } from '../engine/search';
import { Difficulty, Move } from '../engine/types';

export interface WorkerRequest {
  id: number;
  fen: string;
  positionHistory: string[];
  difficulty: Difficulty;
  maxTimeMs?: number;
}

export interface WorkerResponse {
  id: number;
  move: Move | null;
  evalCp: number;
  depth: number;
  nodes: number;
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, fen, positionHistory, difficulty, maxTimeMs } = event.data;
  try {
    const board = parseFEN(fen);
    if (positionHistory && positionHistory.length > 0) {
      board.positionHistory = [...positionHistory];
    }
    const result = findBestMove(board, difficulty, maxTimeMs);
    const response: WorkerResponse = {
      id,
      move: result.move,
      evalCp: result.evalCp,
      depth: result.depth,
      nodes: result.nodes,
    };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      id,
      move: null,
      evalCp: 0,
      depth: 0,
      nodes: 0,
      error: err instanceof Error ? err.message : 'Engine calculation failed',
    };
    self.postMessage(response);
  }
};
