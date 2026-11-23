import React, { useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Compass,
  Grid,
  RotateCw,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { BoardTheme, ChessSettings } from '../engine/types';

interface SettingsModalProps {
  settings: ChessSettings;
  onUpdate: (next: ChessSettings) => void;
  onResetAllData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdate,
  onResetAllData,
  onClose,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const toggle = (key: keyof Omit<ChessSettings, 'boardTheme'>) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  const setTheme = (boardTheme: BoardTheme) => {
    onUpdate({ ...settings, boardTheme });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-[#D4AA55]/40 bg-[#103C3B] text-[#F5F0E5] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4AA55]/20 bg-[#174D49]">
          <h2 id="settings-modal-title" className="font-display text-2xl font-bold text-[#F0D69B]">
            Preferences
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-lg text-[#F5F0E5]/75 hover:text-[#F5F0E5] hover:bg-[#103C3B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto pc-scroll">
          {/* 3D Board Material Finish */}
          <div>
            <p className="text-xs font-semibold text-[#F0D69B] tracking-wide mb-2.5">
              3D Board &amp; Piece Finish
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTheme('peakcraft')}
                className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  settings.boardTheme === 'peakcraft'
                    ? 'border-[#D4AA55] bg-[#174D49] text-[#F5F0E5]'
                    : 'border-[#F5F0E5]/15 bg-[#0D3231] text-[#F5F0E5]/75 hover:border-[#D4AA55]/45'
                }`}
              >
                <span className="w-7 h-7 rounded grid grid-cols-2 overflow-hidden border border-[#D4AA55]/40 shrink-0">
                  <span className="bg-[#F5F0E5]" />
                  <span className="bg-[#174D49]" />
                  <span className="bg-[#174D49]" />
                  <span className="bg-[#F5F0E5]" />
                </span>
                <span className="text-xs font-medium">Teal &amp; Gold</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('porcelain')}
                className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  settings.boardTheme === 'porcelain'
                    ? 'border-[#D4AA55] bg-[#174D49] text-[#F5F0E5]'
                    : 'border-[#F5F0E5]/15 bg-[#0D3231] text-[#F5F0E5]/75 hover:border-[#D4AA55]/45'
                }`}
              >
                <span className="w-7 h-7 rounded grid grid-cols-2 overflow-hidden border border-[#D4AA55]/40 shrink-0">
                  <span className="bg-[#F4F6F8]" />
                  <span className="bg-[#2C3338]" />
                  <span className="bg-[#2C3338]" />
                  <span className="bg-[#F4F6F8]" />
                </span>
                <span className="text-xs font-medium">Alabaster</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('walnut')}
                className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  settings.boardTheme === 'walnut'
                    ? 'border-[#D4AA55] bg-[#174D49] text-[#F5F0E5]'
                    : 'border-[#F5F0E5]/15 bg-[#0D3231] text-[#F5F0E5]/75 hover:border-[#D4AA55]/45'
                }`}
              >
                <span className="w-7 h-7 rounded grid grid-cols-2 overflow-hidden border border-[#D4AA55]/40 shrink-0">
                  <span className="bg-[#EBDAC0]" />
                  <span className="bg-[#5C402D]" />
                  <span className="bg-[#5C402D]" />
                  <span className="bg-[#EBDAC0]" />
                </span>
                <span className="text-xs font-medium">Royal Walnut</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-[#D4AA55]/15" />

          {/* Toggle Controls */}
          <div className="space-y-3">
            <SettingRow
              icon={
                settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#D4AA55]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#F5F0E5]/50" />
                )
              }
              label="Tactile Sound Effects"
              description="Synthesized move, capture, and check chimes (M)"
              checked={settings.soundEnabled}
              onChange={() => toggle('soundEnabled')}
            />
            <SettingRow
              icon={<Compass className="w-4 h-4 text-[#D4AA55]" />}
              label="Show Legal Moves"
              description="Illuminate valid 3D destination rings on selection"
              checked={settings.showLegalMoves}
              onChange={() => toggle('showLegalMoves')}
            />
            <SettingRow
              icon={<Grid className="w-4 h-4 text-[#D4AA55]" />}
              label="Board Coordinates"
              description="Display engraved rank (1–8) and file (A–H) markers"
              checked={settings.showCoordinates}
              onChange={() => toggle('showCoordinates')}
            />
            <SettingRow
              icon={<Sparkles className="w-4 h-4 text-[#D4AA55]" />}
              label="3D Piece Arc Motion"
              description="Smooth parabolic flight, castling slide, and capture burst"
              checked={settings.animationsEnabled}
              onChange={() => toggle('animationsEnabled')}
            />
            <SettingRow
              icon={<RotateCw className="w-4 h-4 text-[#D4AA55]" />}
              label="Auto-Rotate in Local Two-Player"
              description="Smoothly swing camera to active player after each turn"
              checked={settings.autoFlipLocal}
              onChange={() => toggle('autoFlipLocal')}
            />
          </div>

          <div className="h-px bg-[#D4AA55]/15" />

          {/* Local Storage Reset */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div>
              <p className="text-sm font-medium text-[#F5F0E5]">Local Storage</p>
              <p className="text-xs text-[#F5F0E5]/65">Clear saved match &amp; local statistics</p>
            </div>
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-400/35 text-xs font-medium text-red-200 hover:bg-red-950/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onResetAllData();
                    setConfirmClear(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#F5F0E5]/20 text-xs text-[#F5F0E5]/80 hover:bg-[#174D49] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-[#D4AA55]/15" />

          {/* Original IP & Provenance Notice */}
          <div className="flex items-start gap-3 rounded-lg border border-[#D4AA55]/20 bg-[#0D3231] p-3.5 text-xs text-[#F5F0E5]/75 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#D4AA55] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[#F0D69B]">
                PeakCraft Innovations Limited · Original Work
              </p>
              <p className="mt-0.5">
                All 3D piece geometries, procedural marble/wood textures, Web Audio synthesis, and
                FIDE rules/search algorithms are original works authored specifically for PeakCraft
                Chess with zero third-party game assets.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#D4AA55]/20 bg-[#174D49]/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#D4AA55] text-[#202522] font-semibold text-sm hover:bg-[#F0D69B] transition-colors cursor-pointer"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  description,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium text-[#F5F0E5]">{label}</p>
        <p className="text-xs text-[#F5F0E5]/65">{description}</p>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AA55] ${
        checked ? 'bg-[#D4AA55] border-[#F0D69B]' : 'bg-[#0C2F2E] border-[#F5F0E5]/25'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
          checked ? 'translate-x-5.5 bg-[#202522]' : 'translate-x-1 bg-[#F5F0E5]/70'
        }`}
      />
    </button>
  </div>
);
