import React from 'react';
import type { ThemeMotif } from '../types/platform.ts';

export const ChannelLogoSVG: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 120 120"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="60" cy="60" r="54" fill="#FFFFFF" stroke="#00732F" strokeWidth="3.5" />
    {/* UAE Ribbon Arc */}
    <path d="M18 74 C40 94, 80 94, 102 68" stroke="#CE1126" strokeWidth="7" strokeLinecap="round" />
    <path d="M22 66 C44 84, 78 84, 98 60" stroke="#00732F" strokeWidth="5" strokeLinecap="round" />
    <path d="M26 82 C48 98, 78 96, 98 76" stroke="#171717" strokeWidth="4" strokeLinecap="round" />
    {/* Painter Palette */}
    <ellipse cx="64" cy="52" rx="28" ry="22" fill="#FDE68A" stroke="#92400E" strokeWidth="2.5" />
    <circle cx="52" cy="44" r="4.5" fill="#CE1126" />
    <circle cx="65" cy="40" r="4.5" fill="#0E7490" />
    <circle cx="78" cy="46" r="4.5" fill="#00732F" />
    <circle cx="74" cy="59" r="4.5" fill="#D97706" />
    <circle cx="50" cy="58" r="4" fill="#FFFFFF" stroke="#92400E" strokeWidth="1.5" />
    {/* Paintbrush */}
    <path d="M36 30 L68 62" stroke="#1E3A8A" strokeWidth="5" strokeLinecap="round" />
    <path d="M68 62 L76 70" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
    <path d="M75 69 C81 73, 84 79, 82 84 C77 83, 72 78, 73 71 Z" fill="#171717" />
  </svg>
);

export const HeroStorybookIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-56',
}) => (
  <svg viewBox="0 0 420 220" className={className} fill="none" aria-hidden="true">
    {/* Sky background */}
    <rect width="420" height="220" rx="24" fill="#DFF2FE" />
    {/* Warm Sun */}
    <circle cx="355" cy="54" r="28" fill="#FBBF24" />
    <circle cx="355" cy="54" r="36" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="6 6" />
    {/* Puffy Clouds */}
    <ellipse cx="84" cy="46" rx="34" ry="15" fill="#FFFFFF" />
    <ellipse cx="106" cy="40" rx="22" ry="13" fill="#FFFFFF" />
    <ellipse cx="268" cy="36" rx="28" ry="12" fill="#FFFFFF" />
    {/* Hot air balloons */}
    <ellipse cx="64" cy="96" rx="18" ry="22" fill="#EC4899" />
    <path d="M54 80 C64 74, 74 80, 64 118" fill="#F472B6" opacity="0.6" />
    <rect x="59" y="122" width="10" height="8" rx="2" fill="#92400E" />
    <ellipse cx="145" cy="64" rx="13" ry="16" fill="#0EA5E9" />
    <rect x="141" y="83" width="8" height="6" rx="1.5" fill="#92400E" />
    {/* Rolling Emerald Hills */}
    <path d="M0 164 Q110 132 220 162 T420 152 L420 220 L0 220 Z" fill="#4ADE80" />
    <path d="M0 180 Q150 154 290 182 T420 174 L420 220 L0 220 Z" fill="#16A34A" />
    {/* Calm Ocean Wave Strip */}
    <path d="M0 198 Q80 186 160 198 T320 198 T420 194 L420 220 L0 220 Z" fill="#0284C7" opacity="0.85" />
    {/* Sailboat */}
    <polygon points="315,172 342,172 336,184 321,184" fill="#EA580C" />
    <polygon points="328,138 328,170 344,170" fill="#FACC15" />
    <polygon points="326,144 326,170 314,170" fill="#FFFFFF" />
    {/* Colorful Flowers on Hill */}
    <circle cx="48" cy="182" r="5" fill="#F43F5E" />
    <circle cx="92" cy="176" r="5" fill="#FACC15" />
    <circle cx="132" cy="184" r="4.5" fill="#EC4899" />
  </svg>
);

export const MotifIllustration: React.FC<{ motif: ThemeMotif; className?: string }> = ({
  motif,
  className = 'w-full h-40',
}) => {
  if (motif === 'ocean') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#D8F3FE" />
        {/* Rays */}
        <circle cx="160" cy="68" r="52" fill="#FFFFFF" stroke="#0891B2" strokeWidth="4.5" />
        <circle cx="160" cy="68" r="42" fill="#F0F9FF" />
        {/* Bubbles */}
        <circle cx="62" cy="34" r="7" fill="#FFFFFF" opacity="0.8" />
        <circle cx="78" cy="52" r="4.5" fill="#FFFFFF" opacity="0.8" />
        <circle cx="256" cy="36" r="8" fill="#FFFFFF" opacity="0.8" />
        {/* Coral & Seaweed */}
        <path d="M40 130 C35 108, 48 96, 44 82" stroke="#10B981" strokeWidth="6" strokeLinecap="round" />
        <path d="M54 130 C60 112, 52 98, 58 88" stroke="#059669" strokeWidth="5" strokeLinecap="round" />
        <path d="M266 130 C272 108, 260 96, 268 82" stroke="#F43F5E" strokeWidth="6" strokeLinecap="round" />
        {/* Starfish & Pearl */}
        <circle cx="160" cy="68" r="18" fill="#BAE6FD" stroke="#0284C7" strokeWidth="2.5" />
        <circle cx="160" cy="68" r="7" fill="#FFFFFF" />
        {/* Ocean waves & sandy seabed */}
        <path d="M0 116 Q80 100 160 116 T320 116 L320 150 L0 150 Z" fill="#0284C7" opacity="0.28" />
        <path d="M0 128 Q80 114 160 128 T320 128 L320 150 L0 150 Z" fill="#FDE68A" />
      </svg>
    );
  }

  if (motif === 'activities') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#ECFDF5" />
        {/* Clouds */}
        <ellipse cx="64" cy="40" rx="28" ry="12" fill="#FFFFFF" />
        <ellipse cx="256" cy="38" rx="28" ry="12" fill="#FFFFFF" />
        {/* Hot air balloons */}
        <ellipse cx="56" cy="54" rx="18" ry="22" fill="#EC4899" />
        <rect x="51" y="80" width="10" height="8" rx="2" fill="#92400E" />
        <ellipse cx="264" cy="50" rx="16" ry="20" fill="#F59E0B" />
        <rect x="260" y="74" width="8" height="7" rx="2" fill="#92400E" />
        {/* Dashed cloud */}
        <rect
          x="92"
          y="26"
          width="136"
          height="94"
          rx="32"
          fill="#FFFFFF"
          stroke="#059669"
          strokeWidth="3"
          strokeDasharray="7 5"
        />
        {/* Colored pencils */}
        <rect x="128" y="54" width="13" height="48" rx="2" fill="#3B82F6" />
        <polygon points="128,54 134.5,38 141,54" fill="#FDE68A" />
        <rect x="150" y="46" width="13" height="56" rx="2" fill="#10B981" />
        <polygon points="150,46 156.5,30 163,46" fill="#FDE68A" />
        <rect x="172" y="56" width="13" height="46" rx="2" fill="#F43F5E" />
        <polygon points="172,56 178.5,40 185,56" fill="#FDE68A" />
        <rect x="194" y="60" width="13" height="42" rx="2" fill="#F59E0B" />
        <polygon points="194,60 200.5,44 207,60" fill="#FDE68A" />
      </svg>
    );
  }

  if (motif === 'morning') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#E0F7FA" />
        <circle cx="72" cy="46" r="24" fill="#FBBF24" />
        <circle cx="72" cy="46" r="33" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="5 5" />
        <ellipse cx="218" cy="42" rx="34" ry="14" fill="#FFFFFF" />
        <ellipse cx="242" cy="36" rx="22" ry="12" fill="#FFFFFF" />
        <path d="M0 112 Q160 84 320 112 L320 150 L0 150 Z" fill="#84CC16" />
        <path d="M0 124 Q160 100 320 124 L320 150 L0 150 Z" fill="#4D7C0F" />
        {/* Sunflowers */}
        <circle cx="90" cy="128" r="7" fill="#FACC15" stroke="#EA580C" strokeWidth="2" />
        <circle cx="155" cy="122" r="7" fill="#FACC15" stroke="#EA580C" strokeWidth="2" />
        <circle cx="235" cy="128" r="7" fill="#FACC15" stroke="#EA580C" strokeWidth="2" />
      </svg>
    );
  }

  if (motif === 'evening') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#1E3A5F" />
        <path d="M88 30 A24 24 0 1 0 116 66 A18 18 0 1 1 88 30 Z" fill="#FBBF24" />
        <circle cx="168" cy="30" r="3.5" fill="#FDE68A" />
        <circle cx="215" cy="48" r="3" fill="#FDE68A" />
        <circle cx="258" cy="28" r="4" fill="#FDE68A" />
        <circle cx="145" cy="60" r="2.5" fill="#FDE68A" />
        <circle cx="242" cy="70" r="2.5" fill="#FDE68A" />
        <path d="M0 114 Q90 88 180 114 T320 106 L320 150 L0 150 Z" fill="#0F766E" opacity="0.7" />
        <path d="M0 128 Q160 110 320 128 L320 150 L0 150 Z" fill="#0E7490" opacity="0.8" />
        {/* Evening boat */}
        <polygon points="224,116 254,116 248,128 230,128" fill="#F97316" />
        <polygon points="239,88 239,114 252,114" fill="#FACC15" />
      </svg>
    );
  }

  if (motif === 'desert') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#E0F2FE" />
        {/* Wooden signboard */}
        <line x1="108" y1="0" x2="108" y2="28" stroke="#92400E" strokeWidth="4" />
        <line x1="212" y1="0" x2="212" y2="28" stroke="#92400E" strokeWidth="4" />
        <rect x="82" y="24" width="156" height="58" rx="10" fill="#9A4E22" stroke="#5C2D12" strokeWidth="3" />
        <circle cx="96" cy="53" r="4" fill="#FDE68A" />
        <circle cx="224" cy="53" r="4" fill="#FDE68A" />
        {/* Waves + dunes */}
        <path d="M0 112 Q45 90 90 112 T180 112 T270 112 T320 112 L320 150 L0 150 Z" fill="#0284C7" opacity="0.45" />
        <path d="M0 126 Q100 100 190 126 T320 122 L320 150 L0 150 Z" fill="#D97706" opacity="0.85" />
      </svg>
    );
  }

  // guide (#مشكلة وحل)
  return (
    <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
      <rect width="320" height="150" fill="#FEF6E7" />
      <circle cx="160" cy="72" r="50" fill="#FDE68A" opacity="0.8" />
      <rect x="112" y="42" width="96" height="60" rx="12" fill="#FFFFFF" stroke="#0E7490" strokeWidth="3.5" />
      <circle cx="160" cy="72" r="15" fill="#E0F2FE" stroke="#0E7490" strokeWidth="2.5" />
      <path d="M160 63 L160 72 L167 76" stroke="#0E7490" strokeWidth="2.5" strokeLinecap="round" />
      {/* Leaves & decorative shapes */}
      <circle cx="268" cy="36" r="14" fill="#10B981" opacity="0.22" />
      <circle cx="48" cy="112" r="18" fill="#EF4444" opacity="0.18" />
      <circle cx="264" cy="112" r="10" fill="#0284C7" opacity="0.22" />
    </svg>
  );
};
