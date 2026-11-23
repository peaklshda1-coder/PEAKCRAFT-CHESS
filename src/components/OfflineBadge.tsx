import React, { useState } from 'react';
import { Download, Wifi, WifiOff, CheckCircle2, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const OfflineStatusIndicator: React.FC = () => {
  const { isOnline, swReady } = useOnlineStatus();

  return (
    <div
      className="inline-flex items-center gap-2 text-xs text-[#F5F0E5]/80 whitespace-nowrap shrink-0"
      title={
        isOnline
          ? swReady
            ? 'Connected · Offline cache active'
            : 'Connected'
          : 'Offline Mode · Running locally from cache'
      }
    >
      {isOnline ? (
        <Wifi className="w-3.5 h-3.5 text-[#D4AA55]" aria-hidden="true" />
      ) : (
        <WifiOff className="w-3.5 h-3.5 text-[#F0D69B]" aria-hidden="true" />
      )}
      <span>
        {isOnline
          ? swReady
            ? 'Offline Ready'
            : 'Online'
          : 'Offline Mode'}
      </span>
    </div>
  );
};

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'card' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="inline-flex items-center gap-2 text-xs text-[#F0D69B]">
          <CheckCircle2 className="w-4 h-4 text-[#D4AA55]" aria-hidden="true" />
          <span>Installed as App</span>
        </div>
      );
    }
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D4AA55]/45 bg-[#174D49] hover:bg-[#1E5C57] text-xs font-medium text-[#F0D69B] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AA55]"
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D4AA55]/45 bg-[#174D49] hover:bg-[#1E5C57] text-xs font-medium text-[#F0D69B] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AA55]"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-xl border border-[#D4AA55]/30 bg-[#174D49] p-6 text-[#F5F0E5] shadow-2xl">
              <div className="flex items-center justify-between gap-4">
                <h3 id="ios-install-title" className="font-display text-2xl font-bold text-[#F0D69B]">
                  Install PeakCraft Chess
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="p-2 rounded-lg text-[#F5F0E5]/70 hover:text-[#F5F0E5] hover:bg-[#103C3B] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-[#F5F0E5]/90 leading-relaxed">
                <li>1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.</li>
                <li>2. Scroll down and select <strong>Add to Home Screen</strong>.</li>
                <li>3. Launch PeakCraft Chess offline anytime from your home screen.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2.5 px-4 rounded-lg bg-[#D4AA55] text-[#202522] font-semibold text-sm hover:bg-[#F0D69B] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
