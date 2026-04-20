"use client";

import { Card } from "@/lib/types";

interface FlashCardProps {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
}

export default function FlashCard({ card, flipped, onFlip }: FlashCardProps) {
  const categoryClass = `cat-${card.category}`;
  const difficultyClass = `diff-${card.difficulty}`;

  const categoryLabels: Record<string, string> = {
    concept: "💡 Concept",
    definition: "📖 Definition",
    relationship: "🔗 Relationship",
    example: "📝 Example",
    "edge-case": "⚠️ Edge Case",
  };

  return (
    <div className="flashcard-scene" onClick={onFlip}>
      <div className={`flashcard ${flipped ? "flipped" : ""}`}>
        {/* Front */}
        <div className="flashcard-face flashcard-front">
          <span className={`flashcard-category ${categoryClass}`}>
            {categoryLabels[card.category] || card.category}
          </span>
          <span className={`flashcard-difficulty ${difficultyClass}`}>
            {card.difficulty}
          </span>
          <p className="flashcard-text">{card.front}</p>
          <span className="flashcard-hint">Click to reveal answer</span>
        </div>

        {/* Back */}
        <div className="flashcard-face flashcard-back">
          <span className={`flashcard-category ${categoryClass}`}>
            {categoryLabels[card.category] || card.category}
          </span>
          <p className="flashcard-text">{card.back}</p>
          <span className="flashcard-hint">Rate your recall below</span>
        </div>
      </div>
    </div>
  );
}
