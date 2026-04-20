export interface Card {
  id: string;
  front: string;
  back: string;
  category: "concept" | "definition" | "example" | "relationship" | "edge-case";
  difficulty: "easy" | "medium" | "hard";
  // SM-2 fields
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: string;
  lastReviewDate: string | null;
}

export interface DeckStats {
  totalCards: number;
  mastered: number;
  learning: number;
  newCards: number;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastStudiedAt: string | null;
  sourceFileName: string;
  cards: Card[];
  stats: DeckStats;
}

export type CardCategory = Card["category"];
export type CardDifficulty = Card["difficulty"];

export interface StudySessionResult {
  cardsReviewed: number;
  correctCount: number;
  incorrectCount: number;
  averageQuality: number;
}
