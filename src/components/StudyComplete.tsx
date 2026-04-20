"use client";

import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  left: string;
  color: string;
  delay: string;
  size: string;
  shape: string;
}

interface StudyCompleteProps {
  cardsReviewed: number;
  correctCount: number;
  totalInDeck: number;
  onContinue: () => void;
  onBackToDecks: () => void;
}

const COLORS = [
  "hsl(265, 90%, 65%)",
  "hsl(170, 80%, 50%)",
  "hsl(145, 70%, 50%)",
  "hsl(35, 95%, 60%)",
  "hsl(210, 90%, 60%)",
  "hsl(340, 80%, 60%)",
];

export default function StudyComplete({
  cardsReviewed,
  correctCount,
  totalInDeck,
  onContinue,
  onBackToDecks,
}: StudyCompleteProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const accuracy =
    cardsReviewed > 0 ? Math.round((correctCount / cardsReviewed) * 100) : 0;

  useEffect(() => {
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        left: `${Math.random() * 100}%`,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: `${Math.random() * 1.5}s`,
        size: `${6 + Math.random() * 8}px`,
        shape: Math.random() > 0.5 ? "50%" : "0",
      });
    }
    setConfetti(pieces);

    const timer = setTimeout(() => setConfetti([]), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {confetti.length > 0 && (
        <div className="confetti-container">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="confetti-piece"
              style={{
                left: piece.left,
                backgroundColor: piece.color,
                animationDelay: piece.delay,
                width: piece.size,
                height: piece.size,
                borderRadius: piece.shape,
              }}
            />
          ))}
        </div>
      )}

      <div className="study-complete">
        <div className="study-complete-icon">🎉</div>
        <h2 className="study-complete-title">Session Complete!</h2>
        <p className="study-complete-subtitle">
          {accuracy >= 80
            ? "Outstanding work! Keep it up!"
            : accuracy >= 50
            ? "Good effort! Practice makes perfect."
            : "Keep pushing! You'll get there."}
        </p>

        <div className="study-stats-grid">
          <div className="study-stat-card">
            <div className="study-stat-value">{cardsReviewed}</div>
            <div className="study-stat-label">Cards Reviewed</div>
          </div>
          <div className="study-stat-card">
            <div className="study-stat-value">{accuracy}%</div>
            <div className="study-stat-label">Accuracy</div>
          </div>
          <div className="study-stat-card">
            <div className="study-stat-value">{totalInDeck}</div>
            <div className="study-stat-label">Total in Deck</div>
          </div>
        </div>

        <div className="study-complete-actions">
          <button className="btn btn-secondary btn-lg" onClick={onBackToDecks}>
            ← Back to Decks
          </button>
          <button className="btn btn-primary btn-lg" onClick={onContinue}>
            Study Again →
          </button>
        </div>
      </div>
    </>
  );
}
