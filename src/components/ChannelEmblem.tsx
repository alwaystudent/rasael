import React, { useState } from 'react';
import type { ThemeMotif } from '../types/platform.ts';

const HERO_ILLUSTRATION_SRC = '/src/assets/images/hero_rasael_blurred_faces_1795624536552.jpg';

const MOTIF_IMAGE_MAP: Record<ThemeMotif, { src: string; alt: string }> = {
  ocean: {
    src: '/src/assets/images/motif_ocean_faceless_fish_1795624559189.jpg',
    alt: 'رسوم تعليمية بحرية إماراتية للعقيدة للأطفال',
  },
  activities: {
    src: '/src/assets/images/motif_activities_art_1795623597487.jpg',
    alt: 'طاولة أنشطة وألوان إماراتية للأطفال',
  },
  morning: {
    src: '/src/assets/images/motif_morning_faceless_doves_1795624559474.jpg',
    alt: 'إشراقة الصباح والطبيعة الإمارتية لأذكار الصباح',
  },
  evening: {
    src: '/src/assets/images/motif_evening_masaa_1795623598073.jpg',
    alt: 'سكون المساء والنجوم والهلال لأذكار المساء',
  },
  desert: {
    src: '/src/assets/images/motif_story_blurred_faces_1795624536223.jpg',
    alt: 'رمال وبحر وكتاب قصص تعليمية للأطفال',
  },
  guide: {
    src: '/src/assets/images/motif_guide_blurred_faces_1795624536880.jpg',
    alt: 'ركن القراءة واللعب الأسري المتوازن للأطفال',
  },
};

export const ChannelLogoSVG: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 120 120"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="60" cy="60" r="54" fill="#FFFDF7" stroke="#00732F" strokeWidth="3.5" />
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

const HeroStorybookFallbackSVG: React.FC<{ className?: string }> = ({
  className = 'w-full h-56',
}) => (
  <svg viewBox="0 0 420 220" className={className} fill="none" aria-hidden="true">
    <rect width="420" height="220" rx="24" fill="#DFF2FE" />
    <circle cx="355" cy="54" r="28" fill="#FBBF24" />
    <circle cx="355" cy="54" r="36" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="6 6" />
    <ellipse cx="84" cy="46" rx="34" ry="15" fill="#FFFFFF" />
    <ellipse cx="106" cy="40" rx="22" ry="13" fill="#FFFFFF" />
    <ellipse cx="268" cy="36" rx="28" ry="12" fill="#FFFFFF" />
    <path d="M0 164 Q110 132 220 162 T420 152 L420 220 L0 220 Z" fill="#4ADE80" />
    <path d="M0 180 Q150 154 290 182 T420 174 L420 220 L0 220 Z" fill="#16A34A" />
    <path d="M0 198 Q80 186 160 198 T320 198 T420 194 L420 220 L0 220 Z" fill="#0284C7" opacity="0.85" />
    <polygon points="315,172 342,172 336,184 321,184" fill="#EA580C" />
    <polygon points="328,138 328,170 344,170" fill="#FACC15" />
    <polygon points="326,144 326,170 314,170" fill="#FFFFFF" />
  </svg>
);

export const HeroStorybookIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-56',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return <HeroStorybookFallbackSVG className={className} />;
  }

  return (
    <img
      src={HERO_ILLUSTRATION_SRC}
      alt="رسومات تعليمية إماراتية مستوحاة من قناة رسائل إماراتية للأطفال"
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`${className} object-cover`}
    />
  );
};

const MotifFallbackSVG: React.FC<{ motif: ThemeMotif; className?: string }> = ({
  motif,
  className = 'w-full h-40',
}) => {
  if (motif === 'ocean') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#D8F3FE" />
        <circle cx="160" cy="68" r="52" fill="#FFFFFF" stroke="#0891B2" strokeWidth="4.5" />
        <circle cx="160" cy="68" r="18" fill="#BAE6FD" stroke="#0284C7" strokeWidth="2.5" />
        <circle cx="160" cy="68" r="7" fill="#FFFFFF" />
        <path d="M0 116 Q80 100 160 116 T320 116 L320 150 L0 150 Z" fill="#0284C7" opacity="0.28" />
        <path d="M0 128 Q80 114 160 128 T320 128 L320 150 L0 150 Z" fill="#FDE68A" />
      </svg>
    );
  }

  if (motif === 'activities') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#ECFDF5" />
        <rect x="92" y="26" width="136" height="94" rx="32" fill="#FFFFFF" stroke="#059669" strokeWidth="3" strokeDasharray="7 5" />
        <rect x="128" y="54" width="13" height="48" rx="2" fill="#3B82F6" />
        <rect x="150" y="46" width="13" height="56" rx="2" fill="#10B981" />
        <rect x="172" y="56" width="13" height="46" rx="2" fill="#F43F5E" />
        <rect x="194" y="60" width="13" height="42" rx="2" fill="#F59E0B" />
      </svg>
    );
  }

  if (motif === 'morning') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#E0F7FA" />
        <circle cx="72" cy="46" r="24" fill="#FBBF24" />
        <path d="M0 112 Q160 84 320 112 L320 150 L0 150 Z" fill="#84CC16" />
        <path d="M0 124 Q160 100 320 124 L320 150 L0 150 Z" fill="#4D7C0F" />
      </svg>
    );
  }

  if (motif === 'evening') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#1E3A5F" />
        <path d="M88 30 A24 24 0 1 0 116 66 A18 18 0 1 1 88 30 Z" fill="#FBBF24" />
        <path d="M0 114 Q90 88 180 114 T320 106 L320 150 L0 150 Z" fill="#0F766E" opacity="0.7" />
        <path d="M0 128 Q160 110 320 128 L320 150 L0 150 Z" fill="#0E7490" opacity="0.8" />
      </svg>
    );
  }

  if (motif === 'desert') {
    return (
      <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
        <rect width="320" height="150" fill="#E0F2FE" />
        <path d="M0 112 Q45 90 90 112 T180 112 T270 112 T320 112 L320 150 L0 150 Z" fill="#0284C7" opacity="0.45" />
        <path d="M0 126 Q100 100 190 126 T320 122 L320 150 L0 150 Z" fill="#D97706" opacity="0.85" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 150" className={className} fill="none" aria-hidden="true">
      <rect width="320" height="150" fill="#FEF6E7" />
      <circle cx="160" cy="72" r="50" fill="#FDE68A" opacity="0.8" />
      <rect x="112" y="42" width="96" height="60" rx="12" fill="#FFFFFF" stroke="#0E7490" strokeWidth="3.5" />
    </svg>
  );
};

export const MotifIllustration: React.FC<{ motif: ThemeMotif; className?: string }> = ({
  motif,
  className = 'w-full h-40',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const asset = MOTIF_IMAGE_MAP[motif] || MOTIF_IMAGE_MAP.ocean;

  if (imgFailed) {
    return <MotifFallbackSVG motif={motif} className={className} />;
  }

  return (
    <img
      src={asset.src}
      alt={asset.alt}
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`${className} object-cover`}
    />
  );
};
