import { useCallback, useEffect, useState } from 'react';
import { INITIAL_FEN, parseFEN } from './engine/board';
import {
  ChessSettings,
  Color,
  Difficulty,
  GameMode,
  GameOutcome,
  PlayerStats,
  SavedGameState,
} from './engine/types';
import { soundEngine } from './services/audio';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  TIME_CONTROLS,
  loadSavedGame,
  loadSettings,
  loadStats,
  recordGameResult,
  resetAllLocalData,
  saveGame,
  saveSettings,
} from './services/storage';
import { GameView } from './components/GameView';
import { SettingsModal } from './components/SettingsModal';
import { NewGameConfig, WelcomeScreen } from './components/WelcomeScreen';

export default function App() {
  const [settings, setSettings] = useState<ChessSettings>(() => loadSettings());
  const [savedGame, setSavedGame] = useState<SavedGameState | null>(() => loadSavedGame());
  const [stats, setStats] = useState<PlayerStats>(() => loadStats());
  const [activeGame, setActiveGame] = useState<SavedGameState | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    soundEngine.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  const handleUpdateSettings = useCallback((next: ChessSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const handleStartNewGame = useCallback((config: NewGameConfig) => {
    const resolvedColor: Color =
      config.colorPref === 'random'
        ? Math.random() < 0.5
          ? 'w'
          : 'b'
        : config.colorPref;
    const tc = TIME_CONTROLS[config.timeControl];
    const initialBoard = parseFEN(INITIAL_FEN);
    const now = Date.now();

    const newMatch: SavedGameState = {
      id: `match_${now}_${Math.random().toString(36).slice(2, 7)}`,
      mode: config.mode,
      difficulty: config.difficulty,
      playerColor: resolvedColor,
      timeControl: config.timeControl,
      fen: INITIAL_FEN,
      initialFen: INITIAL_FEN,
      moveHistory: [],
      positionHistory: [...initialBoard.positionHistory],
      clockMs: { w: tc.initialMs, b: tc.initialMs },
      outcome: null,
      startedAt: now,
      updatedAt: now,
    };

    saveGame(newMatch);
    setSavedGame(newMatch);
    setActiveGame(newMatch);
  }, []);

  const handleContinueGame = useCallback(() => {
    const latest = loadSavedGame();
    if (latest) {
      setActiveGame(latest);
    }
  }, []);

  const handleSaveGameState = useCallback((state: SavedGameState) => {
    saveGame(state);
    setSavedGame(state);
  }, []);

  const handleRecordOutcome = useCallback(
    (outcome: GameOutcome, mode: GameMode, difficulty: Difficulty) => {
      if (mode === 'practice') return;
      let result: 'win' | 'draw' | 'loss' = 'draw';
      if (outcome.winner !== 'draw') {
        if (mode === 'pvc') {
          const active = loadSavedGame();
          const humanColor = active?.playerColor ?? 'w';
          result = outcome.winner === humanColor ? 'win' : 'loss';
        } else {
          result = 'win';
        }
      }
      const nextStats = recordGameResult(result, mode, difficulty);
      setStats(nextStats);
    },
    []
  );

  const handleResetAllData = useCallback(() => {
    resetAllLocalData();
    setSettings(DEFAULT_SETTINGS);
    setStats(DEFAULT_STATS);
    setSavedGame(null);
    setActiveGame(null);
    setShowSettings(false);
  }, []);

  return (
    <>
      {activeGame ? (
        <GameView
          key={activeGame.id}
          initialState={activeGame}
          settings={settings}
          isSettingsOpen={showSettings}
          onSaveState={handleSaveGameState}
          onRecordOutcome={handleRecordOutcome}
          onUpdateSettings={handleUpdateSettings}
          onOpenSettings={() => setShowSettings(true)}
          onExitToMenu={() => {
            setSavedGame(loadSavedGame());
            setActiveGame(null);
          }}
        />
      ) : (
        <WelcomeScreen
          savedGame={savedGame}
          stats={stats}
          settings={settings}
          isModalOpen={showSettings}
          onStartNewGame={handleStartNewGame}
          onContinueGame={handleContinueGame}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdate={handleUpdateSettings}
          onResetAllData={handleResetAllData}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
