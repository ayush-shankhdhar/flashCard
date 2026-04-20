"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks } from "@/lib/storage";
import { getDeckStats, getCardsForReview } from "@/lib/sm2";
import {
  getStreak,
  getTodayStats,
  getWeeklyActivity,
  getRecentSessions,
  StudySession,
} from "@/lib/studyHistory";

interface DeckSummary {
  id: string;
  name: string;
  totalCards: number;
  mastered: number;
  dueCount: number;
  masteryPct: number;
}

export default function DashboardPage() {
  const [streak, setStreak] = useState({ current: 0, longest: 0, studiedToday: false });
  const [todayStats, setTodayStats] = useState({ sessionsCount: 0, cardsReviewed: 0, correctCount: 0 });
  const [weeklyActivity, setWeeklyActivity] = useState<{ date: string; dayLabel: string; cards: number }[]>([]);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [deckSummaries, setDeckSummaries] = useState<DeckSummary[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalCards: 0,
    totalMastered: 0,
    totalDue: 0,
    totalDecks: 0,
  });

  useEffect(() => {
    setStreak(getStreak());
    setTodayStats(getTodayStats());
    setWeeklyActivity(getWeeklyActivity());
    setRecentSessions(getRecentSessions(5));

    const decks: Deck[] = getDecks();
    let totalCards = 0;
    let totalMastered = 0;
    let totalDue = 0;

    const summaries: DeckSummary[] = decks.map((deck) => {
      const stats = getDeckStats(deck.cards);
      const dueCards = getCardsForReview(deck.cards, 999, 999);
      const masteryPct = stats.totalCards > 0 ? Math.round((stats.mastered / stats.totalCards) * 100) : 0;

      totalCards += stats.totalCards;
      totalMastered += stats.mastered;
      totalDue += dueCards.length;

      return {
        id: deck.id,
        name: deck.name,
        totalCards: stats.totalCards,
        mastered: stats.mastered,
        dueCount: dueCards.length,
        masteryPct,
      };
    });

    setDeckSummaries(summaries);
    setGlobalStats({
      totalCards,
      totalMastered,
      totalDue,
      totalDecks: decks.length,
    });
  }, []);

  const maxWeeklyCards = Math.max(...weeklyActivity.map((d) => d.cards), 1);
  const globalMasteryPct =
    globalStats.totalCards > 0
      ? Math.round((globalStats.totalMastered / globalStats.totalCards) * 100)
      : 0;
  const todayAccuracy =
    todayStats.cardsReviewed > 0
      ? Math.round((todayStats.correctCount / todayStats.cardsReviewed) * 100)
      : 0;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <Link href="/" className="study-back-btn">
          ← Back to Decks
        </Link>
        <h1 className="dashboard-title">Dashboard</h1>
      </div>

      {/* Top Stats Row */}
      <div className="dashboard-top-stats">
        {/* Streak Card */}
        <div className="dashboard-streak-card">
          <div className={`streak-fire ${streak.studiedToday ? "active" : ""}`}>
            🔥
          </div>
          <div className="streak-number">{streak.current}</div>
          <div className="streak-label">Day Streak</div>
          <div className="streak-best">Best: {streak.longest} days</div>
        </div>

        {/* Today Stats */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">📚</div>
          <div className="dashboard-stat-value">{todayStats.cardsReviewed}</div>
          <div className="dashboard-stat-label">Cards Today</div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">✅</div>
          <div className="dashboard-stat-value">{todayStats.sessionsCount}</div>
          <div className="dashboard-stat-label">Sessions Today</div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">🎯</div>
          <div className="dashboard-stat-value">{todayAccuracy}%</div>
          <div className="dashboard-stat-label">Accuracy Today</div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">⏰</div>
          <div className="dashboard-stat-value" style={{ color: globalStats.totalDue > 0 ? "var(--warning)" : "var(--success)" }}>
            {globalStats.totalDue}
          </div>
          <div className="dashboard-stat-label">Cards Due</div>
        </div>
      </div>

      {/* Global Mastery */}
      <div className="dashboard-mastery-section">
        <h2 className="dashboard-section-title">Overall Mastery</h2>
        <div className="dashboard-mastery-card">
          <div className="mastery-ring-container">
            <svg className="mastery-ring" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="var(--bg-hover)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="url(#mastery-gradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${globalMasteryPct * 3.14} ${314 - globalMasteryPct * 3.14}`}
                strokeDashoffset="0"
                transform="rotate(-90 60 60)"
                className="mastery-ring-progress"
              />
              <defs>
                <linearGradient id="mastery-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mastery-ring-text">
              <span className="mastery-ring-value">{globalMasteryPct}%</span>
              <span className="mastery-ring-label">Mastered</span>
            </div>
          </div>
          <div className="mastery-details">
            <div className="mastery-detail-item">
              <span className="mastery-detail-dot" style={{ background: "var(--success)" }} />
              <span>{globalStats.totalMastered} mastered</span>
            </div>
            <div className="mastery-detail-item">
              <span className="mastery-detail-dot" style={{ background: "var(--warning)" }} />
              <span>{globalStats.totalCards - globalStats.totalMastered} remaining</span>
            </div>
            <div className="mastery-detail-item">
              <span className="mastery-detail-dot" style={{ background: "var(--accent-primary)" }} />
              <span>{globalStats.totalDecks} deck{globalStats.totalDecks !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="dashboard-weekly-section">
        <h2 className="dashboard-section-title">Weekly Activity</h2>
        <div className="weekly-chart">
          {weeklyActivity.map((day) => (
            <div key={day.date} className="weekly-bar-group">
              <div className="weekly-bar-value">{day.cards > 0 ? day.cards : ""}</div>
              <div className="weekly-bar-track">
                <div
                  className={`weekly-bar-fill ${day.cards > 0 ? "active" : ""}`}
                  style={{
                    height: `${day.cards > 0 ? Math.max((day.cards / maxWeeklyCards) * 100, 8) : 4}%`,
                  }}
                />
              </div>
              <div className="weekly-bar-label">{day.dayLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Deck Breakdown */}
      {deckSummaries.length > 0 && (
        <div className="dashboard-decks-section">
          <h2 className="dashboard-section-title">Deck Breakdown</h2>
          <div className="dashboard-deck-table">
            {deckSummaries.map((d) => (
              <Link key={d.id} href={`/deck/${d.id}`} className="dashboard-deck-row">
                <div className="dashboard-deck-name">{d.name}</div>
                <div className="dashboard-deck-progress-mini">
                  <div className="mini-progress-bar">
                    <div
                      className="mini-progress-fill"
                      style={{ width: `${d.masteryPct}%` }}
                    />
                  </div>
                  <span className="mini-progress-text">{d.masteryPct}%</span>
                </div>
                <div className="dashboard-deck-meta-info">
                  <span>{d.totalCards} cards</span>
                  {d.dueCount > 0 && (
                    <span className="due-badge-small">{d.dueCount} due</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="dashboard-recent-section">
          <h2 className="dashboard-section-title">Recent Sessions</h2>
          <div className="recent-sessions-list">
            {recentSessions.map((s) => {
              const accuracy = s.cardsReviewed > 0 ? Math.round((s.correctCount / s.cardsReviewed) * 100) : 0;
              const timeStr = new Date(s.timestamp).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <div key={s.id} className="recent-session-item">
                  <div className="recent-session-deck">{s.deckName}</div>
                  <div className="recent-session-stats">
                    <span>{s.cardsReviewed} cards</span>
                    <span className="recent-session-accuracy">{accuracy}%</span>
                  </div>
                  <div className="recent-session-time">{timeStr}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {globalStats.totalDecks === 0 && (
        <div className="empty-state" style={{ marginTop: "var(--space-2xl)" }}>
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-text">No data yet</p>
          <p className="empty-state-subtext">
            Upload a PDF and start studying to see your progress here
          </p>
          <Link href="/" className="btn btn-primary btn-lg" style={{ marginTop: "var(--space-lg)" }}>
            Get Started
          </Link>
        </div>
      )}
    </div>
  );
}
