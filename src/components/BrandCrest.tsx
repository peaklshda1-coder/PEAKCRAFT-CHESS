import React from 'react';

interface BrandCrestProps {
  className?: string;
}

export const BrandCrest: React.FC<BrandCrestProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pc-crest-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#174D49" />
          <stop offset="100%" stopColor="#103C3B" />
        </linearGradient>
        <linearGradient id="pc-crest-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F0D69B" />
          <stop offset="55%" stopColor="#D4AA55" />
          <stop offset="100%" stopColor="#A67E2E" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#pc-crest-bg)" stroke="url(#pc-crest-gold)" strokeWidth="2" />
      <path
        d="M21 16 L25 22 L32 13 L39 22 L43 16 L41 26 L23 26 Z"
        fill="url(#pc-crest-gold)"
      />
      <path
        d="M23 28 L41 28 L43 41 L21 41 Z"
        fill="url(#pc-crest-gold)"
        opacity="0.92"
      />
      <path d="M32 30.5 L35.5 34.5 L32 38.5 L28.5 34.5 Z" fill="#103C3B" />
      <rect x="18" y="43" width="28" height="4" rx="1.5" fill="#F5F0E5" />
      <rect x="15" y="48.5" width="34" height="4.5" rx="1.5" fill="url(#pc-crest-gold)" />
    </svg>
  );
};
