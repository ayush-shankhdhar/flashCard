import { Card, DeckStats } from "./types";

/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality scale:
 *   0 - Complete blackout
 *   1 - Incorrect, but recognized the answer
 *   2 - Incorrect, but the answer felt easy
 *   3 - Correct with serious difficulty
 *   4 - Correct after hesitation
 *   5 - Perfect response
 *
 * UI mapping:
 *   Again → quality 1
 *   Hard  → quality 2
 *   Good  → quality 4
 *   Easy  → quality 5
 */

export function calculateSM2(quality: number, card: Card): Card {
  const q = Math.max(0, Math.min(5, quality));

  // Update ease factor
  let newEF =
    card.easeFactor +
    (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newRepetitions = card.repetitions;
  let newInterval = card.interval;

  if (q < 3) {
    // Failed: reset
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Correct
    if (card.repetitions === 0) {
      newInterval = 1;
    } else if (card.repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(card.interval * newEF);
    }
    newRepetitions = card.repetitions + 1;
  }

  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    ...card,
    repetitions: newRepetitions,
    easeFactor: Math.round(newEF * 100) / 100,
    interval: newInterval,
    nextReviewDate: nextReview.toISOString(),
    lastReviewDate: now.toISOString(),
  };
}

/**
 * Returns cards that are due for review (nextReviewDate <= now)
 * plus cards that have never been reviewed, up to maxNewCards.
 */
export function getCardsForReview(
  cards: Card[],
  maxNewCards: number = 10,
  maxReviewCards: number = 50
): Card[] {
  const now = new Date();

  const dueCards: Card[] = [];
  const newCards: Card[] = [];

  for (const card of cards) {
    if (!card.lastReviewDate) {
      newCards.push(card);
    } else if (new Date(card.nextReviewDate) <= now) {
      dueCards.push(card);
    }
  }

  // Sort due cards: most overdue first
  dueCards.sort(
    (a, b) =>
      new Date(a.nextReviewDate).getTime() -
      new Date(b.nextReviewDate).getTime()
  );

  // Combine: due cards first, then new cards up to limit
  const result = [
    ...dueCards.slice(0, maxReviewCards),
    ...newCards.slice(0, maxNewCards),
  ];

  // Shuffle slightly to avoid predictability
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Compute deck-level statistics from the cards array
 */
export function getDeckStats(cards: Card[]): DeckStats {
  let mastered = 0;
  let learning = 0;
  let newCards = 0;

  for (const card of cards) {
    if (!card.lastReviewDate) {
      newCards++;
    } else if (card.repetitions >= 5) {
      mastered++;
    } else {
      learning++;
    }
  }

  return {
    totalCards: cards.length,
    mastered,
    learning,
    newCards,
  };
}
