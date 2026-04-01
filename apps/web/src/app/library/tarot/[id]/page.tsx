'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import api from '@/lib/api';
import { TarotSession, TarotCard } from '@/types/product';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';

gsap.registerPlugin(useGSAP);

const SPREAD_POSITIONS = [
  { x: -280, label: 'Past' },
  { x: 0, label: 'Present' },
  { x: 280, label: 'Future' },
];

export default function TarotPage() {
  const { id } = useParams<{ id: string }>();
  const deckRef = useRef<HTMLDivElement>(null);
  const [drawnCards, setDrawnCards] = useState<(TarotCard & { reversed: boolean })[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedCard, setSelectedCard] = useState<(TarotCard & { reversed: boolean }) | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['tarot-session', id],
    queryFn: async () => {
      const res = await api.get(`/library/tarot/${id}/session`);
      return res.data.data as TarotSession;
    },
  });

  const shuffle = useCallback(() => {
    if (!session || isShuffling) return;
    setIsShuffling(true);
    setDrawnCards([]);
    setSelectedCard(null);

    const cards = deckRef.current?.querySelectorAll('[data-card]');
    if (!cards) { setIsShuffling(false); return; }

    const tl = gsap.timeline({
      onComplete: () => {
        // Draw 3 random cards after shuffle
        const shuffled = [...session.cards].sort(() => Math.random() - 0.5);
        const drawn = shuffled.slice(0, 3).map((c) => ({
          ...c,
          reversed: Math.random() > 0.7,
        }));
        setDrawnCards(drawn);
        setIsShuffling(false);
      },
    });

    // Fan out and back
    cards.forEach((card, i) => {
      const offset = (i - cards.length / 2) * 4;
      tl.to(card, { x: offset, rotation: offset * 1.2, duration: 0.3 }, i * 0.02);
    });
    tl.to(cards, { x: 0, rotation: 0, duration: 0.4, stagger: 0.02, ease: 'power2.inOut' }, '+=0.2');
  }, [session, isShuffling]);

  if (isLoading) return <PageSpinner />;
  if (!session) return <div className="p-10 text-center">Could not load tarot deck.</div>;

  const backImageUrl = session.backImageUrl;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">{session.deckName}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{session.cards.length} cards</p>
      </div>

      {/* Deck stack */}
      <div className="flex flex-col items-center gap-6">
        <div ref={deckRef} className="relative h-44 w-28">
          {Array.from({ length: Math.min(8, session.cards.length) }).map((_, i) => (
            <div
              key={i}
              data-card
              style={{ top: -i * 2, left: i * 0.5, zIndex: i }}
              className="absolute inset-0 rounded-lg border border-[var(--border)] overflow-hidden shadow-md"
            >
              {backImageUrl ? (
                <Image src={backImageUrl} alt="Card back" fill className="object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-violet-900 to-purple-700 flex items-center justify-center text-2xl">
                  ✦
                </div>
              )}
            </div>
          ))}
        </div>

        <Button size="lg" loading={isShuffling} onClick={shuffle}>
          {drawnCards.length > 0 ? 'Shuffle again' : 'Shuffle & draw'}
        </Button>
      </div>

      {/* 3-card spread */}
      {drawnCards.length === 3 && (
        <div className="space-y-4">
          <h2 className="text-center text-sm font-medium text-[var(--muted-foreground)]">
            Three-card spread
          </h2>
          <div className="flex justify-center gap-3 sm:gap-6 flex-wrap">
            {drawnCards.map((card, i) => (
              <button
                key={i}
                onClick={() => setSelectedCard(card === selectedCard ? null : card)}
                className="flex flex-col items-center gap-2 group"
              >
                <div
                  className={`relative h-40 w-24 sm:h-48 sm:w-28 rounded-lg overflow-hidden border-2 transition-all shadow-lg ${
                    selectedCard === card ? 'border-violet-500 scale-105' : 'border-[var(--border)] hover:border-violet-400'
                  }`}
                  style={{ transform: card.reversed ? 'rotate(180deg)' : undefined }}
                >
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-xs text-[var(--muted-foreground)] font-medium">
                  {SPREAD_POSITIONS[i].label}
                </span>
                <span className="text-xs text-center max-w-[6rem] leading-tight">
                  {card.name}
                  {card.reversed && <span className="text-amber-500"> (Rev.)</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card detail panel */}
      {selectedCard && (
        <div className="rounded-xl border border-[var(--border)] p-5 space-y-3">
          <div className="flex items-start gap-4">
            <div className="relative h-32 w-20 shrink-0 rounded-lg overflow-hidden border border-[var(--border)] shadow"
              style={{ transform: selectedCard.reversed ? 'rotate(180deg)' : undefined }}
            >
              <Image src={selectedCard.imageUrl} alt={selectedCard.name} fill className="object-cover" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">
                {selectedCard.name}
                {selectedCard.reversed && (
                  <span className="ml-2 text-sm text-amber-500 font-normal">(Reversed)</span>
                )}
              </h3>
              {selectedCard.keywords.length > 0 && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {selectedCard.keywords.join(' · ')}
                </p>
              )}
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {selectedCard.reversed
                  ? selectedCard.reversedMeaning || 'Reversed energy of this card.'
                  : selectedCard.uprightMeaning || 'The energy of this card speaks to you.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
