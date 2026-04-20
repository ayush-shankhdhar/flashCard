"use client";

import Link from "next/link";
import { Deck } from "@/lib/types";

interface DeckCardProps {
  deck: Deck;
  onDelete: (id: string) => void;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never studied";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function DeckCard({ deck, onDelete }: DeckCardProps) {
  const { stats } = deck;
  const total = stats.totalCards || 1;
  const masteredPct = (stats.mastered / total) * 100;
  const learningPct = (stats.learning / total) * 100;

  return (
    <div className="deck-card">
      <div className="deck-card-header">
        <h3 className="deck-card-title">{deck.name}</h3>
        <span className="deck-card-count">
          📇 {stats.totalCards}
        </span>
      </div>

      <p className="deck-card-description">{deck.description}</p>

      <div className="deck-card-progress">
        <div className="progress-bar-container">
          <div
            className="progress-bar-segment progress-bar-mastered"
            style={{ width: `${masteredPct}%` }}
          />
          <div
            className="progress-bar-segment progress-bar-learning"
            style={{ width: `${learningPct}%` }}
          />
          <div
            className="progress-bar-segment progress-bar-new"
            style={{ width: `${100 - masteredPct - learningPct}%` }}
          />
        </div>
        <div className="progress-labels">
          <span className="progress-label">
            <span className="progress-dot progress-dot-mastered" />
            {stats.mastered} mastered
          </span>
          <span className="progress-label">
            <span className="progress-dot progress-dot-learning" />
            {stats.learning} learning
          </span>
          <span className="progress-label">
            <span className="progress-dot progress-dot-new" />
            {stats.newCards} new
          </span>
        </div>
      </div>

      <div className="deck-card-footer">
        <span className="deck-card-meta">
          {timeAgo(deck.lastStudiedAt)}
        </span>
        <div className="deck-card-actions">
          <button
            className="btn-icon"
            title="Delete deck"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (confirm("Delete this deck? This cannot be undone.")) {
                onDelete(deck.id);
              }
            }}
          >
            🗑️
          </button>
          <Link
            href={`/deck/${deck.id}`}
            className="btn btn-secondary"
            onClick={(e) => e.stopPropagation()}
          >
            View
          </Link>
          <Link
            href={`/study/${deck.id}`}
            className="btn btn-primary"
            onClick={(e) => e.stopPropagation()}
          >
            Study →
          </Link>
        </div>
      </div>
    </div>
  );
}
