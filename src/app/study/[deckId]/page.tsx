"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FlashCard from "@/components/FlashCard";
import StudyComplete from "@/components/StudyComplete";
import { Card, Deck } from "@/lib/types";
import { getDeck, updateDeckCards } from "@/lib/storage";
import { calculateSM2, getCardsForReview } from "@/lib/sm2";
import { recordSession } from "@/lib/studyHistory";

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load deck and prepare session
  useEffect(() => {
    const loadedDeck = getDeck(deckId);
    if (!loadedDeck) {
      router.push("/");
      return;
    }
    setDeck(loadedDeck);
    const reviewCards = getCardsForReview(loadedDeck.cards, 10, 30);
    setSessionCards(reviewCards);
    setLoading(false);
  }, [deckId, router]);

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
  }, []);

  const handleRate = useCallback(
    (quality: number) => {
      if (!deck || currentIndex >= sessionCards.length) return;

      const currentCard = sessionCards[currentIndex];
      const updatedCard = calculateSM2(quality, currentCard);

      // Update the card in the full deck
      const updatedCards = deck.cards.map((c) =>
        c.id === updatedCard.id ? updatedCard : c
      );
      const updatedDeck = updateDeckCards(deck.id, updatedCards);
      if (updatedDeck) setDeck(updatedDeck);

      const newReviewed = cardsReviewed + 1;
      const newCorrect = quality >= 3 ? correctCount + 1 : correctCount;
      setCardsReviewed(newReviewed);
      if (quality >= 3) setCorrectCount(newCorrect);

      // Move to next card
      if (currentIndex + 1 >= sessionCards.length) {
        // Record session in study history
        recordSession(deck.id, deck.name, newReviewed, newCorrect);
        setSessionComplete(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setFlipped(false);
      }
    },
    [deck, currentIndex, sessionCards, cardsReviewed, correctCount]
  );

  const handleContinue = useCallback(() => {
    if (!deck) return;
    const loadedDeck = getDeck(deck.id);
    if (!loadedDeck) return;
    setDeck(loadedDeck);
    const reviewCards = getCardsForReview(loadedDeck.cards, 10, 30);
    setSessionCards(reviewCards);
    setCurrentIndex(0);
    setFlipped(false);
    setSessionComplete(false);
    setCardsReviewed(0);
    setCorrectCount(0);
  }, [deck]);

  const handleBackToDecks = useCallback(() => {
    router.push("/");
  }, [router]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (sessionComplete || loading || !deck) return;

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!flipped) {
          setFlipped(true);
        }
      }

      // Rating shortcuts — only when card is flipped
      if (flipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate(1);
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate(2);
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate(4);
        } else if (e.key === "4") {
          e.preventDefault();
          handleRate(5);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipped, sessionComplete, loading, deck, handleRate]);

  if (loading) {
    return (
      <div className="study-container">
        <div className="empty-state">
          <div className="upload-progress-spinner" />
          <p className="empty-state-text">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (!deck) return null;

  if (sessionCards.length === 0) {
    return (
      <div className="study-container">
        <div className="study-header">
          <button className="study-back-btn" onClick={() => router.push("/")}>
            ← Back
          </button>
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
            {deck.name}
          </h2>
          <div />
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <p className="empty-state-text">All caught up!</p>
          <p className="empty-state-subtext">
            No cards are due for review right now. Come back later or add more
            cards.
          </p>
          <button
            className="btn btn-primary btn-lg"
            style={{ marginTop: "var(--space-xl)" }}
            onClick={() => router.push(`/deck/${deck.id}`)}
          >
            View Deck Details
          </button>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="study-container">
        <StudyComplete
          cardsReviewed={cardsReviewed}
          correctCount={correctCount}
          totalInDeck={deck.cards.length}
          onContinue={handleContinue}
          onBackToDecks={handleBackToDecks}
        />
      </div>
    );
  }

  const currentCard = sessionCards[currentIndex];
  const progress = ((currentIndex + 1) / sessionCards.length) * 100;

  return (
    <div className="study-container">
      {/* Header */}
      <div className="study-header">
        <button className="study-back-btn" onClick={() => router.push("/")}>
          ← Back
        </button>
        <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
          {deck.name}
        </h2>
        <div />
      </div>

      {/* Progress */}
      <div className="study-progress">
        <p className="study-progress-text">
          Card {currentIndex + 1} of {sessionCards.length}
        </p>
        <div className="study-progress-bar">
          <div
            className="study-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <FlashCard card={currentCard} flipped={flipped} onFlip={handleFlip} />

      {/* Rating Buttons — only show when flipped */}
      {flipped && (
        <div style={{ animation: "fadeInUp 0.3s ease-out" }}>
          <div className="rating-buttons">
            <button
              className="rating-btn rating-btn-again"
              onClick={() => handleRate(1)}
            >
              Again
              <span className="rating-btn-label">1 day</span>
            </button>
            <button
              className="rating-btn rating-btn-hard"
              onClick={() => handleRate(2)}
            >
              Hard
              <span className="rating-btn-label">Review soon</span>
            </button>
            <button
              className="rating-btn rating-btn-good"
              onClick={() => handleRate(4)}
            >
              Good
              <span className="rating-btn-label">
                {currentCard.interval > 0
                  ? `${Math.round(currentCard.interval * currentCard.easeFactor)}d`
                  : "1 day"}
              </span>
            </button>
            <button
              className="rating-btn rating-btn-easy"
              onClick={() => handleRate(5)}
            >
              Easy
              <span className="rating-btn-label">
                {currentCard.interval > 0
                  ? `${Math.round(currentCard.interval * currentCard.easeFactor * 1.3)}d`
                  : "6 days"}
              </span>
            </button>
          </div>
          <div className="keyboard-hints">
            <span>⌨️</span>
            <span><kbd>1</kbd> Again</span>
            <span><kbd>2</kbd> Hard</span>
            <span><kbd>3</kbd> Good</span>
            <span><kbd>4</kbd> Easy</span>
          </div>
        </div>
      )}

      {/* Flip hint */}
      {!flipped && (
        <div className="keyboard-hints" style={{ marginTop: "var(--space-md)" }}>
          <span>⌨️ Press <kbd>Space</kbd> to flip</span>
        </div>
      )}
    </div>
  );
}
