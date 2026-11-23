import { ChessSettings, Difficulty, PlayerStats, SavedGameState, TimeControlConfig, TimeControlId } from '../engine/types';

const SETTINGS_KEY = 'peakcraft_chess_settings_v1';
const SAVED_GAME_KEY = 'peakcraft_chess_saved_game_v1';
const STATS_KEY = 'peakcraft_chess_stats_v1';

export const TIME_CONTROLS: Record<TimeControlId, TimeControlConfig> = {
  untimed: { id: 'untimed', label: 'Untimed', initialMs: 0, incrementMs: 0 },
  blitz5: { id: 'blitz5', label: '5 min', initialMs: 5 * 60 * 1000, incrementMs: 0 },
  rapid10: { id: 'rapid10', label: '10 + 5', initialMs: 10 * 60 * 1000, incrementMs: 5000 },
  classical15: { id: 'classical15', label: '15 + 10', initialMs: 15 * 60 * 1000, incrementMs: 10000 },
};

export const DEFAULT_SETTINGS: ChessSettings = {
  soundEnabled: true,
  animationsEnabled: true,
  showLegalMoves: true,
  showCoordinates: true,
  autoFlipLocal: false,
  boardTheme: 'peakcraft',
};

export const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  pvcWinsByDifficulty: {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  },
};

export function loadSettings(): ChessSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ChessSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage quota exceeded or unavailable
  }
}

export function loadSavedGame(): SavedGameState | null {
  try {
    const raw = localStorage.getItem(SAVED_GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGameState;
    if (!parsed || !parsed.fen || !Array.isArray(parsed.moveHistory)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGame(state: SavedGameState): void {
  try {
    localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVED_GAME_KEY);
  } catch {
    // Ignore
  }
}

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw) as Partial<PlayerStats>;
    return {
      ...DEFAULT_STATS,
      ...parsed,
      pvcWinsByDifficulty: {
        ...DEFAULT_STATS.pvcWinsByDifficulty,
        ...(parsed.pvcWinsByDifficulty ?? {}),
      },
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export function recordGameResult(
  result: 'win' | 'draw' | 'loss',
  mode: SavedGameState['mode'],
  difficulty: Difficulty
): PlayerStats {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  if (result === 'win') {
    stats.wins += 1;
    if (mode === 'pvc') {
      stats.pvcWinsByDifficulty[difficulty] = (stats.pvcWinsByDifficulty[difficulty] || 0) + 1;
    }
  } else if (result === 'draw') {
    stats.draws += 1;
  } else {
    stats.losses += 1;
  }
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore
  }
  return stats;
}

export function resetAllLocalData(): void {
  try {
    localStorage.removeItem(SAVED_GAME_KEY);
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // Ignore
  }
}
