import React from 'react';
import { Color, PieceType } from '../engine/types';

interface PieceSvgProps {
  color: Color;
  type: PieceType;
  className?: string;
}

/**
 * Custom PeakCraft Staunton-sculpted vector chess pieces.
 * White pieces use Warm Ivory (#F5F0E5) with Metallic Gold (#D4AA55) accents and crisp dark borders.
 * Black pieces use Obsidian Charcoal (#202522) with Metallic Gold (#D4AA55) inlays and high-contrast highlights.
 */
export const ChessPieceSvg: React.FC<PieceSvgProps> = ({ color, type, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#F5F0E5' : '#202522';
  const shade = isWhite ? '#DDD2BC' : '#121614';
  const stroke = isWhite ? '#2E332F' : '#0D100F';
  const accent = isWhite ? '#B88933' : '#D4AA55';
  const detail = isWhite ? '#3A3E3B' : '#F0D69B';

  return (
    <svg
      viewBox="0 0 45 45"
      className={className}
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35))' }}
    >
      {type === 'p' && (
        <g stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="22.5" cy="13.5" r="4.8" fill={fill} />
          <path d="M18.5 18.5 C17.5 21 16 25 14 28.5 L31 28.5 C29 25 27.5 21 26.5 18.5 Z" fill={fill} />
          <path d="M16.5 19.5 L28.5 19.5" stroke={accent} strokeWidth="1.6" />
          <path d="M12.5 28.5 L32.5 28.5 L34 32.5 L11 32.5 Z" fill={shade} />
          <rect x="9.5" y="32.5" width="26" height="4" rx="1.5" fill={fill} />
          <line x1="12" y1="34.5" x2="33" y2="34.5" stroke={accent} strokeWidth="1.1" />
        </g>
      )}

      {type === 'r' && (
        <g stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M11 9.5 L15 9.5 L15 12.5 L19.5 12.5 L19.5 9.5 L25.5 9.5 L25.5 12.5 L30 12.5 L30 9.5 L34 9.5 L34 16 L31 18.5 L31 29.5 L33.5 32.5 L11.5 32.5 L14 29.5 L14 18.5 L11 16 Z"
            fill={fill}
          />
          <path d="M14 18.5 L31 18.5" stroke={accent} strokeWidth="1.4" />
          <path d="M14 29.5 L31 29.5" stroke={accent} strokeWidth="1.4" />
          <rect x="19" y="21" width="7" height="6" rx="1" fill={shade} stroke={detail} strokeWidth="1" />
          <rect x="9.5" y="32.5" width="26" height="4.5" rx="1.5" fill={shade} />
          <line x1="11.5" y1="34.8" x2="33.5" y2="34.8" stroke={accent} strokeWidth="1.1" />
        </g>
      )}

      {type === 'n' && (
        <g stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M14 32.5 C14.5 26 18 22 20 19.5 C17.5 19.5 15 20.5 12.5 21.5 C10.5 22.2 9.2 20.4 10.2 18.4 C11.8 15.2 15.2 11.4 19 9.5 L20.5 6.5 L24 9 C29.5 10.2 33.5 15.5 33.5 23.5 C33.5 27 32.5 30 31.5 32.5 Z"
            fill={fill}
          />
          {/* Mane ridge */}
          <path
            d="M24 11.5 C27.5 14 29.5 18.5 29.5 24.5 C29.5 27 29 29.5 28.2 31.5"
            fill="none"
            stroke={accent}
            strokeWidth="1.6"
          />
          {/* Eye & nostril */}
          <circle cx="16.8" cy="14.2" r="1.1" fill={detail} stroke="none" />
          <circle cx="12.5" cy="19.2" r="0.8" fill={detail} stroke="none" />
          <rect x="9.5" y="32.5" width="26" height="4.5" rx="1.5" fill={shade} />
          <line x1="11.5" y1="34.8" x2="33.5" y2="34.8" stroke={accent} strokeWidth="1.1" />
        </g>
      )}

      {type === 'b' && (
        <g stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="22.5" cy="7.5" r="2.3" fill={accent} />
          <path
            d="M22.5 10 C17 13.5 15 19.5 16.5 25.5 L14 29.5 L31 29.5 L28.5 25.5 C30 19.5 28 13.5 22.5 10 Z"
            fill={fill}
          />
          {/* Mitre cleft & cross inlay */}
          <path d="M22.5 15 L22.5 21.5 M19.5 18.2 L25.5 18.2" stroke={detail} strokeWidth="1.5" />
          <path d="M16 25.5 L29 25.5" stroke={accent} strokeWidth="1.4" />
          <path d="M12.5 29.5 L32.5 29.5 L34 32.5 L11 32.5 Z" fill={shade} />
          <rect x="9.5" y="32.5" width="26" height="4.5" rx="1.5" fill={fill} />
          <line x1="11.5" y1="34.8" x2="33.5" y2="34.8" stroke={accent} strokeWidth="1.1" />
        </g>
      )}

      {type === 'q' && (
        <g stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9.5" cy="12" r="1.8" fill={accent} />
          <circle cx="15.5" cy="9" r="1.8" fill={accent} />
          <circle cx="22.5" cy="7.5" r="2" fill={accent} />
          <circle cx="29.5" cy="9" r="1.8" fill={accent} />
          <circle cx="35.5" cy="12" r="1.8" fill={accent} />
          <path
            d="M10.5 14 L14.5 26.5 L30.5 26.5 L34.5 14 L29 21 L29.2 11.2 L24.5 20.5 L22.5 10 L20.5 20.5 L15.8 11.2 L16 21 Z"
            fill={fill}
          />
          <path d="M14 26.5 L31 26.5 L32.5 32.5 L12.5 32.5 Z" fill={shade} />
          <path d="M14.5 29.2 L30.5 29.2" stroke={accent} strokeWidth="1.4" />
          <rect x="9.5" y="32.5" width="26" height="4.5" rx="1.5" fill={fill} />
          <line x1="11.5" y1="34.8" x2="33.5" y2="34.8" stroke={accent} strokeWidth="1.1" />
        </g>
      )}

      {type === 'k' && (
        <g stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Crown Cross */}
          <path d="M22.5 5.5 L22.5 13 M19 8.5 L26 8.5" stroke={accent} strokeWidth="2.1" />
          <path
            d="M22.5 13 C18.5 13 16 15.5 15.5 18.5 C12 18.5 10 21.5 11.5 25 C12.5 27.5 14.5 29 14.5 29.5 L30.5 29.5 C30.5 29 32.5 27.5 33.5 25 C35 21.5 33 18.5 29.5 18.5 C29 15.5 26.5 13 22.5 13 Z"
            fill={fill}
          />
          <path d="M16 19.5 C18.5 18 21 18 22.5 20 C24 18 26.5 18 29 19.5" fill="none" stroke={detail} strokeWidth="1.3" />
          <path d="M14.5 29.5 L30.5 29.5" stroke={accent} strokeWidth="1.5" />
          <path d="M12.5 29.5 L32.5 29.5 L33.5 32.5 L11.5 32.5 Z" fill={shade} />
          <rect x="9.5" y="32.5" width="26" height="4.5" rx="1.5" fill={fill} />
          <line x1="11.5" y1="34.8" x2="33.5" y2="34.8" stroke={accent} strokeWidth="1.1" />
        </g>
      )}
    </svg>
  );
};
