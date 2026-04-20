"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import UploadZone from "@/components/UploadZone";
import DeckCard from "@/components/DeckCard";
import { Deck, Card } from "@/lib/types";
import { getDecks, saveDeck, deleteDeck as deleteDeckStorage } from "@/lib/storage";
import { getDeckStats } from "@/lib/sm2";

type UploadStage = "idle" | "extracting" | "generating" | "building" | "done";

export default function Home() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [error, setError] = useState<string | null>(null);

  // Load decks from localStorage on mount
  useEffect(() => {
    setDecks(getDecks());
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleFileSelect = useCallback(async (file: File) => {
    setUploading(true);
    setUploadStage("extracting");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      setUploadStage("generating");
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate flashcards");
      }

      setUploadStage("building");

      // Build the deck
      const now = new Date().toISOString();
      const cards: Card[] = data.cards.map(
        (c: { front: string; back: string; category: string; difficulty: string }) => ({
          id: uuidv4(),
          front: c.front,
          back: c.back,
          category: c.category,
          difficulty: c.difficulty,
          repetitions: 0,
          easeFactor: 2.5,
          interval: 0,
          nextReviewDate: now,
          lastReviewDate: null,
        })
      );

      const deck: Deck = {
        id: uuidv4(),
        name: data.name,
        description: data.description,
        createdAt: now,
        lastStudiedAt: null,
        sourceFileName: data.sourceFileName || file.name,
        cards,
        stats: getDeckStats(cards),
      };

      saveDeck(deck);
      setDecks(getDecks());
      setUploadStage("done");

      // Reset after a brief moment
      setTimeout(() => {
        setUploading(false);
        setUploadStage("idle");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUploading(false);
      setUploadStage("idle");
    }
  }, []);

  const handleDeleteDeck = useCallback((id: string) => {
    deleteDeckStorage(id);
    setDecks(getDecks());
  }, []);

  const filteredDecks = decks.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container">
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">⚡ Powered by Gemma 4 AI</div>
        <h1 className="hero-title">
          Turn any PDF into{" "}
          <span className="hero-title-gradient">smart flashcards</span>
        </h1>
        <p className="hero-subtitle">
          Drop in your notes, textbooks, or papers — FlashForge creates
          comprehensive flashcards with spaced repetition to help you
          truly learn and retain.
        </p>
      </section>

      {/* Upload Zone or Progress */}
      {uploading ? (
        <div className="upload-progress">
          <div className="upload-progress-card">
            <div className="upload-progress-spinner" />
            <p style={{ fontSize: "var(--font-size-lg)", fontWeight: 600 }}>
              {uploadStage === "extracting" && "Extracting text from PDF..."}
              {uploadStage === "generating" && "AI is crafting your flashcards..."}
              {uploadStage === "building" && "Building your deck..."}
              {uploadStage === "done" && "✨ Done!"}
            </p>
            <div className="upload-progress-steps">
              <div
                className={`upload-step ${
                  uploadStage === "extracting"
                    ? "active"
                    : ["generating", "building", "done"].includes(uploadStage)
                    ? "done"
                    : ""
                }`}
              >
                {["generating", "building", "done"].includes(uploadStage) ? "✅" : "⏳"}{" "}
                Extract text from PDF
              </div>
              <div
                className={`upload-step ${
                  uploadStage === "generating"
                    ? "active"
                    : ["building", "done"].includes(uploadStage)
                    ? "done"
                    : ""
                }`}
              >
                {["building", "done"].includes(uploadStage) ? "✅" : uploadStage === "generating" ? "⏳" : "⬜"}{" "}
                Generate flashcards with AI
              </div>
              <div
                className={`upload-step ${
                  uploadStage === "building"
                    ? "active"
                    : uploadStage === "done"
                    ? "done"
                    : ""
                }`}
              >
                {uploadStage === "done" ? "✅" : uploadStage === "building" ? "⏳" : "⬜"}{" "}
                Build & save deck
              </div>
            </div>
          </div>
        </div>
      ) : (
        <UploadZone onFileSelect={handleFileSelect} disabled={uploading} />
      )}

      {/* Deck Grid */}
      {decks.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title">
              Your Decks{" "}
              <span className="section-count">({decks.length})</span>
            </h2>
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredDecks.length > 0 ? (
            <div className="deck-grid">
              {filteredDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onDelete={handleDeleteDeck}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <p className="empty-state-text">No decks match your search</p>
              <p className="empty-state-subtext">Try a different keyword</p>
            </div>
          )}
        </section>
      )}

      {decks.length === 0 && !uploading && (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p className="empty-state-text">No decks yet</p>
          <p className="empty-state-subtext">
            Upload a PDF above to create your first flashcard deck
          </p>
        </div>
      )}

      {/* Error Toast */}
      {error && <div className="error-toast">⚠️ {error}</div>}
    </div>
  );
}
