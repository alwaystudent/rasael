import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, GripVertical, ImageIcon, RotateCcw } from 'lucide-react';
import type { SmartDragDropCard } from '../../types/platform.ts';
import { playSoftChime } from '../../services/rewardsStorage.ts';

interface Props {
  cards: SmartDragDropCard[];
  accentColor: string;
  soundEnabled?: boolean;
  onComplete?: () => void;
}

function shuffleDeterministic<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed + 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  if (
    arr.length > 1 &&
    arr.every((item, idx) => item === items[idx])
  ) {
    const first = arr.shift();
    if (first !== undefined) arr.push(first);
  }
  return arr;
}

export const ImageDragDropGameView: React.FC<Props> = ({
  cards,
  accentColor,
  soundEnabled = true,
  onComplete,
}) => {
  const [roundSeed, setRoundSeed] = useState(1);
  const [matchedCardIds, setMatchedCardIds] = useState<Record<string, boolean>>({});
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [draggingChipId, setDraggingChipId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [wrongCardId, setWrongCardId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const completedOnceRef = useRef(false);

  const shuffledChips = useMemo(
    () => shuffleDeterministic(cards, roundSeed),
    [cards, roundSeed]
  );

  const matchedCount = useMemo(
    () => cards.filter((c) => matchedCardIds[c.id]).length,
    [cards, matchedCardIds]
  );

  const allMatched = cards.length > 0 && matchedCount === cards.length;

  useEffect(() => {
    if (allMatched && !completedOnceRef.current) {
      completedOnceRef.current = true;
      onComplete?.();
    }
  }, [allMatched, onComplete]);

  const attemptMatch = (chipId: string | null, targetCard: SmartDragDropCard) => {
    if (!chipId || matchedCardIds[targetCard.id]) return;

    const sourceCard = cards.find((c) => c.id === chipId);
    if (!sourceCard) return;

    const isCorrect =
      sourceCard.id === targetCard.id ||
      sourceCard.title.trim() === targetCard.title.trim();

    if (isCorrect) {
      playSoftChime('success', soundEnabled);
      setMatchedCardIds((prev) => ({ ...prev, [targetCard.id]: true }));
      setSelectedChipId(null);
      setWrongCardId(null);
    } else {
      playSoftChime('tap', soundEnabled);
      setWrongCardId(targetCard.id);
      setTimeout(() => {
        setWrongCardId((prev) => (prev === targetCard.id ? null : prev));
      }, 650);
    }
  };

  const handleReset = () => {
    setMatchedCardIds({});
    setSelectedChipId(null);
    setDraggingChipId(null);
    setDragOverCardId(null);
    setWrongCardId(null);
    setRoundSeed((s) => s + 1);
    completedOnceRef.current = false;
  };

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-8 text-center text-sm text-[var(--platform-text-muted)]">
        لا توجد بطاقات صور في هذا النشاط حالياً.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress & Reset Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-5 py-4">
        <div className="space-y-1.5 min-w-48 flex-1">
          <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold">
            <span>اسحب كل عنوان وضعه أسفل الصورة المناسبة</span>
            <span className="tabular-nums text-[var(--platform-text-muted)]">
              {matchedCount} / {cards.length}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--platform-surface-muted)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.round((matchedCount / cards.length) * 100)}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-4 py-2.5 text-xs sm:text-sm font-bold hover:opacity-90 whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4" />
          <span>إعادة اللعب</span>
        </button>
      </div>

      {/* Draggable Title Chips Bank */}
      {!allMatched && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 sm:p-5 space-y-3">
          <div className="text-xs sm:text-sm font-extrabold text-[var(--platform-text-muted)]">
            العناوين (اسحب العنوان إلى الصورة أو اضغط عليه ثم اضغط على الصورة):
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {shuffledChips.map((chip) => {
              const isMatched = Boolean(matchedCardIds[chip.id]);
              if (isMatched) return null;
              const isSelected = selectedChipId === chip.id;

              return (
                <button
                  key={`chip-${chip.id}`}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    setDraggingChipId(chip.id);
                    setSelectedChipId(chip.id);
                    e.dataTransfer.setData('text/plain', chip.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggingChipId(null);
                    setDragOverCardId(null);
                  }}
                  onClick={() => {
                    playSoftChime('tap', soundEnabled);
                    setSelectedChipId((prev) => (prev === chip.id ? null : chip.id));
                  }}
                  className={`inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm sm:text-base font-extrabold shadow-xs transition-transform active:scale-[0.97] cursor-grab active:cursor-grabbing ${
                    isSelected
                      ? 'text-white scale-[1.03] shadow-md'
                      : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)] text-[var(--platform-text)] hover:-translate-y-0.5'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: accentColor, borderColor: accentColor }
                      : undefined
                  }
                >
                  <GripVertical className="w-4 h-4 shrink-0 opacity-75" />
                  <span>{chip.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Drop Zones Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => {
          const isMatched = Boolean(matchedCardIds[card.id]);
          const isOver = dragOverCardId === card.id;
          const isWrong = wrongCardId === card.id;

          return (
            <motion.div
              key={card.id}
              animate={isWrong ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              onDragOver={(e) => {
                if (isMatched) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverCardId !== card.id) setDragOverCardId(card.id);
              }}
              onDragLeave={() => {
                if (dragOverCardId === card.id) setDragOverCardId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCardId(null);
                const droppedId = e.dataTransfer.getData('text/plain') || draggingChipId;
                setDraggingChipId(null);
                attemptMatch(droppedId, card);
              }}
              onClick={() => {
                if (!isMatched && selectedChipId) {
                  attemptMatch(selectedChipId, card);
                }
              }}
              className={`rounded-3xl border-2 bg-[var(--platform-surface)] overflow-hidden transition-all flex flex-col ${
                isMatched
                  ? 'border-emerald-400 shadow-sm'
                  : isWrong
                    ? 'border-rose-400 bg-rose-50/40'
                    : isOver
                      ? 'border-[var(--platform-accent)] scale-[1.02] shadow-md'
                      : selectedChipId
                        ? 'border-amber-300 cursor-pointer hover:border-[var(--platform-accent)]'
                        : 'border-[var(--platform-border)]'
              }`}
            >
              {/* Image Container */}
              <div className="relative h-48 sm:h-52 w-full bg-white p-2 flex items-center justify-center border-b border-[var(--platform-border)]">
                {failedImages[card.id] ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-xs font-bold">صورة النشاط</span>
                  </div>
                ) : (
                  <img
                    src={card.imageUrl}
                    alt={isMatched ? card.title : 'صورة للمطابقة'}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [card.id]: true }))
                    }
                    className="max-h-full max-w-full rounded-xl object-contain select-none"
                  />
                )}
              </div>

              {/* Drop Target Footer */}
              <div
                className={`p-4 min-h-[72px] flex items-center justify-center text-center transition-colors ${
                  isMatched
                    ? 'bg-emerald-50 text-emerald-900'
                    : isWrong
                      ? 'bg-rose-50 text-rose-800'
                      : isOver
                        ? 'bg-amber-50 text-slate-900'
                        : 'bg-[var(--platform-surface-muted)]/60 text-[var(--platform-text-muted)]'
                }`}
              >
                {isMatched ? (
                  <div className="inline-flex items-center gap-2 text-base font-extrabold text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                    <span>{card.title}</span>
                  </div>
                ) : isWrong ? (
                  <span className="text-sm font-extrabold text-rose-700">
                    حاول مرة أخرى
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm font-bold">
                    {selectedChipId
                      ? 'اضغط هنا لوضع العنوان المختار'
                      : 'اسحب العنوان وأفلته هنا'}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
