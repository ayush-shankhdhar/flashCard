import { Deck } from "./types";
import { getDeckStats } from "./sm2";

const STORAGE_KEY = "flashforge-decks";

export function getDecks(): Deck[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Deck[];
  } catch {
    return [];
  }
}

export function saveDeck(deck: Deck): void {
  const decks = getDecks();
  // Recompute stats
  deck.stats = getDeckStats(deck.cards);
  const idx = decks.findIndex((d) => d.id === deck.id);
  if (idx >= 0) {
    decks[idx] = deck;
  } else {
    decks.push(deck);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

export function getDeck(id: string): Deck | null {
  const decks = getDecks();
  return decks.find((d) => d.id === id) || null;
}

export function deleteDeck(id: string): void {
  const decks = getDecks().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

export function updateDeckCards(deckId: string, cards: Deck["cards"]): Deck | null {
  const decks = getDecks();
  const idx = decks.findIndex((d) => d.id === deckId);
  if (idx < 0) return null;

  decks[idx].cards = cards;
  decks[idx].stats = getDeckStats(cards);
  decks[idx].lastStudiedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  return decks[idx];
}
