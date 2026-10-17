"use client";

import type { Achievement, GameStats, LeaderboardEntry, Product } from "@/types/game";
import { getUtcDateKey } from "@/lib/utils";

const STATS_KEY = "pricele:stats:v1";
const LEADERBOARD_KEY = "pricele:leaderboard:v1";
const DAILY_KEY = "pricele:daily:v1";

export const EMPTY_STATS: GameStats = {
  gamesPlayed: 0,
  averageScore: 0,
  bestScore: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastDailyDate: null,
  totalGuesses: 0,
  perfectGuesses: 0,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.error(`Could not read ${key} from local storage.`, error);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Could not save ${key} to local storage.`, error);
  }
}

export function loadStats(): GameStats {
  return { ...EMPTY_STATS, ...readJson(STATS_KEY, EMPTY_STATS) };
}

export function loadLeaderboard(): LeaderboardEntry[] {
  return readJson<LeaderboardEntry[]>(LEADERBOARD_KEY, []);
}

export function loadDailyProgress(): { date: string; products: string[]; guesses: number[] } | null {
  const saved = readJson<{ date: string; products: string[]; guesses: number[] } | null>(DAILY_KEY, null);
  return saved?.date === getUtcDateKey() ? saved : null;
}

export function saveDailyProgress(
  products: Product[],
  guesses: number[],
): void {
  writeJson(DAILY_KEY, {
    date: getUtcDateKey(),
    products: products.map((product) => product.id),
    guesses,
  });
}

export function saveCompletedGame(
  score: number,
  guessesCount: number,
  perfectGuesses: number,
  mode: "daily" | "unlimited",
): { stats: GameStats; achievements: Achievement[] } {
  const previous = loadStats();
  const today = getUtcDateKey();
  const isDaily = mode === "daily" && previous.lastDailyDate !== today;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const playedYesterday = previous.lastDailyDate === getUtcDateKey(yesterday);
  const currentStreak = isDaily
    ? playedYesterday
      ? previous.currentStreak + 1
      : 1
    : previous.currentStreak;
  const gamesPlayed = previous.gamesPlayed + 1;
  const stats: GameStats = {
    ...previous,
    gamesPlayed,
    averageScore: Math.round((previous.averageScore * previous.gamesPlayed + score) / gamesPlayed),
    bestScore: Math.max(previous.bestScore, score),
    currentStreak,
    longestStreak: Math.max(previous.longestStreak, currentStreak),
    lastDailyDate: isDaily ? today : previous.lastDailyDate,
    totalGuesses: previous.totalGuesses + guessesCount,
    perfectGuesses: previous.perfectGuesses + perfectGuesses,
  };

  writeJson(STATS_KEY, stats);
  const leaderboard = loadLeaderboard();
  leaderboard.push({ score, date: new Date().toISOString(), mode });
  writeJson(
    LEADERBOARD_KEY,
    leaderboard.sort((a, b) => b.score - a.score).slice(0, 10),
  );

  return { stats, achievements: getAchievements(stats) };
}

export function getAchievements(stats: GameStats): Achievement[] {
  return [
    { id: "first-win", title: "First steps", description: "Finish your first game", unlocked: stats.gamesPlayed >= 1 },
    { id: "perfect", title: "Nailed it", description: "Make a perfect guess", unlocked: stats.perfectGuesses >= 1 },
    { id: "hundred-guesses", title: "Product person", description: "Guess 100 products", unlocked: stats.totalGuesses >= 100 },
    { id: "week-streak", title: "On a roll", description: "Reach a 7 day streak", unlocked: stats.longestStreak >= 7 },
  ];
}
