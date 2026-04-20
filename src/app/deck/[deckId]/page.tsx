"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardCategory, Deck } from "@/lib/types";
import { getDeck, saveDeck, deleteDeck as deleteDeckStorage } from "@/lib/storage";

const ALL_CATEGORIES: { value: CardCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "concept", label: "💡 Concepts" },
  { value: "definition", label: "📖 Definitions" },
  { value: "relationship", label: "🔗 Relationships" },
  { value: "example", label: "📝 Examples" },
  { value: "edge-case", label: "⚠️ Edge Cases" },
];

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [filter, setFilter] = useState<CardCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadedDeck = getDeck(deckId);
    if (!loadedDeck) {
      router.push("/");
      return;
    }
    setDeck(loadedDeck);
    setLoading(false);
  }, [deckId, router]);

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      if (!deck) return;
      const updatedCards = deck.cards.filter((c) => c.id !== cardId);
      const updatedDeck = { ...deck, cards: updatedCards };
      saveDeck(updatedDeck);
      setDeck({ ...updatedDeck });
    },
    [deck]
  );

  const handleDeleteDeck = useCallback(() => {
    if (!deck) return;
    if (confirm("Delete this entire deck? This cannot be undone.")) {
      deleteDeckStorage(deck.id);
      router.push("/");
    }
  }, [deck, router]);

  if (loading) {
    return (
      <div className="deck-detail-container">
        <div className="empty-state">
          <div className="upload-progress-spinner" />
          <p className="empty-state-text">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (!deck) return null;

  const filteredCards = deck.cards.filter((card) => {
    const matchesCategory = filter === "all" || card.category === filter;
    const matchesSearch =
      searchQuery === "" ||
      card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryClass = (cat: string) => `cat-${cat}`;
  const getDifficultyClass = (diff: string) => `diff-${diff}`;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getCardStatus = (card: Card): string => {
    if (!card.lastReviewDate) return "New";
    if (card.repetitions >= 5) return "Mastered";
    return "Learning";
  };

  const getCardStatusColor = (card: Card): string => {
    const status = getCardStatus(card);
    if (status === "Mastered") return "var(--success)";
    if (status === "Learning") return "var(--warning)";
    return "var(--info)";
  };

  return (
    <div className="deck-detail-container">
      {/* Back link */}
      <Link
        href="/"
        className="study-back-btn"
        style={{ display: "inline-flex", marginBottom: "var(--space-lg)" }}
      >
        ← Back to Decks
      </Link>

      {/* Header */}
      <div className="deck-detail-header">
        <h1 className="deck-detail-title">{deck.name}</h1>
        <p className="deck-detail-description">{deck.description}</p>
        <div className="deck-detail-meta">
          <span className="deck-detail-meta-item">
            📄 {deck.sourceFileName}
          </span>
          <span className="deck-detail-meta-item">
            📅 Created {formatDate(deck.createdAt)}
          </span>
          <span className="deck-detail-meta-item">
            🕐 Last studied {deck.lastStudiedAt ? formatDate(deck.lastStudiedAt) : "Never"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="deck-detail-actions">
        <Link href={`/study/${deck.id}`} className="btn btn-primary btn-lg">
          ▶ Start Study Session
        </Link>
        <button className="btn btn-danger" onClick={handleDeleteDeck}>
          🗑️ Delete Deck
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-card-value">{deck.stats.totalCards}</div>
          <div className="stat-card-label">Total Cards</div>
        </div>
        <div className="stat-card stat-mastered">
          <div className="stat-card-value">{deck.stats.mastered}</div>
          <div className="stat-card-label">Mastered</div>
        </div>
        <div className="stat-card stat-learning">
          <div className="stat-card-value">{deck.stats.learning}</div>
          <div className="stat-card-label">Learning</div>
        </div>
        <div className="stat-card stat-new">
          <div className="stat-card-value">{deck.stats.newCards}</div>
          <div className="stat-card-label">New</div>
        </div>
      </div>

      {/* Card List */}
      <div className="card-list-header">
        <h2 className="section-title">
          Cards{" "}
          <span className="section-count">({filteredCards.length})</span>
        </h2>
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="card-filters" style={{ marginBottom: "var(--space-lg)" }}>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`filter-btn ${filter === cat.value ? "active" : ""}`}
            onClick={() => setFilter(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Card List */}
      {filteredCards.length > 0 ? (
        <div className="card-list">
          {filteredCards.map((card, idx) => (
            <div
              key={card.id}
              className="card-list-item"
              style={{
                animation: `fadeInUp 0.3s ease-out ${idx * 0.03}s both`,
              }}
            >
              <div className="card-list-item-content">
                <div className="card-list-front">{card.front}</div>
                <div className="card-list-back">{card.back}</div>
              </div>
              <div className="card-list-badges">
                <span className={`card-badge ${getCategoryClass(card.category)}`}>
                  {card.category}
                </span>
                <span className={`card-badge ${getDifficultyClass(card.difficulty)}`}>
                  {card.difficulty}
                </span>
                <span
                  className="card-badge"
                  style={{
                    color: getCardStatusColor(card),
                    background: "var(--bg-surface)",
                  }}
                >
                  {getCardStatus(card)}
                </span>
              </div>
              <button
                className="card-list-delete"
                title="Delete card"
                onClick={() => handleDeleteCard(card.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">No cards match your filter</p>
          <p className="empty-state-subtext">Try a different category or search term</p>
        </div>
      )}
    </div>
  );
}
