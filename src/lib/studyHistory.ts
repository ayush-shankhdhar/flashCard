/**
 * Study History & Streak Tracking
 *
 * Stores session logs and computes streaks, daily stats, and weekly activity.
 * All data is stored in localStorage alongside decks.
 */

const HISTORY_KEY = "flashforge-study-history";
const STREAK_KEY = "flashforge-streak";

export interface StudySession {
  id: string;
  deckId: string;
  deckName: string;
  timestamp: string; // ISO string
  cardsReviewed: number;
  correctCount: number;
}

interface StreakData {
  currentStreak: number;
  lastStudyDate: string; // YYYY-MM-DD
  longestStreak: number;
}

function getDateKey(date: Date = new Date()): string {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

function getSessions(): StudySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StudySession[];
  } catch {
    return [];
  }
}

function saveSessions(sessions: StudySession[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
}

function getStreakData(): StreakData {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastStudyDate: "", longestStreak: 0 };
  }
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { currentStreak: 0, lastStudyDate: "", longestStreak: 0 };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { currentStreak: 0, lastStudyDate: "", longestStreak: 0 };
  }
}

function saveStreakData(data: StreakData): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

/**
 * Record a completed study session and update the streak.
 */
export function recordSession(
  deckId: string,
  deckName: string,
  cardsReviewed: number,
  correctCount: number
): void {
  // Save session
  const sessions = getSessions();
  const session: StudySession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    deckId,
    deckName,
    timestamp: new Date().toISOString(),
    cardsReviewed,
    correctCount,
  };
  sessions.push(session);

  // Keep only last 500 sessions to avoid localStorage bloat
  if (sessions.length > 500) {
    sessions.splice(0, sessions.length - 500);
  }
  saveSessions(sessions);

  // Update streak
  const today = getDateKey();
  const streak = getStreakData();

  if (streak.lastStudyDate === today) {
    // Already studied today, streak unchanged
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  if (streak.lastStudyDate === yesterdayKey) {
    // Continuing streak
    streak.currentStreak += 1;
  } else if (streak.lastStudyDate !== today) {
    // Streak broken (or first time)
    streak.currentStreak = 1;
  }

  streak.lastStudyDate = today;
  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  saveStreakData(streak);
}

/**
 * Get the current streak info.
 */
export function getStreak(): { current: number; longest: number; studiedToday: boolean } {
  const streak = getStreakData();
  const today = getDateKey();

  // If last study date was more than 1 day ago, streak is broken
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  const isActive =
    streak.lastStudyDate === today || streak.lastStudyDate === yesterdayKey;

  return {
    current: isActive ? streak.currentStreak : 0,
    longest: streak.longestStreak,
    studiedToday: streak.lastStudyDate === today,
  };
}

/**
 * Get today's study stats.
 */
export function getTodayStats(): {
  sessionsCount: number;
  cardsReviewed: number;
  correctCount: number;
} {
  const sessions = getSessions();
  const today = getDateKey();

  let sessionsCount = 0;
  let cardsReviewed = 0;
  let correctCount = 0;

  for (const s of sessions) {
    if (s.timestamp.startsWith(today)) {
      sessionsCount++;
      cardsReviewed += s.cardsReviewed;
      correctCount += s.correctCount;
    }
  }

  return { sessionsCount, cardsReviewed, correctCount };
}

/**
 * Get the last 7 days of activity (cards reviewed per day).
 * Returns an array of 7 items, from 6 days ago to today.
 */
export function getWeeklyActivity(): { date: string; dayLabel: string; cards: number }[] {
  const sessions = getSessions();
  const result: { date: string; dayLabel: string; cards: number }[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getDateKey(d);
    let cards = 0;

    for (const s of sessions) {
      if (s.timestamp.startsWith(key)) {
        cards += s.cardsReviewed;
      }
    }

    result.push({
      date: key,
      dayLabel: dayNames[d.getDay()],
      cards,
    });
  }

  return result;
}

/**
 * Get recent sessions (latest N).
 */
export function getRecentSessions(limit: number = 10): StudySession[] {
  const sessions = getSessions();
  return sessions.slice(-limit).reverse();
}
