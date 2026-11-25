import React, { useEffect, useRef, useState } from 'react';
import { Check, Eraser, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import { playSoftChime } from '../../services/rewardsStorage.ts';

const PAPER_COLORS = ['#0E7490', '#00732F', '#D97706', '#CE1126', '#2563EB', '#EC4899'];

const UAEFlagSVG: React.FC<{ className?: string }> = ({ className = 'w-28 h-16' }) => (
  <svg viewBox="0 0 120 72" className={className} aria-label="علم الإمارات">
    <rect x="0" y="0" width="120" height="24" fill="#00732F" />
    <rect x="0" y="24" width="120" height="24" fill="#FFFFFF" />
    <rect x="0" y="48" width="120" height="24" fill="#171717" />
    <rect x="90" y="0" width="30" height="72" fill="#CE1126" />
    <rect x="0.5" y="0.5" width="119" height="71" fill="none" stroke="#CBD5E1" />
  </svg>
);

interface Props {
  soundEnabled?: boolean;
  onComplete?: () => void;
}

export const AqeedahActivitiesPackView: React.FC<Props> = ({
  soundEnabled = true,
  onComplete,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const completionFiredRef = useRef(false);

  // Activity 1: Mosaic collage
  const [selectedPaperColor, setSelectedPaperColor] = useState(PAPER_COLORS[0]);
  const [mosaicTiles, setMosaicTiles] = useState<Record<number, string>>({});

  // Activity 2: Circle correct answers
  const [q2Answers, setQ2Answers] = useState<Record<string, string>>({});

  // Activity 3: Drawing canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [brushColor, setBrushColor] = useState('#00732F');
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);

  // Activity 4: Letter puzzle (ش ر ك -> الشرك)
  const [letterInputs, setLetterInputs] = useState(['', '', '']);

  // Activity 5: Color Prophet name
  const [prophetPaletteColor, setProphetPaletteColor] = useState('#00732F');
  const [coloredWord, setColoredWord] = useState<{ word: string; color: string } | null>(null);

  // Activity 6: UAE Flag placement
  const [flagChoice, setFlagChoice] = useState<'right' | 'left' | null>(null);

  // Activity 7: Magnifying glass search
  const [lensPos, setLensPos] = useState({ x: 50, y: 50, active: false });
  const [foundIslamIds, setFoundIslamIds] = useState<Record<string, boolean>>({});
  const [wrongSearchId, setWrongSearchId] = useState<string | null>(null);

  // Activity 8: Matching (أ) & (ب)
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeIndex === 2 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx && canvasRef.current.dataset.initialized !== 'true') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasRef.current.dataset.initialized = 'true';
      }
    }
  }, [activeIndex]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    isDrawingRef.current = true;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = isEraser ? brushSize * 2 : brushSize;
    ctx.strokeStyle = isEraser ? '#FFFFFF' : brushColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const searchWords = [
    { id: 'w1', text: 'الإسلام', isTarget: true, color: '#B91C1C', top: '8%', left: '46%' },
    { id: 'w2', text: 'المجوسية', isTarget: false, color: '#0284C7', top: '16%', left: '20%' },
    { id: 'w3', text: 'اليهودية', isTarget: false, color: '#1E293B', top: '22%', left: '56%' },
    { id: 'w4', text: 'الإسلام', isTarget: true, color: '#15803D', top: '34%', left: '72%' },
    { id: 'w5', text: 'النصرانية', isTarget: false, color: '#991B1B', top: '30%', left: '16%' },
    { id: 'w6', text: 'المجوسية', isTarget: false, color: '#991B1B', top: '42%', left: '54%' },
    { id: 'w7', text: 'الإسلام', isTarget: true, color: '#0369A1', top: '44%', left: '36%' },
    { id: 'w8', text: 'اليهودية', isTarget: false, color: '#0369A1', top: '46%', left: '16%' },
    { id: 'w9', text: 'اليهودية', isTarget: false, color: '#1E293B', top: '57%', left: '62%' },
    { id: 'w10', text: 'الإسلام', isTarget: true, color: '#15803D', top: '57%', left: '34%' },
    { id: 'w11', text: 'الإسلام', isTarget: true, color: '#EA580C', top: '66%', left: '14%' },
    { id: 'w12', text: 'النصرانية', isTarget: false, color: '#991B1B', top: '70%', left: '54%' },
    { id: 'w13', text: 'المجوسية', isTarget: false, color: '#0284C7', top: '74%', left: '38%' },
    { id: 'w14', text: 'النصرانية', isTarget: false, color: '#991B1B', top: '79%', left: '18%' },
    { id: 'w15', text: 'اليهودية', isTarget: false, color: '#0369A1', top: '86%', left: '56%' },
    { id: 'w16', text: 'الإسلام', isTarget: true, color: '#15803D', top: '86%', left: '32%' },
  ];

  const targetCount = searchWords.filter((w) => w.isTarget).length;
  const foundCount = Object.values(foundIslamIds).filter(Boolean).length;

  const activityTabs = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
  ];

  const matchingQuestions = [
    { id: 'm1', text: 'ما معنى اللهُ رَبُّنَا؟', correctRight: 'خالقنا ورازقنا وحده.' },
    { id: 'm2', text: 'ما معنى اللهُ إِلَهُنَا؟', correctRight: 'معبودنا وحده.' },
    { id: 'm3', text: 'ما معنى لَا إِلَهَ إِلَّا اللهُ؟', correctRight: 'لا معبود حق إلا الله.' },
  ];

  const matchingAnswers = [
    'لا معبود حق إلا الله.',
    'معبودنا وحده.',
    'خالقنا ورازقنا وحده.',
  ];

  const allMatchesCorrect = matchingQuestions.every((q) => matches[q.id] === q.correctRight);
  const [visitedActivities, setVisitedActivities] = useState<Record<number, boolean>>({ 0: true });

  useEffect(() => {
    setVisitedActivities((prev) => (prev[activeIndex] ? prev : { ...prev, [activeIndex]: true }));
  }, [activeIndex]);

  useEffect(() => {
    if (completionFiredRef.current) return;
    if (allMatchesCorrect || Object.keys(visitedActivities).length === 8) {
      completionFiredRef.current = true;
      onComplete?.();
    }
  }, [allMatchesCorrect, visitedActivities, onComplete]);

  const handleRightMatchClick = (ansText: string) => {
    if (!selectedLeft) return;
    const question = matchingQuestions.find((q) => q.id === selectedLeft);
    if (question && question.correctRight === ansText) {
      playSoftChime('success', soundEnabled);
    } else {
      playSoftChime('tap', soundEnabled);
    }
    setMatches((prev) => ({ ...prev, [selectedLeft]: ansText }));
    setSelectedLeft(null);
  };

  return (
    <div className="space-y-6">
      {/* Activity Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--platform-border)] pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {activityTabs.map((num, idx) => (
            <button
              key={num}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-10 w-10 rounded-xl text-sm font-bold tabular-nums transition-colors ${
                activeIndex === idx
                  ? 'bg-[#00732F] text-white'
                  : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)] hover:opacity-80'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        <span className="text-sm font-semibold text-[var(--platform-text-muted)] tabular-nums">
          فقرة الأنشطة · {activeIndex + 1} / 8
        </span>
      </div>

      {/* Activity 1: Mosaic Paper Collage on الله */}
      {activeIndex === 0 && (
        <div className="rounded-3xl border border-[var(--platform-border)] bg-white p-6 sm:p-8 text-slate-900 space-y-6">
          <p className="text-lg sm:text-xl font-bold text-[#00732F]">
            أقص الأوراق الملونة قصاصات صغيرة، ثم ألصقها على الإجابة:
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-[#0284C7] text-center">
            السؤال: "من خلقك؟"
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {PAPER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedPaperColor(color)}
                aria-label={color}
                className={`h-10 w-10 rounded-lg border-2 transition-transform ${
                  selectedPaperColor === color ? 'scale-110 border-slate-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <button
              type="button"
              onClick={() => setMosaicTiles({})}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة</span>
            </button>
          </div>

          <div className="mx-auto max-w-md rounded-3xl border-4 border-[#F59E0B] bg-slate-50 p-6">
            <div className="grid grid-cols-6 gap-2" aria-label="الله">
              {Array.from({ length: 24 }).map((_, idx) => {
                const filledColor = mosaicTiles[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setMosaicTiles((prev) => ({ ...prev, [idx]: selectedPaperColor }))
                    }
                    className="h-12 rounded-lg border-2 border-dashed border-slate-300 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: filledColor || '#FFFFFF',
                      borderColor: filledColor || '#CBD5E1',
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-5 text-center font-amiri text-7xl font-bold tracking-wide text-slate-900 select-none">
              الله
            </div>
          </div>
        </div>
      )}

      {/* Activity 2: Circle the correct answer */}
      {activeIndex === 1 && (
        <div className="rounded-3xl border border-[var(--platform-border)] bg-white p-6 sm:p-8 text-slate-900 space-y-6">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
            2) أرسم دائرة على الإجابة الصحيحة:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                id: 'col1',
                q: 'لماذا خلقنا الله؟',
                options: ['- لِلّعب.', '- لعبادته.', '- للراحة.'],
                correct: '- لعبادته.',
              },
              {
                id: 'col2',
                q: 'ما هو أول واجب عليك؟',
                options: ['- توحيد الله.', '- الصلاة.', '- الصيام.'],
                correct: '- توحيد الله.',
              },
              {
                id: 'col3',
                q: 'ما هو آخر الكتب؟',
                options: ['- الكتب العلمية.', '- القصص.', '- القرآن.'],
                correct: '- القرآن.',
              },
            ].map((col) => {
              const picked = q2Answers[col.id];
              return (
                <div
                  key={col.id}
                  className="rounded-2xl border-2 border-[#B91C1C] p-5 space-y-4 bg-white"
                >
                  <h4 className="text-lg font-extrabold text-[#0284C7] text-center">{col.q}</h4>
                  <div className="space-y-3">
                    {col.options.map((opt) => {
                      const isPicked = picked === opt;
                      const isRight = opt === col.correct;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setQ2Answers((p) => ({ ...p, [col.id]: opt }))}
                          className={`w-full rounded-full border-2 px-4 py-3 text-right text-lg font-bold transition-colors ${
                            isPicked
                              ? isRight
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                                : 'border-rose-600 bg-rose-50 text-rose-900'
                              : 'border-transparent bg-slate-50 hover:bg-slate-100 text-slate-900'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span>{opt}</span>
                            {isPicked && isRight && <Check className="w-5 h-5 text-emerald-600" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity 3: Nature Reflection + Drawing Canvas */}
      {activeIndex === 2 && (
        <div className="rounded-3xl border border-[var(--platform-border)] bg-white p-6 sm:p-8 text-slate-900 space-y-6">
          <h3 className="text-lg sm:text-xl font-bold text-[#B91C1C]">
            3) أتأمل مخلوقات الله في هذه الصورة، وأتحدث عنها، ثم أرسمها بألواني الجميلة.
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Reference Scene SVG */}
            <div className="rounded-2xl border-2 border-[#15803D] overflow-hidden bg-[#E0F2FE] flex flex-col">
              <svg viewBox="0 0 400 280" className="w-full h-full object-cover" aria-hidden="true">
                <rect width="400" height="280" fill="#BAE6FD" />
                {/* Mountains */}
                <polygon points="0,170 90,50 180,170" fill="#475569" />
                <polygon points="120,170 220,35 320,170" fill="#334155" />
                <polygon points="240,170 340,65 400,170" fill="#64748B" />
                {/* Snow peaks */}
                <polygon points="90,50 70,78 110,78" fill="#FFFFFF" />
                <polygon points="220,35 196,68 244,68" fill="#FFFFFF" />
                {/* Lake */}
                <rect x="0" y="170" width="400" height="75" fill="#0284C7" />
                <ellipse cx="200" cy="200" rx="140" ry="14" fill="#38BDF8" opacity="0.45" />
                {/* Meadow & flowers */}
                <path d="M0 228 Q200 212 400 232 L400 280 L0 280 Z" fill="#65A30D" />
                <circle cx="70" cy="252" r="6" fill="#EC4899" />
                <circle cx="115" cy="244" r="5" fill="#EC4899" />
                <circle cx="310" cy="248" r="6" fill="#EC4899" />
                <circle cx="345" cy="256" r="5" fill="#FACC15" />
              </svg>
            </div>

            {/* Interactive Drawing Canvas */}
            <div className="rounded-2xl border-2 border-[#15803D] p-3 bg-slate-50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {['#00732F', '#0284C7', '#475569', '#EC4899', '#D97706', '#CE1126'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setBrushColor(c);
                        setIsEraser(false);
                      }}
                      className={`h-8 w-8 rounded-full border-2 ${
                        !isEraser && brushColor === c ? 'border-slate-900 scale-110' : 'border-white'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={2}
                    max={18}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20 accent-[#00732F]"
                    aria-label="حجم الفرشاة"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEraser((v) => !v)}
                    className={`p-2 rounded-lg border ${
                      isEraser ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <canvas
                ref={canvasRef}
                width={480}
                height={300}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="w-full rounded-xl border border-slate-200 bg-white touch-none cursor-crosshair"
              />
            </div>
          </div>
        </div>
      )}

      {/* Activity 4: Discover the Word (الشرك) */}
      {activeIndex === 3 && (
        <div className="rounded-3xl border border-[var(--platform-border)] bg-white p-6 sm:p-8 text-slate-900 space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-[#0284C7]">4) أكتشف الكلمة:</h3>
            <p className="text-base font-bold text-[#0284C7]">
              أستخرج أول حرف من الكلمات، ثم أجمعها لأتعرف على الإجابة.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-2xl sm:text-3xl font-extrabold text-[#B91C1C]">
            <span>ما هو أعظم ذنب؟</span>
            <span className="inline-flex items-center gap-1.5" dir="rtl">
              <span>الـ</span>
              {letterInputs.map((val, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={val}
                  onChange={(e) => {
                    const next = [...letterInputs];
                    next[idx] = e.target.value;
                    setLetterInputs(next);
                  }}
                  className="h-12 w-12 rounded-xl border-2 border-[#B91C1C] bg-rose-50/40 text-center text-2xl font-bold text-slate-900 focus:outline-none"
                />
              ))}
            </span>
          </div>

          {letterInputs.join('') === 'شرك' && (
            <div className="mx-auto max-w-xs rounded-2xl bg-emerald-50 border border-emerald-300 p-3 text-center text-xl font-extrabold text-emerald-800">
              الشرك
            </div>
          )}

          {/* 3 Illustration Cards: شمس، رمان، كتاب */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 rounded-2xl border-2 border-[#0284C7] p-6">
            {[
              { idx: 0, letter: 'ش', label: 'شمس', icon: 'sun' },
              { idx: 1, letter: 'ر', label: 'رمان', icon: 'pomegranate' },
              { idx: 2, letter: 'ك', label: 'كتاب', icon: 'book' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-3">
                <div className="h-28 w-28 flex items-center justify-center">
                  {item.icon === 'sun' && (
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                      <circle cx="50" cy="50" r="26" fill="#FBBF24" stroke="#F59E0B" strokeWidth="3" />
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                        <line
                          key={deg}
                          x1="50"
                          y1="10"
                          x2="50"
                          y2="18"
                          stroke="#F59E0B"
                          strokeWidth="4"
                          strokeLinecap="round"
                          transform={`rotate(${deg} 50 50)`}
                        />
                      ))}
                    </svg>
                  )}
                  {item.icon === 'pomegranate' && (
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                      <circle cx="50" cy="56" r="28" fill="#B91C1C" />
                      <polygon points="40,28 50,16 60,28" fill="#991B1B" />
                      <circle cx="44" cy="52" r="3" fill="#FCA5A5" />
                      <circle cx="55" cy="58" r="3" fill="#FCA5A5" />
                      <circle cx="49" cy="66" r="3" fill="#FCA5A5" />
                    </svg>
                  )}
                  {item.icon === 'book' && (
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                      <rect x="24" y="18" width="50" height="64" rx="5" fill="#6366F1" />
                      <rect x="32" y="24" width="38" height="52" rx="3" fill="#818CF8" />
                      <rect x="28" y="72" width="44" height="8" rx="2" fill="#E2E8F0" />
                    </svg>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = [...letterInputs];
                    next[item.idx] = item.letter;
                    setLetterInputs(next);
                  }}
                  className="rounded-xl border border-[#0284C7] bg-sky-50 px-5 py-2 text-lg font-extrabold text-[#0284C7] hover:bg-sky-100"
                >
                  {item.letter}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity 5: Color Prophet Muhammad's Name */}
      {activeIndex === 4 && (
        <div className="rounded-3xl border border-[var(--platform-border)] bg-white p-6 sm:p-8 text-slate-900 space-y-6">
          <h3 className="text-xl sm:text-2xl font-bold text-[#0284C7]">
            5) أُلَوِّنُ اسم نبينا صلى الله عليه وسلم
          </h3>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {PAPER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setProphetPaletteColor(c)}
                className={`h-10 w-10 rounded-full border-2 transition-transform ${
                  prophetPaletteColor === c ? 'scale-110 border-slate-900' : 'border-slate-200'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 text-center">
            {['إبراهيم', 'عيسى', 'محمد'].map((name) => {
              const isColored = coloredWord?.word === name;
              const isCorrect = name === 'محمد';
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setColoredWord({ word: name, color: prophetPaletteColor })}
                  className="rounded-2xl border-2 border-slate-200 p-6 transition-transform hover:scale-105"
                >
                  <span
                    className="font-amiri text-5xl sm:text-6xl font-bold"
                    style={{
                      color: isColored ? coloredWord.color : '#FFFFFF',
                      WebkitTextStroke: '2px #1E293B',
                    }}
                  >
                    {name}
                  </span>
                  {isColored && isCorrect && (
                    <div className="mt-3 inline-flex items-center gap-1 text-emerald-700 font-bold text-sm">
                      <Check className="w-4 h-4" />
                      <span>محمد</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity 6: Draw UAE Flag on Correct Answer */}
      {activeIndex === 5 && (
        <div className="rounded-3xl border border-[var(--platform-border)] bg-white p-6 sm:p-8 text-slate-900 space-y-6">
          <h3 className="text-xl sm:text-2xl font-bold text-[#0284C7]">
            6) أرسم علم بلادي عند الإجابة الصحيحة.
          </h3>
          <p className="text-2xl font-extrabold text-[#B91C1C] text-center">
            • ما هو حق حكامنا؟
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => setFlagChoice('right')}
              className={`rounded-2xl border-2 p-6 flex flex-col items-center gap-5 transition-colors ${
                flagChoice === 'right'
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-[#0284C7] bg-white hover:bg-sky-50/40'
              }`}
            >
              <div className="h-24 flex items-center justify-center">
                {flagChoice === 'right' ? (
                  <UAEFlagSVG className="w-36 h-22 rounded shadow-sm" />
                ) : (
                  <div className="w-36 h-20 rounded-xl border-2 border-dashed border-slate-300" />
                )}
              </div>
              <span className="text-lg sm:text-xl font-bold text-[#B91C1C]">
                - السمع والطاعة لهم بالمعروف.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFlagChoice('left')}
              className={`rounded-2xl border-2 p-6 flex flex-col items-center gap-5 transition-colors ${
                flagChoice === 'left'
                  ? 'border-rose-600 bg-rose-50'
                  : 'border-[#0284C7] bg-white hover:bg-sky-50/40'
              }`}
            >
              <div className="h-24 flex items-center justify-center">
                <div className="w-36 h-20 rounded-xl border-2 border-dashed border-slate-300" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-[#B91C1C]">
                - عدم طاعتهم والخروج عليهم.
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Activity 7: Magnifying Glass Search for (الإسلام) */}
      {activeIndex === 6 && (
        <div className="rounded-3xl border border-[var(--platform-border)] bg-white p-6 sm:p-8 text-slate-900 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg sm:text-xl font-bold text-[#15803D]">
              7) أبحث عن كلمة (الإسلام) باستخدام عدستي المكبرة، ثم أحوطها بدائرة:
            </h3>
            <span className="text-sm font-bold tabular-nums text-emerald-700">
              {foundCount} / {targetCount}
            </span>
          </div>

          <div
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setLensPos({
                x: ((e.clientX - rect.left) / rect.width) * 100,
                y: ((e.clientY - rect.top) / rect.height) * 100,
                active: true,
              });
            }}
            onMouseLeave={() => setLensPos((p) => ({ ...p, active: false }))}
            className="relative mx-auto h-96 max-w-lg rounded-full border-4 border-[#15803D] bg-white overflow-hidden select-none"
          >
            {lensPos.active && (
              <div
                className="pointer-events-none absolute z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-slate-700 bg-sky-100/35 shadow-md"
                style={{ left: `${lensPos.x}%`, top: `${lensPos.y}%` }}
              />
            )}

            {searchWords.map((w) => {
              const isFound = Boolean(foundIslamIds[w.id]);
              const isWrong = wrongSearchId === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    if (w.isTarget) {
                      setFoundIslamIds((prev) => ({ ...prev, [w.id]: true }));
                    } else {
                      setWrongSearchId(w.id);
                      setTimeout(() => setWrongSearchId(null), 500);
                    }
                  }}
                  style={{ top: w.top, left: w.left, color: w.color }}
                  className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 px-3 py-1 text-base sm:text-lg font-extrabold rounded-full transition-transform ${
                    isFound
                      ? 'border-2 border-emerald-600 bg-emerald-50 scale-110'
                      : isWrong
                        ? 'border-2 border-rose-500 bg-rose-50'
                        : 'hover:scale-110'
                  }`}
                >
                  {w.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity 8: Matching (أ) and (ب) */}
      {activeIndex === 7 && (
        <div className="rounded-3xl border border-[var(--platform-border)] bg-white p-6 sm:p-8 text-slate-900 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-[#0284C7]">
              8) أصل بين السؤال وإجابته المناسبة:
            </h3>
            <button
              type="button"
              onClick={() => {
                setMatches({});
                setSelectedLeft(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column (أ) */}
            <div className="rounded-2xl border-2 border-[#0284C7] p-5 space-y-4">
              <div className="text-center text-3xl font-extrabold text-[#B91C1C]">(أ)</div>
              {matchingQuestions.map((q) => {
                const isSelected = selectedLeft === q.id;
                const matchedText = matches[q.id];
                const isCorrect = matchedText === q.correctRight;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedLeft(q.id)}
                    className={`w-full rounded-xl border-2 px-4 py-4 text-right text-lg font-bold transition-colors ${
                      isSelected
                        ? 'border-[#0284C7] bg-sky-50'
                        : matchedText
                          ? isCorrect
                            ? 'border-emerald-600 bg-emerald-50'
                            : 'border-rose-500 bg-rose-50'
                          : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="text-[#B91C1C]">{q.text}</div>
                    {matchedText && (
                      <div className="mt-1.5 text-sm font-bold text-[#0284C7]">
                        ← {matchedText}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Column (ب) */}
            <div className="rounded-2xl border-2 border-[#0284C7] p-5 space-y-4">
              <div className="text-center text-3xl font-extrabold text-[#0284C7]">(ب)</div>
              {matchingAnswers.map((ans) => {
                const isUsed = Object.values(matches).includes(ans);
                return (
                  <button
                    key={ans}
                    type="button"
                    onClick={() => handleRightMatchClick(ans)}
                    className={`w-full rounded-xl border-2 px-4 py-4 text-right text-lg font-bold transition-colors ${
                      selectedLeft
                        ? 'border-[#0284C7] bg-sky-50/70 hover:bg-sky-100'
                        : isUsed
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <span className="text-[#0284C7]">{ans}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Prev / Next Activity Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={activeIndex === 0}
          onClick={() => setActiveIndex((i) => i - 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
        >
          <ArrowRight className="w-4 h-4" />
          <span>السابق</span>
        </button>
        <button
          type="button"
          disabled={activeIndex === 7}
          onClick={() => setActiveIndex((i) => i + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
        >
          <span>التالي</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
