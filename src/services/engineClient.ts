import { parseFEN } from '../engine/board';
import { findBestMove, SearchResult } from '../engine/search';
import { Difficulty } from '../engine/types';
import type { WorkerRequest, WorkerResponse } from '../workers/chess.worker';

class ChessEngineClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (res: SearchResult) => void; reject: (err: Error) => void }
  >();

  private getWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/chess.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, move, evalCp, depth, nodes, error } = e.data;
        const entry = this.pending.get(id);
        if (!entry) return;
        this.pending.delete(id);
        if (error) {
          entry.reject(new Error(error));
        } else {
          entry.resolve({ move, evalCp, depth, nodes });
        }
      };
      this.worker.onerror = () => {
        this.terminate();
      };
    }
    return this.worker;
  }

  public async requestBestMove(
    fen: string,
    positionHistory: string[],
    difficulty: Difficulty,
    maxTimeMs?: number
  ): Promise<SearchResult> {
    const worker = this.getWorker();
    if (!worker) {
      // Synchronous fallback only in environments without Web Workers
      const board = parseFEN(fen);
      board.positionHistory = [...positionHistory];
      return findBestMove(board, difficulty, maxTimeMs);
    }

    const id = this.nextId++;
    const payload: WorkerRequest = {
      id,
      fen,
      positionHistory,
      difficulty,
      maxTimeMs,
    };

    return new Promise<SearchResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage(payload);
    });
  }

  public cancelAll(): void {
    if (this.worker) {
      this.terminate();
    }
  }

  private terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const [, entry] of this.pending) {
      entry.reject(new Error('Search cancelled'));
    }
    this.pending.clear();
  }
}

export const engineClient = new ChessEngineClient();
